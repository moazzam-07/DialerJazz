const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[CONSOLE] ${msg.type()}:`, msg.text());
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]:', err.toString());
  });
  
  page.on('requestfailed', request => {
    console.log('[REQUEST FAILED]:', request.url(), request.failure().errorText);
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('[NAVIGATION SUCCESS]');
    
    // Wait an extra second to see if React crashes delayed
    await new Promise(r => setTimeout(r, 1000));
  } catch (err) {
    console.error('[NAVIGATION FAILED]:', err);
  }

  await browser.close();
})();
