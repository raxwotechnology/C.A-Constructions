import React, { useState } from 'react';
import { Users, FileText, UserPlus, PhoneCall, Calendar, CheckCircle2 } from 'lucide-react';
import { PROJECT_SERVICE_TYPES } from '../config/categories';

export default function CRM() {
  const [activeTab, setActiveTab] = useState('leads');

  const leads = [
    { id: 'LD-101', name: 'Dr. K. Jayawardena', phone: '+94 77 123 4567', type: 'Residential Construction', location: 'Nawala', status: 'Site Visit Scheduled', estimatedValue: 'LKR 35M' },
    { id: 'LD-102', name: 'Commercial Bank Property Dev', phone: '+94 11 234 5678', type: 'Commercial Construction', location: 'Kandy', status: 'BOQ Quotation Sent', estimatedValue: 'LKR 95M' },
    { id: 'LD-103', name: 'Mrs. N. Perera', phone: '+94 71 987 6543', type: 'Renovation & Remodeling', location: 'Mount Lavinia', status: 'SBD-03 Agreement Drafted', estimatedValue: 'LKR 12M' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Customer Management (CRM)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Leads Pipeline, Site Visit Logs, BOQ Quotations & Digital SBD-03 Agreements
          </p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all text-sm">
          <UserPlus size={18} />
          New Client Lead
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-700/60 gap-4 text-sm font-medium">
        {['leads', 'quotations', 'agreements'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              activeTab === tab
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'leads' && 'Leads Pipeline'}
            {tab === 'quotations' && 'BOQ Quotations'}
            {tab === 'agreements' && 'Digital SBD-03 Agreements'}
          </button>
        ))}
      </div>

      {/* Leads Pipeline Content */}
      {activeTab === 'leads' && (
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-3">Lead ID</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Project Type</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Est. Value</th>
                  <th className="p-3">Pipeline Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {leads.map((ld) => (
                  <tr key={ld.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-mono text-cyan-400 font-semibold">{ld.id}</td>
                    <td className="p-3 font-medium text-slate-100">
                      <div>{ld.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <PhoneCall size={12} /> {ld.phone}
                      </div>
                    </td>
                    <td className="p-3 text-slate-300 text-xs">{ld.type}</td>
                    <td className="p-3 text-slate-300">{ld.location}</td>
                    <td className="p-3 text-emerald-400 font-semibold">{ld.estimatedValue}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800">
                        {ld.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-600 font-medium">
                        Log Site Visit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SBD-03 Contract Agreement Notice */}
      {activeTab === 'agreements' && (
        <div className="bg-slate-800/50 border border-cyan-500/30 p-6 rounded-2xl space-y-3">
          <div className="flex items-center gap-3 text-cyan-400">
            <FileText size={24} />
            <h3 className="text-lg font-bold">Standard Bidding Document (SBD-03) Contract Repository</h3>
          </div>
          <p className="text-sm text-slate-300">
            Generates ICTAD / CIDA Sri Lanka compliant SBD-03 legal contract agreements including liquidated damages, retention terms (5%), advance payment guarantee, and arbitration terms.
          </p>
        </div>
      )}
    </div>
  );
}
