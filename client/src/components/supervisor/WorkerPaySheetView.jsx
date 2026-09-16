import React, { useState } from 'react';
import { Search, UserCheck, DollarSign, Calendar, AlertCircle, Plus, Phone, CreditCard, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkerPaySheetView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRegModal, setShowRegModal] = useState(false);

  const [newWorker, setNewWorker] = useState({
    name: '',
    nic: '',
    phone: '',
    emergencyContact: '',
    workerType: 'Baas (Skilled)',
    dailyRate: 4500,
    site: 'Site: Kalaniya',
  });

  const [workers, setWorkers] = useState([
    {
      id: 'W-101',
      name: 'Sunil Shantha',
      nic: '841234567V',
      phone: '0712345678',
      emergencyContact: '0779876543 (Wife)',
      workerType: 'Mason Baas',
      dailyRate: 4500,
      site: 'Site: Kalaniya',
      workedDays: 22,
      otHours: 18,
      otRate: 650,
      advances: 15000,
    },
    {
      id: 'W-102',
      name: 'Kamal Perera',
      nic: '902345678V',
      phone: '0783456789',
      emergencyContact: '0711122334 (Brother)',
      workerType: 'Helper (Unskilled)',
      dailyRate: 3000,
      site: 'Site: Kalaniya',
      workedDays: 25,
      otHours: 12,
      otRate: 450,
      advances: 8000,
    },
    {
      id: 'W-103',
      name: 'Nimal Bandara',
      nic: '883456789V',
      phone: '0764567890',
      emergencyContact: '0709988776 (Father)',
      workerType: 'Carpenter Baas',
      dailyRate: 5000,
      site: 'Lotus Luxury Villa',
      workedDays: 20,
      otHours: 24,
      otRate: 700,
      advances: 20000,
    },
  ]);

  const handleRegisterWorker = (e) => {
    e.preventDefault();
    if (!newWorker.name || !newWorker.nic || !newWorker.emergencyContact) {
      toast.error('Worker Name, NIC, and Emergency Contact are required!');
      return;
    }
    const created = {
      id: 'W-' + Math.floor(100 + Math.random() * 900),
      ...newWorker,
      workedDays: 0,
      otHours: 0,
      otRate: Math.round(newWorker.dailyRate / 8 * 1.5),
      advances: 0,
    };
    setWorkers([created, ...workers]);
    toast.success(`Worker "${newWorker.name}" registered successfully without system login account.`);
    setShowRegModal(false);
    setNewWorker({ name: '', nic: '', phone: '', emergencyContact: '', workerType: 'Baas (Skilled)', dailyRate: 4500, site: 'Site: Kalaniya' });
  };

  const filteredWorkers = workers.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.nic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.site.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="text-orange-600" size={22} />
            Worker & Baasla Pay Sheet Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Register workers with NIC & Emergency Contacts (No System Profile Required). Calculate worked days, OT, advances & net payable balance.
          </p>
        </div>
        <button
          onClick={() => setShowRegModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus size={16} /> Register New Worker (Baas)
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search worker by name, NIC, or site..."
          className="form-input !pl-10 text-sm w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Worker Pay Sheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase bg-slate-50">
              <th className="py-3 px-3">Worker / Baas</th>
              <th className="py-3 px-3">NIC & Emergency Contact</th>
              <th className="py-3 px-3">Assigned Site</th>
              <th className="py-3 px-3 text-center">Worked Days</th>
              <th className="py-3 px-3 text-right">Basic Wages (LKR)</th>
              <th className="py-3 px-3 text-right">OT Pay (LKR)</th>
              <th className="py-3 px-3 text-right">Advances (LKR)</th>
              <th className="py-3 px-3 text-right">Net Payable Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredWorkers.map((w) => {
              const basicWages = w.workedDays * w.dailyRate;
              const otPay = w.otHours * w.otRate;
              const grossEarned = basicWages + otPay;
              const netPayable = grossEarned - w.advances;

              return (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-3">
                    <p className="font-bold text-slate-900">{w.name}</p>
                    <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{w.workerType}</span>
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">
                    <p className="font-mono text-slate-800 font-medium">NIC: {w.nic}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">📞 {w.emergencyContact}</p>
                  </td>
                  <td className="py-3.5 px-3 text-xs font-semibold text-slate-700">{w.site}</td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-800">{w.workedDays} days</td>
                  <td className="py-3.5 px-3 text-right font-semibold text-slate-800">LKR {basicWages.toLocaleString()}</td>
                  <td className="py-3.5 px-3 text-right font-semibold text-emerald-600">+ LKR {otPay.toLocaleString()} ({w.otHours} hrs)</td>
                  <td className="py-3.5 px-3 text-right font-semibold text-red-600">- LKR {w.advances.toLocaleString()}</td>
                  <td className="py-3.5 px-3 text-right font-black text-slate-900 text-base">
                    LKR {netPayable.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Worker Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Register Baas / Worker (No System Profile Required)</h3>
            <form onSubmit={handleRegisterWorker} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunil Shantha"
                  className="form-input w-full"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NIC Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 841234567V"
                    className="form-input w-full"
                    value={newWorker.nic}
                    onChange={(e) => setNewWorker({ ...newWorker, nic: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0712345678"
                    className="form-input w-full"
                    value={newWorker.phone}
                    onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Emergency Contact Number & Relation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0779876543 (Wife / Brother)"
                  className="form-input w-full"
                  value={newWorker.emergencyContact}
                  onChange={(e) => setNewWorker({ ...newWorker, emergencyContact: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Worker Type</label>
                  <select
                    className="form-select w-full"
                    value={newWorker.workerType}
                    onChange={(e) => setNewWorker({ ...newWorker, workerType: e.target.value })}
                  >
                    <option value="Baas (Skilled)">Baas (Skilled)</option>
                    <option value="Mason Baas">Mason Baas</option>
                    <option value="Carpenter Baas">Carpenter Baas</option>
                    <option value="Bar Bender">Bar Bender</option>
                    <option value="Helper (Unskilled)">Helper (Unskilled)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Daily Rate (LKR)</label>
                  <input
                    type="number"
                    className="form-input w-full"
                    value={newWorker.dailyRate}
                    onChange={(e) => setNewWorker({ ...newWorker, dailyRate: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Site</label>
                <input
                  type="text"
                  className="form-input w-full"
                  value={newWorker.site}
                  onChange={(e) => setNewWorker({ ...newWorker, site: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowRegModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Register Worker</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
