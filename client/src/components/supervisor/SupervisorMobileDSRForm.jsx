import React, { useState } from 'react';
import { 
  Sun, CloudRain, Cloud, ShieldCheck, AlertTriangle, 
  Users, HardHat, Truck, PackageCheck, Send, CheckCircle2, Plus, Minus
} from 'lucide-react';

export default function SupervisorMobileDSRForm() {
  const [submitted, setSubmitted] = useState(false);
  const [weather, setWeather] = useState('Sunny');
  const [workCompleted, setWorkCompleted] = useState('');
  
  // Labour Attendance State
  const [labour, setLabour] = useState([
    { type: 'Mason (Skilled)', count: 8, regHours: 8, otHours: 2 },
    { type: 'Helper (Unskilled)', count: 14, regHours: 8, otHours: 3 },
    { type: 'Bar Bender (Skilled)', count: 4, regHours: 8, otHours: 1 },
    { type: 'Carpenter (Skilled)', count: 6, regHours: 8, otHours: 2 },
  ]);

  // Material Usage State
  const [materials, setMaterials] = useState([
    { name: 'Tokyo Super Cement 50kg', qty: 120, unit: 'Bags' },
    { name: 'Tor Steel 12mm TMT', qty: 1.5, unit: 'Tons' },
  ]);

  // Machinery State
  const [machinery, setMachinery] = useState([
    { name: 'JCB 3CX Excavator', hours: 6.5, fuelLiters: 45 },
  ]);

  // HSE Incident State
  const [hseIncident, setHseIncident] = useState({
    reported: false,
    severity: 'Near Miss',
    description: ''
  });

  const handleLabourChange = (index, delta) => {
    setLabour(prev => prev.map((item, i) => i === index ? { ...item, count: Math.max(0, item.count + delta) } : item));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-6">
      {/* Mobile Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">MOBILE DSR ENTRY</span>
          <h2 className="text-lg font-bold text-slate-100">Daily Site Diary</h2>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 font-mono px-3 py-1 rounded-full border border-slate-700">
          {new Date().toISOString().split('T')[0]}
        </span>
      </div>

      {submitted && (
        <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 p-4 rounded-2xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
          <div className="text-xs">
            <div className="font-bold">Daily Site Report Submitted!</div>
            <div>Sent for Project Manager approval & inventory update.</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Weather Condition */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Site Weather Condition</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sunny', icon: Sun, color: 'text-amber-400' },
              { label: 'Cloudy', icon: Cloud, color: 'text-slate-400' },
              { label: 'Rainy', icon: CloudRain, color: 'text-blue-400' }
            ].map(item => {
              const Icon = item.icon;
              const isSelected = weather === item.label;
              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setWeather(item.label)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all ${
                    isSelected 
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-md' 
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Icon size={20} className={`${item.color} mb-1`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Work Progress Summary */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Work Completed Summary</label>
          <textarea
            required
            rows={3}
            value={workCompleted}
            onChange={(e) => setWorkCompleted(e.target.value)}
            placeholder="e.g., Completed Grade 30 concrete pouring for 1st floor beam section B2-B5. Fixed shuttering..."
            className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 text-xs rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Labour Attendance Mobile Counter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HardHat size={16} className="text-amber-400" /> Labour Attendance Counter
            </label>
            <span className="text-[10px] text-cyan-400 font-bold">
              Total: {labour.reduce((acc, l) => acc + l.count, 0)} Workers
            </span>
          </div>
          <div className="space-y-2">
            {labour.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
                <div>
                  <div className="text-xs font-bold text-slate-200">{item.type}</div>
                  <div className="text-[10px] text-slate-400">OT: {item.otHours} hrs</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleLabourChange(idx, -1)}
                    className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 active:scale-95"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold font-mono w-5 text-center text-cyan-300">{item.count}</span>
                  <button
                    type="button"
                    onClick={() => handleLabourChange(idx, 1)}
                    className="w-8 h-8 rounded-xl bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white active:scale-95"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Machinery & Heavy Plant */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Truck size={16} className="text-cyan-400" /> Machinery Hours & Fuel
          </label>
          {machinery.map((m, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-slate-200">{m.name}</div>
              <div className="flex justify-between text-slate-400">
                <span>Hours Worked: <b className="text-cyan-400">{m.hours} hrs</b></span>
                <span>Fuel Consumed: <b className="text-amber-400">{m.fuelLiters} L</b></span>
              </div>
            </div>
          ))}
        </div>

        {/* HSE Safety Log Toggle */}
        <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-400" /> Zero Accidents / HSE Compliant
            </span>
            <input
              type="checkbox"
              checked={!hseIncident.reported}
              onChange={(e) => setHseIncident(prev => ({ ...prev, reported: !e.target.checked }))}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
          </div>
          {hseIncident.reported && (
            <input
              type="text"
              placeholder="Describe HSE Incident / Near Miss..."
              value={hseIncident.description}
              onChange={(e) => setHseIncident(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-slate-900 border border-rose-500/50 text-slate-200 text-xs rounded-xl p-2 mt-2 focus:outline-none"
            />
          )}
        </div>

        {/* Submit Mobile DSR Button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-2xl text-sm shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <Send size={18} />
          Submit Daily Site Report (DSR)
        </button>
      </form>
    </div>
  );
}
