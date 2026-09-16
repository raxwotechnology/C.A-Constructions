import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
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
  FiUsers,
  FiPhone,
  FiMail,
  FiMapPin,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi'

export default function MealsCateringView() {
  const queryClient = useQueryClient()
  const printRef = useRef(null)

  const [activeTab, setActiveTab] = useState('daily-entries') // 'daily-entries' | 'settlements' | 'vendors'
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [editingVendorId, setEditingVendorId] = useState(null)
  const [editingMealId, setEditingMealId] = useState(null)
  const [showMealModal, setShowMealModal] = useState(false)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const [selectedSettlement, setSelectedSettlement] = useState(null)
  const [selectedPrintData, setSelectedPrintData] = useState(null)

  // Vendor Form
  const [vendorForm, setVendorForm] = useState({
    name: '', contactPerson: '', phone: '', email: '', address: '', defaultMealRate: 250, notes: '', status: 'active'
  })

  // Meal Entry Form
  const [mealForm, setMealForm] = useState({
    vendorId: '', date: new Date().toISOString().slice(0, 10), shift: 'Day',
    mealCount: 150, unitPrice: 250, projectId: '', notes: '', settlementStatus: 'unsettled'
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
      toast.success('Catering vendor added successfully!')
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
      setShowVendorModal(false)
      setEditingVendorId(null)
      setVendorForm({ name: '', contactPerson: '', phone: '', email: '', address: '', defaultMealRate: 250, notes: '', status: 'active' })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to add catering vendor')
    }
  })

  // Update Vendor
  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }) => await api.put(`/meals/vendors/${id}`, data),
    onSuccess: () => {
      toast.success('Catering vendor updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
      setShowVendorModal(false)
      setEditingVendorId(null)
      setVendorForm({ name: '', contactPerson: '', phone: '', email: '', address: '', defaultMealRate: 250, notes: '', status: 'active' })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update catering vendor')
    }
  })

  // Delete Vendor
  const deleteVendorMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/meals/vendors/${id}`),
    onSuccess: () => {
      toast.success('Catering vendor deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
      queryClient.invalidateQueries({ queryKey: ['meal-entries'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete catering vendor')
    }
  })

  const openAddVendorModal = () => {
    setEditingVendorId(null)
    setVendorForm({ name: '', contactPerson: '', phone: '', email: '', address: '', defaultMealRate: 250, notes: '', status: 'active' })
    setShowVendorModal(true)
  }

  const openEditVendorModal = (vendor) => {
    setEditingVendorId(vendor._id)
    setVendorForm({
      name: vendor.name || '',
      contactPerson: vendor.contactPerson || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      defaultMealRate: vendor.defaultMealRate || 250,
      notes: vendor.notes || '',
      status: vendor.status || 'active',
    })
    setShowVendorModal(true)
  }

  const handleDeleteVendor = (vendor) => {
    if (window.confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) {
      deleteVendorMutation.mutate(vendor._id)
    }
  }

  const handleVendorSubmit = (e) => {
    e.preventDefault()
    if (editingVendorId) {
      updateVendorMutation.mutate({ id: editingVendorId, data: vendorForm })
    } else {
      createVendorMutation.mutate(vendorForm)
    }
  }

  // Log Daily Meal Entry
  const createMealMutation = useMutation({
    mutationFn: async (data) => await api.post('/meals/entries', data),
    onSuccess: () => {
      toast.success('Daily meal entry recorded!')
      queryClient.invalidateQueries({ queryKey: ['meal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
      setShowMealModal(false)
      setEditingMealId(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to record meal entry')
    }
  })

  // Update Daily Meal Entry
  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data }) => await api.put(`/meals/entries/${id}`, data),
    onSuccess: () => {
      toast.success('Daily meal entry updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['meal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
      setShowMealModal(false)
      setEditingMealId(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update meal entry')
    }
  })

  // Delete Daily Meal Entry
  const deleteMealMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/meals/entries/${id}`),
    onSuccess: () => {
      toast.success('Daily meal entry deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['meal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete meal entry')
    }
  })

  const openAddMealModal = () => {
    setEditingMealId(null)
    setMealForm({
      vendorId: vendors[0]?._id || '',
      date: new Date().toISOString().slice(0, 10),
      shift: 'Day',
      mealCount: 150,
      unitPrice: vendors[0]?.defaultMealRate || 250,
      projectId: '',
      notes: '',
      settlementStatus: 'unsettled',
    })
    setShowMealModal(true)
  }

  const openEditMealModal = (entry) => {
    setEditingMealId(entry._id)
    const formattedDate = entry.date ? new Date(entry.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    setMealForm({
      vendorId: entry.vendor?._id || entry.vendor || '',
      date: formattedDate,
      shift: entry.shift || 'Day',
      mealCount: entry.mealCount || 1,
      unitPrice: entry.unitPrice || 250,
      projectId: entry.project?._id || entry.project || '',
      notes: entry.notes || '',
      settlementStatus: entry.settlementStatus || 'unsettled',
    })
    setShowMealModal(true)
  }

  const handleDeleteMeal = (entry) => {
    if (window.confirm(`Are you sure you want to delete this meal entry for ${new Date(entry.date).toLocaleDateString()} (${entry.mealCount} meals)?`)) {
      deleteMealMutation.mutate(entry._id)
    }
  }

  const handleMealSubmit = (e) => {
    e.preventDefault()
    if (editingMealId) {
      updateMealMutation.mutate({ id: editingMealId, data: mealForm })
    } else {
      createMealMutation.mutate(mealForm)
    }
  }

  // Create Settlement
  const createSettlementMutation = useMutation({
    mutationFn: async (data) => await api.post('/meals/settlements', data),
    onSuccess: () => {
      toast.success('Settlement processed successfully!')
      queryClient.invalidateQueries({ queryKey: ['meal-settlements'] })
      queryClient.invalidateQueries({ queryKey: ['meal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['catering-vendors'] })
      setShowSettlementModal(false)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to process settlement')
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
    <div className="p-6 space-y-6 bg-slate-50 text-slate-800 min-h-screen">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <FiCoffee className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meals & Catering Ledger</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Daily meal logging, weekly settlement auto-calculations, instant SMS alerts, and printable invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAddMealModal}
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
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab('daily-entries')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'daily-entries' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          Daily Meal Logs ({entries.length})
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'settlements' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          Weekly Settlements ({settlements.length})
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'vendors' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          Catering Vendors ({vendors.length})
        </button>
      </div>

      {/* TAB 1: Daily Meal Logs */}
      {activeTab === 'daily-entries' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
          {entries.length === 0 ? (
            <div className="p-12 text-center">
              <FiCalendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">No Daily Meal Entries Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Log daily meal counts for Day/Night shifts to track supplier billing automatically.
              </p>
              <button
                onClick={openAddMealModal}
                className="mt-4 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs shadow transition-all"
              >
                <FiPlus className="w-4 h-4" /> Log First Meal
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Shift</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Site / Project</th>
                  <th className="p-4">Meal Count</th>
                  <th className="p-4">Unit Rate</th>
                  <th className="p-4">Total Cost</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-100/40 transition">
                    <td className="p-4 font-mono">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="p-4 font-semibold">
                      <span className={`px-2.5 py-1 rounded-full text-xs ${
                        entry.shift === 'Night' ? 'bg-indigo-500/10 text-indigo-700 border border-indigo-200' : 'bg-amber-500/10 text-amber-700 border border-amber-200'
                      }`}>
                        {entry.shift} Shift
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-900">{entry.vendor?.name || 'N/A'}</td>
                    <td className="p-4 text-slate-600">{entry.siteName || entry.project?.name || 'Head Office'}</td>
                    <td className="p-4 font-mono text-slate-900 font-bold">{entry.mealCount} meals</td>
                    <td className="p-4">LKR {entry.unitPrice}</td>
                    <td className="p-4 font-bold text-amber-600">LKR {(entry.totalCost || 0).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        entry.settlementStatus === 'settled' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {entry.settlementStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditMealModal(entry)}
                          title="Edit Meal Entry"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeal(entry)}
                          title="Delete Meal Entry"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: Settlements & Printable Invoices */}
      {activeTab === 'settlements' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-200">
              {settlements.map((s) => (
                <tr key={s._id} className="hover:bg-slate-100/40 transition">
                  <td className="p-4 font-mono font-bold text-amber-400">{s.settlementNo}</td>
                  <td className="p-4 font-medium text-slate-900">{s.vendor?.name || 'N/A'}</td>
                  <td className="p-4 text-xs text-slate-500">{new Date(s.paymentDate).toLocaleDateString()}</td>
                  <td className="p-4 font-mono">{s.totalMealCount} meals</td>
                  <td className="p-4 font-bold text-slate-900">LKR {(s.totalBillAmount || 0).toLocaleString()}</td>
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
                      className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition"
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
              onClick={openAddVendorModal}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm shadow flex items-center gap-1.5 transition-all"
            >
              <FiPlus className="w-4 h-4" /> Add Catering Vendor
            </button>
          </div>

          {vendors.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <FiCoffee className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">No Catering Vendors Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Add catering suppliers to start recording daily meal counts, site deliveries, and weekly settlements.
              </p>
              <button
                onClick={openAddVendorModal}
                className="mt-4 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs shadow transition-all"
              >
                <FiPlus className="w-4 h-4" /> Add First Vendor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {vendors.map((v) => (
                <div key={v._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg space-y-3 hover:border-amber-400 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{v.name}</h3>
                        <span className={`inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                          v.status === 'inactive'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {v.status === 'inactive' ? 'Inactive' : 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditVendorModal(v)}
                          title="Edit Vendor"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(v)}
                          title="Delete Vendor"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5"><FiUsers className="w-3.5 h-3.5 text-slate-400" /> Contact: {v.contactPerson || 'N/A'}</p>
                      <p className="flex items-center gap-1.5"><FiPhone className="w-3.5 h-3.5 text-slate-400" /> Phone: {v.phone || 'N/A'}</p>
                      {v.email && <p className="flex items-center gap-1.5"><FiMail className="w-3.5 h-3.5 text-slate-400" /> {v.email}</p>}
                      {v.address && <p className="flex items-center gap-1.5"><FiMapPin className="w-3.5 h-3.5 text-slate-400" /> {v.address}</p>}
                      <p className="text-slate-700 font-medium pt-1">Default Rate: LKR {v.defaultMealRate} / meal</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between font-bold mt-2">
                    <span className="text-slate-500">Outstanding:</span>
                    <span className="text-amber-600">LKR {(v.outstandingBalance || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CATERING VENDOR MODAL (ADD & EDIT) */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingVendorId ? 'Edit Catering Vendor' : 'Add Catering Vendor'}
              </h3>
              <button
                onClick={() => {
                  setShowVendorModal(false)
                  setEditingVendorId(null)
                }}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleVendorSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700">Vendor / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Caterers, Perera Meals"
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Kamal Perera"
                    value={vendorForm.contactPerson}
                    onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0771234567"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    placeholder="vendor@mail.com"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Default Rate / Meal (LKR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="250"
                    value={vendorForm.defaultMealRate}
                    onChange={(e) => setVendorForm({ ...vendorForm, defaultMealRate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Address / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. No 45, Kandy Road"
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={vendorForm.status || 'active'}
                    onChange={(e) => setVendorForm({ ...vendorForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Notes / Agreement Details</label>
                <textarea
                  rows="2"
                  placeholder="Special instructions, dietary options, payment terms..."
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowVendorModal(false)
                    setEditingVendorId(null)
                  }}
                  className="px-4 py-2 text-sm rounded-xl text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 shadow transition-all"
                >
                  {createVendorMutation.isPending || updateVendorMutation.isPending
                    ? 'Saving...'
                    : editingVendorId
                    ? 'Save Changes'
                    : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAILY MEAL LOG MODAL */}
      {showMealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingMealId ? 'Edit Daily Meal Entry' : 'Daily Meal Entry'}
              </h3>
              <button
                onClick={() => {
                  setShowMealModal(false)
                  setEditingMealId(null)
                }}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleMealSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700">Catering Vendor *</label>
                <select
                  required
                  value={mealForm.vendorId}
                  onChange={(e) => {
                    const vId = e.target.value
                    const v = vendors.find(x => x._id === vId)
                    setMealForm({
                      ...mealForm,
                      vendorId: vId,
                      unitPrice: (!editingMealId && v) ? v.defaultMealRate : mealForm.unitPrice
                    })
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Select Catering Supplier --</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>{v.name} (LKR {v.defaultMealRate}/meal)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={mealForm.date}
                    onChange={(e) => setMealForm({ ...mealForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Shift</label>
                  <select
                    value={mealForm.shift}
                    onChange={(e) => setMealForm({ ...mealForm, shift: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Meal Count (Qty) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 150, 200, 300"
                    value={mealForm.mealCount}
                    onChange={(e) => setMealForm({ ...mealForm, mealCount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Unit Price (LKR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={mealForm.unitPrice}
                    onChange={(e) => setMealForm({ ...mealForm, unitPrice: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Site / Project</label>
                  <select
                    value={mealForm.projectId}
                    onChange={(e) => setMealForm({ ...mealForm, projectId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  >
                    <option value="">Head Office / Default</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name || p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Settlement Status</label>
                  <select
                    value={mealForm.settlementStatus || 'unsettled'}
                    onChange={(e) => setMealForm({ ...mealForm, settlementStatus: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                  >
                    <option value="unsettled">Unsettled</option>
                    <option value="settled">Settled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Notes / Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Special dietary request, overtime meal, notes..."
                  value={mealForm.notes}
                  onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium text-xs">Total Calculated Cost:</span>
                <span className="font-bold text-amber-700 text-base">
                  LKR {(Number(mealForm.mealCount || 0) * Number(mealForm.unitPrice || 0)).toLocaleString()}
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowMealModal(false)
                    setEditingMealId(null)
                  }}
                  className="px-4 py-2 text-sm rounded-xl text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMealMutation.isPending || updateMealMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 shadow transition-all"
                >
                  {createMealMutation.isPending || updateMealMutation.isPending
                    ? 'Saving...'
                    : editingMealId
                    ? 'Save Changes'
                    : 'Record Meal Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WEEKLY SETTLEMENT MODAL */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Weekly Settlement System</h3>
              <button onClick={() => setShowSettlementModal(false)} className="text-slate-500 hover:text-slate-900">
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
                <label className="text-xs font-medium text-slate-600">Catering Vendor *</label>
                <select
                  required
                  value={settlementForm.vendorId}
                  onChange={(e) => handleVendorForSettlement(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>{v.name} (Outstanding: LKR {v.outstandingBalance?.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Total Accumulated Bill (LKR)</label>
                <input
                  type="number" required
                  value={settlementForm.totalBillAmount}
                  onChange={(e) => setSettlementForm({ ...settlementForm, totalBillAmount: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Paid Amount (LKR) *</label>
                <input
                  type="number" required min="0"
                  value={settlementForm.paidAmount}
                  onChange={(e) => setSettlementForm({ ...settlementForm, paidAmount: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:outline-none font-bold text-emerald-400"
                />
              </div>

              {/* Auto Calculated Remaining Outstanding */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bill:</span>
                  <span className="text-slate-900 font-bold">LKR {(settlementForm.totalBillAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid Amount:</span>
                  <span className="text-emerald-400 font-bold">- LKR {(settlementForm.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1">
                  <span className="text-amber-400">Remaining Balance:</span>
                  <span className="text-amber-400">LKR {(Number(settlementForm.totalBillAmount || 0) - Number(settlementForm.paidAmount || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <FiSend className="w-4 h-4" />
                <span>Instant SMS Alert will be sent to vendor on payment submission.</span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowSettlementModal(false)} className="px-4 py-2 text-sm rounded-xl text-slate-500">Cancel</button>
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
                <p className="text-slate-500 uppercase font-semibold">Vendor Details:</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedPrintData.settlement?.vendor?.name}</p>
                <p className="text-slate-600">Contact: {selectedPrintData.settlement?.vendor?.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 uppercase font-semibold">Payment Status:</p>
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
