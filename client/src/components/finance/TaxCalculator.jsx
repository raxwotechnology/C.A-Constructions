import React, { useState } from 'react';
import { Calculator, DollarSign, Percent, FileText } from 'lucide-react';

export default function TaxCalculator() {
  const [revenue, setRevenue] = useState(15000000);
  const [expenses, setExpenses] = useState(10500000);
  const [vatRate, setVatRate] = useState(18);
  const [incomeTaxRate, setIncomeTaxRate] = useState(30);

  const taxableProfit = Math.max(0, revenue - expenses);
  const vatOutput = (revenue * vatRate) / 100;
  const vatInput = (expenses * vatRate) / 100;
  const netVatPayable = Math.max(0, vatOutput - vatInput);
  const corporateTaxPayable = (taxableProfit * incomeTaxRate) / 100;
  const netProfitAfterTax = taxableProfit - corporateTaxPayable;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="text-orange-600" size={22} />
            Corporate Income Tax & VAT Calculator (Sri Lanka Tax Rules)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Calculate statutory VAT (18%) and Corporate Income Tax (30% / 15%) on business revenues and site profits.
          </p>
        </div>
        <span className="badge badge-navy">RAMIS / IRD Compliant</span>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Total Revenue / Invoiced (LKR)</label>
          <input
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(Number(e.target.value))}
            className="form-input w-full font-semibold"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Total Allowable Expenses (LKR)</label>
          <input
            type="number"
            value={expenses}
            onChange={(e) => setExpenses(Number(e.target.value))}
            className="form-input w-full font-semibold"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">VAT Rate (%)</label>
          <select
            value={vatRate}
            onChange={(e) => setVatRate(Number(e.target.value))}
            className="form-select w-full font-semibold"
          >
            <option value={18}>18% (Standard SL VAT 2026)</option>
            <option value={0}>0% (Exempt / Export)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Income Tax Rate (%)</label>
          <select
            value={incomeTaxRate}
            onChange={(e) => setIncomeTaxRate(Number(e.target.value))}
            className="form-select w-full font-semibold"
          >
            <option value={30}>30% (Standard Corporate Tax)</option>
            <option value={15}>15% (Concessional / Small Enterprise)</option>
            <option value={14}>14% (Construction Concessional)</option>
          </select>
        </div>
      </div>

      {/* Results Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-xs font-semibold text-blue-700 uppercase">Gross Taxable Profit</p>
          <p className="text-2xl font-black text-blue-900 mt-1">LKR {taxableProfit.toLocaleString()}</p>
          <p className="text-[11px] text-blue-600 mt-1">Revenue - Expenses</p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs font-semibold text-amber-800 uppercase">Net VAT Payable (18%)</p>
          <p className="text-2xl font-black text-amber-900 mt-1">LKR {netVatPayable.toLocaleString()}</p>
          <p className="text-[11px] text-amber-700 mt-1">Output VAT ({vatOutput.toLocaleString()}) - Input VAT ({vatInput.toLocaleString()})</p>
        </div>

        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs font-semibold text-red-700 uppercase">Income Tax Payable ({incomeTaxRate}%)</p>
          <p className="text-2xl font-black text-red-900 mt-1">LKR {corporateTaxPayable.toLocaleString()}</p>
          <p className="text-[11px] text-red-600 mt-1">Corporate Tax on LKR {taxableProfit.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-xs font-semibold text-emerald-800 uppercase">Net Profit After Tax</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">LKR {netProfitAfterTax.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-700 mt-1">Net Retained Company Earnings</p>
        </div>
      </div>
    </div>
  );
}
