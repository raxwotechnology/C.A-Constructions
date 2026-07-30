import React from 'react';
import { Download, FileSpreadsheet, FileText, BarChart3, Printer } from 'lucide-react';

export default function ReportsExportView() {
  const handleExportExcel = (moduleName) => {
    window.open(`/api/exports/excel/${moduleName}`, '_blank');
  };

  const handleExportPDF = (moduleName) => {
    window.open(`/api/exports/pdf/${moduleName}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Reports & Enterprise Analytics Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            SLS 573 Variance Analysis, Cashflow Reports & 1-Click Export to PDF / Excel (.xlsx)
          </p>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Projects Export */}
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-cyan-400">
            <BarChart3 size={24} />
            <h3 className="text-lg font-bold text-slate-100">Project & BOQ Variance Report</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Detailed breakdown of planned contract value vs actual construction cost for all active sites compliant with SLS 573.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={() => handleExportExcel('projects')}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all shadow-md"
            >
              <FileSpreadsheet size={16} /> Excel (.xlsx)
            </button>
            <button 
              onClick={() => handleExportPDF('projects')}
              className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 rounded-xl text-xs transition-all shadow-md"
            >
              <FileText size={16} /> PDF Report
            </button>
          </div>
        </div>

        {/* Finance Export */}
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-emerald-400">
            <FileText size={24} />
            <h3 className="text-lg font-bold text-slate-100">Financial Statements & Taxes</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Double-entry ledger records, Profit & Loss statement, Balance Sheet & Sri Lanka VAT (18%) / APIT tax audit schedules.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={() => handleExportExcel('finance')}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all shadow-md"
            >
              <FileSpreadsheet size={16} /> Excel (.xlsx)
            </button>
            <button 
              onClick={() => handleExportPDF('finance')}
              className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 rounded-xl text-xs transition-all shadow-md"
            >
              <FileText size={16} /> PDF Report
            </button>
          </div>
        </div>

        {/* Store & Stock Export */}
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-amber-400">
            <FileSpreadsheet size={24} />
            <h3 className="text-lg font-bold text-slate-100">Inventory & Store Audit Log</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Central warehouse & site stock levels, reorder thresholds, Goods Received Notes (GRN), and intra-site transfers.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={() => handleExportExcel('inventory')}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all shadow-md"
            >
              <FileSpreadsheet size={16} /> Excel (.xlsx)
            </button>
            <button 
              onClick={() => handleExportPDF('inventory')}
              className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 rounded-xl text-xs transition-all shadow-md"
            >
              <FileText size={16} /> PDF Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
