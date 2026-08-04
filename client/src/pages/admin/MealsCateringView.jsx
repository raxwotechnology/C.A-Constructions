import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import {
  FiPlus,
  FiCheckCircle,
  FiPrinter,
  FiSend,
  FiX,
  FiDollarSign,
  FiCalendar,
  FiCoffee,
} from 'react-icons/fi'

export default function MealsCateringView() {
  const queryClient = useQueryClient()
  const printRef = useRef(null)

  const [activeTab, setActiveTab] = useState('daily-entries') // 'daily-entries' | 'settlements' | 'vendors'
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [showMealModal, setShowMealModal] = useState(false)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const [selectedSettlement, setSelectedSettlement] = useState(null)
  const [selectedPrintData, setSelectedPrintData] = useState(null)

  // Vendor Form
  const [vendorForm, setVendorForm] = useState({
    name: '', contactPerson: '', phone: '', email: '', defaultMealRate: 250, notes: ''
  })

  // Meal Entry Form
  const [mealForm, setMealForm] = useState({
    vendorId: '', date: new Date().toISOString().slice(0, 10), shift: 'Day',
    mealCount: 150, unitPrice: 250, projectId: '', notes: ''
  })

  // Settlement Form
  const [settlementForm, setSettlementForm] = useState({
    vendorId: '', startDate: '', endDate: '', totalBillAmount: 0, paidAmount: 0,
    paymentMethod: 'cash', chequeNumber: '', notes: ''
  })

  // Fetch Vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ['catering-vendors'],
    queryFn: async () => {
      const res = await api.get('/meals/vendors')
      return res.data?.vendors || []
    }
  })

  // Fetch Meal Entries
  const { data: entries = [] } = useQuery({
    queryKey: ['meal-entries'],
    queryFn: async () => {
      const res = await api.get('/meals/entries')
      return res.data?.entries || []
    }
  })

  // Fetch Settlements
  const { data: settlements = [] } = useQuery({
    queryKey: ['meal-settlements'],
    queryFn: async () => {
      const res = await api.get('/meals/settlements')
      return res.data?.settlements || []
    }
  })

  // Fetch Projects for site selection
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const res = await api.get('/projects')
      return res.data?.projects || res.data || []
    }
  })

  // Create Vendor
  const createVendorMutation = useMutation({
    mutationFn: async (data) => await api.post('/meals/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
      setShowVendorModal(false)
      setVendorForm({ name: '', contactPerson: '', phone: '', email: '', defaultMealRate: 250, notes: '' })
    }
  })

  // Log Daily Meal Entry
  const createMealMutation = useMutation({
    mutationFn: async (data) => await api.post('/meals/entries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
      setShowMealModal(false)
    }
  })

  // Create Settlement
  const createSettlementMutation = useMutation({
    mutationFn: async (data) => await api.post('/meals/settlements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-settlements'] })
      queryClient.invalidateQueries({ queryKey: ['meal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
      setShowSettlementModal(false)
    }
  })

  // Handle vendor selection for settlement calculation
  const handleVendorForSettlement = (vendorId) => {
    const vendor = vendors.find(v => v._id === vendorId)
    const unsettled = entries.filter(e => e.vendor?._id === vendorId && e.settlementStatus === 'unsettled')
    const calculatedBill = unsettled.reduce((sum, e) => sum + (e.totalCost || 0), 0)

    setSettlementForm(prev => ({
      ...prev,
      vendorId,
      totalBillAmount: calculatedBill,
      paidAmount: calculatedBill,
    }))
  }

  // Handle Print Action
  const handlePrint = async (settlementId) => {
    const res = await api.get(`/meals/settlements/${settlementId}/print`)
    if (res.data?.success) {
      setSelectedPrintData(res.data)
      setShowPrintModal(true)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <FiCoffee className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Meals & Catering Ledger</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Daily meal logging, weekly settlement auto-calculations, instant SMS alerts, and printable invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMealModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all"
          >
            <FiPlus className="w-5 h-5" />
            <span>Daily Meal Entry</span>
          </button>

          <button
            onClick={() => setShowSettlementModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all"
          >
            <FiDollarSign className="w-5 h-5" />
            <span>Weekly Settlement</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <button
          onClick={() => setActiveTab('daily-entries')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'daily-entries' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          Daily Meal Logs ({entries.length})
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'settlements' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          Weekly Settlements ({settlements.length})
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'vendors' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          Catering Vendors ({vendors.length})
        </button>
      </div>

      {/* TAB 1: Daily Meal Logs */}
      {activeTab === 'daily-entries' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Shift</th>
                <th className="p-4">Vendor</th>
                <th className="p-4">Site / Project</th>
                <th className="p-4">Meal Count</th>
                <th className="p-4">Unit Rate</th>
                <th className="p-4">Total Cost</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {entries.map((entry) => (
                <tr key={entry._id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-mono">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="p-4 font-semibold">
                    <span className={`px-2.5 py-1 rounded-full text-xs ${
                      entry.shift === 'Night' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {entry.shift} Shift
                    </span>
                  </td>
                  <td className="p-4 font-medium text-white">{entry.vendor?.name || 'N/A'}</td>
                  <td className="p-4 text-slate-300">{entry.siteName || entry.project?.name || 'Head Office'}</td>
                  <td className="p-4 font-mono text-white font-bold">{entry.mealCount} meals</td>
                  <td className="p-4">LKR {entry.unitPrice}</td>
                  <td className="p-4 font-bold text-amber-400">LKR {(entry.totalCost || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      entry.settlementStatus === 'settled' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {entry.settlementStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Settlements & Printable Invoices */}
      {activeTab === 'settlements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Settlement #</th>
                <th className="p-4">Vendor</th>
                <th className="p-4">Date</th>
                <th className="p-4">Meals Count</th>
                <th className="p-4">Total Bill</th>
                <th className="p-4">Paid Amount</th>
                <th className="p-4">Remaining Outstanding</th>
                <th className="p-4">SMS Status</th>
                <th className="p-4 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {settlements.map((s) => (
                <tr key={s._id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-mono font-bold text-amber-400">{s.settlementNo}</td>
                  <td className="p-4 font-medium text-white">{s.vendor?.name || 'N/A'}</td>
                  <td className="p-4 text-xs text-slate-400">{new Date(s.paymentDate).toLocaleDateString()}</td>
                  <td className="p-4 font-mono">{s.totalMealCount} meals</td>
                  <td className="p-4 font-bold text-white">LKR {(s.totalBillAmount || 0).toLocaleString()}</td>
                  <td className="p-4 font-bold text-emerald-400">LKR {(s.paidAmount || 0).toLocaleString()}</td>
                  <td className="p-4 font-bold text-amber-400">LKR {(s.remainingOutstanding || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <FiSend className="w-3 h-3" /> SMS Sent
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handlePrint(s._id)}
                      className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition"
                    >
                      <FiPrinter className="w-4 h-4" /> Print Bill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Catering Vendors */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowVendorModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm shadow"
            >
              + Add Catering Vendor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {vendors.map((v) => (
              <div key={v._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                <h3 className="text-lg font-bold text-white">{v.name}</h3>
                <p className="text-xs text-slate-400">Contact: {v.contactPerson || 'N/A'} ({v.phone})</p>
                <p className="text-xs text-slate-400">Default Rate: LKR {v.defaultMealRate} / meal</p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between font-bold">
                  <span className="text-slate-400">Outstanding:</span>
                  <span className="text-amber-400">LKR {(v.outstandingBalance || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DAILY MEAL LOG MODAL */}
      {showMealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Daily Meal Entry</h3>
              <button onClick={() => setShowMealModal(false)} className="text-slate-400 hover:text-white">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMealMutation.mutate(mealForm)
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-300">Catering Vendor *</label>
                <select
                  required
                  value={mealForm.vendorId}
                  onChange={(e) => {
                    const vId = e.target.value
                    const v = vendors.find(x => x._id === vId)
                    setMealForm({ ...mealForm, vendorId: vId, unitPrice: v ? v.defaultMealRate : 250 })
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Select Catering Supplier --</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>{v.name} (LKR {v.defaultMealRate}/meal)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Shift</label>
                  <select
                    value={mealForm.shift}
                    onChange={(e) => setMealForm({ ...mealForm, shift: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Meal Count (Qty) *</label>
                  <input
                    type="number" required min="1" placeholder="e.g. 150, 200, 300"
                    value={mealForm.mealCount}
                    onChange={(e) => setMealForm({ ...mealForm, mealCount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Unit Price (LKR) *</label>
                  <input
                    type="number" required min="0"
                    value={mealForm.unitPrice}
                    onChange={(e) => setMealForm({ ...mealForm, unitPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Site / Project</label>
                  <select
                    value={mealForm.projectId}
                    onChange={(e) => setMealForm({ ...mealForm, projectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Head Office / Default</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name || p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-right font-bold text-amber-400 text-sm">
                Total Cost: LKR {(Number(mealForm.mealCount || 0) * Number(mealForm.unitPrice || 0)).toLocaleString()}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowMealModal(false)} className="px-4 py-2 text-sm rounded-xl text-slate-400">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow">
                  Record Meal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WEEKLY SETTLEMENT MODAL */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Weekly Settlement System</h3>
              <button onClick={() => setShowSettlementModal(false)} className="text-slate-400 hover:text-white">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createSettlementMutation.mutate(settlementForm)
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-300">Catering Vendor *</label>
                <select
                  required
                  value={settlementForm.vendorId}
                  onChange={(e) => handleVendorForSettlement(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>{v.name} (Outstanding: LKR {v.outstandingBalance?.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Total Accumulated Bill (LKR)</label>
                <input
                  type="number" required
                  value={settlementForm.totalBillAmount}
                  onChange={(e) => setSettlementForm({ ...settlementForm, totalBillAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Paid Amount (LKR) *</label>
                <input
                  type="number" required min="0"
                  value={settlementForm.paidAmount}
                  onChange={(e) => setSettlementForm({ ...settlementForm, paidAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:outline-none font-bold text-emerald-400"
                />
              </div>

              {/* Auto Calculated Remaining Outstanding */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Bill:</span>
                  <span className="text-white font-bold">LKR {(settlementForm.totalBillAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Paid Amount:</span>
                  <span className="text-emerald-400 font-bold">- LKR {(settlementForm.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-1">
                  <span className="text-amber-400">Remaining Balance:</span>
                  <span className="text-amber-400">LKR {(Number(settlementForm.totalBillAmount || 0) - Number(settlementForm.paidAmount || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <FiSend className="w-4 h-4" />
                <span>Instant SMS Alert will be sent to vendor on payment submission.</span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowSettlementModal(false)} className="px-4 py-2 text-sm rounded-xl text-slate-400">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow">
                  Process Settlement & Send SMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE BILL / INVOICE MODAL */}
      {showPrintModal && selectedPrintData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">C.A CONSTRUCTIONS</h2>
                <p className="text-xs text-slate-500">Corporate & Construction Engineering</p>
                <p className="text-xs text-slate-500">Sri Lanka | Hotline: +94 77 123 4567</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                  CATERING INVOICE / BILL
                </span>
                <p className="text-sm font-mono font-bold mt-2">{selectedPrintData.settlement?.settlementNo}</p>
                <p className="text-xs text-slate-500">{new Date(selectedPrintData.settlement?.paymentDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <p className="text-slate-400 uppercase font-semibold">Vendor Details:</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedPrintData.settlement?.vendor?.name}</p>
                <p className="text-slate-600">Contact: {selectedPrintData.settlement?.vendor?.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 uppercase font-semibold">Payment Status:</p>
                <p className="font-bold text-emerald-600 text-sm mt-0.5">SETTLEMENT RECORDED</p>
                <p className="text-slate-600">SMS Alert Status: Verified</p>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Itemized Daily Meal Log</h4>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Shift</th>
                    <th className="p-2">Meal Count</th>
                    <th className="p-2 text-right">Unit Rate</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(selectedPrintData.entries || []).map((e, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="p-2">{e.shift}</td>
                      <td className="p-2 font-bold">{e.mealCount} meals</td>
                      <td className="p-2 text-right">LKR {e.unitPrice}</td>
                      <td className="p-2 text-right font-bold">LKR {(e.totalCost || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Summary */}
            <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs text-right">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Accumulated Bill:</span>
                <span className="font-bold text-slate-900">LKR {(selectedPrintData.settlement?.totalBillAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Amount Paid:</span>
                <span>- LKR {(selectedPrintData.settlement?.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2 text-amber-600">
                <span>Remaining Outstanding Balance:</span>
                <span>LKR {(selectedPrintData.settlement?.remainingOutstanding || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center border-t border-slate-200">
              <div>
                <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
                <p className="text-slate-500">Prepared By (Finance)</p>
              </div>
              <div>
                <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
                <p className="text-slate-500">Vendor Signature & Stamp</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow flex items-center gap-1.5"
              >
                <FiPrinter className="w-4 h-4" /> Print / Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
