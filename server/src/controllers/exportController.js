const xlsx = require('xlsx');
const puppeteer = require('puppeteer');
const Project = require('../models/Project');
const FinanceEntry = require('../models/FinanceEntry');
const Payroll = require('../models/Payroll');
const SiteStock = require('../models/SiteStock');

/**
 * Generate Excel (.xlsx) Report for any collection (Projects, Finance, Payroll, Inventory)
 */
const exportToExcel = async (req, res) => {
  try {
    const { moduleName } = req.params;
    let data = [];
    let fileName = `RA_Constructions_${moduleName}_Report.xlsx`;

    if (moduleName === 'projects') {
      const projects = await Project.find().lean();
      data = projects.map(p => ({
        'Project Code': p.code,
        'Project Name': p.name,
        'Service Type': p.serviceType,
        'Client': p.clientName,
        'Contract Value (LKR)': p.contractValue,
        'Actual Cost (LKR)': p.actualCost,
        'Progress (%)': p.progressPercentage,
        'Status': p.status,
        'Start Date': p.startDate ? p.startDate.toISOString().split('T')[0] : ''
      }));
    } else if (moduleName === 'finance') {
      const finance = await FinanceEntry.find().lean();
      data = finance.map(f => ({
        'Tx No': f.transactionNo,
        'Type': f.transactionType,
        'Master Category': f.masterCategory,
        'Payee/Payer': f.payeeOrPayer,
        'Amount (LKR)': f.amount,
        'Payment Method': f.paymentMethod,
        'Status': f.status,
        'Date': f.date ? f.date.toISOString().split('T')[0] : ''
      }));
    } else if (moduleName === 'inventory') {
      const stock = await SiteStock.find().lean();
      data = stock.map(s => ({
        'Item Code': s.itemCode,
        'Item Name': s.itemName,
        'Category': s.category,
        'Unit': s.unit,
        'Central Stock Qty': s.centralStockQty,
        'Unit Price (LKR)': s.unitPrice,
        'Threshold Qty': s.minThresholdQty
      }));
    } else {
      return res.status(400).json({ success: false, message: 'Invalid module specified for Excel export' });
    }

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, moduleName.toUpperCase());

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.send(buffer);
  } catch (error) {
    console.error('Export to Excel Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate Excel export', error: error.message });
  }
};

/**
 * Generate PDF Report using Puppeteer for SBD-03 Contracts, BOQ Reports & Financial Statements
 */
const exportToPDF = async (req, res) => {
  let browser;
  try {
    const { moduleName } = req.params;
    let title = 'Executive Summary Report';
    let contentHtml = '';

    if (moduleName === 'projects') {
      const projects = await Project.find().limit(10).lean();
      title = 'Project Portfolio & SLS 573 Variance Report';
      contentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Code</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Project Name</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Type</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Contract Value</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Actual Cost</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">Progress</th>
            </tr>
          </thead>
          <tbody>
            ${projects.map(p => `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${p.code}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${p.name}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${p.serviceType}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">LKR ${p.contractValue.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">LKR ${p.actualCost.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${p.progressPercentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      contentHtml = `<p style="font-size: 14px; color: #475569;">Standard Enterprise PDF Report for <b>R A Creations / R A Constructions</b> generated on ${new Date().toLocaleDateString()}</p>`;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 30px; color: #0f172a; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
          .company-title { font-size: 24px; font-weight: bold; color: #0284c7; }
          .report-title { font-size: 18px; color: #334155; font-weight: 600; margin-top: 5px; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-title">R A CREATIONS / R A CONSTRUCTIONS</div>
            <div style="font-size: 12px; color: #64748b;">Enterprise Construction Management System (Sri Lanka)</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            Date: ${new Date().toISOString().split('T')[0]}<br/>
            Ref: RAC-PDF-${Math.floor(1000 + Math.random() * 9000)}
          </div>
        </div>
        <h2>${title}</h2>
        ${contentHtml}
        <div class="footer">
          Confidential - For Internal Enterprise Use Only | R A Creations / R A Constructions © 2026
        </div>
      </body>
      </html>
    `;

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=RA_Constructions_${moduleName}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    if (browser) await browser.close();
    console.error('Export to PDF Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate PDF report', error: error.message });
  }
};

module.exports = { exportToExcel, exportToPDF };
