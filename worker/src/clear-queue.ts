import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const queue = new Queue('lighthouse-analysis', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});

async function clear() {
    console.log('Connecting to Redis...');
    console.log('Clearing "lighthouse-analysis" queue...');
    
    // Drains the queue (removes waiting/delayed)
    await queue.drain();
    
    // Completely removes the queue and all jobs (active, completed, failed)
    await queue.obliterate({ force: true });
    
    console.log('Queue cleared successfully!');
    process.exit(0);
}

clear().catch(err => {
    console.error('Failed to clear queue:', err);
    process.exit(1);
});
