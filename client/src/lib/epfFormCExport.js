import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

/**
 * Generate & download Sri Lanka Labour Department EPF Form C Schedule (C-Form)
 */
export function exportEpfFormC(summaryData, monthStr = '') {
  if (!summaryData || summaryData.length === 0) {
    toast.error('No employee statutory records found for Form C export.');
    return;
  }

  const rows = summaryData.map((emp, index) => ({
    'Serial No': index + 1,
    'EPF Number': emp.epfNo || emp.employeeNo || `EMP-${index + 1}`,
    'Member Name': emp.name || emp.fullName || 'Employee',
    'NIC Number': emp.nic || '—',
    'Basic Salary (LKR)': emp.basicSalary || 0,
    'EPF Employee (8%)': emp.epfEmployee || 0,
    'EPF Employer (12%)': emp.epfEmployer || 0,
    'Total EPF (20%)': emp.totalEPF || ((emp.epfEmployee || 0) + (emp.epfEmployer || 0)),
    'ETF Employer (3%)': emp.etfEmployer || 0,
    'Remittance Status': emp.isPaid ? 'PAID' : 'DRAFT / PENDING',
  }));

  // Add totals summary row
  const totals = rows.reduce(
    (acc, r) => {
      acc.basic += Number(r['Basic Salary (LKR)']);
      acc.epf8 += Number(r['EPF Employee (8%)']);
      acc.epf12 += Number(r['EPF Employer (12%)']);
      acc.totalEpf += Number(r['Total EPF (20%)']);
      acc.etf3 += Number(r['ETF Employer (3%)']);
      return acc;
    },
    { basic: 0, epf8: 0, epf12: 0, totalEpf: 0, etf3: 0 }
  );

  rows.push({
    'Serial No': '',
    'EPF Number': '',
    'Member Name': 'TOTAL REMITTANCE',
    'NIC Number': '',
    'Basic Salary (LKR)': totals.basic,
    'EPF Employee (8%)': totals.epf8,
    'EPF Employer (12%)': totals.epf12,
    'Total EPF (20%)': totals.totalEpf,
    'ETF Employer (3%)': totals.etf3,
    'Remittance Status': '',
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'EPF Form C');

  const filename = `EPF_Form_C_Schedule_${monthStr || 'Export'}.xlsx`;
  XLSX.writeFile(workbook, filename);
  toast.success(`EPF Form C Schedule exported successfully as ${filename}`);
}
