import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { runtimeConfig } from './config/runtime';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export class Scheduler {
  private queue: Queue;
  private isRunning: boolean = false;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  async start() {
    console.log('[Scheduler] Starting scheduler loop...');
    // Run every hour
    setInterval(() => this.run(), 60 * 60 * 1000);
    // Run immediately on start
    this.run();
  }

  async run() {
    // Simple lock check (in-memory for single instance, but good practice to mention Redis for distributed)
    if (this.isRunning) {
      console.log('[Scheduler] Previous run still in progress, skipping.');
      return;
    }

    // Distributed Lock Check (using Redis via BullMQ connection if available, or just a key check)
    // Since we have the queue, we can use a job as a lock or a simple redis key if we had the client exposed.
    // For now, we'll rely on single-instance deployment or assume the user will scale workers but not API.
    // If API is scaled, this needs a real Redis lock: `SET scheduler-lock true NX EX 300`

    this.isRunning = true;

    try {
      if (runtimeConfig.disableScheduler) {
        console.log('[Scheduler] Disabled via DISABLE_SCHEDULER');
        return;
      }

      /* 
      // Temporarily disabled time window check to allow immediate scheduling for testing
      if (!this.isWithinTimeWindow()) {
        console.log('[Scheduler] Outside of allowed time window (00:00-09:00 FR time or Weekend). Skipping.');
        return;
      }
      */

      await this.scheduleBatch();

    } catch (error) {
      console.error('[Scheduler] Error during scheduling run:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private isWithinTimeWindow(): boolean {
    const now = DateTime.now().setZone('Europe/Paris');
    const isWeekend = now.weekday >= 6; // 6 = Saturday, 7 = Sunday
    const hour = now.hour;

    // Allow if weekend OR between 00:00 and 09:00
    return isWeekend || (hour >= 0 && hour < 9);
  }

  private async scheduleBatch() {
    // 1. Calculate Batch Size
    const totalPages = await prisma.page.count();
    const targetCycleDays = runtimeConfig.targetCycleDays || 15;
    
    // Daily target
    const rawDailyBatch = Math.ceil(totalPages / targetCycleDays);
    
    // Clamp
    const dailyBatch = Math.min(
      Math.max(rawDailyBatch, runtimeConfig.minDailyBatch || 1),
      runtimeConfig.maxDailyBatch
    );

    console.log(`[Scheduler] Total pages: ${totalPages}, Target cycle: ${targetCycleDays} days`);
    console.log(`[Scheduler] Calculated daily batch: ${dailyBatch}`);

    // We run hourly, so we should schedule a fraction of the daily batch?
    // OR we just schedule the whole daily batch once a day?
    // The user said "DailyBatch = ...". If we run hourly, we need to be careful not to over-schedule.
    // A simple approach: Check how many we've scheduled/analyzed in the last 24h?
    // Better: Just pick the 'dailyBatch' number of pages that haven't been analyzed recently.
    // But if we run this every hour, we might schedule 'dailyBatch' * 24 pages.
    
    // Let's refine: The requirement is "Smart Recurring Analysis".
    // If we want to spread it out over the window (0-9am = 9 hours), we could divide dailyBatch by 9.
    // OR we can just find pages that need analysis and limit to dailyBatch.
    // But we need to ensure we don't exceed the daily cap *globally* for the day.
    
    // Let's check how many were analyzed/scheduled "today" (since midnight FR time).
    const startOfDay = DateTime.now().setZone('Europe/Paris').startOf('day').toJSDate();
    
    // Check queue size to prevent over-queuing
    const waitingCount = await this.queue.getWaitingCount();
    const activeCount = await this.queue.getActiveCount();
    const totalInFlight = waitingCount + activeCount;
    const MAX_QUEUE_SIZE = 100; // Safety cap

    if (totalInFlight > MAX_QUEUE_SIZE) {
        console.log(`[Scheduler] Queue is full (${totalInFlight} jobs). Skipping scheduling.`);
        return;
    }

    const analyzedTodayCount = await prisma.dailyAnalysis.count({
        where: {
            createdAt: {
                gte: startOfDay
            }
        }
    });

    // Also check queued jobs? It's hard to count queued jobs by "day" easily without checking the queue.
    // But we can check 'lastAttemptedAt' on Page if we update it when queuing (or when worker picks it up).
    // The user said: "Update lastAttemptedAt" -> usually done when job starts or fails.
    
    // Let's stick to a simpler logic for now:
    // Find pages that haven't been analyzed in the last 'targetCycleDays' days (or never).
    // Limit the query to 'dailyBatch'.
    // BUT we need to respect the MAX_DAILY_BATCH.
    
    // If we already analyzed 'dailyBatch' pages today, stop.
    if (analyzedTodayCount >= dailyBatch) {
        console.log(`[Scheduler] Daily limit reached (${analyzedTodayCount}/${dailyBatch}). Skipping.`);
        return;
    }

    const remainingQuota = dailyBatch - analyzedTodayCount;
    
    // Find pages to analyze
    // Criteria:
    // 1. Not analyzed recently (older than targetCycleDays)
    // 2. Not attempted recently (to avoid retry storms in the same day) - e.g. last 24h
    // 3. Not failed too many times (e.g. < 5 failures) OR failed long ago (cooldown)
    
    const cutoffDate = DateTime.now().minus({ days: targetCycleDays }).toJSDate();
    const retryCutoff = DateTime.now().minus({ hours: 24 }).toJSDate();
    const failureCooldown = DateTime.now().minus({ days: 7 }).toJSDate();

    const pagesToAnalyze = await prisma.page.findMany({
        where: {
            OR: [
                { lastAnalyzedAt: null },
                { lastAnalyzedAt: { lt: cutoffDate } }
            ],
            AND: [
                {
                    OR: [
                        { lastAttemptedAt: null },
                        { lastAttemptedAt: { lt: retryCutoff } }
                    ]
                },
                {
                    OR: [
                        { failureCount: { lt: 5 } }, // Retry up to 5 times
                        { lastAttemptedAt: { lt: failureCooldown } } // Or retry after 7 days cooldown
                    ]
                }
            ]
        },
        take: remainingQuota,
        orderBy: {
            lastAnalyzedAt: 'asc' // Oldest first
        }
    });

    if (pagesToAnalyze.length === 0) {
        console.log('[Scheduler] No pages need analysis.');
        return;
    }

    console.log(`[Scheduler] Scheduling ${pagesToAnalyze.length} pages...`);

    for (const page of pagesToAnalyze) {
        await this.queue.add('analyze', {
            pageId: page.id,
            url: page.url,
            tool: 'KAMELEOON', // Default or derived?
            // Add other necessary data
        }, {
            jobId: `analysis-${page.id}-${DateTime.now().toFormat('yyyy-MM-dd')}`, // Deduplication
            removeOnComplete: true,
            removeOnFail: 100
        });
        
        // Optionally update lastAttemptedAt here to prevent double scheduling if the worker is slow?
        // Better to let the worker handle it, or update it here as "scheduled".
        // User said: "Update lastAttemptedAt" in the context of failures, but it's good for tracking attempts.
        // Let's leave it to the worker for now to be accurate about "attempt".
    }
    
    // Metrics logging
    const jobCounts = await this.queue.getJobCounts();
    console.log('[Scheduler] Queue metrics:', jobCounts);
  }
}
