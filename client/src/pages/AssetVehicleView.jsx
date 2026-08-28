import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Fuel, AlertCircle, Wrench, Shield, Plus, X, Edit2, Trash2, Search, DollarSign, Activity } from 'lucide-react';
import { ASSET_CATEGORIES } from '../config/categories';
import ExportBar from '../components/ui/ExportBar';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function AssetVehicleView() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'Machinery & Plant',
    assetCode: '',
    registrationNumber: '',
    site: '',
    amount: '',
    status: 'Operational',
    insuranceExpiry: '',
  });

  // Fetch assets from backend API
  const { data: apiResponse, isLoading, refetch } = useQuery({
    queryKey: ['assets', searchQuery, selectedCategory],
    queryFn: async () => {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      const res = await api.get('/assets', { params });
      return res.data;
    },
  });

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/assets', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Asset registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to register asset');
    },
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/assets/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Asset updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update asset');
    },
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/assets/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Asset deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete asset');
    },
  });

  // Default fallback assets if backend is initializing
  const fallbackAssets = [
    { _id: '1', assetCode: 'AST-EXC-01', name: 'KOBELCO SK200 Excavator', category: 'Machinery & Plant', site: 'Colombo Commercial Tower', amount: 18500000, assetValue: 18500000, fuel: 'Diesel (45L today)', status: 'Operational', insuranceExpiry: '2026-11-15' },
    { _id: '2', assetCode: 'AST-LRY-04', name: 'ISUZU 10-Wheeler Tipper Truck', category: 'Vehicles', site: 'Rajagiriya Project', amount: 12000000, assetValue: 12000000, fuel: 'Diesel (80L today)', status: 'Operational', insuranceExpiry: '2026-09-30' },
    { _id: '3', assetCode: 'AST-CMP-02', name: 'Mikasa Plate Compactor 5.5HP', category: 'Tools & Equipment', site: 'Central Store - Wattala', amount: 450000, assetValue: 450000, fuel: 'Petrol (5L today)', status: 'In Store / Ready', insuranceExpiry: 'N/A' },
  ];

  const assetsList = apiResponse?.assets && apiResponse.assets.length > 0
    ? apiResponse.assets.map(a => ({
        ...a,
        code: a.assetCode || a.code,
        site: a.site || a.assignedProject?.name || 'Central Store',
        amount: Number(a.assetValue || a.amount || 0),
        insuranceExpiry: a.insuranceExpiry ? new Date(a.insuranceExpiry).toISOString().split('T')[0] : 'N/A',
      }))
    : fallbackAssets;

  const totalAssetValue = assetsList.reduce((sum, a) => sum + Number(a.amount || a.assetValue || 0), 0);
  const operationalCount = assetsList.filter(a => ['Operational', 'Active Site Operation', 'In Store / Ready'].includes(a.status)).length;

  const openCreateModal = () => {
    setEditingAsset(null);
    setAssetForm({
      name: '',
      category: 'Machinery & Plant',
      assetCode: '',
      registrationNumber: '',
      site: '',
      amount: '',
      status: 'Operational',
      insuranceExpiry: '',
    });
    setShowModal(true);
  };

  const openEditModal = (asset) => {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name || '',
      category: asset.category || 'Machinery & Plant',
      assetCode: asset.assetCode || asset.code || '',
      registrationNumber: asset.registrationNumber || '',
      site: asset.site || '',
      amount: asset.amount || asset.assetValue || '',
      status: asset.status || 'Operational',
      insuranceExpiry: asset.insuranceExpiry !== 'N/A' ? asset.insuranceExpiry : '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAsset(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!assetForm.name.trim()) {
      toast.error('Please enter asset name!');
      return;
    }
    const val = Number(assetForm.amount || 0);

    const payload = {
      name: assetForm.name,
      category: assetForm.category,
      assetCode: assetForm.assetCode,
      registrationNumber: assetForm.registrationNumber,
      site: assetForm.site,
      assetValue: val,
      amount: val,
      status: assetForm.status,
      insuranceExpiry: assetForm.insuranceExpiry || undefined,
    };

    if (editingAsset && editingAsset._id) {
      updateAssetMutation.mutate({ id: editingAsset._id, payload });
    } else {
      createAssetMutation.mutate(payload);
    }
  };

  const handleDelete = (asset) => {
    if (window.confirm(`Are you sure you want to delete asset "${asset.name}"?`)) {
      deleteAssetMutation.mutate(asset._id);
    }
  };

  // Columns for PDF / Excel ExportBar
  const exportColumns = [
    { header: 'Asset Code', accessor: row => row.assetCode || row.code || '' },
    { header: 'Name & Model', accessor: 'name' },
    { header: 'Category', accessor: 'category' },
    { header: 'Assigned Location', accessor: row => row.site || 'Central Store' },
    { header: 'Asset Value / Amount (LKR)', accessor: row => `LKR ${Number(row.amount || row.assetValue || 0).toLocaleString()}` },
    { header: 'Status', accessor: 'status' },
    { header: 'Insurance Expiry', accessor: row => row.insuranceExpiry || 'N/A' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Machinery, Vehicles & Fleet Asset Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Heavy Plant Tracking, Fuel Logs, Maintenance Schedules & Total Asset Valuation Reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportBar
            data={assetsList}
            columns={exportColumns}
            title="Machinery & Vehicles Fleet Asset Valuation Report"
            filters={{ Category: selectedCategory || 'All', Search: searchQuery }}
          />
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm cursor-pointer shrink-0"
          >
            <Plus size={18} />
            Register New Asset
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fleet Assets</p>
            <h3 className="text-2xl font-black text-slate-900">{assetsList.length} Units</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{operationalCount} Operational</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fleet Asset Portfolio Value</p>
            <h3 className="text-xl font-black text-emerald-700">LKR {totalAssetValue.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Reflected in Balance Sheet / Accounts</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Status</p>
            <h3 className="text-2xl font-black text-slate-900">{Math.round((operationalCount / (assetsList.length || 1)) * 100)}% Active</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{assetsList.length - operationalCount} Under Maintenance / Idle</p>
          </div>
        </div>
      </div>

      {/* Asset Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Truck size={20} className="text-orange-600" />
            Heavy Plant & Vehicle Inventory
          </h2>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search code, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
            >
              <option value="">All Categories</option>
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">
                <th className="py-3 px-3">Asset Code</th>
                <th className="py-3 px-3">Name & Model</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Assigned Location</th>
                <th className="py-3 px-3 text-right">Asset Value / Amount (LKR)</th>
                <th className="py-3 px-3">Fuel / Usage Log</th>
                <th className="py-3 px-3">Insurance Expiry</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400 text-xs">Loading fleet assets...</td>
                </tr>
              ) : assetsList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400 text-xs">No assets registered yet. Click "Register New Asset" to add one.</td>
                </tr>
              ) : (
                assetsList.map((a) => (
                  <tr key={a._id || a.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-xs font-bold text-orange-600">{a.assetCode || a.code}</td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      <div>{a.name}</div>
                      {a.registrationNumber && (
                        <div className="text-[11px] font-normal text-slate-400">Reg: {a.registrationNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{a.category}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-700 font-medium">{a.site}</td>
                    <td className="py-3.5 px-3 text-right font-black text-emerald-700 text-sm">
                      LKR {Number(a.amount || a.assetValue || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-semibold text-slate-600">
                      {a.fuel ? (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <Fuel size={14} className="text-emerald-500 shrink-0" /> {a.fuel}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-500">{a.insuranceExpiry}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                        ['Operational', 'Active Site Operation', 'In Store / Ready'].includes(a.status)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(a)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit Asset"
                        >
                          <Edit2 size={15} />
                        </button>
                        {a._id && (
                          <button
                            onClick={() => handleDelete(a)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Asset"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Registration / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAsset ? 'Edit Asset Details' : 'Register New Asset / Vehicle'}
              </h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Asset Name & Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Caterpillar SK200 Excavator"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Asset Code</label>
                  <input
                    type="text"
                    placeholder="e.g. AST-EXC-01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    value={assetForm.assetCode}
                    onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reg No. / Plate</label>
                  <input
                    type="text"
                    placeholder="e.g. WP LA-4589"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    value={assetForm.registrationNumber}
                    onChange={(e) => setAssetForm({ ...assetForm, registrationNumber: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Asset Category *</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={assetForm.category}
                  onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                >
                  {ASSET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Site / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Colombo Commercial Tower"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={assetForm.site}
                  onChange={(e) => setAssetForm({ ...assetForm, site: e.target.value })}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Asset Value / Amount (LKR) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 18500000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold text-emerald-800"
                  value={assetForm.amount}
                  onChange={(e) => setAssetForm({ ...assetForm, amount: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">This amount will be reflected in Accounts & Finance Statements.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={assetForm.status}
                    onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                  >
                    <option value="Operational">Operational</option>
                    <option value="Under Service">Under Service</option>
                    <option value="Breakdown">Breakdown</option>
                    <option value="Idle">Idle</option>
                    <option value="In Store / Ready">In Store / Ready</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Insurance Expiry Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={assetForm.insuranceExpiry}
                    onChange={(e) => setAssetForm({ ...assetForm, insuranceExpiry: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
                >
                  {editingAsset ? 'Save Changes' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
