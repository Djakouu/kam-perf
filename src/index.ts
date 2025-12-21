import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runLighthouse } from './runLighthouse.js';
import { parseBootupTime } from './parseBootupTime.js';
import { mapScriptsToEntities } from './mapScriptsToEntities.js';
import { storeResult } from './storeResults.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .command('mobile', 'Run analysis with mobile emulation (default)')
    .command('desktop', 'Run analysis with desktop emulation')
    .option('url', {
      alias: 'u',
      type: 'string',
      description: 'URL to analyze',
      demandOption: true,
    })
    .option('raw', {
      alias: 'r',
      type: 'boolean',
      description: 'Export raw Lighthouse CPU data to a file',
      default: false,
    })
    .help()
    .argv;

  const url = argv.url;
  const mode = argv._.includes('desktop') ? 'desktop' : 'mobile';

  console.error(`Running Lighthouse (${mode}) for ${url}...`); // Use stderr for logs so stdout can be piped JSON

  try {
    const lhr = await runLighthouse(url, mode);

    if (argv.raw) {
      const rawPath = path.resolve('lighthouse-cpu-raw.json');
      fs.writeFileSync(rawPath, JSON.stringify(lhr.audits['bootup-time'], null, 2));
      console.error(`Raw CPU data written to ${rawPath}`);
    }

    const scripts = parseBootupTime(lhr);
    const entities = mapScriptsToEntities(scripts);

    const output = {
      url: url,
      entities: entities
    };

    console.log(JSON.stringify(output, null, 2));

    // Calculate total CPU time for all detected entities
    const totalEntityCpuTime = Object.values(entities).reduce((acc, entity) => acc + entity.cpuTimeMs, 0);
    storeResult(url, mode, totalEntityCpuTime);

  } catch (error) {
    console.error('Error running analysis:', error);
    process.exit(1);
  }
}

main();
