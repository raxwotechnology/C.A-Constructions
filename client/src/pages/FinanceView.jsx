import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, FileCheck, Plus, Filter } from 'lucide-react';
import { 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  ASSET_CATEGORIES, 
  LIABILITY_CATEGORIES, 
  CAPITAL_CATEGORIES, 
  TAX_CATEGORIES 
} from '../config/categories';

export default function FinanceView() {
  const [selectedCategoryType, setSelectedCategoryType] = useState('Income');

  const sampleLedger = [
    { txNo: 'TX-2026-089', date: '2026-07-28', type: 'Income', category: 'Client Payment', payee: 'Lotus Villa Client', amount: 8500000, vat: 1530000, method: 'Bank Transfer', status: 'Approved' },
    { txNo: 'TX-2026-090', date: '2026-07-29', type: 'Expense', category: 'Cement (Material)', payee: 'Tokyo Cement Lanka PLC', amount: 485000, vat: 87300, method: 'Cheque', status: 'Approved' },
    { txNo: 'TX-2026-091', date: '2026-07-30', type: 'Expense', category: 'Daily Labour (Labour)', payee: 'Subcontractor Perera', amount: 145000, vat: 0, method: 'Cash', status: 'Approved' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Finance & Double-Entry Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cash Book, Bank Book, Progress Billing Invoices, P&L, Balance Sheet & Sri Lankan VAT/APIT Tax Tracking
          </p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all text-sm">
          <Plus size={18} />
          New Voucher / Ledger Entry
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">TOTAL REVENUE (YTD)</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">LKR 68,500,000</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">TOTAL OPERATING EXPENSES</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">LKR 42,100,000</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">NET PROFIT BEFORE TAX</p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">LKR 26,400,000</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-2xl">
          <p className="text-xs text-slate-400 font-medium">VAT / APIT TAX LIABILITIES</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">LKR 4,752,000</p>
        </div>
      </div>

      {/* Master Categories Filter Bar */}
      <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl flex flex-wrap items-center gap-3 text-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Filter size={14} /> Master Category:
        </span>
        {['Income', 'Expense', 'Asset', 'Liability', 'Capital', 'Tax'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategoryType(cat)}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all ${
              selectedCategoryType === cat
                ? 'bg-cyan-500 text-slate-900 shadow-md'
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Double Entry Ledger Table */}
      <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">General Ledger & Transaction Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-3">Tx No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Master Category</th>
                <th className="p-3">Payee / Payer</th>
                <th className="p-3">Amount (LKR)</th>
                <th className="p-3">VAT (18%)</th>
                <th className="p-3">Payment Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {sampleLedger.map((tx) => (
                <tr key={tx.txNo} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-mono text-cyan-400 font-bold">{tx.txNo}</td>
                  <td className="p-3 text-xs text-slate-400">{tx.date}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${
                      tx.type === 'Income' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-3 text-slate-200">{tx.category}</td>
                  <td className="p-3 text-slate-300">{tx.payee}</td>
                  <td className="p-3 font-mono font-bold text-slate-100">{tx.amount.toLocaleString()}</td>
                  <td className="p-3 font-mono text-amber-400">{tx.vat.toLocaleString()}</td>
                  <td className="p-3 text-xs text-slate-400">{tx.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
