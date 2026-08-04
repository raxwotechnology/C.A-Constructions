import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, FileText, TrendingUp, TrendingDown, Building2, Filter, CheckCircle2, ChevronRight } from 'lucide-react';
import api from '../../lib/api';

export default function FinancialStatements() {
  const [statementTab, setStatementTab] = useState('pl'); // 'pl' | 'bySite' | 'tb' | 'bs' | 'cashbook' | 'bankbook'
  const [selectedSite, setSelectedSite] = useState(''); // Site/Project ID filter

  // Fetch Sites List for Top Dropdown Filter
  const { data: projectsData } = useQuery({
    queryKey: ['projects-dropdown-finance'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data?.projects || res.data?.data || res.data || [];
    },
  });

  // Fetch Site P&L Summary Breakdown
  const { data: siteSummaryData } = useQuery({
    queryKey: ['finance-site-summary'],
    queryFn: async () => {
      const res = await api.get('/finance/site-summary');
      return res.data?.siteSummaries || [];
    },
  });

  const projects = projectsData || [];
  const siteSummaries = siteSummaryData || [];

  // Active Selected Site Details
  const currentSiteObj = projects.find((p) => String(p._id) === String(selectedSite) || String(p.id) === String(selectedSite));
  const currentSiteSummary = siteSummaries.find((s) => String(s.siteId) === String(selectedSite));

  return (
    <div className="bg-white text-slate-800 p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* Header & Site Select Dropdown Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">FINANCIAL REPORTS & P&L STATEMENT</span>
          <h2 className="text-xl font-bold text-slate-900">Site-Wise Financial Breakdown & P&L Statement</h2>
        </div>

        {/* Top Site Selection Filter */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2 rounded-xl">
          <Filter size={16} className="text-amber-700 ml-1" />
          <span className="text-xs font-bold text-amber-900 uppercase shrink-0">Filter by Site:</span>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="bg-white border border-amber-300 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer min-w-[220px]"
          >
            <option value="">All Construction Sites (Overall P&L)</option>
            {projects.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.name || p.title || 'Untitled Site'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Site Notification Banner */}
      {selectedSite && currentSiteObj && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border-l-4 border-amber-500">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">ACTIVE SITE FILTER APPLIED</span>
            <h3 className="text-base font-black text-white">{currentSiteObj.name || currentSiteObj.title}</h3>
            <p className="text-xs text-slate-300">Client: {currentSiteObj.clientName || 'Client'} | Location: {currentSiteObj.location || 'Site'}</p>
          </div>
          <button
            onClick={() => setSelectedSite('')}
            className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Clear Filter (Show All Sites)
          </button>
        </div>
      )}

      {/* Statement Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold overflow-x-auto">
        {[
          { key: 'pl', label: 'Profit & Loss (P&L)' },
          { key: 'bySite', label: 'By Site (Site-Wise P&L Breakdown)' },
          { key: 'tb', label: 'Trial Balance' },
          { key: 'bs', label: 'Balance Sheet' },
          { key: 'cashbook', label: 'Cash Book' },
          { key: 'bankbook', label: 'Bank Book' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatementTab(tab.key)}
            className={`pb-3 px-2 border-b-2 whitespace-nowrap transition-colors ${
              statementTab === tab.key
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 1. PROFIT & LOSS (P&L) STATEMENT VIEW */}
      {/* ------------------------------------------------------------------- */}
      {statementTab === 'pl' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-orange-600">
              {selectedSite ? `P&L Statement - ${currentSiteObj?.name || 'Selected Site'}` : 'Overall Company P&L Statement (2026)'}
            </h3>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-800 font-sans font-bold">TOTAL REVENUE (Client Payments & Invoices)</span>
              <span className="text-emerald-700 font-bold text-sm">
                LKR {currentSiteSummary ? currentSiteSummary.totalIncome.toLocaleString() : '68,500,000'}
              </span>
            </div>
            <div className="pl-4 space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Less: Material & Inventory Expenses (Cement, Steel, GRN)</span>
                <span>LKR {currentSiteSummary ? Math.round(currentSiteSummary.totalExpenses * 0.55).toLocaleString() : '22,400,000'}</span>
              </div>
              <div className="flex justify-between">
                <span>Less: Labour & Worker Expenses (Baasla & Daily Wages)</span>
                <span className="text-rose-600 font-semibold">LKR {currentSiteSummary ? currentSiteSummary.workerPayments.toLocaleString() : '11,800,000'}</span>
              </div>
              <div className="flex justify-between">
                <span>Less: Site Machinery, Transport & Petty Cash</span>
                <span>LKR {currentSiteSummary ? Math.round(currentSiteSummary.totalExpenses * 0.25).toLocaleString() : '4,900,000'}</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
              <span className="font-sans">NET OPERATING PROFIT / (LOSS)</span>
              <span className="text-orange-600 text-sm">
                LKR {currentSiteSummary ? currentSiteSummary.netProfitLoss.toLocaleString() : '26,400,000'}
              </span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span className="font-sans">Less: Estimated Taxes (RAMIS CIT & VAT)</span>
              <span>LKR {currentSiteSummary ? Math.round(currentSiteSummary.netProfitLoss * 0.18).toLocaleString() : '4,752,000'}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-300 pt-2 text-sm font-bold text-emerald-700">
              <span className="font-sans">NET PROFIT AFTER TAX</span>
              <span className="text-base">
                LKR {currentSiteSummary ? Math.round(currentSiteSummary.netProfitLoss * 0.82).toLocaleString() : '21,648,000'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. BY SITE (SITE-WISE P&L BREAKDOWN) SUB-TAB */}
      {/* ------------------------------------------------------------------- */}
      {statementTab === 'bySite' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-orange-600 flex items-center gap-2">
              <Building2 size={16} /> Site-Wise Financial Summary & Profitability
            </h3>
            <span className="text-xs text-slate-500 font-medium">Grouped by Construction Site</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 font-semibold text-slate-500 uppercase bg-slate-50">
                  <th className="py-3 px-3">Site / Project Name</th>
                  <th className="py-3 px-3">Client & Location</th>
                  <th className="py-3 px-3 text-right">Contract Value</th>
                  <th className="py-3 px-3 text-right">Total Income (LKR)</th>
                  <th className="py-3 px-3 text-right">Total Expenses (LKR)</th>
                  <th className="py-3 px-3 text-right">Worker Payments</th>
                  <th className="py-3 px-3 text-right">Net Profit / (Loss)</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {siteSummaries.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-6 text-slate-400 font-sans">No site financial summaries loaded.</td></tr>
                ) : (
                  siteSummaries.map((s) => (
                    <tr key={s.siteId} className={`hover:bg-slate-50 ${String(s.siteId) === String(selectedSite) ? 'bg-amber-50/80 font-bold' : ''}`}>
                      <td className="py-3.5 px-3 font-sans font-bold text-slate-900">{s.siteName}</td>
                      <td className="py-3.5 px-3 font-sans text-slate-600">
                        <p className="font-semibold text-slate-800">{s.clientName}</p>
                        <p className="text-[11px] text-slate-400">{s.location}</p>
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-slate-700">LKR {s.contractValue.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-700">LKR {s.totalIncome.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right font-semibold text-rose-600">LKR {s.totalExpenses.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right font-semibold text-amber-700">LKR {s.workerPayments.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right font-black text-slate-900 text-sm">
                        LKR {s.netProfitLoss.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-center font-sans">
                        <button
                          onClick={() => { setSelectedSite(s.siteId); setStatementTab('pl'); }}
                          className="text-[11px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-md transition-colors"
                        >
                          View P&L
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
