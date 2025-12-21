import { runLighthouse } from './lighthouse/runLighthouse';
import { parseBootupTime } from './lighthouse/parseBootupTime';
import { mapScriptsToEntities } from './lighthouse/mapScriptsToEntities';

async function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    // Expected format: [mobile|desktop] [runs] --url=[url]
    
    const urlArg = args.find(a => a.startsWith('--url='));
    const formFactor = args.includes('desktop') ? 'desktop' : 'mobile';
    
    // Find the number of runs (first number found that isn't part of a flag)
    const runsArg = args.find(a => !a.startsWith('--') && !isNaN(parseInt(a)) && a !== 'mobile' && a !== 'desktop');
    const runs = runsArg ? parseInt(runsArg) : 1;

    if (!urlArg) {
        console.error('Error: URL is required.');
        console.log('Usage: npm run cli [mobile|desktop] [runs] -- --url=<url>');
        console.log('Example: npm run cli mobile 1 -- --url=https://www.toyota.fr/');
        process.exit(1);
    }

    const url = urlArg.split('=')[1];

    console.log(`Starting Manual Analysis`);
    console.log(`URL: ${url}`);
    console.log(`Device: ${formFactor}`);
    console.log(`Runs: ${runs}`);
    console.log('----------------------------------------');

    for (let i = 0; i < runs; i++) {
        console.log(`\nRun ${i + 1}/${runs}...`);
        const startTime = Date.now();
        
        try {
            const lhr = await runLighthouse(url, formFactor);
            const scripts = parseBootupTime(lhr);
            const entities = mapScriptsToEntities(scripts);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`Completed in ${duration}s`);
            
            console.log('Third Party Scripts Impact:');
            Object.entries(entities).forEach(([name, stats]: [string, any]) => {
                if (stats.cpuTimeMs > 0) {
                    console.log(`- ${name}: ${stats.cpuTimeMs.toFixed(2)} ms`);
                }
            });

        } catch (error) {
            console.error(`Run ${i + 1} failed:`, error);
        }
    }
}

main().catch(console.error);
