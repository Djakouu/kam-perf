import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { Queue, Job } from 'bullmq';
import path from 'path';
import { Scheduler } from './scheduler';

const prisma = new PrismaClient();
const analysisQueue = new Queue('lighthouse-analysis', {
    connection: process.env.REDIS_URL ? {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
    } : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
    }
} as any);

const typeDefs = readFileSync(path.join(__dirname, '../src/schema.graphql'), { encoding: 'utf-8' });

const resolvers = {
  Query: {
    getJobStatus: async (_: any, { jobId }: { jobId: string }) => {
        const job = await Job.fromId(analysisQueue, jobId);
        if (!job) return null;
        
        const state = await job.getState();
        const progress = job.progress;
        const failedReason = job.failedReason;
        
        return {
            jobId: job.id,
            status: state,
            progress: typeof progress === 'number' ? progress : 0,
            failedReason,
            message: job.data.statusMessage || null
        };
    },
    getSchedulerMetrics: async () => {
        const counts = await analysisQueue.getJobCounts();
        return counts;
    },
    getAnalytics: async (_: any, { filters }: any) => {
        // 1. Build base filters
        const accountWhere: any = {};
        if (filters?.country) accountWhere.country = filters.country;
        if (filters?.tamName) accountWhere.tamName = { contains: filters.tamName, mode: 'insensitive' };

        const domainWhere: any = {};
        if (filters?.sitecode) domainWhere.sitecode = { contains: filters.sitecode };

        // 2. Fetch Hierarchy (Accounts -> Domains -> Pages)
        const accounts = await prisma.account.findMany({
            where: accountWhere,
            include: {
                domains: {
                    where: domainWhere,
                    include: {
                        pages: true
                    }
                }
            }
        });

        // Flatten to get all domains and pages for calculations
        const allDomains = accounts.flatMap(a => a.domains);
        const allPages = allDomains.flatMap(d => d.pages);
        const allPageIds = allPages.map(p => p.id);

        // 3. Fetch Analysis Data
        const dateFilter: any = {};
        if (filters?.dateRange) {
            dateFilter.date = {
                gte: new Date(filters.dateRange.start),
                lte: new Date(filters.dateRange.end)
            };
        }

        const analyses = await prisma.dailyAnalysis.findMany({
            where: {
                pageId: { in: allPageIds },
                ...dateFilter
            }
        });

        // --- SUMMARY CALCULATION ---
        
        const calculateCpuDist = (domainIds: string[], analysesSubset: any[]) => {
            const dist = { under500: 0, between500And1000: 0, between1000And2000: 0, over2000: 0 };
            
            // Map pageId -> domainId
            const pageToDomain = new Map<string, string>();
            allDomains.forEach(d => d.pages.forEach(p => pageToDomain.set(p.id, d.id)));

            const domainAvgs = new Map<string, { sum: number, count: number }>();

            analysesSubset.forEach(a => {
                const domainId = pageToDomain.get(a.pageId);
                if (domainId && domainIds.includes(domainId)) {
                    if (!domainAvgs.has(domainId)) domainAvgs.set(domainId, { sum: 0, count: 0 });
                    const entry = domainAvgs.get(domainId)!;
                    
                    let val = 0;
                    if (filters?.device === 'mobile') {
                        val = a.mobileCpuAvg;
                    } else {
                        // Default to desktop
                        val = a.desktopCpuAvg;
                    }
                    
                    entry.sum += val;
                    entry.count += 1;
                }
            });

            domainAvgs.forEach((val) => {
                const finalAvg = val.sum / val.count;
                if (finalAvg < 500) dist.under500++;
                else if (finalAvg < 1000) dist.between500And1000++;
                else if (finalAvg < 2000) dist.between1000And2000++;
                else dist.over2000++;
            });

            return dist;
        };

        const summaryRows = [];

        // Row 1: All TAMs
        const allTamRow = {
            id: 'ALL',
            label: 'All TAMs',
            totalAccounts: accounts.length,
            totalDomains: allDomains.length,
            totalPages: allPages.length,
            domainsWith5PlusPages: allDomains.filter(d => d.pages.length >= 5).length,
            domainsByCpu: calculateCpuDist(allDomains.map(d => d.id), analyses)
        };
        summaryRows.push(allTamRow);

        // Rows per TAM
        const accountsByTam = new Map<string, typeof accounts>();
        accounts.forEach(a => {
            const tam = a.tamName || 'Unassigned';
            if (!accountsByTam.has(tam)) accountsByTam.set(tam, []);
            accountsByTam.get(tam)!.push(a);
        });

        for (const [tam, tamAccounts] of accountsByTam.entries()) {
            const tamDomains = tamAccounts.flatMap(a => a.domains);
            const tamPages = tamDomains.flatMap(d => d.pages);
            
            summaryRows.push({
                id: tam,
                label: tam,
                totalAccounts: tamAccounts.length,
                totalDomains: tamDomains.length,
                totalPages: tamPages.length,
                domainsWith5PlusPages: tamDomains.filter(d => d.pages.length >= 5).length,
                domainsByCpu: calculateCpuDist(tamDomains.map(d => d.id), analyses)
            });
        }

        // --- TRENDS CALCULATION ---
        const trendsSeries = [];
        
        let startDate = filters?.dateRange ? new Date(filters.dateRange.start) : new Date();
        let endDate = filters?.dateRange ? new Date(filters.dateRange.end) : new Date();
        
        if (!filters?.dateRange) {
             const firstAnalysis = await prisma.dailyAnalysis.findFirst({ orderBy: { date: 'asc' } });
             startDate = firstAnalysis ? firstAnalysis.date : new Date();
             endDate = new Date();
        }

        // Helper to get days
        const getDaysArray = (start: Date, end: Date) => {
            const arr = [];
            for(const dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
                arr.push(new Date(dt));
            }
            return arr;
        };

        const days = getDaysArray(startDate, endDate);

        // Helper to calculate points for a set of accounts
        const calculatePoints = (targetAccounts: typeof accounts) => {
            const points = [];
            const targetDomains = targetAccounts.flatMap(a => a.domains);
            const targetPages = targetDomains.flatMap(d => d.pages);
            const targetPageIds = targetPages.map(p => p.id);

            for (const d of days) {
                const dayStart = new Date(d);
                dayStart.setHours(0,0,0,0);
                const dayEnd = new Date(d);
                dayEnd.setHours(23,59,59,999);
                const dayStr = d.toISOString().split('T')[0];

                const activeAccounts = targetAccounts.filter(a => a.createdAt <= dayEnd);
                const activeDomains = targetDomains.filter(dom => dom.createdAt <= dayEnd);
                const activePages = targetPages.filter(p => p.createdAt <= dayEnd);
                
                // Filter analyses for this day and these pages
                const dayAnalyses = analyses.filter(a => 
                    a.date.toISOString().split('T')[0] === dayStr && 
                    targetPageIds.includes(a.pageId)
                );

                const domainsWith5Plus = activeDomains.filter(dom => {
                    const domPages = activePages.filter(p => p.domainId === dom.id);
                    return domPages.length >= 5;
                }).length;

                points.push({
                    date: d,
                    totalAccounts: activeAccounts.length,
                    totalDomains: activeDomains.length,
                    totalPages: activePages.length,
                    domainsWith5PlusPages: domainsWith5Plus,
                    domainsByCpu: calculateCpuDist(activeDomains.map(dom => dom.id), dayAnalyses)
                });
            }
            return points;
        };

        // 1. "All TAMs" Series
        trendsSeries.push({
            id: 'ALL',
            label: 'All TAMs',
            data: calculatePoints(accounts)
        });

        // 2. Per-TAM Series
        for (const [tam, tamAccounts] of accountsByTam.entries()) {
            trendsSeries.push({
                id: tam,
                label: tam,
                data: calculatePoints(tamAccounts)
            });
        }
        
        return {
            summary: summaryRows,
            trends: trendsSeries
        };
    },
    getHierarchy: async (_: any, { filters }: any) => {
      const where: any = {};
      
      if (filters?.country) where.country = filters.country;
      if (filters?.tamName) where.tamName = { contains: filters.tamName, mode: 'insensitive' };

      return await prisma.account.findMany({
          where,
          include: {
              domains: {
                  where: filters?.sitecode ? { sitecode: { contains: filters.sitecode } } : undefined,
                  include: {
                      pages: {
                          where: filters?.sitecode ? { sitecode: { contains: filters.sitecode } } : undefined,
                      }
                  }
              }
          },
          orderBy: { name: 'asc' }
      });
    },
    getHistory: async (_: any, { entityId, entityType, tool, dateRange }: any) => {
        const where: any = { tool };
        
        if (dateRange) {
            where.date = {
                gte: new Date(dateRange.start),
                lte: new Date(dateRange.end)
            };
        }

        if (entityType === 'PAGE') {
            where.pageId = entityId;
            const analyses = await prisma.dailyAnalysis.findMany({
                where,
                orderBy: { date: 'asc' },
                include: { page: { include: { comments: true } } }
            });
            
            return analyses.map(a => {
                const analysisDateStr = a.date.toISOString().split('T')[0];
                const comment = a.page.comments.find(c => c.date.toISOString().split('T')[0] === analysisDateStr);
                
                return {
                    date: a.date,
                    desktopCpuAvg: a.desktopCpuAvg,
                    mobileCpuAvg: a.mobileCpuAvg,
                    comment: comment ? { id: comment.id, text: comment.text } : null
                };
            });
        } else if (entityType === 'DOMAIN') {
            // 1. Get all pages in domain
            const pages = await prisma.page.findMany({
                where: { domainId: entityId },
                select: { id: true }
            });
            const pageIds = pages.map(p => p.id);

            // Fetch comments for this domain
            const comments = await prisma.comment.findMany({
                where: { domainId: entityId }
            });

            // 2. Fetch all analyses for these pages
            const analyses = await prisma.dailyAnalysis.findMany({
                where: {
                    ...where,
                    pageId: { in: pageIds }
                }
            });

            // 3. Group by date and calculate average (excluding 0s)
            const groupedByDate: Record<string, { desktopSum: number, desktopCount: number, mobileSum: number, mobileCount: number }> = {};

            analyses.forEach(a => {
                const dateStr = a.date.toISOString().split('T')[0];
                if (!groupedByDate[dateStr]) {
                    groupedByDate[dateStr] = { desktopSum: 0, desktopCount: 0, mobileSum: 0, mobileCount: 0 };
                }
                
                if (a.desktopCpuAvg > 0) {
                    groupedByDate[dateStr].desktopSum += a.desktopCpuAvg;
                    groupedByDate[dateStr].desktopCount++;
                }
                if (a.mobileCpuAvg > 0) {
                    groupedByDate[dateStr].mobileSum += a.mobileCpuAvg;
                    groupedByDate[dateStr].mobileCount++;
                }
            });

            return Object.entries(groupedByDate).map(([date, stats]) => {
                const dateObj = new Date(date);
                const dateStr = dateObj.toISOString().split('T')[0];
                const comment = comments.find(c => c.date.toISOString().split('T')[0] === dateStr);

                return {
                    date: dateObj,
                    desktopCpuAvg: stats.desktopCount ? Math.round(stats.desktopSum / stats.desktopCount) : 0,
                    mobileCpuAvg: stats.mobileCount ? Math.round(stats.mobileSum / stats.mobileCount) : 0,
                    comment: comment ? { id: comment.id, text: comment.text } : null
                };
            }).sort((a, b) => a.date.getTime() - b.date.getTime());

        } else if (entityType === 'ACCOUNT') {
            // 1. Get all domains in account
            const domains = await prisma.domain.findMany({
                where: { accountId: entityId },
                include: { pages: { select: { id: true } } }
            });

            // Fetch comments for this account
            const comments = await prisma.comment.findMany({
                where: { accountId: entityId }
            });

            // We need to calculate daily avg for EACH domain first, then avg those.
            // This is getting heavy. Let's fetch all analyses for all pages in the account.
            const allPageIds = domains.flatMap(d => d.pages.map(p => p.id));
            
            const analyses = await prisma.dailyAnalysis.findMany({
                where: {
                    ...where,
                    pageId: { in: allPageIds }
                },
                include: { page: true } // to know which domain it belongs to
            });

            // Group by Date -> Domain -> Analyses
            const grouped: Record<string, Record<string, { desktop: number[], mobile: number[] }>> = {};

            analyses.forEach(a => {
                const dateStr = a.date.toISOString().split('T')[0];
                const domainId = a.page.domainId;

                if (!grouped[dateStr]) grouped[dateStr] = {};
                if (!grouped[dateStr][domainId]) grouped[dateStr][domainId] = { desktop: [], mobile: [] };

                if (a.desktopCpuAvg > 0) grouped[dateStr][domainId].desktop.push(a.desktopCpuAvg);
                if (a.mobileCpuAvg > 0) grouped[dateStr][domainId].mobile.push(a.mobileCpuAvg);
            });

            // Calculate averages
            return Object.entries(grouped).map(([date, domainsMap]) => {
                const domainAverages = Object.values(domainsMap).map(d => ({
                    desktop: d.desktop.length ? d.desktop.reduce((a,b)=>a+b,0)/d.desktop.length : 0,
                    mobile: d.mobile.length ? d.mobile.reduce((a,b)=>a+b,0)/d.mobile.length : 0
                }));

                // Filter out domains with 0 avg for that day (if that's the requirement "if a domain has 0 is excluded")
                const validDesktopDomains = domainAverages.filter(d => d.desktop > 0);
                const validMobileDomains = domainAverages.filter(d => d.mobile > 0);

                const dateObj = new Date(date);
                const dateStr = dateObj.toISOString().split('T')[0];
                const comment = comments.find(c => c.date.toISOString().split('T')[0] === dateStr);

                return {
                    date: dateObj,
                    desktopCpuAvg: validDesktopDomains.length ? Math.round(validDesktopDomains.reduce((s, d) => s + d.desktop, 0) / validDesktopDomains.length) : 0,
                    mobileCpuAvg: validMobileDomains.length ? Math.round(validMobileDomains.reduce((s, d) => s + d.mobile, 0) / validMobileDomains.length) : 0,
                    comment: comment ? { id: comment.id, text: comment.text } : null
                };
            }).sort((a, b) => a.date.getTime() - b.date.getTime());
        }
        
        return [];
    }
  },
  Account: {
      stats: async (parent: any, { tool }: any) => {
          // Get all pages for this account
          const domains = await prisma.domain.findMany({
              where: { accountId: parent.id },
              include: { pages: { select: { id: true } } }
          });
          const pageIds = domains.flatMap(d => d.pages.map(p => p.id));
          
          if (pageIds.length === 0) return { date: new Date(), desktopCpuAvg: 0, mobileCpuAvg: 0 };

          // Get latest analysis for each page
          // We can't easily do "latest per group" in Prisma in one query without raw SQL
          // So we'll fetch all analyses for these pages and filter in JS (not efficient for huge datasets but fine here)
          const analyses = await prisma.dailyAnalysis.findMany({
              where: { 
                  pageId: { in: pageIds },
                  tool
              },
              orderBy: { date: 'desc' }
          });

          // Map pageId -> latest analysis
          const latestByPage = new Map();
          analyses.forEach(a => {
              if (!latestByPage.has(a.pageId)) {
                  latestByPage.set(a.pageId, a);
              }
          });

          const validDesktop = Array.from(latestByPage.values()).filter(a => a.desktopCpuAvg > 0);
          const validMobile = Array.from(latestByPage.values()).filter(a => a.mobileCpuAvg > 0);

          const desktopAvg = validDesktop.length 
              ? Math.round(validDesktop.reduce((sum, a) => sum + a.desktopCpuAvg, 0) / validDesktop.length) 
              : 0;
              
          const mobileAvg = validMobile.length 
              ? Math.round(validMobile.reduce((sum, a) => sum + a.mobileCpuAvg, 0) / validMobile.length) 
              : 0;

          return { 
              date: new Date(), 
              desktopCpuAvg: desktopAvg, 
              mobileCpuAvg: mobileAvg 
          }; 
      }
  },
  Domain: {
      stats: async (parent: any, { tool }: any) => {
          const pages = await prisma.page.findMany({
              where: { domainId: parent.id },
              select: { id: true }
          });
          const pageIds = pages.map(p => p.id);
          
          if (pageIds.length === 0) return { date: new Date(), desktopCpuAvg: 0, mobileCpuAvg: 0 };

          const analyses = await prisma.dailyAnalysis.findMany({
              where: { 
                  pageId: { in: pageIds },
                  tool
              },
              orderBy: { date: 'desc' }
          });

          const latestByPage = new Map();
          analyses.forEach(a => {
              if (!latestByPage.has(a.pageId)) {
                  latestByPage.set(a.pageId, a);
              }
          });

          const validDesktop = Array.from(latestByPage.values()).filter(a => a.desktopCpuAvg > 0);
          const validMobile = Array.from(latestByPage.values()).filter(a => a.mobileCpuAvg > 0);

          const desktopAvg = validDesktop.length 
              ? Math.round(validDesktop.reduce((sum, a) => sum + a.desktopCpuAvg, 0) / validDesktop.length) 
              : 0;
              
          const mobileAvg = validMobile.length 
              ? Math.round(validMobile.reduce((sum, a) => sum + a.mobileCpuAvg, 0) / validMobile.length) 
              : 0;

          return { 
              date: new Date(), 
              desktopCpuAvg: desktopAvg, 
              mobileCpuAvg: mobileAvg 
          };
      }
  },
  Page: {
      stats: async (parent: any, { tool }: any) => {
          const latest = await prisma.dailyAnalysis.findFirst({
              where: { pageId: parent.id, tool },
              orderBy: { date: 'desc' }
          });
          if (!latest) return { date: new Date(), desktopCpuAvg: 0, mobileCpuAvg: 0 };
          return latest;
      }
  },
  Mutation: {
    triggerAnalysis: async (_: any, { pageId, tool }: any) => {
        const page = await prisma.page.findUnique({ 
            where: { id: pageId },
            include: { domain: true }
        });
        if (!page) throw new Error('Page not found');
        
        const domain = page.domain as any;
        let scriptUrl = domain.selfHostingUrl;
        
        if (!scriptUrl) {
            const sitecode = page.sitecode || domain.sitecode;
            if (sitecode) {
                if (sitecode.includes('/') || sitecode.endsWith('.js')) {
                    scriptUrl = sitecode;
                } else {
                    scriptUrl = `https://static.kameleoon.com/css/customers/${sitecode}/0/kameleoon.js`;
                }
            }
        }

        const job = await analysisQueue.add('analyze', {
            pageId,
            url: page.url,
            tool,
            scriptUrl,
            cookieConsentCode: domain.cookieConsentCode
        });
        
        return {
            jobId: job.id,
            status: 'queued'
        };
    },
    cancelAnalysis: async (_: any, { jobId }: { jobId: string }) => {
        const job = await Job.fromId(analysisQueue, jobId);
        if (job) {
            // Mark as cancelled in data so worker can check it even if queue state is messy
            await job.updateData({ ...job.data, cancelled: true });

            // If active, this might not stop the worker immediately, but it will prevent next steps
            // We can try to discard it or move to failed
            try {
                await job.discard(); // Remove from queue if waiting
            } catch (e) {
                console.log('Could not discard job (maybe active):', e);
            }
            
            // If it's active, we can't force kill the worker thread easily from here,
            // but moving to failed might signal the worker if it checks status.
            // However, standard BullMQ pattern is just to rely on job.isActive() in worker.
            // We should ensure the job state reflects it's not needed.
            
            // Important: If we move to failed, the worker's job.isActive() returns false?
            // Actually, job.isActive() checks if the job is in the 'active' set in Redis.
            // If we move it to failed, it is removed from active.
            // await job.moveToFailed(new Error('Cancelled by user'), '0');
            return true;
        }
        return false;
    },
    
    // Account CRUD
    createAccount: async (_: any, { input }: any) => prisma.account.create({ data: input }),
    updateAccount: async (_: any, { id, input }: any) => prisma.account.update({ where: { id }, data: input }),
    deleteAccount: async (_: any, { id }: any) => {
        await prisma.account.delete({ where: { id } });
        return true;
    },

    // Domain CRUD
    createDomain: async (_: any, { input }: any) => {
        // Ensure sitecode is null if empty string
        const data = { ...input };
        if (data.sitecode === '') data.sitecode = null;
        return prisma.domain.create({ data });
    },
    updateDomain: async (_: any, { id, input }: any) => {
        const data = { ...input };
        if (data.sitecode === '') data.sitecode = null;
        return prisma.domain.update({ where: { id }, data });
    },
    deleteDomain: async (_: any, { id }: any) => {
        await prisma.domain.delete({ where: { id } });
        return true;
    },

    // Page CRUD
    createPage: async (_: any, { input }: any) => prisma.page.create({ data: input }),
    updatePage: async (_: any, { id, input }: any) => prisma.page.update({ where: { id }, data: input }),
    deletePage: async (_: any, { id }: any) => {
        await prisma.page.delete({ where: { id } });
        return true;
    },

    // Comments
    addComment: async (_: any, { input }: any) => {
        const data: any = {
            text: input.text,
            date: new Date(input.date)
        };
        if (input.entityType === 'ACCOUNT') data.accountId = input.entityId;
        if (input.entityType === 'DOMAIN') data.domainId = input.entityId;
        if (input.entityType === 'PAGE') data.pageId = input.entityId;
        
        return prisma.comment.create({ data });
    },
    deleteComment: async (_: any, { id }: any) => {
        await prisma.comment.delete({ where: { id } });
        return true;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function start() {
    // Start Scheduler
    const scheduler = new Scheduler(analysisQueue);
    scheduler.start();

    const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 },
    });
    console.log(`🚀  Server ready at: ${url}`);
}

start();
