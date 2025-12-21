import 'dotenv/config';
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { runLighthouse, launchChrome } from './lighthouse/runLighthouse';
import { parseBootupTime } from './lighthouse/parseBootupTime';
import { mapScriptsToEntities } from './lighthouse/mapScriptsToEntities';

const prisma = new PrismaClient();

const worker = new Worker('lighthouse-analysis', async job => {
    if (job.data.cancelled) {
        console.log(`[Job ${job.id}] Job marked as cancelled in data. Skipping.`);
        return;
    }

    if (!(await job.isActive())) {
        console.log(`[Job ${job.id}] Job cancelled before start.`);
        return;
    }

    console.log(`[Job ${job.id}] Processing job for ${job.data.url} (picked up from queue)`);
    
    const { pageId, url, tool, scriptUrl, cookieConsentCode } = job.data;
    
    // 1. URL Normalization
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
    }

    const runs = process.env.NODE_ENV === 'production' ? 5 : 1;
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
        const performRun = async (type: 'desktop' | 'mobile', useInjection: boolean) => {
            if (!(await job.isActive())) {
                console.log(`[Job ${job.id}] Job cancelled.`);
                throw new Error('Job cancelled');
            }
            
            const currentScriptUrl = useInjection ? scriptUrl : undefined;
            const lhr = await runLighthouse(targetUrl, type, port, currentScriptUrl, cookieConsentCode);
            const scripts = parseBootupTime(lhr, currentScriptUrl);
            const entities = mapScriptsToEntities(scripts);
            const cpuTime = entities[entityName]?.cpuTimeMs || 0;
            
            return { cpuTime, hasTool: cpuTime > 0 };
        };

        let desktopCpuTotal = 0;
        let mobileCpuTotal = 0;
        let useInjection = false;
        let detected = false;

        const checkCancelled = async () => {
            // Check data flag first
            if (job.data.cancelled) {
                 console.log(`[Job ${job.id}] Job cancelled (data flag).`);
                 throw new Error('Job cancelled');
            }

            // We need to check if the job is still active in the queue
            // job.isActive() returns true if the job is currently being processed by this worker
            // BUT if we moved it to failed in the API, we need to detect that.
            // The most reliable way is to check the job status from the queue, but we don't have the queue instance here easily.
            // However, job.isActive() SHOULD return false if the job is no longer in the active set in Redis.
            
            const isActive = await job.isActive();
            if (!isActive) {
                console.log(`[Job ${job.id}] Job cancelled (isActive=false).`);
                throw new Error('Job cancelled');
            }
        };

        // Step 1: Probe Run (Run 1) - Natural Detection
        console.log(`[Job ${job.id}] Starting Probe Run (Natural)...`);
        await checkCancelled();
        await updateStatus('Starting Probe Run (Natural)...');
        
        // Desktop Probe
        console.log(`Desktop Probe Run 1/${runs}`);
        await checkCancelled();
        await updateStatus(`Desktop Probe Run 1/${runs}`);
        await job.updateProgress(10);
        const dProbe = await performRun('desktop', false);
        
        // Mobile Probe
        console.log(`Mobile Probe Run 1/${runs}`);
        await checkCancelled();
        await updateStatus(`Mobile Probe Run 1/${runs}`);
        await job.updateProgress(20);
        const mProbe = await performRun('mobile', false);

        if (dProbe.hasTool || mProbe.hasTool) {
            console.log(`[Job ${job.id}] Tool detected naturally.`);
            await updateStatus('Tool detected naturally.');
            detected = true;
            desktopCpuTotal += dProbe.cpuTime;
            mobileCpuTotal += mProbe.cpuTime;
        } else {
            console.log(`[Job ${job.id}] Tool NOT detected naturally.`);
            if (scriptUrl) {
                console.log(`[Job ${job.id}] Switching to injection mode.`);
                await updateStatus('Tool NOT detected naturally. Switching to injection mode.');
                useInjection = true;
                // We discard the probe results because we want to measure WITH the script
            } else {
                // No scriptUrl available, so we accept the 0s
                await updateStatus('Tool NOT detected naturally. No script URL provided.');
                desktopCpuTotal += dProbe.cpuTime;
                mobileCpuTotal += mProbe.cpuTime;
            }
        }

        // Step 2: Remaining Runs or Full Retry
        const startRun = useInjection ? 0 : 1; // If injection, start from 0 (full retry). If natural, start from 1 (continue).
        
        // Desktop Loop
        for (let i = startRun; i < runs; i++) {
            await checkCancelled();
            const msg = `Desktop Run ${i+1}/${runs} ${useInjection ? '(Injection)' : ''}`;
            console.log(msg);
            await updateStatus(msg);
            await job.updateProgress(30 + Math.round((i / runs) * 30));
            const res = await performRun('desktop', useInjection);
            desktopCpuTotal += res.cpuTime;
        }

        // Mobile Loop
        for (let i = startRun; i < runs; i++) {
            await checkCancelled();
            const msg = `Mobile Run ${i+1}/${runs} ${useInjection ? '(Injection)' : ''}`;
            console.log(msg);
            await updateStatus(msg);
            await job.updateProgress(60 + Math.round((i / runs) * 30));
            const res = await performRun('mobile', useInjection);
            mobileCpuTotal += res.cpuTime;
        }

        const desktopAvg = runs > 0 ? desktopCpuTotal / runs : 0;
        const mobileAvg = runs > 0 ? mobileCpuTotal / runs : 0;

        console.log(`Job ${job.id} completed ${useInjection ? '(with injection)' : ''}. Desktop: ${desktopAvg}ms, Mobile: ${mobileAvg}ms`);
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
                    runCount: runs
                },
                create: {
                    pageId,
                    date: new Date(),
                    tool,
                    desktopCpuAvg: desktopAvg,
                    mobileCpuAvg: mobileAvg,
                    runCount: runs
                }
            });
        }

        await job.updateProgress(100);

    } catch (error: any) {
        console.error(`[Job ${job.id}] Error:`, error);
        if (error.message === 'Job cancelled') return;
        
        // Update status so user sees it
        await job.updateData({ ...job.data, statusMessage: `Error: ${error.message}` });
        
        throw error;
    } finally {
        if (chrome) {
            await chrome.kill();
        }
    }
}, {
    connection: process.env.REDIS_URL ? {
        url: process.env.REDIS_URL
    } : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    }
});

console.log('Worker started...');
