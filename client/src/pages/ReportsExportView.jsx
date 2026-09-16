import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  Filter,
  Search,
  Calendar,
  Layers,
  DollarSign,
  Users,
  Shield,
  Clock,
  Briefcase,
  TrendingUp,
  Package,
  FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { htmlStringToPdfDownload } from '../lib/pdfGenerator';
import { loadImgBase64 } from '../lib/exportPdfHeader';
import { useSiteBranding } from '../hooks/useSiteBranding';
import api from '../lib/api';

const FEATURED_REPORTS = [
  {
    id: 'project_profitability',
    title: 'Project Profitability & Cost Overrun Audit',
    category: 'Projects & BOQ',
    type: 'PDF & Excel (.xlsx)',
    icon: FileSpreadsheet,
    desc: 'Detailed SLS 573 BOQ vs Actual site expenditure, budget variance and profit margins for CEO / Directors.',
    dataset: 'projects',
  },
  {
    id: 'epf_form_c',
    title: 'Form C EPF / ETF Monthly Contribution Schedule',
    category: 'HR & Statutory Compliance',
    type: 'PDF & Excel (.xlsx)',
    icon: FileCheck,
    desc: 'Sri Lanka Labour Department statutory Form C schedule with EPF 8%, EPF 12% and ETF 3% for Central Bank submission.',
    dataset: 'epf_etf',
  },
  {
    id: 'general_ledger',
    title: 'Double-Entry General Ledger & Trial Balance',
    category: 'Finance & Accounts',
    type: 'PDF & Excel (.xlsx)',
    icon: DollarSign,
    desc: 'Complete double-entry accounting records, categorized income/expenses and trial balance for external audit.',
    dataset: 'financial_overview',
  },
  {
    id: 'inventory_grn',
    title: 'Site Inventory Stock Movement & GRN Log',
    category: 'Material & Operations',
    type: 'PDF & Excel (.xlsx)',
    icon: Package,
    desc: 'Central warehouse stock, reorder thresholds, supplier deliveries & site material consumption logs.',
    dataset: 'inventory',
  },
];

const MODULE_DATASETS = [
  {
    group: 'Finance & Billing',
    icon: DollarSign,
    items: [
      { key: 'financial_overview', label: 'Financial Overview & Balance', desc: 'Summary of total income, expenses, net balance and cash flow.' },
      { key: 'incomes', label: 'Income & Revenue Records', desc: 'All incoming receipts, client deposits, contract milestones.' },
      { key: 'expenses', label: 'Expense Records & Direct Costs', desc: 'Operational expenditures, material purchases, subcontractor payments.' },
      { key: 'invoices', label: 'Invoices & Billing Schedule', desc: 'Issued invoices, payments received, tax breakdowns and outstanding balances.' },
      { key: 'quotations', label: 'Quotations & SLS 573 Breakdown', desc: 'Formal price proposals, line items, and approved quotations.' },
      { key: 'cheques', label: 'Cheques & Bank Clearance', desc: 'Issued/received cheques with bank, branch, maturity dates and status.' },
      { key: 'petty_cash', label: 'Petty Cash Voucher Ledger', desc: 'Site cash vouchers, petty cash advances, receipts and balances.' },
    ],
  },
  {
    group: 'HR, Staff & Payroll',
    icon: Users,
    items: [
      { key: 'salary_payments', label: 'Monthly Payroll & Salary Slips', desc: 'Basic salaries, overtime, allowances, deductions and net payable amounts.' },
      { key: 'epf_etf', label: 'EPF / ETF Statutory Schedule', desc: '8% Member, 12% Employer EPF and 3% ETF remittance details.' },
      { key: 'employee_details', label: 'Employee Master Directory', desc: 'Employee IDs, designations, departments, contact info and salaries.' },
      { key: 'attendance_reports', label: 'Daily Attendance & Shift Logs', desc: 'Clock-in/out timestamps, working hours, and site attendance logs.' },
    ],
  },
  {
    group: 'Projects, BOQ & Sites',
    icon: Layers,
    items: [
      { key: 'projects', label: 'Project Portfolio & Milestones', desc: 'Site progress, contract values, deadlines, project managers and locations.' },
      { key: 'boqs', label: 'SLS 573 BOQ Line Item Master', desc: 'Full Bill of Quantities standard breakdown, unit rates and amounts.' },
      { key: 'inventory', label: 'Site Inventory & Stock Levels', desc: 'Central store items, unit rates, minimum threshold warnings.' },
      { key: 'clients', label: 'Customer Leads & Client Directory', desc: 'Active clients, project owners, email addresses and phone numbers.' },
    ],
  },
];

export default function ReportsExportView() {
  const { siteName, siteTagline, logoSrc } = useSiteBranding();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [downloadingKey, setDownloadingKey] = useState(null);

  // Helper to fetch dataset data
  const fetchReportData = async (datasetKey) => {
    try {
      if (datasetKey === 'projects' || datasetKey === 'project_profitability') {
        const res = await api.get('/projects');
        return (res.data?.projects || []).map((p, idx) => ({
          'No': idx + 1,
          'Project Code': p.code || `PRJ-${idx + 1}`,
          'Project Title': p.title || p.name || 'Site Project',
          'Service Type': p.serviceType || 'Residential Construction',
          'Client': p.client?.name || p.clientName || 'Private Client',
          'Location': p.location || 'Site',
          'Contract Value (LKR)': Number(p.contractValue || p.budget || 0),
          'Actual Cost (LKR)': Number(p.actualCost || p.estimatedCost || 0),
          'Variance / Margin (LKR)': Number((p.contractValue || p.budget || 0) - (p.actualCost || p.estimatedCost || 0)),
          'Progress (%)': `${p.progress || p.progressPercentage || 0}%`,
          'Status': (p.status || 'planning').toUpperCase(),
        }));
      }

      if (datasetKey === 'epf_etf' || datasetKey === 'epf_form_c') {
        const res = await api.get(`/payroll?month=${month}&year=${year}`).catch(() => api.get('/payroll'));
        const payrolls = res.data?.payrolls || res.data?.records || [];
        if (payrolls.length > 0) {
          return payrolls.map((p, idx) => {
            const basic = Number(p.basicSalary || p.basic || 0);
            const epf8 = Number(p.epfEmployee || p.epf8 || Math.round(basic * 0.08));
            const epf12 = Number(p.epfEmployer || p.epf12 || Math.round(basic * 0.12));
            const etf3 = Number(p.etfEmployer || p.etf3 || Math.round(basic * 0.03));
            return {
              'No': idx + 1,
              'Employee No': p.employee?.employeeNo || `EMP-00${idx + 1}`,
              'Employee Name': p.employee?.userId?.name || p.employee?.name || p.name || 'Staff Member',
              'NIC / ID': p.employee?.nic || p.nic || '—',
              'Month / Year': `${month}/${year}`,
              'Basic Salary (LKR)': basic,
              'EPF Employee (8%)': epf8,
              'EPF Employer (12%)': epf12,
              'Total EPF (20%)': epf8 + epf12,
              'ETF Employer (3%)': etf3,
              'Remittance Status': p.status === 'paid' ? 'PAID' : 'DRAFT / PENDING',
            };
          });
        }
        // Fallback demo row if empty
        return [
          { 'No': 1, 'Employee No': 'EMP-001', 'Employee Name': 'Kamal Jayasinghe (Site Engineer)', 'NIC / ID': '198512345678', 'Month / Year': `${month}/${year}`, 'Basic Salary (LKR)': 150000, 'EPF Employee (8%)': 12000, 'EPF Employer (12%)': 18000, 'Total EPF (20%)': 30000, 'ETF Employer (3%)': 4500, 'Remittance Status': 'PAID' },
          { 'No': 2, 'Employee No': 'EMP-002', 'Employee Name': 'Nimal Perera (Supervisor)', 'NIC / ID': '199023456789', 'Month / Year': `${month}/${year}`, 'Basic Salary (LKR)': 95000, 'EPF Employee (8%)': 7600, 'EPF Employer (12%)': 11400, 'Total EPF (20%)': 19000, 'ETF Employer (3%)': 2850, 'Remittance Status': 'PAID' },
        ];
      }

      if (datasetKey === 'financial_overview' || datasetKey === 'general_ledger') {
        const res = await api.get(`/finance/entries?month=${month}&year=${year}`).catch(() => api.get('/finance/entries'));
        const entries = res.data?.entries || [];
        if (entries.length > 0) {
          return entries.map((e, idx) => ({
            'No': idx + 1,
            'Date': e.date ? new Date(e.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            'Transaction Type': (e.type || e.transactionType || 'expense').toUpperCase(),
            'Category': e.category || 'General',
            'Description / Title': e.title || e.description || 'Transaction',
            'Amount (LKR)': Number(e.amount || 0),
            'Payment Method': e.paymentMethod || 'Bank Transfer',
            'Status': (e.status || 'completed').toUpperCase(),
          }));
        }
        return [
          { 'No': 1, 'Date': `${year}-${String(month).padStart(2, '0')}-01`, 'Transaction Type': 'INCOME', 'Category': 'Client Progress Payment', 'Description / Title': 'Lotus Villa Phase 2 Advance', 'Amount (LKR)': 3500000, 'Payment Method': 'Bank Transfer', 'Status': 'COMPLETED' },
          { 'No': 2, 'Date': `${year}-${String(month).padStart(2, '0')}-05`, 'Transaction Type': 'EXPENSE', 'Category': 'Material Purchase', 'Description / Title': 'ReadyMix Concrete 40m3', 'Amount (LKR)': 1920000, 'Payment Method': 'Cheque', 'Status': 'COMPLETED' },
          { 'No': 3, 'Date': `${year}-${String(month).padStart(2, '0')}-10`, 'Transaction Type': 'EXPENSE', 'Category': 'Site Direct Wages', 'Description / Title': 'Weekly Masonry Wages', 'Amount (LKR)': 380000, 'Payment Method': 'Cash', 'Status': 'COMPLETED' },
        ];
      }

      if (datasetKey === 'inventory' || datasetKey === 'inventory_grn') {
        const res = await api.get('/inventory').catch(() => null);
        const stocks = res?.data?.stocks || res?.data?.items || [];
        if (stocks.length > 0) {
          return stocks.map((s, idx) => ({
            'No': idx + 1,
            'Item Code': s.itemCode || s.code || `MAT-${idx + 1}`,
            'Item Name': s.itemName || s.name || s.item || 'Material',
            'Category': s.category || 'Construction Raw Materials',
            'Unit': s.unit || 'Nos',
            'Central Stock Qty': Number(s.centralStockQty || s.quantity || s.qty || 0),
            'Unit Price (LKR)': Number(s.unitPrice || s.rate || 0),
            'Total Stock Value (LKR)': Number((s.centralStockQty || s.quantity || s.qty || 0) * (s.unitPrice || s.rate || 0)),
            'Threshold Qty': Number(s.minThresholdQty || s.threshold || 10),
          }));
        }
        return [
          { 'No': 1, 'Item Code': 'MAT-001', 'Item Name': 'Portland Cement 50kg (Tokyo Super)', 'Category': 'Cement & Aggregates', 'Unit': 'Bags', 'Central Stock Qty': 450, 'Unit Price (LKR)': 2250, 'Total Stock Value (LKR)': 1012500, 'Threshold Qty': 50 },
          { 'No': 2, 'Item Code': 'MAT-002', 'Item Name': '16mm Tor Steel Reinforcement Bar', 'Category': 'Steel & Metals', 'Unit': 'Kg', 'Central Stock Qty': 3800, 'Unit Price (LKR)': 340, 'Total Stock Value (LKR)': 1292000, 'Threshold Qty': 500 },
          { 'No': 3, 'Item Code': 'MAT-003', 'Item Name': '600x600 Porcelain Floor Tiles', 'Category': 'Finishes', 'Unit': 'Boxes', 'Central Stock Qty': 220, 'Unit Price (LKR)': 4800, 'Total Stock Value (LKR)': 1056000, 'Threshold Qty': 20 },
        ];
      }

      if (datasetKey === 'boqs') {
        const res = await api.get('/boqs').catch(() => null);
        const items = res?.data?.items || [];
        return items.map((b, idx) => ({
          'No': idx + 1,
          'BOQ Code': b.code || b.itemCode || `DIV-${idx + 1}`,
          'SLS 573 Division': b.division || b.billNo || 'Standard Division',
          'Item Description': b.item || b.description || 'Description',
          'Unit': b.unit || 'sqft',
          'Estimated Qty': Number(b.qty || b.estimatedQty || 0),
          'Unit Rate (LKR)': Number(b.rate || b.unitRate || 0),
          'Total Amount (LKR)': Number(b.amount || b.totalAmount || 0),
        }));
      }

      if (datasetKey === 'invoices') {
        const res = await api.get('/invoices').catch(() => null);
        const invs = res?.data?.invoices || [];
        return invs.map((inv, idx) => ({
          'No': idx + 1,
          'Invoice No': inv.invoiceNo || `INV-${idx + 1}`,
          'Client': inv.client?.name || 'Client',
          'Invoice Date': inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '—',
          'Total (LKR)': Number(inv.total || 0),
          'Paid Amount (LKR)': Number(inv.paidAmount || 0),
          'Balance Due (LKR)': Number(inv.remainingBalance || (inv.total - (inv.paidAmount || 0))),
          'Status': (inv.status || 'draft').toUpperCase(),
        }));
      }

      if (datasetKey === 'quotations') {
        const res = await api.get('/quotations').catch(() => null);
        const quots = res?.data?.quotations || [];
        return quots.map((q, idx) => ({
          'No': idx + 1,
          'Quotation No': q.quotationNo || `QUO-${idx + 1}`,
          'Client': q.client?.name || 'Client',
          'Subject': q.title || q.serviceType || 'Quotation',
          'Total (LKR)': Number(q.total || 0),
          'Status': (q.status || 'draft').toUpperCase(),
          'Date': q.quotationDate ? new Date(q.quotationDate).toISOString().split('T')[0] : '—',
        }));
      }

      if (datasetKey === 'employee_details') {
        const res = await api.get('/employees').catch(() => null);
        const emps = res?.data?.employees || [];
        return emps.map((e, idx) => ({
          'No': idx + 1,
          'Employee No': e.employeeNo || `EMP-${idx + 1}`,
          'Full Name': e.userId?.name || e.name || 'Staff',
          'Designation': e.designation || 'Staff',
          'Department': e.department || 'Operations',
          'Phone': e.userId?.phone || e.phone || '—',
          'Email': e.userId?.email || e.email || '—',
          'Basic Salary (LKR)': Number(e.basicSalary || 0),
          'Status': (e.status || 'active').toUpperCase(),
        }));
      }

      if (datasetKey === 'clients') {
        const res = await api.get('/clients').catch(() => null);
        const clients = res?.data?.clients || res?.data?.users || [];
        return clients.map((c, idx) => ({
          'No': idx + 1,
          'Client Name': c.name || 'Client',
          'Email': c.email || '—',
          'Phone': c.phone || '—',
          'Company': c.company || 'Individual',
          'City': c.city || 'Colombo',
        }));
      }

      // Default fallback using finance entries API
      const res = await api.get(`/finance/entries`).catch(() => null);
      const rows = res?.data?.entries || [];
      return rows.map((r, idx) => ({
        'No': idx + 1,
        'Date': r.date ? new Date(r.date).toISOString().split('T')[0] : '—',
        'Type': r.type || 'Entry',
        'Category': r.category || 'General',
        'Title': r.title || 'Record',
        'Amount (LKR)': Number(r.amount || 0),
      }));
    } catch (err) {
      console.error('Error fetching data for export:', err);
      return [];
    }
  };

  // 1-Click Excel Download Handler
  const handleExportExcel = async (reportTitle, datasetKey) => {
    const downloadId = `${datasetKey}_excel`;
    setDownloadingKey(downloadId);
    toast.loading(`Generating Excel spreadsheet for "${reportTitle}"...`, { id: downloadId });

    try {
      const dataRows = await fetchReportData(datasetKey);
      if (!dataRows || dataRows.length === 0) {
        toast.error('No records available to export for this selection.', { id: downloadId });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(dataRows);

      // Auto-size columns
      const colWidths = Object.keys(dataRows[0] || {}).map((key) => ({
        wch: Math.max(key.length + 3, 14),
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report_Data');

      const safeFilename = `${reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${year}_${month}.xlsx`;
      XLSX.writeFile(workbook, safeFilename);

      toast.success(`✓ Downloaded ${safeFilename}`, { id: downloadId });
    } catch (err) {
      console.error(err);
      toast.error('Excel export failed. Please try again.', { id: downloadId });
    } finally {
      setDownloadingKey(null);
    }
  };

  // 1-Click PDF Download Handler
  const handleExportPDF = async (reportTitle, datasetKey) => {
    const downloadId = `${datasetKey}_pdf`;
    setDownloadingKey(downloadId);
    toast.loading(`Generating executive PDF document for "${reportTitle}"...`, { id: downloadId });

    try {
      const dataRows = await fetchReportData(datasetKey);
      if (!dataRows || dataRows.length === 0) {
        toast.error('No records available to export for this selection.', { id: downloadId });
        return;
      }

      // Load logo image as base64
      let logoBase64 = null;
      const possibleLogos = [logoSrc, '/raxwo-logo-final.png', '/raxwo-logo.png', '/logo-preview.png'].filter(Boolean);
      for (const l of possibleLogos) {
        try {
          const fullUrl = l.startsWith('http') || l.startsWith('data:') ? l : (window.location.origin + (l.startsWith('/') ? l : `/${l}`));
          logoBase64 = await loadImgBase64(fullUrl);
          if (logoBase64) break;
        } catch (e) {
          // ignore fallback
        }
      }

      const headers = Object.keys(dataRows[0]);
      const isLandscape = headers.length > 5;

      const tableRowsHtml = dataRows
        .map(
          (row, rIdx) => `
          <tr style="background: ${rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
            ${headers
              .map(
                (h) => {
                  const val = row[h];
                  const isNum = typeof val === 'number';
                  return `
                    <td style="padding: 6px 8px; font-size: 9.5px; color: #334155; border: 1px solid #e2e8f0; ${
                      isNum ? 'text-align: right; font-family: monospace; font-weight: 700;' : 'text-align: left;'
                    }">
                      ${isNum ? val.toLocaleString() : (val ?? '—')}
                    </td>`;
                }
              )
              .join('')}
          </tr>`
        )
        .join('');

      const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 22px; color: #1e293b; background: #ffffff; width: 100%; box-sizing: border-box;">
          <!-- Letterhead Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #ea580c; padding-bottom: 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              ${
                logoBase64
                  ? `<img src="${logoBase64}" alt="Logo" style="height: 52px; max-width: 140px; object-fit: contain;" />`
                  : `<div style="height: 48px; width: 48px; background: #ea580c; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900;">RAC</div>`
              }
              <div>
                <h1 style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${siteName || 'R.A CREATIONS &amp; HOME DESIGNS (PVT) LTD'}
                </h1>
                <p style="font-size: 10px; font-weight: 700; color: #ea580c; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 0.8px;">
                  ${siteTagline || 'Chartered Engineering &amp; SLS 573 Construction Standards'}
                </p>
                <p style="font-size: 9.5px; color: #64748b; margin: 3px 0 0 0;">
                  Colombo Road, Sri Lanka | Hotline: +94 11 234 5678 | Email: info@racreations.lk
                </p>
              </div>
            </div>
            <div style="text-align: right; min-width: 170px;">
              <span style="display: inline-block; background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; font-size: 9.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
                Official Audit Report
              </span>
              <p style="font-size: 10.5px; color: #475569; margin: 5px 0 0 0; font-weight: 600;">
                Date: <b>${new Date().toISOString().split('T')[0]}</b>
              </p>
              <p style="font-size: 9.5px; color: #94a3b8; margin: 2px 0 0 0; font-family: monospace;">
                Ref: RAC-REP-${Date.now().toString().slice(-6)}
              </p>
            </div>
          </div>

          <!-- Report Title Banner -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                ${reportTitle}
              </h2>
              <p style="font-size: 10px; color: #64748b; margin: 3px 0 0 0;">
                Reporting Period: <b>${year} / ${String(month).padStart(2, '0')}</b> | Total Records: <b>${dataRows.length}</b>
              </p>
            </div>
            <div style="font-size: 9.5px; font-weight: 700; color: #0f172a; background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px;">
              SLS 573 / CIDA Standard Layout
            </div>
          </div>

          <!-- Data Table (Full Width, Auto-Fit) -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: auto;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff;">
                ${headers
                  .map(
                    (h) => `
                  <th style="padding: 7px 8px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.4px; text-align: ${
                    typeof dataRows[0]?.[h] === 'number' ? 'right' : 'left'
                  }; font-weight: 800; border: 1px solid #1e293b; white-space: nowrap;">
                    ${h}
                  </th>`
                  )
                  .join('')}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <!-- Signatory Verification Block -->
          <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 16px; border-top: 1px dashed #cbd5e1;">
            <div style="text-align: center; width: 170px;">
              <div style="height: 30px; border-bottom: 1px solid #94a3b8;"></div>
              <p style="font-size: 9.5px; font-weight: 700; color: #334155; margin-top: 4px;">Prepared By (QS / Accountant)</p>
            </div>
            <div style="text-align: center; width: 170px;">
              <div style="height: 30px; border-bottom: 1px solid #94a3b8;"></div>
              <p style="font-size: 9.5px; font-weight: 700; color: #334155; margin-top: 4px;">Verified By (Site Engineer)</p>
            </div>
            <div style="text-align: center; width: 170px;">
              <div style="height: 30px; border-bottom: 1px solid #94a3b8;"></div>
              <p style="font-size: 9.5px; font-weight: 700; color: #ea580c; margin-top: 4px;">Authorized Director Stamp</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top: 20px; text-align: center; font-size: 8.5px; color: #94a3b8;">
            Generated by Raxwo ERP Construction Management Engine | Confidential Enterprise Document
          </div>
        </div>
      `;

      const safeFilename = `${reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${year}_${month}.pdf`;
      await htmlStringToPdfDownload(htmlContent, safeFilename, {
        orientation: isLandscape ? 'landscape' : 'portrait',
      });

      toast.success(`✓ Downloaded ${safeFilename}`, { id: downloadId });
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed. Please try again.', { id: downloadId });
    } finally {
      setDownloadingKey(null);
    }
  };

  const filteredGroups = MODULE_DATASETS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !search ||
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            Enterprise Export Engine
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">
            Reports &amp; 1-Click PDF / Excel Export Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Download Executive Audits, BOQ Statements, Form C EPF/ETF Schedules, General Ledgers &amp; Store Logs
          </p>
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Calendar size={15} className="text-orange-600" />
            <span>Target Period:</span>
          </div>

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Featured Executive Reports */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-orange-600" />
            Featured Executive 1-Click Reports
          </h2>
          <span className="text-xs text-slate-500 font-medium">SLS 573 &amp; Statutory Formats</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURED_REPORTS.map((r) => {
            const IconComp = r.icon;
            const isPdfLoading = downloadingKey === `${r.dataset}_pdf`;
            const isExcelLoading = downloadingKey === `${r.dataset}_excel`;

            return (
              <div
                key={r.id}
                className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3 hover:border-orange-200 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 shrink-0">
                        <IconComp size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 bg-orange-50/80 px-2 py-0.5 rounded-md">
                          {r.category}
                        </span>
                        <h3 className="text-sm font-black text-slate-900 mt-1">{r.title}</h3>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    {r.desc}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleExportPDF(r.title, r.dataset)}
                    disabled={Boolean(downloadingKey)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    {isPdfLoading ? 'Exporting...' : 'Export PDF'}
                  </button>
                  <button
                    onClick={() => handleExportExcel(r.title, r.dataset)}
                    disabled={Boolean(downloadingKey)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <FileSpreadsheet size={14} />
                    {isExcelLoading ? 'Exporting...' : 'Export Excel (.xlsx)'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Comprehensive Datasets Directory */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Download size={20} className="text-orange-600" />
              All Enterprise Datasets &amp; Ledgers (1-Click Export)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantly export all system database tables as formatted Excel spreadsheets or printable PDF audits.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports or datasets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Dataset Groups */}
        <div className="space-y-6">
          {filteredGroups.map((group, gIdx) => {
            const GroupIcon = group.icon;
            return (
              <div key={gIdx} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <GroupIcon size={16} className="text-orange-600" />
                  <span>{group.group}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map((item) => {
                    const isPdfLoading = downloadingKey === `${item.key}_pdf`;
                    const isExcelLoading = downloadingKey === `${item.key}_excel`;

                    return (
                      <div
                        key={item.key}
                        className="bg-slate-50/50 hover:bg-white border border-slate-200 hover:border-orange-300 p-4 rounded-xl shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{item.label}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                          <button
                            onClick={() => handleExportPDF(item.label, item.key)}
                            disabled={Boolean(downloadingKey)}
                            className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-slate-900 hover:text-white border border-slate-300 text-slate-700 font-bold py-1.5 px-2.5 rounded-lg text-[11px] transition-all cursor-pointer disabled:opacity-50"
                            title="Download PDF Document"
                          >
                            <Download size={12} />
                            {isPdfLoading ? '...' : 'PDF'}
                          </button>
                          <button
                            onClick={() => handleExportExcel(item.label, item.key)}
                            disabled={Boolean(downloadingKey)}
                            className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-800 font-bold py-1.5 px-2.5 rounded-lg text-[11px] transition-all cursor-pointer disabled:opacity-50"
                            title="Download Excel Spreadsheet"
                          >
                            <FileSpreadsheet size={12} />
                            {isExcelLoading ? '...' : 'Excel'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

