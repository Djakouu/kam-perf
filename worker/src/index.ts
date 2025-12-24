import 'dotenv/config';
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { runLighthouse, launchChrome } from './lighthouse/runLighthouse';
import { parseBootupTime } from './lighthouse/parseBootupTime';
import { mapScriptsToEntities } from './lighthouse/mapScriptsToEntities';
import http from 'http';
import { runtimeConfig } from './config/runtime';
import os from 'os';

// Start a dummy HTTP server to satisfy Render's port requirement
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Worker is running');
}).listen(port, () => {
    console.log(`Worker health check server listening on port ${port}`);
});

const prisma = new PrismaClient();

// Calculate concurrency
// Reserve 512MB for OS/Node, then 1GB per Chrome
const RESERVED_RAM = 512 * 1024 * 1024;
const RAM_PER_CHROME = 1024 * 1024 * 1024; // 1GB approx
const availableRam = os.totalmem();
const dynamicConcurrency = Math.max(1, Math.floor((availableRam - RESERVED_RAM) / RAM_PER_CHROME));
const concurrency = runtimeConfig.concurrency || dynamicConcurrency;

console.log(`[Worker] Starting with concurrency: ${concurrency}`);

const worker = new Worker('lighthouse-analysis', async job => {
    if (runtimeConfig.pauseLighthouse) {
        console.log('[Worker] Lighthouse paused via PAUSE_LIGHTHOUSE');
        // Wait 4 minutes before retrying
        await job.moveToDelayed(Date.now() + 4 * 60 * 1000, job.token);
        return;
    }

    if (job.data.cancelled) {
        console.log(`[Job ${job.id}] Job marked as cancelled in data. Skipping.`);
        return;
    }

    if (!(await job.isActive())) {
        console.log(`[Job ${job.id}] Job cancelled before start.`);
        return;
    }

    console.log(`[Job ${job.id}] Processing job for ${job.data.url} (picked up from queue)`);
    
    const { pageId, url, tool, scriptUrl, cookieConsentCode, consentStrategy } = job.data;
    
    // 1. URL Normalization
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
    }

    const isProd = process.env.NODE_ENV === 'production';
    // In Prod: 1 Probe + 5 Extra = 6 Total. In Dev: 1 Probe + 0 Extra = 1 Total.
    const extraRuns = isProd ? 5 : 0;
    
    let chrome;
    
    try {
        chrome = await launchChrome();
        const port = chrome.port;

        console.log(`Running analysis for ${targetUrl}...`);
        
        const entityName = 'Kameleoon';

        const updateStatus = async (msg: string) => {
            await job.updateData({ ...job.data, statusMessage: msg });
        };

        // Helper function to perform a single run
        const performRun = async (type: 'desktop' | 'mobile', useInjection: boolean, runCookieConsent: boolean) => {
            if (!(await job.isActive())) {
                console.log(`[Job ${job.id}] Job cancelled.`);
                throw new Error('Job cancelled');
            }
            
            const currentScriptUrl = useInjection ? scriptUrl : undefined;
            // Only pass cookieConsentCode if runCookieConsent is true
            const currentCookieConsent = runCookieConsent ? cookieConsentCode : undefined;
            
            const lhr = await runLighthouse(targetUrl, type, port, currentScriptUrl, currentCookieConsent, consentStrategy);
            const scripts = parseBootupTime(lhr, currentScriptUrl);
            const entities = mapScriptsToEntities(scripts);
            const cpuTime = entities[entityName]?.cpuTimeMs || 0;
            
            return { cpuTime, hasTool: cpuTime > 0 };
        };

        let desktopCpuTotal = 0;
        let mobileCpuTotal = 0;
        let desktopRunsCount = 0;
        let mobileRunsCount = 0;
        let useInjection = false;

        const checkCancelled = async () => {
            // Check data flag first
            if (job.data.cancelled) {
                 console.log(`[Job ${job.id}] Job cancelled (data flag).`);
                 throw new Error('Job cancelled');
            }

            const isActive = await job.isActive();
            if (!isActive) {
                console.log(`[Job ${job.id}] Job cancelled (isActive=false).`);
                throw new Error('Job cancelled');
            }
        };

        // --- DESKTOP ANALYSIS ---
        console.log(`[Job ${job.id}] Starting Desktop Probe Run...`);
        await checkCancelled();
        await updateStatus('Starting Desktop Probe Run...');
        await job.updateProgress(10);
        
        // Run cookie consent only on the first run (Probe)
        const dProbe = await performRun('desktop', false, true);
        desktopCpuTotal += dProbe.cpuTime;
        desktopRunsCount++;

        let desktopDetected = dProbe.hasTool;
        
        if (desktopDetected) {
            if (isProd) {
                console.log(`[Job ${job.id}] Tool detected on Desktop (Natural). Running ${extraRuns} extra runs...`);
                for (let i = 0; i < extraRuns; i++) {
                    await checkCancelled();
                    const msg = `Desktop Run ${i+2}/${extraRuns + 1}`;
                    console.log(msg);
                    await updateStatus(msg);
                    await job.updateProgress(10 + Math.round(((i + 1) / extraRuns) * 20)); // 10-30%
                    // No cookie consent for extra runs
                    const res = await performRun('desktop', false, false);
                    desktopCpuTotal += res.cpuTime;
                    desktopRunsCount++;
                }
            } else {
                console.log(`[Job ${job.id}] Tool detected on Desktop (Natural). Dev mode, skipping extra runs.`);
            }
        } else {
             console.log(`[Job ${job.id}] Tool NOT detected on Desktop. Skipping extra runs.`);
        }

        // --- MOBILE ANALYSIS ---
        try {
            console.log(`[Job ${job.id}] Starting Mobile Probe Run...`);
            await checkCancelled();
            await updateStatus('Starting Mobile Probe Run...');
            await job.updateProgress(50);

            // Run cookie consent again for Mobile Probe (first run)
            const mProbe = await performRun('mobile', false, true);
            mobileCpuTotal += mProbe.cpuTime;
            mobileRunsCount++;

            let mobileDetected = mProbe.hasTool;

            if (mobileDetected) {
                if (isProd) {
                    console.log(`[Job ${job.id}] Tool detected on Mobile (Natural). Running ${extraRuns} extra runs...`);
                    for (let i = 0; i < extraRuns; i++) {
                        await checkCancelled();
                        const msg = `Mobile Run ${i+2}/${extraRuns + 1}`;
                        console.log(msg);
                        await updateStatus(msg);
                        await job.updateProgress(50 + Math.round(((i + 1) / extraRuns) * 40)); // 50-90%
                        // No cookie consent for extra runs
                        const res = await performRun('mobile', false, false);
                        mobileCpuTotal += res.cpuTime;
                        mobileRunsCount++;
                    }
                } else {
                    console.log(`[Job ${job.id}] Tool detected on Mobile (Natural). Dev mode, skipping extra runs.`);
                }
            } else {
                 console.log(`[Job ${job.id}] Tool NOT detected on Mobile. Skipping extra runs.`);
            }
        } catch (mobileError: any) {
            if (mobileError.message === 'Job cancelled') throw mobileError;
            console.error(`[Job ${job.id}] Mobile analysis failed:`, mobileError);
            await updateStatus(`Mobile analysis failed: ${mobileError.message}`);
            // We continue to save whatever we have (Desktop results)
        }

        const desktopAvg = desktopRunsCount > 0 ? desktopCpuTotal / desktopRunsCount : 0;
        const mobileAvg = mobileRunsCount > 0 ? mobileCpuTotal / mobileRunsCount : 0;
        const totalRuns = desktopRunsCount + mobileRunsCount;

        console.log(`Job ${job.id} completed. Desktop: ${desktopAvg}ms (${desktopRunsCount} runs), Mobile: ${mobileAvg}ms (${mobileRunsCount} runs)`);
        await updateStatus('Analysis Completed');

        if (await job.isActive()) {
            await prisma.dailyAnalysis.upsert({
                where: {
                    pageId_date_tool: {
                        pageId,
                        date: new Date(),
                        tool
                    }
                },
                update: {
                    desktopCpuAvg: desktopAvg,
                    mobileCpuAvg: mobileAvg,
                    runCount: totalRuns
                },
                create: {
                    pageId,
                    date: new Date(),
                    tool,
                    desktopCpuAvg: desktopAvg,
                    mobileCpuAvg: mobileAvg,
                    runCount: totalRuns
                }
            });

            // Update Page status on success
            await prisma.page.update({
                where: { id: pageId },
                data: {
                    lastAnalyzedAt: new Date(),
                    lastAttemptedAt: new Date(),
                    failureCount: 0,
                    lastError: null
                }
            });
        }

        await job.updateProgress(100);

    } catch (error: any) {
        console.error(`[Job ${job.id}] Error:`, error);
        if (error.message === 'Job cancelled') return;
        
        // Update status so user sees it
        await job.updateData({ ...job.data, statusMessage: `Error: ${error.message}` });
        
        // Update Page with failure info
        try {
            await prisma.page.update({
                where: { id: pageId },
                data: {
                    failureCount: { increment: 1 },
                    lastError: error.message,
                    lastAttemptedAt: new Date()
                }
            });
        } catch (dbError) {
            console.error(`[Job ${job.id}] Failed to update page failure status:`, dbError);
        }

        throw error;
    } finally {
        if (chrome) {
            await chrome.kill();
        }
    }
}, {
    concurrency,
    connection: process.env.REDIS_URL ? {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
    } : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    }
} as any);

console.log('Worker started...');
