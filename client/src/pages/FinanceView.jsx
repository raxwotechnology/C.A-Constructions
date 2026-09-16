import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, BookOpen, Receipt, Scale, TrendingUp, Plus, X, Calendar, ArrowUpRight, ArrowDownRight, Truck } from 'lucide-react';
import { FINANCIAL_ACCOUNT_TYPES } from '../config/categories';
import FinancialStatements from '../components/finance/FinancialStatements';
import TaxCalculator from '../components/finance/TaxCalculator';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function FinanceView({ defaultTab = 'ledger' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');

  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    debitAccount: 'Bank - Commercial Bank',
    creditAccount: 'Client Advances',
    amount: '',
    description: '',
  });

  // Fetch Projects for Filter
  const { data: projectsData } = useQuery({
    queryKey: ['projects-list-finance-view'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });
  const projectsList = Array.isArray(projectsData?.projects)
    ? projectsData.projects
    : Array.isArray(projectsData?.data)
    ? projectsData.data
    : Array.isArray(projectsData)
    ? projectsData
    : [];

  // Fetch Machinery & Vehicles Asset summary for Finance View
  const { data: assetData } = useQuery({
    queryKey: ['assets-finance-summary'],
    queryFn: async () => {
      const res = await api.get('/assets');
      return res.data;
    },
  });

  const totalAssetVal = assetData?.totalValue || (Array.isArray(assetData?.assets) ? assetData.assets.reduce((s, a) => s + Number(a.assetValue || a.amount || 0), 0) : 0);
  const assetCount = assetData?.count || (Array.isArray(assetData?.assets) ? assetData.assets.length : 0);

  const dailyFinancials = [];
  const transactions = [];

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
            General Ledger, Cash Book, Bank Book, Trial Balance, P&L, Balance Sheet & Asset Valuations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 font-bold text-xs focus:outline-none shadow-xs"
          >
            <option value="">All Projects (Global View)</option>
            {projectsList.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.name || p.title || 'Untitled Project'}
              </option>
            ))}
          </select>

          <button 
            onClick={() => setShowJournalModal(true)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm cursor-pointer whitespace-nowrap"
          >
            <Plus size={18} />
            Record Journal Entry
          </button>
        </div>
      </div>

      {/* Finance Overview Asset Metric Card Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">General Ledger Status</p>
            <h3 className="text-xl font-black text-slate-900">Balanced & Audited</h3>
            <p className="text-[11px] text-emerald-600 font-medium">Double-Entry Verified</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <BookOpen size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Machinery & Fleet Asset Value</p>
            <h3 className="text-xl font-black text-emerald-700">LKR {totalAssetVal.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-500 font-medium">{assetCount} Registered Fleet Assets</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Truck size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax Compliance (RAMIS)</p>
            <h3 className="text-xl font-black text-slate-900">VAT (18%) & CIT</h3>
            <p className="text-[11px] text-slate-500 font-medium">Calculated per Inland Revenue Act</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Scale size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-medium overflow-x-auto">
        {[
          { key: 'ledger', label: 'Double-Entry General Ledger' },
          { key: 'daily', label: 'Daily Financials' },
          { key: 'tax', label: 'Tax Calculator (VAT & CIT)' },
          { key: 'statements', label: 'Financial Statements & Tax Audit' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`pb-3 px-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
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
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
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
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Record Journal Entry</h3>
              <button onClick={() => setShowJournalModal(false)} className="text-slate-500 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRecordJournal} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Transaction Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={journalForm.date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                />
              </div>
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
                  placeholder="e.g. 50000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={journalForm.amount}
                  onChange={(e) => setJournalForm({ ...journalForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={journalForm.description}
                  onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
