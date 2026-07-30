import React, { useState } from 'react';
import { 
  Calculator, DollarSign, FileSpreadsheet, Download, 
  CheckCircle2, AlertCircle, Building, UserCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountantPayrollComponent() {
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [processed, setProcessed] = useState(false);

  const [employees, setEmployees] = useState([
    {
      id: 'EMP-001',
      name: 'Chaminda Silva',
      designation: 'Senior Civil Engineer',
      epfNo: 'EPF/8892',
      basicSalary: 185000,
      allowances: 15000,
      regularOtHours: 12,
      otRate: 1500,
      doubleOtHours: 4,
      doubleOtRate: 2000,
    },
    {
      id: 'EMP-004',
      name: 'Sunil Shantha',
      designation: 'Site Supervisor',
      epfNo: 'EPF/9102',
      basicSalary: 95000,
      allowances: 8000,
      regularOtHours: 18,
      otRate: 850,
      doubleOtHours: 6,
      doubleOtRate: 1100,
    },
    {
      id: 'EMP-012',
      name: 'Nalin Bandara',
      designation: 'Senior Accountant',
      epfNo: 'EPF/8540',
      basicSalary: 160000,
      allowances: 10000,
      regularOtHours: 5,
      otRate: 1400,
      doubleOtHours: 0,
      doubleOtRate: 1800,
    }
  ]);

  const calculatePayroll = (emp) => {
    const otPay = (emp.regularOtHours * emp.otRate) + (emp.doubleOtHours * emp.doubleOtRate);
    const grossSalary = emp.basicSalary + emp.allowances + otPay;
    
    const epfEligible = emp.basicSalary + emp.allowances;
    const epf8 = Math.round(epfEligible * 0.08);
    const epf12 = Math.round(epfEligible * 0.12);
    const etf3 = Math.round(epfEligible * 0.03);

    let apitTax = 0;
    if (grossSalary > 200000) {
      apitTax = Math.round((grossSalary - 200000) * 0.12 + 6000);
    } else if (grossSalary > 150000) {
      apitTax = Math.round((grossSalary - 150000) * 0.06);
    }

    const netPay = grossSalary - epf8 - apitTax;

    return { grossSalary, otPay, epf8, epf12, etf3, apitTax, netPay };
  };

  const totals = employees.reduce((acc, emp) => {
    const p = calculatePayroll(emp);
    acc.gross += p.grossSalary;
    acc.epf8 += p.epf8;
    acc.epf12 += p.epf12;
    acc.etf3 += p.etf3;
    acc.apit += p.apitTax;
    acc.net += p.netPay;
    return acc;
  }, { gross: 0, epf8: 0, epf12: 0, etf3: 0, apit: 0, net: 0 });

  const handleProcessPayroll = () => {
    setProcessed(true);
    toast.success(`Payroll for ${selectedMonth} processed successfully!`);
  };

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
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none"
          />
          <button
            onClick={handleProcessPayroll}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Calculator size={16} /> Process Payroll
          </button>
        </div>
      </div>

      {processed && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>Payroll for {selectedMonth} processed successfully. EPF/ETF Form C export ready.</span>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {employees.map((emp) => {
              const p = calculatePayroll(emp);
              return (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-sans">
                    <div className="font-bold text-slate-800">{emp.name}</div>
                    <div className="text-[10px] text-slate-400">{emp.id} | {emp.epfNo}</div>
                  </td>
                  <td className="p-3 font-bold text-slate-700">{emp.basicSalary.toLocaleString()}</td>
                  <td className="p-3 text-emerald-600">+{p.otPay.toLocaleString()}</td>
                  <td className="p-3 font-bold text-slate-800">{p.grossSalary.toLocaleString()}</td>
                  <td className="p-3 text-rose-600">-{p.epf8.toLocaleString()}</td>
                  <td className="p-3 text-blue-600">{p.epf12.toLocaleString()}</td>
                  <td className="p-3 text-purple-600">{p.etf3.toLocaleString()}</td>
                  <td className="p-3 text-amber-600">-{p.apitTax.toLocaleString()}</td>
                  <td className="p-3 font-bold text-emerald-700 text-sm">{p.netPay.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
