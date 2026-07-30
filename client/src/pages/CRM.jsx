import React, { useState } from 'react';
import { UserCheck, FileText, Send, CheckCircle, Clock, XCircle, Plus, Search, Filter, X } from 'lucide-react';
import { CRM_LEAD_SOURCES } from '../config/categories';
import toast from 'react-hot-toast';

export default function CRM() {
  const [activeTab, setActiveTab] = useState('leads');
  const [showLeadModal, setShowLeadModal] = useState(false);

  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    project: '',
    budget: '',
    source: 'Website Inquiry',
  });

  const leads = [
    { id: 'LD-101', name: 'Dr. Ruwan Perera', project: 'Luxury House Construction (3-Story)', budget: 'LKR 35,000,000', status: 'Quotation Sent', source: 'Website Inquiry', phone: '0771234567' },
    { id: 'LD-102', name: 'Nihal Jayasinghe', project: 'Commercial Showroom Renovation', budget: 'LKR 18,000,000', status: 'Site Visit Completed', source: 'Client Referral', phone: '0719876543' },
    { id: 'LD-103', name: 'Apex Holdings (Pvt) Ltd', nameSub: 'Attn: Mr. Fernando', project: 'Warehouse & Office Complex', budget: 'LKR 85,000,000', status: 'SBD-03 Contract Draft', source: 'Facebook Ad', phone: '0112345678' },
  ];

  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!leadForm.name.trim()) {
      toast.error('Please enter client name!');
      return;
    }
    toast.success(`Lead for "${leadForm.name}" created successfully!`);
    setShowLeadModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Customer Management (CRM), Quotations & Agreements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Client Leads Pipeline, BOQ Quotation Builder & SBD-03 Standard Legal Contracts
          </p>
        </div>
        <button 
          onClick={() => setShowLeadModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm cursor-pointer"
        >
          <Plus size={18} />
          New Customer Lead
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
        {['leads', 'quotations', 'agreements'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 border-b-2 capitalize transition-colors ${
              activeTab === tab
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'leads' && 'Customer Leads & Enquiries'}
            {tab === 'quotations' && 'BOQ Quotations'}
            {tab === 'agreements' && 'SBD-03 Legal Contracts'}
          </button>
        ))}
      </div>

      {/* Leads View */}
      {activeTab === 'leads' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search leads by client name, project..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2">
                <option value="">All Sources</option>
                {CRM_LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                  <th className="py-3 px-2">Lead ID</th>
                  <th className="py-3 px-2">Client Name</th>
                  <th className="py-3 px-2">Project Scope</th>
                  <th className="py-3 px-2">Estimated Budget</th>
                  <th className="py-3 px-2">Lead Source</th>
                  <th className="py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs font-bold text-orange-600">{l.id}</td>
                    <td className="py-3 px-2">
                      <div className="font-semibold text-slate-800">{l.name}</div>
                      <div className="text-xs text-slate-400">{l.phone}</div>
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-600">{l.project}</td>
                    <td className="py-3 px-2 text-xs font-semibold text-slate-700">{l.budget}</td>
                    <td className="py-3 px-2 text-xs text-slate-500">{l.source}</td>
                    <td className="py-3 px-2">
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">New Customer Lead</h3>
              <button onClick={() => setShowLeadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Client Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ruwan Perera"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="0771234567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lead Source</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                  >
                    {CRM_LEAD_SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Project Scope & Description</label>
                <input
                  type="text"
                  placeholder="e.g. 3-Story Luxury Villa Construction"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={leadForm.project}
                  onChange={(e) => setLeadForm({ ...leadForm, project: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
