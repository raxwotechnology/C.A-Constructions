import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, ShieldCheck, FileText, Package, DollarSign, UserCheck } from 'lucide-react';

export default function ApprovalSystem() {
  const [filterType, setFilterType] = useState('ALL');

  const requests = [
    { id: 'REQ-1092', type: 'Material Requisition (MR)', requestedBy: 'Site Supervisor Sunil', project: 'Lotus Luxury Villa', details: '150 Bags Tokyo Super Cement + 2 Tons Steel', amount: 'LKR 845,000', stage: 'Pending Supervisor', date: '2026-07-30' },
    { id: 'REQ-1093', type: 'Purchase Order (PO)', requestedBy: 'Procurement Engineer Silva', project: 'Rajagiriya Commercial Site', details: '20 Cubes Washing Sand via Supplier Lanka Sand', amount: 'LKR 320,000', stage: 'Supervisor Approved', date: '2026-07-29' },
    { id: 'REQ-1094', type: 'Employee Leave Request', requestedBy: 'Mason Operator Perera', project: 'Lotus Luxury Villa', details: 'Medical Leave (3 Days)', amount: 'N/A', stage: 'Manager Approved', date: '2026-07-28' },
    { id: 'REQ-1095', type: 'Expense Voucher', requestedBy: 'Accountant Bandara', project: 'Head Office', details: 'Site Transport & Machinery Fuel Reimbursement', amount: 'LKR 142,500', stage: 'Director Approved', date: '2026-07-27' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Central Multi-Level Approval System
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Request Progression: Supervisor → Project Manager → CEO / Director Approval
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-700/60 gap-4 text-xs font-semibold">
        {['ALL', 'Material Requisition (MR)', 'Purchase Order (PO)', 'Employee Leave Request', 'Expense Voucher'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              filterType === t ? 'border-cyan-400 text-cyan-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Approvals Table */}
      <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-3">Req ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Requested By</th>
                <th className="p-3">Project / Site</th>
                <th className="p-3">Details</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Stage Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-mono text-cyan-400 font-bold">{r.id}</td>
                  <td className="p-3 text-xs font-semibold text-slate-200">{r.type}</td>
                  <td className="p-3 text-slate-300">{r.requestedBy}</td>
                  <td className="p-3 text-xs text-slate-400">{r.project}</td>
                  <td className="p-3 text-xs text-slate-300">{r.details}</td>
                  <td className="p-3 font-mono font-bold text-emerald-400">{r.amount}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                      r.stage === 'Director Approved' ? 'bg-purple-950 text-purple-400 border-purple-800' :
                      r.stage === 'Manager Approved' ? 'bg-blue-950 text-blue-400 border-blue-800' :
                      r.stage === 'Supervisor Approved' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                      'bg-amber-950 text-amber-400 border-amber-800'
                    }`}>
                      {r.stage}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold shadow-md">
                      Approve
                    </button>
                    <button className="text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold shadow-md">
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
