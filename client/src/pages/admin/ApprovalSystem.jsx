import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, ShieldCheck, FileText, Package, DollarSign, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApprovalSystem() {
  const [filterType, setFilterType] = useState('ALL');

  const requests = [
    { id: 'REQ-1092', type: 'Material Requisition (MR)', requestedBy: 'Site Supervisor Sunil', project: 'Lotus Luxury Villa', details: '150 Bags Tokyo Super Cement + 2 Tons Steel', amount: 'LKR 845,000', stage: 'Pending Supervisor', date: '2026-07-30' },
    { id: 'REQ-1093', type: 'Purchase Order (PO)', requestedBy: 'Procurement Engineer Silva', project: 'Rajagiriya Commercial Site', details: '20 Cubes Washing Sand via Supplier Lanka Sand', amount: 'LKR 320,000', stage: 'Supervisor Approved', date: '2026-07-29' },
    { id: 'REQ-1094', type: 'Employee Leave Request', requestedBy: 'Mason Operator Perera', project: 'Lotus Luxury Villa', details: 'Medical Leave (3 Days)', amount: 'N/A', stage: 'Manager Approved', date: '2026-07-28' },
    { id: 'REQ-1095', type: 'Expense Voucher', requestedBy: 'Accountant Bandara', project: 'Head Office', details: 'Site Transport & Machinery Fuel Reimbursement', amount: 'LKR 142,500', stage: 'Director Approved', date: '2026-07-27' },
  ];

  const handleApprove = (id) => {
    toast.success(`Request ${id} approved successfully!`);
  };

  const handleReject = (id) => {
    toast.error(`Request ${id} rejected.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Central Multi-Level Approval System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Request Progression: Supervisor → Project Manager → CEO / Director Approval
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        {['ALL', 'Material Requisition (MR)', 'Purchase Order (PO)', 'Employee Leave Request', 'Expense Voucher'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              filterType === t ? 'border-orange-600 text-orange-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Approvals Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                <th className="py-3 px-2">Req ID</th>
                <th className="py-3 px-2">Type</th>
                <th className="py-3 px-2">Requested By</th>
                <th className="py-3 px-2">Project / Site</th>
                <th className="py-3 px-2">Details</th>
                <th className="py-3 px-2">Amount</th>
                <th className="py-3 px-2">Stage Status</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-2 font-mono text-xs font-bold text-orange-600">{r.id}</td>
                  <td className="py-3 px-2 text-xs font-semibold text-slate-800">{r.type}</td>
                  <td className="py-3 px-2 text-xs text-slate-700">{r.requestedBy}</td>
                  <td className="py-3 px-2 text-xs text-slate-500">{r.project}</td>
                  <td className="py-3 px-2 text-xs text-slate-600">{r.details}</td>
                  <td className="py-3 px-2 font-mono font-bold text-slate-900 text-xs">{r.amount}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                      r.stage === 'Director Approved' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      r.stage === 'Manager Approved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      r.stage === 'Supervisor Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {r.stage}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right space-x-2">
                    <button 
                      onClick={() => handleApprove(r.id)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold shadow-xs cursor-pointer"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleReject(r.id)}
                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl font-bold shadow-xs cursor-pointer"
                    >
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
