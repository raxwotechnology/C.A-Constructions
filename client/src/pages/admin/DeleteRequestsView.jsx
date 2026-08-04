import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Trash2, CheckCircle2, XCircle, Clock, Search, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function DeleteRequestsView() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('pending');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['delete-requests', filterStatus],
    queryFn: async () => {
      const res = await api.get(`/deletion-requests?status=${filterStatus}`);
      return res.data?.requests || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.put(`/deletion-requests/${id}/approve`, { adminNote: 'Approved by Admin' });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Delete request approved!');
      queryClient.invalidateQueries({ queryKey: ['delete-requests'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to approve delete request.'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.put(`/deletion-requests/${id}/reject`, { adminNote: 'Rejected by Admin' });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Delete request rejected!');
      queryClient.invalidateQueries({ queryKey: ['delete-requests'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reject delete request.'),
  });

  const requests = (data || []).filter(r =>
    !search ||
    r.entityName?.toLowerCase().includes(search.toLowerCase()) ||
    r.requestedByName?.toLowerCase().includes(search.toLowerCase()) ||
    r.module?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admin Delete Request Management</h1>
            <p className="text-xs text-slate-500 mt-1">
              Review, Approve, or Reject deletion requests submitted by Managers, Supervisors, and Staff.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg transition-all ${filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Pending Requests ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg transition-all ${filterStatus === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Approved Log
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded-lg transition-all ${filterStatus === 'rejected' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Rejected Log
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search request by module, item name, or requester..."
            className="form-input !pl-10 text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase bg-slate-50">
                <th className="py-3 px-3">Module</th>
                <th className="py-3 px-3">Item / Record Name</th>
                <th className="py-3 px-3">Requested By & Role</th>
                <th className="py-3 px-3">Reason for Deletion</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">Loading deletion requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">No {filterStatus} deletion requests found.</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {r.module}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">{r.entityName}</td>
                    <td className="py-3.5 px-3 text-xs">
                      <p className="font-semibold text-slate-800">{r.requestedByName}</p>
                      <span className="text-[11px] text-amber-700 font-bold uppercase">{r.userRole}</span>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 max-w-xs">{r.reason}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-center">
                      {r.status === 'pending' && <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending Approval</span>}
                      {r.status === 'approved' && <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Approved & Deleted</span>}
                      {r.status === 'rejected' && <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-50 text-red-700 border border-red-200">Rejected</span>}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {r.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => approveDeleteRequest(r._id)}
                            disabled={approveMutation.isPending}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button
                            onClick={() => rejectDeleteRequest(r._id)}
                            disabled={rejectMutation.isPending}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
