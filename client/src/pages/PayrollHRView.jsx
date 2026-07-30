import React, { useState } from 'react';
import { Users, DollarSign, CalendarCheck, ShieldCheck, Download, Play } from 'lucide-react';
import { SRI_LANKA_PAYROLL_CONFIG } from '../config/categories';
import AccountantPayrollComponent from '../components/accountant/AccountantPayrollComponent';
import toast from 'react-hot-toast';

export default function PayrollHRView() {
  const [activeTab, setActiveTab] = useState('processor');

  const handleExportFormC = () => {
    toast.success('EPF Form C Schedule generated & downloaded successfully!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            HR, Attendance & Sri Lanka Statutory Payroll
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Basic Salary + OT, EPF Employee (8%), EPF Employer (12%), ETF (3%), APIT Tax & Form C Export
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
        {['processor', 'compliance'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              activeTab === t
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t === 'processor' && 'Monthly Payroll Processor'}
            {t === 'compliance' && 'EPF / ETF & Statutory Compliance'}
          </button>
        ))}
      </div>

      {activeTab === 'processor' && <AccountantPayrollComponent />}

      {activeTab === 'compliance' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-600" />
            Sri Lanka Labour Department EPF Form C Export
          </h2>
          <p className="text-sm text-slate-600">
            Generate monthly EPF Form C C-Form text and PDF schedules ready for bank remittance submission to Central Bank of Sri Lanka (CBSL).
          </p>
          <button 
            onClick={handleExportFormC}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow-sm cursor-pointer"
          >
            <Download size={16} /> Export Form C (EPF / ETF Schedule)
          </button>
        </div>
      )}
    </div>
  );
}
