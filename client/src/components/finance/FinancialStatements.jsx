import React, { useState } from 'react';
import { DollarSign, FileText, TrendingUp, TrendingDown, Scale, Building2, BookOpen } from 'lucide-react';

export default function FinancialStatements() {
  const [statementTab, setStatementTab] = useState('pl');

  return (
    <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold text-orange-600 uppercase">FINANCIAL STATEMENTS</span>
          <h2 className="text-xl font-bold text-slate-900">Cash Book, Bank Book, Trial Balance, P&L & Balance Sheet</h2>
        </div>
      </div>

      {/* Statement Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        {['pl', 'tb', 'bs', 'cashbook', 'bankbook'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatementTab(tab)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              statementTab === tab ? 'border-orange-600 text-orange-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
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
          <h3 className="text-sm font-bold text-orange-600">Statement of Profit & Loss (For Year Ended 2026)</h3>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-800 font-sans font-bold">TOTAL REVENUE (Client Payments & Variations)</span>
              <span className="text-emerald-700 font-bold">LKR 68,500,000</span>
            </div>
            <div className="pl-4 space-y-1 text-slate-600">
              <div className="flex justify-between"><span>Less: Material Expenses (Cement, Steel, Tiles)</span><span>LKR 22,400,000</span></div>
              <div className="flex justify-between"><span>Less: Labour Expenses (Skilled & Daily Labour)</span><span>LKR 11,800,000</span></div>
              <div className="flex justify-between"><span>Less: Site Expenses (Fuel, Transport, Machinery)</span><span>LKR 4,900,000</span></div>
              <div className="flex justify-between"><span>Less: Office Expenses (Rent, Utilities, Stationery)</span><span>LKR 3,000,000</span></div>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
              <span className="font-sans">NET OPERATING PROFIT BEFORE TAX</span>
              <span className="text-orange-600">LKR 26,400,000</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span className="font-sans">Less: Estimated VAT (18%) & Income Tax</span>
              <span>LKR 4,752,000</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-300 pt-2 text-sm font-bold text-emerald-700">
              <span className="font-sans">NET PROFIT AFTER TAX</span>
              <span>LKR 21,648,000</span>
            </div>
          </div>
        </div>
      )}

      {/* Trial Balance View */}
      {statementTab === 'tb' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-orange-600">Trial Balance Verification</h3>
          <table className="w-full text-left text-xs text-slate-800 font-mono border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-3">Account Title</th>
                <th className="p-3">Debit (LKR)</th>
                <th className="p-3">Credit (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="p-3 font-sans">Cash in Hand & Bank Balances</td><td className="p-3 text-emerald-700 font-bold">18,500,000</td><td className="p-3">-</td></tr>
              <tr><td className="p-3 font-sans">Machinery, Vehicles & Equipment</td><td className="p-3 text-emerald-700 font-bold">45,000,000</td><td className="p-3">-</td></tr>
              <tr><td className="p-3 font-sans">Client Revenue Account</td><td className="p-3">-</td><td className="p-3 text-orange-600 font-bold">68,500,000</td></tr>
              <tr><td className="p-3 font-sans">Owner Capital & Investment</td><td className="p-3">-</td><td className="p-3 text-orange-600 font-bold">37,100,000</td></tr>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <td className="p-3 font-sans">TOTAL EQUAL BALANCE</td>
                <td className="p-3 text-emerald-700 font-bold">LKR 105,600,000</td>
                <td className="p-3 text-orange-600 font-bold">LKR 105,600,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
