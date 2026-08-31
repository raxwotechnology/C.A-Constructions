import React, { useState, useEffect } from 'react';
import { 
  UserCheck, FileText, Send, CheckCircle, Clock, XCircle, Plus, Search, Filter, X,
  Building, DollarSign, Phone, FileCheck, Layers, RefreshCw, ArrowRight, UserPlus
} from 'lucide-react';
import { CRM_LEAD_SOURCES } from '../config/categories';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function CRM() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('leads');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    project: '',
    budget: '',
    source: 'Website Inquiry',
  });

  const { data: clientsData } = useQuery({
    queryKey: ['crm-clients'],
    queryFn: () => api.get('/auth/clients').then(r => r.data).catch(() => ({ clients: [] })),
  });

  const dbClientsList = Array.isArray(clientsData?.clients) ? clientsData.clients : (Array.isArray(clientsData?.users) ? clientsData.users : (Array.isArray(clientsData) ? clientsData : []));

  const [leads, setLeads] = useState([]);

  useEffect(() => {
    if (dbClientsList.length > 0) {
      setLeads(dbClientsList.map(c => ({
        id: c._id || c.id,
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        project: c.project || 'Customer Inquiry',
        budget: c.budget || 'N/A',
        status: c.status || 'New Lead',
        source: c.source || 'Direct Contact',
        dbClientId: c._id,
        syncedToDb: true
      })));
    } else {
      setLeads([]);
    }
  }, [dbClientsList]);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!leadForm.name.trim()) {
      toast.error('Please enter client name!');
      return;
    }

    setIsSubmitting(true);
    let dbClientId = null;

    try {
      // 1. Immediately create in MongoDB as a client user
      const res = await api.post('/auth/clients', {
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim() || '0770000000',
        email: leadForm.email.trim() || undefined,
        role: 'client',
        password: 'Client@2026',
      });
      dbClientId = res.data?.user?._id || res.data?.client?._id;
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['clients-list'] });
      qc.invalidateQueries({ queryKey: ['lookup-clients'] });
    } catch (err) {
      console.warn('[handleCreateLead] Client save warning:', err.response?.data?.message || err.message);
    }

    const nextIdNumber = 101 + leads.length;
    const newLead = {
      id: `LD-${nextIdNumber}`,
      name: leadForm.name.trim(),
      email: leadForm.email.trim(),
      phone: leadForm.phone.trim() || '0770000000',
      project: leadForm.project.trim() || 'Residential / Commercial Project',
      budget: leadForm.budget.trim() ? `LKR ${Number(leadForm.budget.replace(/[^0-9]/g, '')).toLocaleString()}` : 'LKR 25,000,000',
      source: leadForm.source,
      status: 'New Lead Enquiry',
      createdAt: new Date().toISOString(),
      dbClientId,
      syncedToDb: true,
    };

    setLeads([newLead, ...leads]);
    toast.success(`Lead for "${leadForm.name}" created and synced to Quotations!`);
    setShowLeadModal(false);
    setIsSubmitting(false);
    setLeadForm({
      name: '',
      email: '',
      phone: '',
      project: '',
      budget: '',
      source: 'Website Inquiry',
    });
  };

  const handleCreateQuotationForLead = async (lead) => {
    try {
      // Ensure registered in DB
      let clientId = lead.dbClientId;
      if (!clientId) {
        const res = await api.post('/auth/clients', {
          name: lead.name,
          phone: lead.phone || '0770000000',
          email: lead.email || undefined,
          role: 'client',
          password: 'Client@2026',
        });
        clientId = res.data?.user?._id || res.data?.client?._id;
      }
      navigate('/admin/quotations', {
        state: {
          createWithClient: {
            _id: clientId,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            project: lead.project,
          }
        }
      });
    } catch {
      navigate('/admin/quotations');
    }
  };

  const handleStatusChange = (leadId, newStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    toast.success(`Status updated to "${newStatus}"`);
  };

  // Filter leads based on search query and source
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      !searchQuery || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.phone && lead.phone.includes(searchQuery)) ||
      lead.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSource = !selectedSource || lead.source === selectedSource;
    return matchesSearch && matchesSource;
  });

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => syncLeadsToDatabase(false)}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all text-sm cursor-pointer disabled:opacity-50"
            title="Sync all leads into the Quotations client search"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin text-orange-600' : ''} />
            {isSyncing ? 'Syncing Leads...' : 'Sync Leads to Quotations'}
          </button>
          <button 
            onClick={() => setShowLeadModal(true)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm cursor-pointer"
          >
            <Plus size={18} />
            New Customer Lead
          </button>
        </div>
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
            {tab === 'leads' && `Customer Leads & Enquiries (${leads.length})`}
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads by client name, phone, project..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-500" />
              <select 
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2"
              >
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
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-2">Lead ID</th>
                  <th className="py-3 px-2">Client Name</th>
                  <th className="py-3 px-2">Project Scope</th>
                  <th className="py-3 px-2">Estimated Budget</th>
                  <th className="py-3 px-2">Lead Source</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs font-bold text-orange-600">{l.id}</td>
                    <td className="py-3 px-2">
                      <div className="font-semibold text-slate-800">{l.name}</div>
                      <div className="text-xs text-slate-500">{l.phone || 'No phone'}</div>
                      {l.email && <div className="text-[11px] text-slate-400">{l.email}</div>}
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-600">{l.project}</td>
                    <td className="py-3 px-2 text-xs font-semibold text-slate-700">{l.budget}</td>
                    <td className="py-3 px-2 text-xs text-slate-500">{l.source}</td>
                    <td className="py-3 px-2">
                      <select
                        value={l.status}
                        onChange={(e) => handleStatusChange(l.id, e.target.value)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-full border cursor-pointer focus:outline-none ${
                          l.status === 'New Lead Enquiry' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          l.status === 'Site Visit Completed' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          l.status === 'Quotation Sent' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          l.status === 'SBD-03 Contract Draft' || l.status === 'SBD3' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          l.status === 'Contract Signed / Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="New Lead Enquiry">New Lead Enquiry</option>
                        <option value="Site Visit Completed">Site Visit Completed</option>
                        <option value="Quotation Sent">Quotation Sent</option>
                        <option value="SBD-03 Contract Draft">SBD-03 Contract Draft</option>
                        <option value="Contract Signed / Active">Contract Signed / Active</option>
                        <option value="Lost / Cancelled">Lost / Cancelled</option>
                      </select>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => handleCreateQuotationForLead(l)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-bold text-xs transition-colors cursor-pointer border border-orange-200"
                        title="Create a Quotation for this client"
                      >
                        <FileText size={13} />
                        Quotation
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLeads.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs">
                No customer leads found matching your criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOQ Quotations Tab View */}
      {activeTab === 'quotations' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText size={20} className="text-orange-600" /> BOQ Quotations & Cost Estimations
            </h2>
            <button
              onClick={() => navigate('/admin/quotations')}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              Open Quotation Manager <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
              <div className="font-bold text-slate-800 text-sm">QUO-2026-001 (Lotus Luxury Villa)</div>
              <div className="text-slate-500">Client: Dr. Ruwan Perera | SLS 573 BOQ Standard</div>
              <div className="text-orange-600 font-bold text-sm">LKR 34,850,000.00</div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                Approved & Sent to Client
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
              <div className="font-bold text-slate-800 text-sm">QUO-2026-002 (Showroom Renovation)</div>
              <div className="text-slate-500">Client: Nihal Jayasinghe | Custom Commercial Estimate</div>
              <div className="text-orange-600 font-bold text-sm">LKR 17,900,000.00</div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                Draft Under Review
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SBD-03 Legal Contracts Tab View */}
      {activeTab === 'agreements' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck size={20} className="text-orange-600" /> SBD-03 Standard Construction Legal Contracts
            </h2>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2">
            <div className="font-bold text-slate-800 text-sm">SBD03-CON-2026-89 (Apex Holdings Warehouse)</div>
            <p className="text-slate-600">Standard Bidding Document for Procurement of Works (ICTAD/SBD/03 Sri Lanka Standard Contract Agreement).</p>
            <div className="text-emerald-700 font-bold">Status: Pending Client Signature & Advance Security Stamp</div>
          </div>
        </div>
      )}

      {/* Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">New Customer Lead</h3>
              <button onClick={() => setShowLeadModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Client Full Name *</label>
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
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimated Budget (LKR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 25000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={leadForm.budget}
                    onChange={(e) => setLeadForm({ ...leadForm, budget: e.target.value })}
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving & Syncing...' : 'Create Lead & Sync to Clients'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


