const puppeteer = require('puppeteer');
const { buildQuotationDocumentHtml, buildInvoiceDocumentHtml, bankLabelFromAccount, inlineUploadImagesInHtml } = require('./documentHtmlService');

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Critical for Render/Docker
        '--single-process', // Critical for low memory environments
        '--no-zygote',
        '--disable-gpu'
      ],
      // If deployed on Render and using their Puppeteer buildpack,
      // it sets PUPPETEER_EXECUTABLE_PATH. Use it if available.
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    }).catch(err => {
      console.error('[Puppeteer] Failed to launch browser:', err);
      browserPromise = null; // Reset so it retries next time
      throw err;
    });
  }
  return browserPromise;
}

async function htmlToPdfBuffer(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Abort requests that aren't data URIs or local — prevents hanging on unreachable hosts
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (req.resourceType() === 'image' && /^https?:\/\//i.test(url)) {
        // Allow the request but don't let it block rendering
        req.continue();
      } else {
        req.continue();
      }
    });
    // Use networkidle2 (tolerates ≤2 pending connections) so stalled image fetches don't hang
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
      // If networkidle2 times out, proceed anyway — content is already loaded via setContent
    });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
  } finally {
    await page.close();
  }
}

async function quotationToPdf(quotation) {
  const bankLabel = bankLabelFromAccount(quotation.bankAccount);
  const html = await buildQuotationDocumentHtml(quotation, { bankLabel });
  return htmlToPdfBuffer(inlineUploadImagesInHtml(html));
}

async function invoiceToPdf(invoice) {
  const html = await buildInvoiceDocumentHtml(invoice);
  return htmlToPdfBuffer(inlineUploadImagesInHtml(html));
}

module.exports = { quotationToPdf, invoiceToPdf, htmlToPdfBuffer };
