
import puppeteer from 'puppeteer';

export async function launchChrome() {
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  const chromeLauncher = await dynamicImport('chrome-launcher');
  return await chromeLauncher.launch({ 
    chromeFlags: [
      '--headless',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ] 
  });
}

export async function runLighthouse(url: string, formFactor: 'mobile' | 'desktop' = 'mobile', port?: number, scriptUrl?: string, cookieConsentCode?: string) {
  // Dynamic imports for ESM modules using new Function to bypass ts-node transpilation
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  const chromeLauncher = await dynamicImport('chrome-launcher');
  const lighthouseModule = await dynamicImport('lighthouse');
  const lighthouse = lighthouseModule.default || lighthouseModule;

  let chrome;
  let chromePort = port;
  let browser;

  // If scriptUrl is provided, we MUST use Puppeteer to inject the script
  // OR if we have cookie consent code to run
  const hasCookieConsent = !!cookieConsentCode && cookieConsentCode.trim().length > 0;
  
  const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  // Use iPhone UA as requested to avoid blocks (e.g. Fnac)
  const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

  if (scriptUrl || hasCookieConsent) {
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
                      // Wait for it to be visible to ensure we can click it. Increased timeout to 30s.
                      const element = await targetPage.waitForSelector(cookieConsentCode, { visible: true, timeout: 30000 });
                      if (element) {
                          console.log('Clicking cookie consent element...');
                          await element.click();
                          console.log('Cookie consent element clicked.');
                          
                          // Wait a bit for cookie set
                          await new Promise(r => setTimeout(r, 2000));
                          await targetPage.reload({ waitUntil: 'networkidle0' });
                          console.log('Page reloaded after cookie acceptance.');
                      }
                  } catch (e: any) {
                      console.log('Error executing cookie consent code:', e.message);
                      // Optional: Try to find in iframes if main page fails
                      console.log('Checking iframes...');
                      for (const frame of targetPage.frames()) {
                          try {
                              const frameEl = await frame.waitForSelector(cookieConsentCode, { visible: true, timeout: 2000 });
                              if (frameEl) {
                                  await frameEl.click();
                                  console.log('Clicked in iframe');
                                  await new Promise(r => setTimeout(r, 2000));
                                  await targetPage.reload({ waitUntil: 'networkidle0' });
                                  break;
                              }
                          } catch (err) { /* ignore */ }
                      }
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

      // Setup Injection on all existing pages and new ones
      if (scriptUrl) {
        const injectScript = async (targetPage: any) => {
        try {
          // Listen to console logs from the page
          targetPage.on('console', (msg: any) => console.log('PAGE LOG:', msg.text()));
          
          // Set User Agent
          await targetPage.setUserAgent(DESKTOP_UA);

          // Bypass CSP to ensure script can be injected
          await targetPage.setBypassCSP(true);

          // Fetch script content first to avoid 403 on script src
          let scriptContent = '';
          try {
            const response = await fetch(scriptUrl);
            if (!response.ok) throw new Error(`Failed to fetch script: ${response.statusText}`);
            scriptContent = await response.text();
            console.log(`Fetched script content (${scriptContent.length} bytes)`);
          } catch (fetchError) {
            console.error('Failed to fetch script content directly, falling back to src injection:', fetchError);
          }

          await targetPage.evaluateOnNewDocument((url: string, content: string) => {
            console.log('Attempting to inject script:', url);
            const script = document.createElement('script');
            if (content) {
                // Append sourceURL so DevTools/Lighthouse attributes this script to the original URL
                // Use a clean URL without query params if possible, or just the provided URL
                // Ensure it starts with a valid protocol for Lighthouse to pick it up
                const sourceUrl = url.startsWith('http') ? url : 'https://' + url;
                script.textContent = content + '\n//# sourceURL=' + sourceUrl;
                console.log('Injecting script as inline content with sourceURL: ' + sourceUrl);
            } else {
                script.src = url;
                script.async = false; 
                console.log('Injecting script as src');
            }
            document.head.insertBefore(script, document.head.firstChild);
            console.log('Kameleoon Script Injected into DOM');
          }, scriptUrl, scriptContent);
        } catch (e) {
          console.error('Error setting up script injection:', e);
        }
      };

      const pages = await browser.pages();
      for (const p of pages) {
        await injectScript(p);
      }

      browser.on('targetcreated', async (target) => {
        const p = await target.page();
        if (p) {
          await injectScript(p);
        }
      });
      } // End if scriptUrl

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
    throttlingMethod: 'provided'
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
