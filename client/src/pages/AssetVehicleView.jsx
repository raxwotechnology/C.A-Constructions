import React from 'react';
import { Truck, Fuel, AlertTriangle, Calendar, Wrench, Shield } from 'lucide-react';
import { ASSET_CATEGORIES } from '../config/categories';

export default function AssetVehicleView() {
  const assets = [
    { code: 'AST-VEH-001', name: 'JCB 3CX Excavator Loader', category: 'Machinery & Plant', regNo: 'WP JCB-7821', project: 'Lotus Luxury Villa', status: 'Operational', hours: 1450, fuelLiters: 480, insuranceExpiry: '2026-08-15' },
    { code: 'AST-VEH-004', name: 'Isuzu Elf 4-Ton Tipper Truck', category: 'Vehicles', regNo: 'WP DA-4592', project: 'Rajagiriya Commercial Site', status: 'Under Service', hours: 820, fuelLiters: 920, insuranceExpiry: '2026-09-01' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Heavy Plant, Vehicles & Fleet Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Fuel Consumption Tracking, Operator Assignments, Maintenance History & Revenue/Insurance Expiry Alerts
          </p>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assets.map((ast) => (
          <div key={ast.code} className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div>
                <span className="font-mono text-xs text-cyan-400 font-bold">{ast.code}</span>
                <h3 className="text-lg font-bold text-slate-100 mt-0.5">{ast.name}</h3>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                ast.status === 'Operational' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-400 border-amber-800'
              }`}>
                {ast.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl">
                <span className="text-slate-400">Registration No:</span>
                <div className="text-sm font-bold text-slate-200 mt-0.5">{ast.regNo}</div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl">
                <span className="text-slate-400">Assigned Site:</span>
                <div className="text-sm font-bold text-slate-200 mt-0.5">{ast.project}</div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-700/60 pt-3 text-xs">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Fuel size={16} /> Total Fuel Logged: <span className="font-bold">{ast.fuelLiters} L</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar size={16} /> Insurance Expiry: <span className="font-semibold text-rose-400">{ast.insuranceExpiry}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
