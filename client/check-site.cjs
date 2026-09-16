const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );

  console.log('Navigating to http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('Page loaded successfully.');
    
    // Wait a bit to see if React renders anything
    await new Promise(r => setTimeout(r, 2000));
    const content = await page.content();
    if (content.includes('id="root"></div>') || content.includes('id="root" data-reactroot=""></div')) {
        console.log('React failed to render (empty root div)');
    } else {
        console.log('React rendered successfully.');
    }
  } catch (err) {
    console.log('Navigation error:', err.message);
  }

  await browser.close();
})();
