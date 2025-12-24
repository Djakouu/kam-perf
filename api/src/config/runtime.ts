import 'dotenv/config';

export const runtimeConfig = {
  // Concurrency
  concurrency: parseInt(process.env.CONCURRENCY || '1', 10),

  // Kill Switches
  disableScheduler: process.env.DISABLE_SCHEDULER === 'true',
  pauseLighthouse: process.env.PAUSE_LIGHTHOUSE === 'true',
  
  // Safety Limits
  maxDailyBatch: parseInt(process.env.MAX_DAILY_BATCH || '500', 10),
  minDailyBatch: parseInt(process.env.MIN_DAILY_BATCH || '1', 10),
  
  // Cycle Target (days to cover entire DB)
  targetCycleDays: parseInt(process.env.TARGET_CYCLE_DAYS || '15', 10),
};
