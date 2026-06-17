const puppeteer = require('puppeteer');
const { buildQuotationDocumentHtml, buildInvoiceDocumentHtml, bankLabelFromAccount, inlineUploadImagesInHtml } = require('./documentHtmlService');

let browserPromise = null;

function launchArgs() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ];
  // Linux/Docker low-memory flags — break Chromium on Windows
  if (process.platform === 'linux') {
    args.push('--single-process', '--no-zygote');
  }
  return args;
}

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: launchArgs(),
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      console.error('[Puppeteer] Failed to launch browser:', err.message);
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

async function resetBrowser() {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      await b.close().catch(() => {});
    } catch (_) { /* ignore */ }
    browserPromise = null;
  }
}

async function renderPdfOnce(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
  } finally {
    await page.close().catch(() => {});
  }
}

async function htmlToPdfBuffer(html) {
  const prepared = inlineUploadImagesInHtml(html);
  try {
    return await renderPdfOnce(prepared);
  } catch (err) {
    const msg = err?.message || '';
    const retriable = /Connection closed|Protocol error|Target closed|Session closed|Browser has disconnected/i.test(msg);
    if (retriable) {
      console.warn('[Puppeteer] PDF failed, restarting browser:', msg);
      await resetBrowser();
      return renderPdfOnce(prepared);
    }
    throw err;
  }
}

async function quotationToPdf(quotation) {
  const bankLabel = bankLabelFromAccount(quotation.bankAccount);
  const html = await buildQuotationDocumentHtml(quotation, { bankLabel });
  return htmlToPdfBuffer(html);
}

async function invoiceToPdf(invoice) {
  const html = await buildInvoiceDocumentHtml(invoice);
  return htmlToPdfBuffer(html);
}

module.exports = { quotationToPdf, invoiceToPdf, htmlToPdfBuffer, resetBrowser };
