const puppeteer = require('puppeteer');
const { buildQuotationDocumentHtml, buildInvoiceDocumentHtml, bankLabelFromAccount } = require('./documentHtmlService');

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

async function htmlToPdfBuffer(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
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
  return htmlToPdfBuffer(html);
}

async function invoiceToPdf(invoice) {
  const html = await buildInvoiceDocumentHtml(invoice);
  return htmlToPdfBuffer(html);
}

module.exports = { quotationToPdf, invoiceToPdf, htmlToPdfBuffer };
