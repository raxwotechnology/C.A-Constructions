import React, { useState } from 'react';
import { Users, DollarSign, Calculator, FileCheck, Shield, Plus } from 'lucide-react';

export default function PayrollHRView() {
  const [activePayrollTab, setActivePayrollTab] = useState('employees');

  const employees = [
    { empId: 'EMP-001', name: 'Chaminda Silva', designation: 'Senior Civil Engineer', basic: 185000, epfNo: 'EPF/8892', status: 'Active' },
    { empId: 'EMP-004', name: 'Sunil Shantha', designation: 'Site Supervisor', basic: 95000, epfNo: 'EPF/9102', status: 'Active' },
    { empId: 'EMP-012', name: 'Nalin Bandara', designation: 'Senior Accountant', basic: 160000, epfNo: 'EPF/8540', status: 'Active' },
  ];

  const payrollSample = [
    { 
      empId: 'EMP-001', name: 'Chaminda Silva', basic: 185000, otPay: 24000, gross: 209000, 
      epf8: 14800, epf12: 22200, etf3: 5550, apit: 12500, netPay: 181700 
    },
    { 
      empId: 'EMP-004', name: 'Sunil Shantha', basic: 95000, otPay: 18500, gross: 113500, 
      epf8: 7600, epf12: 11400, etf3: 2850, apit: 1800, netPay: 104100 
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            HR, Attendance & Sri Lanka Statutory Payroll Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Base Salary + OT + Allowances - EPF (8%/12%) - ETF (3%) - APIT Tax = Net Statutory Pay
          </p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all text-sm">
          <Calculator size={18} />
          Run Monthly Payroll (EPF/ETF)
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-700/60 gap-4 text-sm font-medium">
        {['employees', 'payroll', 'warning'].map((t) => (
          <button
            key={t}
            onClick={() => setActivePayrollTab(t)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              activePayrollTab === t
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'employees' && 'Employee Profiles & EPF Details'}
            {t === 'payroll' && 'Monthly Payroll Processor (Sri Lanka)'}
            {t === 'warning' && 'Warning Letters & Exit Checklists'}
          </button>
        ))}
      </div>

      {/* Payroll Processing Table */}
      {activePayrollTab === 'payroll' && (
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h2 className="text-lg font-semibold text-slate-100">July 2026 Statutory Payroll Calculations</h2>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full font-semibold">
              Ready for Bank Transfer (Form C Ready)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-3">Emp ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Basic (LKR)</th>
                  <th className="p-3">OT Pay</th>
                  <th className="p-3">Gross Salary</th>
                  <th className="p-3">EPF 8% (Deduction)</th>
                  <th className="p-3">EPF 12% (Employer)</th>
                  <th className="p-3">ETF 3% (Employer)</th>
                  <th className="p-3">APIT Tax</th>
                  <th className="p-3">Net Pay (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 font-mono text-xs">
                {payrollSample.map((p) => (
                  <tr key={p.empId} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-bold text-cyan-400">{p.empId}</td>
                    <td className="p-3 font-sans text-slate-200">{p.name}</td>
                    <td className="p-3">{p.basic.toLocaleString()}</td>
                    <td className="p-3 text-emerald-400">+{p.otPay.toLocaleString()}</td>
                    <td className="p-3 font-bold text-slate-100">{p.gross.toLocaleString()}</td>
                    <td className="p-3 text-rose-400">-{p.epf8.toLocaleString()}</td>
                    <td className="p-3 text-blue-400">{p.epf12.toLocaleString()}</td>
                    <td className="p-3 text-purple-400">{p.etf3.toLocaleString()}</td>
                    <td className="p-3 text-amber-400">-{p.apit.toLocaleString()}</td>
                    <td className="p-3 font-bold text-emerald-400 text-sm">{p.netPay.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
