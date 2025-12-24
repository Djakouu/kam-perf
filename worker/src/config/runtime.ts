import 'dotenv/config';

export const runtimeConfig = {
  // Concurrency
  concurrency: parseInt(process.env.CONCURRENCY || '1', 10),

  // Kill Switches
  pauseLighthouse: process.env.PAUSE_LIGHTHOUSE === 'true',
};
