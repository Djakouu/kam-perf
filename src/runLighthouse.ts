import * as chromeLauncher from 'chrome-launcher';
// @ts-ignore
import lighthouse from 'lighthouse';

export async function runLighthouse(url: string, formFactor: 'mobile' | 'desktop' = 'mobile') {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  const flags = {
    logLevel: 'info' as 'info',
    output: 'json' as 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  };

  const mobileConfig = {
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 360,
      height: 640,
      deviceScaleFactor: 2.625,
      disabled: false,
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    },
  };

  const desktopConfig = {
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      requestLatencyMs: 0,
      downloadThroughputKbps: 10240,
      uploadThroughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
  };

  const config = {
    extends: 'lighthouse:default',
    settings: formFactor === 'desktop' ? desktopConfig : mobileConfig,
    audits: [
      {
        path: 'bootup-time',
        options: {
          thresholdInMs: 0
        }
      }
    ]
  };

  // @ts-ignore
  const runnerResult = await lighthouse(url, flags, config);

  if (!runnerResult) {
    await chrome.kill();
    throw new Error('Lighthouse failed to produce a result.');
  }

  const lhr = runnerResult.lhr;

  await chrome.kill();

  return lhr;
}