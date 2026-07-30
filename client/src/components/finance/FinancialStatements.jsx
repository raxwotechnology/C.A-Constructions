import React, { useState } from 'react';
import { DollarSign, FileText, TrendingUp, TrendingDown, Scale, Building2, BookOpen } from 'lucide-react';

export default function FinancialStatements() {
  const [statementTab, setStatementTab] = useState('pl');

  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase">FINANCIAL STATEMENTS</span>
          <h2 className="text-xl font-bold text-slate-100">Cash Book, Bank Book, Trial Balance, P&L & Balance Sheet</h2>
        </div>
      </div>

      {/* Statement Sub Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        {['pl', 'tb', 'bs', 'cashbook', 'bankbook'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatementTab(tab)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              statementTab === tab ? 'border-cyan-400 text-cyan-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'pl' && 'Profit & Loss (P&L)'}
            {tab === 'tb' && 'Trial Balance'}
            {tab === 'bs' && 'Balance Sheet'}
            {tab === 'cashbook' && 'Cash Book'}
            {tab === 'bankbook' && 'Bank Book'}
          </button>
        ))}
      </div>

      {/* P&L Statement View */}
      {statementTab === 'pl' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-cyan-400">Statement of Profit & Loss (For Year Ended 2026)</h3>
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-sans font-bold">TOTAL REVENUE (Client Payments & Variations)</span>
              <span className="text-emerald-400 font-bold">LKR 68,500,000</span>
            </div>
            <div className="pl-4 space-y-1 text-slate-400">
              <div className="flex justify-between"><span>Less: Material Expenses (Cement, Steel, Tiles)</span><span>LKR 22,400,000</span></div>
              <div className="flex justify-between"><span>Less: Labour Expenses (Skilled & Daily Labour)</span><span>LKR 11,800,000</span></div>
              <div className="flex justify-between"><span>Less: Site Expenses (Fuel, Transport, Machinery)</span><span>LKR 4,900,000</span></div>
              <div className="flex justify-between"><span>Less: Office Expenses (Rent, Utilities, Stationery)</span><span>LKR 3,000,000</span></div>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-slate-100">
              <span className="font-sans">NET OPERATING PROFIT BEFORE TAX</span>
              <span className="text-cyan-400">LKR 26,400,000</span>
            </div>
            <div className="flex justify-between text-amber-400">
              <span className="font-sans">Less: Estimated VAT (18%) & Income Tax</span>
              <span>LKR 4,752,000</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-700 pt-2 text-sm font-bold text-emerald-400">
              <span className="font-sans">NET PROFIT AFTER TAX</span>
              <span>LKR 21,648,000</span>
            </div>
          </div>
        </div>
      )}

      {/* Trial Balance View */}
      {statementTab === 'tb' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-cyan-400">Trial Balance Verification</h3>
          <table className="w-full text-left text-xs text-slate-300 font-mono border border-slate-800 rounded-2xl overflow-hidden">
            <thead className="bg-slate-950 text-slate-400 uppercase">
              <tr>
                <th className="p-3">Account Title</th>
                <th className="p-3">Debit (LKR)</th>
                <th className="p-3">Credit (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr><td className="p-3 font-sans">Cash in Hand & Bank Balances</td><td className="p-3 text-emerald-400">18,500,000</td><td className="p-3">-</td></tr>
              <tr><td className="p-3 font-sans">Machinery, Vehicles & Equipment</td><td className="p-3 text-emerald-400">45,000,000</td><td className="p-3">-</td></tr>
              <tr><td className="p-3 font-sans">Client Revenue Account</td><td className="p-3">-</td><td className="p-3 text-cyan-400">68,500,000</td></tr>
              <tr><td className="p-3 font-sans">Owner Capital & Investment</td><td className="p-3">-</td><td className="p-3 text-cyan-400">37,100,000</td></tr>
              <tr className="bg-slate-950 font-bold text-slate-100">
                <td className="p-3 font-sans">TOTAL EQUAL BALANCE</td>
                <td className="p-3 text-emerald-400">LKR 105,600,000</td>
                <td className="p-3 text-cyan-400">LKR 105,600,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
