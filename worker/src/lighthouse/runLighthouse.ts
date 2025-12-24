
import puppeteer from 'puppeteer';

export async function launchChrome() {
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  const chromeLauncher = await dynamicImport('chrome-launcher');
  return await chromeLauncher.launch({ 
    chromeFlags: [
      '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-extensions',
      '--disable-default-apps',
      '--mute-audio'
    ] 
  });
}

export async function runLighthouse(
  url: string, 
  formFactor: 'mobile' | 'desktop' = 'mobile', 
  port?: number, 
  scriptUrl?: string, 
  cookieConsentCode?: string,
  consentStrategy?: string
) {
  // Dynamic imports for ESM modules using new Function to bypass ts-node transpilation
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  const chromeLauncher = await dynamicImport('chrome-launcher');
  const lighthouseModule = await dynamicImport('lighthouse');
  const lighthouse = lighthouseModule.default || lighthouseModule;

  let chrome;
  let chromePort = port;
  let browser;

  // If scriptUrl is provided, we MUST use Puppeteer to inject the script
  // OR if we have cookie consent code to run AND strategy is REQUIRED (or undefined, for backward compatibility)
  const hasCookieConsent = !!cookieConsentCode && cookieConsentCode.trim().length > 0 && consentStrategy !== 'NOT_REQUIRED';
  
  const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  // Use iPhone UA as requested to avoid blocks (e.g. Fnac)
  const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

  if (hasCookieConsent) {
    try {
      // Try to connect to existing Chrome if port is provided
      if (port) {
        browser = await puppeteer.connect({
          browserURL: `http://localhost:${port}`,
          defaultViewport: null
        });
      } else {
        // Launch new if no port
        browser = await puppeteer.launch({
          headless: true,
          args: [
            `--remote-debugging-port=${port || 0}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            '--disable-blink-features=AutomationControlled',
            `--user-agent=${DESKTOP_UA}` // Default to desktop for Puppeteer unless we want to match formFactor too?
          ]
        });
        const browserWSEndpoint = browser.wsEndpoint();
        const portMatch = browserWSEndpoint.match(/:(\d+)\//);
        chromePort = portMatch ? parseInt(portMatch[1], 10) : 0;
      }

      if (hasCookieConsent) {
          console.log('Cookie consent code detected: Setting up handler...');
          const handleCookieConsent = async (targetPage: any) => {
              try {
                  // Set UA based on formFactor to ensure we get the correct site version (Mobile vs Desktop)
                  const userAgent = formFactor === 'mobile' ? MOBILE_UA : DESKTOP_UA;
                  await targetPage.setUserAgent(userAgent);

                  console.log('Navigating to ' + url + ' to handle cookies...');
                  // Use domcontentloaded to be faster, then wait for selector
                  await targetPage.goto(url, { waitUntil: 'domcontentloaded' });
                  
                  try {
                      console.log('Waiting for cookie consent element: ' + cookieConsentCode);
                      // Wait for it to be visible to ensure we can click it. Timeout 5s as requested.
                      const element = await targetPage.waitForSelector(cookieConsentCode, { visible: true, timeout: 5000 });
                      if (element) {
                          console.log('Clicking cookie consent element...');
                          await element.click();
                          console.log('Cookie consent element clicked.');
                          
                          // Wait a bit for cookie set
                          await new Promise(r => setTimeout(r, 2000));
                          console.log('Cookies set. Proceeding to Lighthouse run...');
                      }
                  } catch (e: any) {
                      console.log('Cookie consent element not found or timed out (5s). Proceeding without consent.');
                      // No iframe check as requested
                  }
                  
              } catch (e) {
                  console.error('Error handling cookies:', e);
              }
          };
          
          const pages = await browser.pages();
          if (pages.length > 0) {
              await handleCookieConsent(pages[0]);
          }
      }

    } catch (e) {
      console.error('Failed to setup Puppeteer for script injection:', e);
    }
  } else if (!chromePort) {
    // Standard launch if no port provided and no script injection needed
    const userAgent = formFactor === 'mobile' ? MOBILE_UA : DESKTOP_UA;
    chrome = await chromeLauncher.launch({ 
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--disable-blink-features=AutomationControlled',
        `--user-agent=${userAgent}`
      ] 
    });
    chromePort = chrome.port;
  }
  
  const flags = {
    logLevel: 'info' as 'info',
    output: 'json' as 'json',
    port: chromePort,
  };

  const commonSettings = {
    onlyCategories: ['performance'],
    onlyAudits: [
      'bootup-time',
      'mainthread-work-breakdown',
      'metrics'
    ],
    skipAudits: [
      'screenshot-thumbnails',
      'final-screenshot',
      'full-page-screenshot',
      'script-treemap-data'
    ],
    disableFullPageScreenshot: true,
    disableStorageReset: true,
    throttlingMethod: 'devtools'
  };

  const mobileConfig = {
    ...commonSettings,
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      disabled: false,
    },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 2,
    },
  };

  const desktopConfig = {
    ...commonSettings,
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
    userAgent: DESKTOP_UA,
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
    if (chrome) await chrome.kill();
    if (browser) await browser.close();
    throw new Error('Lighthouse failed to produce a result.');
  }

  const lhr = runnerResult.lhr;

  if (chrome) await chrome.kill();
  if (browser) {
    if (port) browser.disconnect();
    else await browser.close();
  }

  return lhr;
}
