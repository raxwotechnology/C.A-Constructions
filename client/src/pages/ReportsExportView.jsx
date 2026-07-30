import React from 'react';
import { FileSpreadsheet, FileText, Download, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsExportView() {
  const reports = [
    { title: 'Project Profitability & Cost Overrun Audit', type: 'PDF & Excel', icon: FileSpreadsheet, desc: 'Detailed SLS 573 BOQ vs Actual site expenditure statement for CEO / Directors.' },
    { title: 'Form C EPF / ETF Monthly Contribution Schedule', type: 'Text / PDF', icon: FileText, desc: 'Sri Lanka Labour Department statutory Form C schedule for Central Bank submission.' },
    { title: 'Double-Entry General Ledger & Trial Balance', type: 'Excel (.xlsx)', icon: FileSpreadsheet, desc: 'Complete double-entry accounting records with audit logs for external auditor.' },
    { title: 'Site Inventory Stock Movement & GRN Log', type: 'PDF / Excel', icon: FileText, desc: 'Material consumption, reorder thresholds & supplier delivery variance report.' },
  ];

  const handleDownloadReport = (title, format) => {
    toast.success(`Exporting ${title} (${format})... Download starting!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Reports & 1-Click PDF / Excel Export Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Download Executive Audits, BOQ Statements, Tax Schedules & Store Movement Logs
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((r, i) => {
          const IconComp = r.icon;
          return (
            <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-100">
                    <IconComp size={24} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{r.title}</h2>
                    <span className="text-xs font-semibold text-slate-400 uppercase">{r.type}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{r.desc}</p>
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => handleDownloadReport(r.title, 'PDF')}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  <Download size={15} /> Export PDF Report
                </button>
                <button 
                  onClick={() => handleDownloadReport(r.title, 'Excel')}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  <Download size={15} /> Export Excel (.xlsx)
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
