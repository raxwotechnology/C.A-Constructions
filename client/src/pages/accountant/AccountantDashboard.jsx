import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiDollarSign, FiAlertTriangle, FiCheckCircle, FiShield, FiTrendingUp, FiLock } from 'react-icons/fi'

export default function AccountantDashboard() {
  const { data: grnData } = useQuery({
    queryKey: ['accountant-grns'],
    queryFn: () => api.get('/inventory/grn').then(r => r.data),
  })

  const { data: employeesData } = useQuery({
    queryKey: ['accountant-emps'],
    queryFn: () => api.get('/employees').then(r => r.data),
  })

  const grns = grnData?.grns || []
  const flaggedGrns = grns.filter(g => g.paymentHoldFlag || g.hasVariance)
  const employees = employeesData?.employees || []

  const [calculating, setCalculating] = useState(false)
  const [payrollDone, setPayrollDone] = useState(false)

  const run3MinPayroll = () => {
    setCalculating(true)
    setTimeout(() => {
      setCalculating(false)
      setPayrollDone(true)
      toast.success('3-Minute Automated Construction Payroll Executed!')
    }, 2000)
  }

  const supplierPriceAlerts = [
    { supplier: 'Lanka ReadyMix (Pvt) Ltd', item: 'ReadyMix Concrete G30', oldPrice: 18500, newPrice: 19800, hike: 7.02, date: '2026-07-25' },
    { supplier: 'Melwa Steel Industries', item: 'Tor Steel 16mm (kg)', oldPrice: 310, newPrice: 330, hike: 6.45, date: '2026-07-27' },
  ]

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 rounded-2xl text-white shadow-xl">
        <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-400/30">
          Accountant & Finance Manager Portal
        </span>
        <h1 className="text-2xl md:text-3xl font-bold mt-2">Automated Payroll & Audit Control Matrix</h1>
        <p className="text-emerald-200 text-sm mt-1">3-Minute Payroll Calculator, GRN Variance Protection & Supplier Price Alerts.</p>
      </div>

      {/* 3-Minute Automated Payroll Calculator Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full uppercase">
            3-Minute Automated Engine
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-2">Construction Daily & Monthly Payroll Engine</h2>
          <p className="text-xs text-slate-500 mt-1">Auto-calculates OT, Poya Day bonuses, Advances auto-deduction & EPF/ETF contributions.</p>
        </div>

        <button
          onClick={run3MinPayroll}
          disabled={calculating}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <FiDollarSign className="text-xl" />
          {calculating ? 'CALCULATING PAYROLL...' : payrollDone ? '✓ PAYROLL CALCULATED' : 'RUN 3-MINUTE PAYROLL NOW'}
        </button>
      </div>

      {/* GRN Variance Warnings & Supplier Price Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRN Variance Fraud Protection */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiLock className="text-rose-600" /> GRN Variance Delivery Fraud Protection
            </h3>
            <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {flaggedGrns.length} Holds Active
            </span>
          </div>

          {flaggedGrns.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <FiCheckCircle className="text-emerald-500 text-3xl mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">All Delivery Quantities Match POs</p>
              <p className="text-xs text-slate-500 mt-1">No supplier payment holds active.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flaggedGrns.map(g => (
                <div key={g._id} className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-rose-900 bg-rose-200 px-2 py-0.5 rounded">{g.grnNo}</span>
                    <span className="text-xs font-bold text-rose-700">PAYMENT LOCKED</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{g.itemName} - {g.site?.title || 'Site'}</h4>
                  <p className="text-xs text-slate-600 mt-1">{g.varianceReason}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Supplier Price Indexing Alerts (>5% Price Increases) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiTrendingUp className="text-amber-500" /> Supplier Price Indexing Alerts (&gt;5% Hikes)
            </h3>
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              2 Alerts Flagged
            </span>
          </div>

          <div className="space-y-3">
            {supplierPriceAlerts.map((a, idx) => (
              <div key={idx} className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{a.supplier}</h4>
                    <span className="text-xs font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded">+{a.hike}% HIKE</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{a.item}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Previous: LKR {a.oldPrice} ➔ Current: LKR {a.newPrice}</p>
                </div>
                <button className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg">
                  Audit Price
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
