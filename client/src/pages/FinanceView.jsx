import React, { useState } from 'react';
import { DollarSign, BookOpen, Receipt, Scale, TrendingUp, Plus, X, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { FINANCIAL_ACCOUNT_TYPES } from '../config/categories';
import FinancialStatements from '../components/finance/FinancialStatements';
import TaxCalculator from '../components/finance/TaxCalculator';
import toast from 'react-hot-toast';

export default function FinanceView({ defaultTab = 'ledger' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showJournalModal, setShowJournalModal] = useState(false);

  const [journalForm, setJournalForm] = useState({
    debitAccount: 'Bank - Commercial Bank',
    creditAccount: 'Client Advances',
    amount: '',
    description: '',
  });

  const dailyFinancials = [
    { date: '2026-08-04', income: 4500000, expenses: 840000, net: 3660000, notes: 'Client Advance (Kalaniya Site) - Material GRN Payments' },
    { date: '2026-08-03', income: 1200000, expenses: 320000, net: 880000, notes: 'Quotation Payment #402 - Subcontractor Doors/Windows' },
    { date: '2026-08-02', income: 0, expenses: 145000, net: -145000, notes: 'Worker Daily Wages & Site Petty Cash Topup' },
    { date: '2026-08-01', income: 2800000, expenses: 510000, net: 2290000, notes: 'Progress Invoice #102 Payment' },
  ];

  const transactions = [
    { id: 'TX-901', date: '2026-07-28', debitAccount: 'Bank - Commercial Bank', creditAccount: 'Client Advances', amount: 4500000, description: 'Lotus Villa Phase 2 Advance Payment' },
    { id: 'TX-902', date: '2026-07-29', debitAccount: 'Material Stock (Cement)', creditAccount: 'Accounts Payable - LankaCement', amount: 352500, description: '150 Bags Tokyo Super Cement GRN-489' },
    { id: 'TX-903', date: '2026-07-30', debitAccount: 'Site Petty Cash', creditAccount: 'Bank - Commercial Bank', amount: 50000, description: 'Site Petty Cash Top-up for Site Supervisor' },
  ];

  const handleRecordJournal = (e) => {
    e.preventDefault();
    if (!journalForm.amount || Number(journalForm.amount) <= 0) {
      toast.error('Please enter a valid amount!');
      return;
    }
    toast.success(`Journal Voucher (TX-${Math.floor(100 + Math.random() * 900)}) recorded successfully!`);
    setShowJournalModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Finance, Double-Entry Accounts & Sri Lanka Taxes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            General Ledger, Cash Book, Bank Book, Trial Balance, P&L, Balance Sheet & VAT (18%) / APIT Taxes
          </p>
        </div>
        <button 
          onClick={() => setShowJournalModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm cursor-pointer"
        >
          <Plus size={18} />
          Record Journal Entry
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
        {['ledger', 'daily', 'tax', 'statements'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              activeTab === t
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t === 'ledger' && 'Double-Entry General Ledger'}
            {t === 'daily' && 'Daily Financials'}
            {t === 'tax' && 'Tax Calculator (VAT & CIT)'}
            {t === 'statements' && 'Financial Statements & Tax Audit'}
          </button>
        ))}
      </div>

      {/* Ledger View */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen size={20} className="text-orange-600" />
              General Journal Entries
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                  <th className="py-3 px-2">Voucher ID</th>
                  <th className="py-3 px-2">Date</th>
                  <th className="py-3 px-2">Debit Account (Dr)</th>
                  <th className="py-3 px-2">Credit Account (Cr)</th>
                  <th className="py-3 px-2">Description</th>
                  <th className="py-3 px-2 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs font-bold text-orange-600">{tx.id}</td>
                    <td className="py-3 px-2 text-xs text-slate-500">{tx.date}</td>
                    <td className="py-3 px-2 text-xs font-semibold text-slate-800">{tx.debitAccount}</td>
                    <td className="py-3 px-2 text-xs text-slate-600">{tx.creditAccount}</td>
                    <td className="py-3 px-2 text-xs text-slate-500 max-w-xs">{tx.description}</td>
                    <td className="py-3 px-2 text-xs text-right font-bold text-slate-900">{tx.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'daily' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar size={20} className="text-orange-600" />
              Daily Financials (Day-by-Day Income, Expenses & Net Cash Flow)
            </h2>
            <span className="text-xs text-slate-500">Auto-calculated from Invoices, Payments, GRN & Payroll</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                  <th className="py-3 px-2">Date</th>
                  <th className="py-3 px-2 text-right">Daily Income (LKR)</th>
                  <th className="py-3 px-2 text-right">Daily Expenses (LKR)</th>
                  <th className="py-3 px-2 text-right">Net Daily Cash Flow (LKR)</th>
                  <th className="py-3 px-2">Summary Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyFinancials.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-3.5 px-2 font-medium text-slate-800">{d.date}</td>
                    <td className="py-3.5 px-2 text-right font-bold text-emerald-600">+ LKR {d.income.toLocaleString()}</td>
                    <td className="py-3.5 px-2 text-right font-bold text-red-600">- LKR {d.expenses.toLocaleString()}</td>
                    <td className={`py-3.5 px-2 text-right font-black ${d.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      LKR {d.net.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-2 text-xs text-slate-500">{d.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tax' && <TaxCalculator />}

      {activeTab === 'statements' && <FinancialStatements />}

      {/* Journal Modal */}
      {showJournalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Record Journal Entry</h3>
              <button onClick={() => setShowJournalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRecordJournal} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Debit Account (Dr)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={journalForm.debitAccount}
                  onChange={(e) => setJournalForm({ ...journalForm, debitAccount: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Credit Account (Cr)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={journalForm.creditAccount}
                  onChange={(e) => setJournalForm({ ...journalForm, creditAccount: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount (LKR)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 150000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  value={journalForm.amount}
                  onChange={(e) => setJournalForm({ ...journalForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Payment for Cement GRN-489"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={journalForm.description}
                  onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Post Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
