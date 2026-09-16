import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calculator, DollarSign, FileSpreadsheet, Download, 
  CheckCircle2, AlertCircle, Building, UserCheck, Printer, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { exportEpfFormC } from '../../lib/epfFormCExport';
import { downloadPayslipPdf } from '../../lib/payslipDocument';
import { useSiteBranding } from '../../hooks/useSiteBranding';

export default function AccountantPayrollComponent() {
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [processed, setProcessed] = useState(false);
  const qc = useQueryClient();
  const { settings: siteSettings } = useSiteBranding();

  const [yearStr, monthStr] = selectedMonth.split('-');
  const month = Number(monthStr || 7);
  const year = Number(yearStr || 2026);

  // 1. Fetch live EPF/ETF statutory summary for selected month/year
  const { data: epfData, isLoading: epfLoading, refetch: refetchEpf } = useQuery({
    queryKey: ['epf-summary', month, year],
    queryFn: () => api.get(`/payroll/epf-summary?month=${month}&year=${year}`).then(r => r.data),
  });

  // 2. Fetch live payroll records for selected month/year
  const { data: payrollData, isLoading: payrollLoading, refetch: refetchPayrolls } = useQuery({
    queryKey: ['payrolls-accountant', month, year],
    queryFn: () => api.get(`/payroll?month=${month}&year=${year}`).then(r => r.data),
  });

  const payrolls = payrollData?.payrolls || [];
  const epfSummary = epfData?.summary || [];

  const payrollMap = React.useMemo(() => {
    const map = {};
    payrolls.forEach(p => {
      const empId = p.employee?._id || p.employee;
      if (empId) map[String(empId)] = p;
    });
    return map;
  }, [payrolls]);

  // Combine EPF summary & payroll data for live display
  const liveRows = React.useMemo(() => {
    if (epfSummary.length === 0 && payrolls.length > 0) {
      return payrolls.map(p => ({
        id: p.employee?.employeeNo || String(p.employee?._id || p.employee),
        name: p.employee?.userId?.name || p.employee?.fullName || 'Employee',
        epfNo: p.employee?.epfNumber || '—',
        basicSalary: Number(p.basicSalary || 0),
        otPay: Number(p.overtime || p.otPay || 0),
        grossSalary: Number(p.grossSalary || 0),
        epf8: Number(p.epfEmployee || 0),
        epf12: Number(p.epfEmployer || 0),
        etf3: Number(p.etfEmployer || 0),
        apitTax: Number(p.incomeTaxDeduction || p.apitTaxDeduction || 0),
        netPay: Number(p.netSalary || 0),
        payrollObj: p,
      }));
    }

    return epfSummary.map(emp => {
      const p = payrollMap[String(emp.employeeId)];
      const basicSalary = Number(p ? p.basicSalary : emp.basicSalary || 0);
      const otPay = Number(p ? (p.overtime || p.otPay || 0) : 0);
      const grossSalary = Number(p ? p.grossSalary : (basicSalary + otPay));
      const epf8 = Number(p ? p.epfEmployee : emp.epfEmployee || Math.round(basicSalary * 0.08));
      const epf12 = Number(p ? p.epfEmployer : emp.epfEmployer || Math.round(basicSalary * 0.12));
      const etf3 = Number(p ? p.etfEmployer : emp.etfEmployer || Math.round(basicSalary * 0.03));
      const apitTax = Number(p ? (p.incomeTaxDeduction || p.apitTaxDeduction || 0) : 0);
      const netPay = Number(p ? p.netSalary : (grossSalary - epf8 - apitTax));

      return {
        id: emp.employeeNo || emp.employeeId,
        name: emp.name || 'Employee',
        epfNo: emp.epfNo || '—',
        basicSalary,
        otPay,
        grossSalary,
        epf8,
        epf12,
        etf3,
        apitTax,
        netPay,
        payrollObj: p || null,
        epfSummaryObj: emp,
      };
    });
  }, [epfSummary, payrolls, payrollMap]);

  // Compute live summary totals
  const totals = React.useMemo(() => {
    return liveRows.reduce((acc, row) => {
      acc.gross += row.grossSalary;
      acc.epf8 += row.epf8;
      acc.epf12 += row.epf12;
      acc.etf3 += row.etf3;
      acc.apit += row.apitTax;
      acc.net += row.netPay;
      return acc;
    }, { gross: 0, epf8: 0, epf12: 0, etf3: 0, apit: 0, net: 0 });
  }, [liveRows]);

  // Process Payroll Mutation
  const processMut = useMutation({
    mutationFn: () => api.post('/payroll/generate-all', { month, year }),
    onSuccess: (res) => {
      setProcessed(true);
      toast.success(`Payroll for ${selectedMonth} processed (${res.data?.generated || 0} payslips generated)!`);
      qc.invalidateQueries({ queryKey: ['payrolls-accountant'] });
      qc.invalidateQueries({ queryKey: ['epf-summary'] });
      refetchEpf();
      refetchPayrolls();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Payroll processing failed'),
  });

  const handleDownloadFormC = () => {
    const exportData = liveRows.map(r => ({
      epfNo: r.epfNo,
      employeeNo: r.id,
      name: r.name,
      nic: r.epfSummaryObj?.nic || '—',
      basicSalary: r.basicSalary,
      epfEmployee: r.epf8,
      epfEmployer: r.epf12,
      totalEPF: r.epf8 + r.epf12,
      etfEmployer: r.etf3,
      isPaid: r.payrollObj?.status === 'paid',
    }));
    exportEpfFormC(exportData, selectedMonth);
  };

  const handleDownloadSinglePayslip = async (payrollObj) => {
    if (!payrollObj) {
      toast.error('No generated payslip found for this employee yet. Please process payroll first.');
      return;
    }
    try {
      await downloadPayslipPdf(payrollObj, siteSettings || {});
      toast.success('Payslip PDF downloaded');
    } catch {
      toast.error('Failed to export payslip PDF');
    }
  };

  const isLoading = epfLoading || payrollLoading;

  return (
    <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* Accountant Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">ACCOUNTANT PAYROLL ENGINE</span>
          <h2 className="text-xl font-bold text-slate-900">Sri Lanka Statutory Payroll & Form C Generator</h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setProcessed(false);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          />
          <button
            onClick={() => processMut.mutate()}
            disabled={processMut.isPending}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Calculator size={16} /> {processMut.isPending ? 'Processing…' : 'Process Payroll'}
          </button>
        </div>
      </div>

      {(processed || payrolls.length > 0) && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <span>Payroll for <strong>{selectedMonth}</strong> processed ({liveRows.length} active records). EPF/ETF Form C export ready.</span>
          </div>
          <button 
            onClick={handleDownloadFormC}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-sm"
          >
            <Download size={14} /> Download Form C
          </button>
        </div>
      )}

      {/* Summary Statutory Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 font-semibold uppercase">TOTAL NET PAYABLE</div>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">LKR {totals.net.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 font-semibold uppercase">TOTAL EPF (8% + 12%)</div>
          <div className="text-xl font-bold text-blue-700 mt-1 font-mono">LKR {(totals.epf8 + totals.epf12).toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 font-semibold uppercase">TOTAL ETF (3%)</div>
          <div className="text-xl font-bold text-purple-700 mt-1 font-mono">LKR {totals.etf3.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 font-semibold uppercase">APIT TAX DEDUCTION</div>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">LKR {totals.apit.toLocaleString()}</div>
        </div>
      </div>

      {/* Live Payroll Calculation Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-7 h-7 border-3 border-orange-600/30 border-t-orange-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Loading statutory payroll data…</p>
          </div>
        ) : liveRows.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No payroll or employee records found for {selectedMonth}. Click <strong>Process Payroll</strong> above to generate.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-3">Emp Details</th>
                <th className="p-3">Basic (LKR)</th>
                <th className="p-3">OT Pay</th>
                <th className="p-3">Gross Salary</th>
                <th className="p-3 text-rose-600">EPF 8% (Emp)</th>
                <th className="p-3 text-blue-600">EPF 12% (Comp)</th>
                <th className="p-3 text-purple-600">ETF 3% (Comp)</th>
                <th className="p-3 text-amber-600">APIT Tax</th>
                <th className="p-3 text-emerald-700">Net Pay</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {liveRows.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-sans">
                    <div className="font-bold text-slate-800">{emp.name}</div>
                    <div className="text-[10px] text-slate-400">{emp.id} | {emp.epfNo}</div>
                  </td>
                  <td className="p-3 font-bold text-slate-700">{emp.basicSalary.toLocaleString()}</td>
                  <td className="p-3 text-emerald-600">{emp.otPay > 0 ? `+${emp.otPay.toLocaleString()}` : '—'}</td>
                  <td className="p-3 font-bold text-slate-800">{emp.grossSalary.toLocaleString()}</td>
                  <td className="p-3 text-rose-600">-{emp.epf8.toLocaleString()}</td>
                  <td className="p-3 text-blue-600">{emp.epf12.toLocaleString()}</td>
                  <td className="p-3 text-purple-600">{emp.etf3.toLocaleString()}</td>
                  <td className="p-3 text-amber-600">{emp.apitTax > 0 ? `-${emp.apitTax.toLocaleString()}` : '0'}</td>
                  <td className="p-3 font-bold text-emerald-700 text-sm">{emp.netPay.toLocaleString()}</td>
                  <td className="p-3 text-right font-sans">
                    <button
                      onClick={() => handleDownloadSinglePayslip(emp.payrollObj)}
                      title="Download Payslip PDF"
                      className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Download size={13} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
