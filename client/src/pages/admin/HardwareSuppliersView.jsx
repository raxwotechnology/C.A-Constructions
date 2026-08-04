import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import {
  FiBriefcase,
  FiPlus,
  FiShoppingBag,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiFileText,
  FiTruck,
  FiX,
  FiSearch,
} from 'react-icons/fi'

export default function HardwareSuppliersView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('suppliers') // 'suppliers' | 'pos'
  const [searchQuery, setSearchQuery] = useState('')
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showPOModal, setShowPOModal] = useState(false)
  const [showLedgerModal, setShowLedgerModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const [selectedSupplier, setSelectedSupplier] = useState(null)

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    code: '',
    contactPerson: '',
    phone: '',
    email: '',
    category: 'Hardware',
    address: '',
    brNumber: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  })

  // PO Form State
  const [poForm, setPOForm] = useState({
    supplierId: '',
    projectId: '',
    expectedDeliveryDate: '',
    notes: '',
    items: [{ itemName: '', category: 'Hardware', quantity: 1, unit: 'Units', unitPrice: 0 }],
  })

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    chequeNumber: '',
    notes: '',
  })

  // Fetch Suppliers
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['hardware-suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers')
      return res.data?.suppliers || []
    },
  })

  // Fetch POs
  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['hardware-pos'],
    queryFn: async () => {
      const res = await api.get('/suppliers/pos/all')
      return res.data?.pos || []
    },
  })

  // Fetch Projects for PO site selection
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const res = await api.get('/projects')
      return res.data?.projects || res.data || []
    },
  })

  // Fetch Supplier Ledger details
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['supplier-ledger', selectedSupplier?._id],
    queryFn: async () => {
      if (!selectedSupplier?._id) return null
      const res = await api.get(`/suppliers/${selectedSupplier._id}/ledger`)
      return res.data
    },
    enabled: !!selectedSupplier?._id,
  })

  // Create Supplier Mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (data) => {
      return await api.post('/suppliers', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      setShowSupplierModal(false)
      setSupplierForm({
        name: '', code: '', contactPerson: '', phone: '', email: '',
        category: 'Hardware', address: '', brNumber: '', bankName: '', accountNumber: '', accountName: ''
      })
    },
  })

  // Create PO Mutation
  const createPOMutation = useMutation({
    mutationFn: async (data) => {
      return await api.post('/suppliers/pos', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-pos'] })
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      setShowPOModal(false)
      setPOForm({
        supplierId: '', projectId: '', expectedDeliveryDate: '', notes: '',
        items: [{ itemName: '', category: 'Hardware', quantity: 1, unit: 'Units', unitPrice: 0 }],
      })
    },
  })

  // Update PO Status Mutation
  const updatePOStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return await api.patch(`/suppliers/pos/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-pos'] })
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['site-inventory'] })
    },
  })

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ supplierId, data }) => {
      return await api.post(`/suppliers/${supplierId}/payment`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', selectedSupplier?._id] })
      setShowPaymentModal(false)
      setPaymentForm({ amount: '', paymentMethod: 'bank_transfer', referenceNumber: '', chequeNumber: '', notes: '' })
    },
  })

  const suppliers = suppliersData || []
  const pos = posData || []

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone?.includes(searchQuery)
  )

  const handleAddItemRow = () => {
    setPOForm(prev => ({
      ...prev,
      items: [...prev.items, { itemName: '', category: 'Hardware', quantity: 1, unit: 'Units', unitPrice: 0 }]
    }))
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...poForm.items]
    newItems[index][field] = value
    setPOForm(prev => ({ ...prev, items: newItems }))
  }

  const calculatePOTotal = () => {
    return poForm.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0)
  }

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <FiBriefcase className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Hardware Suppliers Module</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Supplier registration, Purchase Order tracking (Pending/Delivered), and Supplier Ledgers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all"
          >
            <FiPlus className="w-5 h-5" />
            <span>Register Supplier</span>
          </button>

          <button
            onClick={() => setShowPOModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all"
          >
            <FiShoppingBag className="w-5 h-5" />
            <span>New Purchase Order (PO)</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'suppliers' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Suppliers & Ledgers ({suppliers.length})
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'pos' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Purchase Orders ({pos.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <FiSearch className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* TAB 1: Suppliers Directory & Outstanding Balances */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {suppliersLoading ? (
            <div className="text-center py-12 text-slate-400">Loading hardware suppliers...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
              No suppliers found. Click "Register Supplier" to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier._id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {supplier.code}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-1">{supplier.name}</h3>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {supplier.category || 'Hardware'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <p><span className="text-slate-500">Contact:</span> {supplier.contactPerson || 'N/A'} ({supplier.phone})</p>
                      <p><span className="text-slate-500">Email:</span> {supplier.email || 'N/A'}</p>
                      <p><span className="text-slate-500">Address:</span> {supplier.address || 'N/A'}</p>
                    </div>

                    {/* Ledger Summary */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Total Billed:</span>
                        <span className="text-white font-medium">LKR {(supplier.totalBilled || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Total Paid:</span>
                        <span className="text-emerald-400 font-medium">LKR {(supplier.totalPaid || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-1.5">
                        <span className="text-amber-400">Outstanding:</span>
                        <span className="text-amber-400">LKR {(supplier.outstandingBalance || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setSelectedSupplier(supplier)
                        setShowLedgerModal(true)
                      }}
                      className="flex-1 text-center py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      View Ledger
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSupplier(supplier)
                        setShowPaymentModal(true)
                      }}
                      className="flex-1 text-center py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Purchase Orders */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          {posLoading ? (
            <div className="text-center py-12 text-slate-400">Loading Purchase Orders...</div>
          ) : pos.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
              No Purchase Orders found. Click "New Purchase Order" to issue orders to suppliers.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">PO Number</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Site / Project</th>
                    <th className="p-4">Items Count</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pos.map((po) => (
                    <tr key={po._id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-mono font-bold text-amber-400">{po.poNumber}</td>
                      <td className="p-4 font-medium text-white">{po.supplier?.name || 'N/A'}</td>
                      <td className="p-4 text-slate-300">{po.siteName || po.project?.name || 'Central Warehouse'}</td>
                      <td className="p-4">{po.items?.length || 0} items</td>
                      <td className="p-4 font-bold text-white">LKR {(po.totalAmount || 0).toLocaleString()}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            po.status === 'Delivered'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : po.status === 'Approved'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : po.status === 'Cancelled'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {po.status === 'Delivered' && <FiCheckCircle className="w-3.5 h-3.5" />}
                          {po.status === 'Pending' && <FiClock className="w-3.5 h-3.5" />}
                          {po.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {po.status !== 'Delivered' && (
                          <button
                            onClick={() => updatePOStatusMutation.mutate({ id: po._id, status: 'Delivered' })}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* REGISTER SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Register Hardware Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createSupplierMutation.mutate(supplierForm)
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-300">Supplier / Business Name *</label>
                <input
                  type="text" required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. Lanka Hardware Supplies"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Phone Number *</label>
                  <input
                    type="text" required
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Category</label>
                  <select
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Materials">Materials</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Machinery">Machinery</option>
                    <option value="Raw Material">Raw Material</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Address</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 text-sm rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSupplierMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow"
                >
                  {createSupplierMutation.isPending ? 'Registering...' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PURCHASE ORDER MODAL */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Create Purchase Order (PO)</h3>
              <button onClick={() => setShowPOModal(false)} className="text-slate-400 hover:text-white">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createPOMutation.mutate(poForm)
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Select Supplier *</label>
                  <select
                    required
                    value={poForm.supplierId}
                    onChange={(e) => setPOForm({ ...poForm, supplierId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Delivery Site / Project</label>
                  <select
                    value={poForm.projectId}
                    onChange={(e) => setPOForm({ ...poForm, projectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Central Warehouse</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name || p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Order Items</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-semibold text-amber-400 hover:underline"
                  >
                    + Add Line Item
                  </button>
                </div>

                {poForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 items-center">
                    <input
                      type="text" required placeholder="Item Description"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      className="col-span-5 bg-slate-900 border border-slate-800 text-white p-2 text-xs rounded-lg focus:outline-none"
                    />
                    <input
                      type="number" required min="1" placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="col-span-2 bg-slate-900 border border-slate-800 text-white p-2 text-xs rounded-lg focus:outline-none"
                    />
                    <input
                      type="number" required min="0" placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="col-span-3 bg-slate-900 border border-slate-800 text-white p-2 text-xs rounded-lg focus:outline-none"
                    />
                    <div className="col-span-2 text-right text-xs font-bold text-amber-400">
                      LKR {(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toLocaleString()}
                    </div>
                  </div>
                ))}

                <div className="text-right text-sm font-bold text-white pt-2">
                  Total Amount: <span className="text-amber-400 font-mono text-base">LKR {calculatePOTotal().toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 text-sm rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPOMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow"
                >
                  {createPOMutation.isPending ? 'Creating PO...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER LEDGER MODAL */}
      {showLedgerModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedSupplier.name} — Supplier Ledger</h3>
                <p className="text-xs text-slate-400">Code: {selectedSupplier.code} | Contact: {selectedSupplier.phone}</p>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-400 hover:text-white">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-xs text-slate-400">Total Billed</span>
                <p className="text-base font-bold text-white">LKR {(selectedSupplier.totalBilled || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Total Paid</span>
                <p className="text-base font-bold text-emerald-400">LKR {(selectedSupplier.totalPaid || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Net Outstanding</span>
                <p className="text-base font-bold text-amber-400">LKR {(selectedSupplier.outstandingBalance || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-300">Transaction History</h4>
              {ledgerLoading ? (
                <div className="text-center py-6 text-slate-400">Loading ledger history...</div>
              ) : !ledgerData?.ledger || ledgerData.ledger.length === 0 ? (
                <div className="text-center py-6 bg-slate-950 rounded-xl text-slate-500 text-xs">No transactions recorded in ledger yet.</div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Ref #</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ledgerData.ledger.map((entry) => (
                      <tr key={entry._id}>
                        <td className="p-3">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            entry.transactionType === 'payment' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {entry.transactionType === 'payment' ? 'PAYMENT' : 'PO BILL'}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{entry.referenceNumber || entry.referencePO?.poNumber || '-'}</td>
                        <td className="p-3 text-slate-400">{entry.notes}</td>
                        <td className={`p-3 text-right font-bold ${entry.transactionType === 'payment' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {entry.transactionType === 'payment' ? '-' : '+'} LKR {(entry.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          LKR {(entry.runningBalance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Record Payment to Supplier</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p><span className="text-slate-400">Supplier:</span> <strong className="text-white">{selectedSupplier.name}</strong></p>
              <p><span className="text-slate-400">Current Outstanding:</span> <strong className="text-amber-400">LKR {(selectedSupplier.outstandingBalance || 0).toLocaleString()}</strong></p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                recordPaymentMutation.mutate({ supplierId: selectedSupplier._id, data: paymentForm })
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-300">Payment Amount (LKR) *</label>
                <input
                  type="number" required min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Reference / Cheque Number</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                >
                  {recordPaymentMutation.isPending ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
