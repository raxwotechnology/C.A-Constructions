import React, { useState } from 'react';
import { Truck, Fuel, AlertCircle, Wrench, Shield, Plus, X } from 'lucide-react';
import { ASSET_CATEGORIES } from '../config/categories';
import toast from 'react-hot-toast';

export default function AssetVehicleView() {
  const [showAssetModal, setShowAssetModal] = useState(false);

  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'Machinery & Plant',
    site: 'Colombo Commercial Tower',
  });

  const assets = [
    { code: 'AST-EXC-01', name: 'KOBELCO SK200 Excavator', category: 'Machinery & Plant', site: 'Colombo Commercial Tower', fuel: 'Diesel (45L today)', status: 'Active Site Operation', insuranceExpiry: '2026-11-15' },
    { code: 'AST-LRY-04', name: 'ISUZU 10-Wheeler Tipper Truck', category: 'Vehicles', site: 'Rajagiriya Project', fuel: 'Diesel (80L today)', status: 'Active Site Operation', insuranceExpiry: '2026-09-30' },
    { code: 'AST-CMP-02', name: 'Mikasa Plate Compactor 5.5HP', category: 'Tools & Equipment', site: 'Central Store - Wattala', fuel: 'Petrol (5L today)', status: 'In Store / Ready', insuranceExpiry: 'N/A' },
  ];

  const handleRegisterAsset = (e) => {
    e.preventDefault();
    if (!assetForm.name.trim()) {
      toast.error('Please enter asset name!');
      return;
    }
    toast.success(`Asset "${assetForm.name}" registered successfully!`);
    setShowAssetModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Machinery, Vehicles & Fleet Asset Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Heavy Plant Tracking, Fuel Consumption Logs, Maintenance Schedules & License/Insurance Expiry Alerts
          </p>
        </div>
        <button 
          onClick={() => setShowAssetModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm cursor-pointer"
        >
          <Plus size={18} />
          Register New Asset
        </button>
      </div>

      {/* Asset Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Truck size={20} className="text-orange-600" />
            Heavy Plant & Vehicle Inventory
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-2">Asset Code</th>
                <th className="py-3 px-2">Name & Model</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Assigned Location</th>
                <th className="py-3 px-2">Fuel Log</th>
                <th className="py-3 px-2">Insurance Expiry</th>
                <th className="py-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map((a) => (
                <tr key={a.code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-2 font-mono text-xs font-bold text-orange-600">{a.code}</td>
                  <td className="py-3 px-2 font-semibold text-slate-800">{a.name}</td>
                  <td className="py-3 px-2 text-xs text-slate-600">{a.category}</td>
                  <td className="py-3 px-2 text-xs text-slate-700">{a.site}</td>
                  <td className="py-3 px-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <Fuel size={14} className="text-emerald-500" /> {a.fuel}
                  </td>
                  <td className="py-3 px-2 text-xs text-slate-500">{a.insuranceExpiry}</td>
                  <td className="py-3 px-2">
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Registration Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Register New Asset / Vehicle</h3>
              <button onClick={() => setShowAssetModal(false)} className="text-slate-500 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRegisterAsset} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Asset Name & Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Caterpillar SK200 Excavator"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Asset Category</label>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={assetForm.site}
                  onChange={(e) => setAssetForm({ ...assetForm, site: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Asset Value / Amount (LKR) *</label>
                <input
                  type="number"
                  placeholder="e.g. 18500000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  value={assetForm.amount || ''}
                  onChange={(e) => setAssetForm({ ...assetForm, amount: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
