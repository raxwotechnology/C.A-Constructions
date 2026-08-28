import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
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
  FiEdit2,
  FiTrash2,
  FiCalendar,
  FiRotateCcw,
  FiArrowUp,
  FiArrowDown,
  FiFilter,
  FiEye,
  FiCheck,
} from 'react-icons/fi'

export default function HardwareSuppliersView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('pos') // 'suppliers' | 'pos'
  const [searchQuery, setSearchQuery] = useState('')
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [supplierFilter, setSupplierFilter] = useState('ALL')
  const [projectFilter, setProjectFilter] = useState('ALL')

  // Sorting State for Purchase Orders
  const [poSortBy, setPoSortBy] = useState('createdAt') // 'createdAt' | 'expectedDeliveryDate' | 'poNumber' | 'totalAmount' | 'supplier' | 'project' | 'status' | 'items'
  const [poSortOrder, setPoSortOrder] = useState('desc') // 'asc' | 'desc'

  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showPOModal, setShowPOModal] = useState(false)
  const [editingPOId, setEditingPOId] = useState(null)
  const [viewingPO, setViewingPO] = useState(null)
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
    status: 'Pending',
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
      toast.success('Hardware supplier registered successfully!')
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      setShowSupplierModal(false)
      setSupplierForm({
        name: '', code: '', contactPerson: '', phone: '', email: '',
        category: 'Hardware', address: '', brNumber: '', bankName: '', accountNumber: '', accountName: ''
      })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to register supplier')
    }
  })

  // Create PO Mutation
  const createPOMutation = useMutation({
    mutationFn: async (data) => {
      return await api.post('/suppliers/pos', data)
    },
    onSuccess: () => {
      toast.success('Purchase Order created successfully!')
      queryClient.invalidateQueries({ queryKey: ['hardware-pos'] })
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      setShowPOModal(false)
      setPOForm({
        supplierId: '',
        projectId: '',
        expectedDeliveryDate: '',
        notes: '',
        status: 'Pending',
        items: [{ itemName: '', category: 'Hardware', quantity: 1, unit: 'Units', unitPrice: 0 }],
      })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create Purchase Order')
    }
  })

  // Update PO Mutation
  const updatePOMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await api.put(`/suppliers/pos/${id}`, data)
    },
    onSuccess: () => {
      toast.success('Purchase Order updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['hardware-pos'] })
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      setShowPOModal(false)
      setEditingPOId(null)
      if (viewingPO) setViewingPO(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update Purchase Order')
    }
  })

  // Delete PO Mutation
  const deletePOMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/suppliers/pos/${id}`)
    },
    onSuccess: () => {
      toast.success('Purchase Order deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['hardware-pos'] })
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      if (viewingPO) setViewingPO(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete Purchase Order')
    }
  })

  // Update PO Status Mutation
  const updatePOStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return await api.patch(`/suppliers/pos/${id}/status`, { status })
    },
    onSuccess: () => {
      toast.success('Purchase Order marked as Delivered!')
      queryClient.invalidateQueries({ queryKey: ['hardware-pos'] })
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['site-inventory'] })
      if (viewingPO) {
        setViewingPO(prev => prev ? { ...prev, status: 'Delivered' } : null)
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    }
  })

  const openNewPOModal = () => {
    setEditingPOId(null)
    setPOForm({
      supplierId: suppliersData?.[0]?._id || '',
      projectId: '',
      expectedDeliveryDate: '',
      notes: '',
      status: 'Pending',
      items: [{ itemName: '', category: 'Hardware', quantity: 1, unit: 'Units', unitPrice: 0 }],
    })
    setShowPOModal(true)
  }

  const openEditPOModal = (po) => {
    setEditingPOId(po._id)
    const formattedDeliveryDate = po.expectedDeliveryDate
      ? new Date(po.expectedDeliveryDate).toISOString().slice(0, 10)
      : ''
    setPOForm({
      supplierId: po.supplier?._id || po.supplier || '',
      projectId: po.project?._id || po.project || '',
      expectedDeliveryDate: formattedDeliveryDate,
      notes: po.notes || '',
      status: po.status || 'Pending',
      items: (po.items && po.items.length > 0)
        ? po.items.map(item => ({
            itemName: item.itemName || '',
            category: item.category || 'Hardware',
            quantity: item.quantity || 1,
            unit: item.unit || 'Units',
            unitPrice: item.unitPrice || 0,
          }))
        : [{ itemName: '', category: 'Hardware', quantity: 1, unit: 'Units', unitPrice: 0 }],
    })
    setShowPOModal(true)
  }

  const handleDeletePO = (po) => {
    if (window.confirm(`Are you sure you want to delete Purchase Order "${po.poNumber}"?`)) {
      deletePOMutation.mutate(po._id)
    }
  }

  const handlePOSubmit = (e) => {
    e.preventDefault()
    if (editingPOId) {
      updatePOMutation.mutate({ id: editingPOId, data: poForm })
    } else {
      createPOMutation.mutate(poForm)
    }
  }

  const handleRemoveItemRow = (index) => {
    if (poForm.items.length <= 1) return
    setPOForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ supplierId, data }) => {
      return await api.post(`/suppliers/${supplierId}/payments`, data)
    },
    onSuccess: () => {
      toast.success('Payment recorded and ledger updated!')
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', selectedSupplier?._id] })
      setShowPaymentModal(false)
      setPaymentForm({
        amount: '',
        paymentMethod: 'bank_transfer',
        referenceNumber: '',
        chequeNumber: '',
        notes: '',
      })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to record payment')
    }
  })

  const suppliers = suppliersData || []
  const pos = posData || []

  // Filter and Sort POs with full multi-criteria & ASC/DESC direction
  const sortedAndFilteredPOs = useMemo(() => {
    let list = [...pos]

    // 1. Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter(p => p.status === statusFilter)
    }

    // 2. Supplier filter
    if (supplierFilter !== 'ALL') {
      list = list.filter(p => (p.supplier?._id || p.supplier) === supplierFilter)
    }

    // 3. Project / Site filter
    if (projectFilter !== 'ALL') {
      list = list.filter(p => (p.project?._id || p.project) === projectFilter)
    }

    // 4. Expected delivery date filter
    if (deliveryDateFilter) {
      list = list.filter(p => {
        if (!p.expectedDeliveryDate) return false
        const poDate = new Date(p.expectedDeliveryDate).toISOString().slice(0, 10)
        return poDate === deliveryDateFilter
      })
    }

    // 5. Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(po => 
        po.poNumber?.toLowerCase().includes(q) ||
        po.supplier?.name?.toLowerCase().includes(q) ||
        po.supplier?.code?.toLowerCase().includes(q) ||
        po.siteName?.toLowerCase().includes(q) ||
        po.project?.name?.toLowerCase().includes(q) ||
        po.project?.title?.toLowerCase().includes(q) ||
        po.status?.toLowerCase().includes(q) ||
        po.notes?.toLowerCase().includes(q) ||
        po.items?.some(i => i.itemName?.toLowerCase().includes(q))
      )
    }

    // 6. Sorting logic (ASC / DESC on any chosen column)
    list.sort((a, b) => {
      let valA, valB
      switch (poSortBy) {
        case 'poNumber':
          valA = a.poNumber || ''
          valB = b.poNumber || ''
          return poSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)

        case 'supplier':
          valA = a.supplier?.name || ''
          valB = b.supplier?.name || ''
          return poSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)

        case 'project':
          valA = a.siteName || a.project?.name || a.project?.title || ''
          valB = b.siteName || b.project?.name || b.project?.title || ''
          return poSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)

        case 'expectedDeliveryDate':
          valA = a.expectedDeliveryDate ? new Date(a.expectedDeliveryDate).getTime() : 0
          valB = b.expectedDeliveryDate ? new Date(b.expectedDeliveryDate).getTime() : 0
          return poSortOrder === 'asc' ? valA - valB : valB - valA

        case 'items':
          valA = a.items?.length || 0
          valB = b.items?.length || 0
          return poSortOrder === 'asc' ? valA - valB : valB - valA

        case 'totalAmount':
          valA = Number(a.totalAmount || 0)
          valB = Number(b.totalAmount || 0)
          return poSortOrder === 'asc' ? valA - valB : valB - valA

        case 'status':
          valA = a.status || ''
          valB = b.status || ''
          return poSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)

        case 'createdAt':
        default:
          valA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          valB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return poSortOrder === 'asc' ? valA - valB : valB - valA
      }
    })

    return list
  }, [pos, statusFilter, supplierFilter, projectFilter, deliveryDateFilter, searchQuery, poSortBy, poSortOrder])

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q ||
      s.name?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)

    if (!deliveryDateFilter) return matchesSearch

    const hasMatchingPO = pos.some(po => {
      const supplierId = po.supplier?._id || po.supplier
      if (String(supplierId) !== String(s._id)) return false
      if (!po.expectedDeliveryDate) return false
      const poDate = new Date(po.expectedDeliveryDate).toISOString().slice(0, 10)
      return poDate === deliveryDateFilter
    })

    return matchesSearch && hasMatchingPO
  })

  // Helper to toggle table column sorting
  const handleSort = (column) => {
    if (poSortBy === column) {
      setPoSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setPoSortBy(column)
      setPoSortOrder(column === 'totalAmount' || column === 'createdAt' ? 'desc' : 'asc')
    }
  }

  // Reset all filters & sorting
  const resetAllFilters = () => {
    setSearchQuery('')
    setDeliveryDateFilter('')
    setStatusFilter('ALL')
    setSupplierFilter('ALL')
    setProjectFilter('ALL')
    setPoSortBy('createdAt')
    setPoSortOrder('desc')
  }

  // KPI Calculations
  const totalPOAmount = useMemo(() => pos.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0), [pos])
  const pendingPOs = useMemo(() => pos.filter(p => p.status === 'Pending'), [pos])
  const pendingPOAmount = useMemo(() => pendingPOs.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0), [pendingPOs])
  const deliveredPOs = useMemo(() => pos.filter(p => p.status === 'Delivered'), [pos])
  const deliveredPOAmount = useMemo(() => deliveredPOs.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0), [deliveredPOs])

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
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 text-slate-800 min-h-screen">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <FiBriefcase className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Orders &amp; Supplier Management</h1>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                Sort, filter by Order Direction (ASC/DESC), track site deliveries, and manage vendor ledgers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs transition-all text-xs cursor-pointer"
          >
            <FiPlus className="w-4 h-4 text-slate-600" />
            <span>Register Supplier</span>
          </button>

          <button
            onClick={openNewPOModal}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-md transition-all text-xs cursor-pointer"
          >
            <FiShoppingBag className="w-4 h-4" />
            <span>+ New Purchase Order (PO)</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Purchase Orders</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><FiShoppingBag size={15} /></span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{pos.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Total Value: <span className="font-bold text-slate-700">LKR {totalPOAmount.toLocaleString()}</span></p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600">Pending Delivery</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><FiClock size={15} /></span>
          </div>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{pendingPOs.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Pending: <span className="font-bold text-amber-700">LKR {pendingPOAmount.toLocaleString()}</span></p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600">Delivered &amp; In-Stock</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FiCheckCircle size={15} /></span>
          </div>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{deliveredPOs.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Delivered: <span className="font-bold text-emerald-700">LKR {deliveredPOAmount.toLocaleString()}</span></p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600">Registered Suppliers</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><FiBriefcase size={15} /></span>
          </div>
          <p className="text-xl font-extrabold text-indigo-600 mt-1">{suppliers.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Active Hardware Vendors</p>
        </div>
      </div>

      {/* Tabs & Filter Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pos' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiShoppingBag size={14} />
            Purchase Orders ({pos.length})
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'suppliers' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiBriefcase size={14} />
            Suppliers &amp; Ledgers ({suppliers.length})
          </button>
        </div>

        {/* Global Reset */}
        {(searchQuery || deliveryDateFilter || statusFilter !== 'ALL' || supplierFilter !== 'ALL' || projectFilter !== 'ALL' || poSortOrder !== 'desc' || poSortBy !== 'createdAt') && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Reset all filters and sorting"
          >
            <FiRotateCcw className="w-3.5 h-3.5" /> Reset Filters &amp; Order
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PURCHASE ORDERS (WITH FULL ASC / DESC & MULTI-FILTERS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          {/* Enhanced Order / Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            {/* Top row: Sort Controls & Direction Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              {/* Order Direction Toggle: ASC vs DESC */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <FiFilter className="text-amber-500" /> Sort Order:
                </span>

                <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPoSortOrder('asc')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      poSortOrder === 'asc'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Ascending Order (A-Z / Low to High / Oldest First)"
                  >
                    <FiArrowUp size={13} />
                    <span>ASC (Ascending)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPoSortOrder('desc')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      poSortOrder === 'desc'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Descending Order (Z-A / High to Low / Newest First)"
                  >
                    <FiArrowDown size={13} />
                    <span>DESC (Descending)</span>
                  </button>
                </div>
              </div>

              {/* Sort By Field Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Order by Field:</span>
                <select
                  value={poSortBy}
                  onChange={(e) => setPoSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="createdAt">Date Created ({poSortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'})</option>
                  <option value="expectedDeliveryDate">Expected Delivery Date ({poSortOrder === 'asc' ? 'Earliest → Latest' : 'Latest → Earliest'})</option>
                  <option value="poNumber">PO Number ({poSortOrder === 'asc' ? 'PO-001 → PO-999' : 'PO-999 → PO-001'})</option>
                  <option value="totalAmount">Total Amount ({poSortOrder === 'asc' ? 'Low → High' : 'High → Low'})</option>
                  <option value="supplier">Supplier Name ({poSortOrder === 'asc' ? 'A → Z' : 'Z → A'})</option>
                  <option value="project">Site / Project ({poSortOrder === 'asc' ? 'A → Z' : 'Z → A'})</option>
                  <option value="status">Status ({poSortOrder === 'asc' ? 'A → Z' : 'Z → A'})</option>
                  <option value="items">Item Count ({poSortOrder === 'asc' ? 'Fewest → Most' : 'Most → Fewest'})</option>
                </select>
              </div>
            </div>

            {/* Bottom row: Multi-Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              {/* Text Search */}
              <div className="relative">
                <FiSearch className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search PO #, supplier, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-8 pr-7 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses ({pos.length})</option>
                  <option value="Pending">Pending ({pos.filter(p => p.status === 'Pending').length})</option>
                  <option value="Approved">Approved ({pos.filter(p => p.status === 'Approved').length})</option>
                  <option value="Delivered">Delivered ({pos.filter(p => p.status === 'Delivered').length})</option>
                  <option value="Cancelled">Cancelled ({pos.filter(p => p.status === 'Cancelled').length})</option>
                </select>
              </div>

              {/* Supplier Filter */}
              <div>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">All Suppliers</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              {/* Project / Site Filter */}
              <div>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">All Delivery Sites</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name || p.title}</option>
                  ))}
                </select>
              </div>

              {/* Expected Delivery Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={deliveryDateFilter}
                  onChange={(e) => setDeliveryDateFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  title="Filter by Expected Delivery Date"
                />
                {deliveryDateFilter && (
                  <button
                    type="button"
                    onClick={() => setDeliveryDateFilter('')}
                    className="absolute right-8 top-2.5 text-slate-400 hover:text-rose-600"
                    title="Clear date"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* PO Table */}
          {posLoading ? (
            <div className="text-center py-12 text-slate-500">Loading Purchase Orders...</div>
          ) : pos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
              No Purchase Orders found. Click &quot;+ New Purchase Order&quot; to issue orders to suppliers.
            </div>
          ) : sortedAndFilteredPOs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
              <p>No Purchase Orders found matching your current filter and sort criteria.</p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200 select-none">
                    <tr>
                      {/* Clickable Header: PO Number */}
                      <th
                        onClick={() => handleSort('poNumber')}
                        className="p-3.5 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1">
                          <span>PO Number</span>
                          {poSortBy === 'poNumber' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className="text-amber-600" /> : <FiArrowDown className="text-amber-600" />
                          ) : (
                            <span className="text-slate-300">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* Clickable Header: Supplier */}
                      <th
                        onClick={() => handleSort('supplier')}
                        className="p-3.5 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1">
                          <span>Supplier</span>
                          {poSortBy === 'supplier' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className="text-amber-600" /> : <FiArrowDown className="text-amber-600" />
                          ) : (
                            <span className="text-slate-300">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* Clickable Header: Site / Project */}
                      <th
                        onClick={() => handleSort('project')}
                        className="p-3.5 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1">
                          <span>Delivery Site / Project</span>
                          {poSortBy === 'project' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className="text-amber-600" /> : <FiArrowDown className="text-amber-600" />
                          ) : (
                            <span className="text-slate-300">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* Clickable Header: Expected Delivery */}
                      <th
                        onClick={() => handleSort('expectedDeliveryDate')}
                        className="p-3.5 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1">
                          <span>Expected Delivery</span>
                          {poSortBy === 'expectedDeliveryDate' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className="text-amber-600" /> : <FiArrowDown className="text-amber-600" />
                          ) : (
                            <span className="text-slate-300">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* Clickable Header: Items Count */}
                      <th
                        onClick={() => handleSort('items')}
                        className="p-3.5 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1">
                          <span>Items</span>
                          {poSortBy === 'items' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className="text-amber-600" /> : <FiArrowDown className="text-amber-600" />
                          ) : (
                            <span className="text-slate-300">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* Clickable Header: Total Amount */}
                      <th
                        onClick={() => handleSort('totalAmount')}
                        className="p-3.5 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1">
                          <span>Total Amount</span>
                          {poSortBy === 'totalAmount' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className="text-amber-600" /> : <FiArrowDown className="text-amber-600" />
                          ) : (
                            <span className="text-slate-300">⇅</span>
                          )}
                        </div>
                      </th>

                      {/* Clickable Header: Status */}
                      <th
                        onClick={() => handleSort('status')}
                        className="p-3.5 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1">
                          <span>Status</span>
                          {poSortBy === 'status' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className="text-amber-600" /> : <FiArrowDown className="text-amber-600" />
                          ) : (
                            <span className="text-slate-300">⇅</span>
                          )}
                        </div>
                      </th>

                      <th className="p-3.5 text-right font-bold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {sortedAndFilteredPOs.map((po) => (
                      <tr key={po._id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-mono font-bold text-amber-600">
                          <button
                            type="button"
                            onClick={() => setViewingPO(po)}
                            className="hover:underline text-left cursor-pointer"
                          >
                            {po.poNumber}
                          </button>
                        </td>

                        <td className="p-3.5 font-semibold text-slate-900">
                          <div>{po.supplier?.name || 'N/A'}</div>
                          {po.supplier?.code && (
                            <span className="text-[10px] text-slate-400 font-mono">{po.supplier.code}</span>
                          )}
                        </td>

                        <td className="p-3.5 text-slate-700">
                          {po.siteName || po.project?.name || po.project?.title || 'Central Warehouse'}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {po.expectedDeliveryDate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                              <FiCalendar className="w-3 h-3 text-amber-600" />
                              {new Date(po.expectedDeliveryDate).toLocaleDateString('en-CA')}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not set</span>
                          )}
                        </td>

                        <td className="p-3.5 font-medium text-slate-700">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md font-bold text-slate-800">
                            {po.items?.length || 0}
                          </span>
                        </td>

                        <td className="p-3.5 font-extrabold text-slate-900">
                          LKR {(po.totalAmount || 0).toLocaleString()}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              po.status === 'Delivered'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : po.status === 'Approved'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : po.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {po.status === 'Delivered' && <FiCheckCircle className="w-3 h-3" />}
                            {po.status === 'Pending' && <FiClock className="w-3 h-3" />}
                            {po.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Inspect / View Details Button */}
                            <button
                              onClick={() => setViewingPO(po)}
                              title="View Order Details"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            >
                              <FiEye size={15} />
                            </button>

                            {/* Mark Delivered Button */}
                            {po.status !== 'Delivered' && (
                              <button
                                onClick={() => updatePOStatusMutation.mutate({ id: po._id, status: 'Delivered' })}
                                title="Mark Delivered & Add to Site Stock"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
                              >
                                <FiCheck size={12} />
                                <span>Delivered</span>
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditPOModal(po)}
                              title="Edit Purchase Order"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            >
                              <FiEdit2 size={14} />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeletePO(po)}
                              title="Delete Purchase Order"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Count & Summary */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
                <div>
                  Showing <span className="font-bold text-slate-900">{sortedAndFilteredPOs.length}</span> of{' '}
                  <span className="font-bold text-slate-900">{pos.length}</span> Purchase Orders
                </div>
                <div className="flex items-center gap-4">
                  <span>
                    Filtered Total: <strong className="text-slate-900">LKR {sortedAndFilteredPOs.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0).toLocaleString()}</strong>
                  </span>
                  <span>
                    Order: <strong className="text-amber-600">{poSortBy} ({poSortOrder.toUpperCase()})</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: SUPPLIERS DIRECTORY & OUTSTANDING BALANCES            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {suppliersLoading ? (
            <div className="text-center py-12 text-slate-500">Loading hardware suppliers...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
              <p>No suppliers found matching your search.</p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier._id}
                  className="bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20 font-bold">
                          {supplier.code}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{supplier.name}</h3>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                        {supplier.category || 'Hardware'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p><span className="font-bold text-slate-600">Contact:</span> {supplier.contactPerson || 'N/A'} ({supplier.phone})</p>
                      <p><span className="font-bold text-slate-600">Email:</span> {supplier.email || 'N/A'}</p>
                      <p><span className="font-bold text-slate-600">Address:</span> {supplier.address || 'N/A'}</p>
                    </div>

                    {/* Ledger Summary */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Total Billed:</span>
                        <span className="text-slate-900 font-bold">LKR {(supplier.totalBilled || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Total Paid:</span>
                        <span className="text-emerald-600 font-bold">LKR {(supplier.totalPaid || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-t border-slate-200 pt-1.5">
                        <span className="text-amber-700">Outstanding Balance:</span>
                        <span className="text-amber-700">LKR {(supplier.outstandingBalance || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedSupplier(supplier)
                        setShowLedgerModal(true)
                      }}
                      className="flex-1 text-center py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      View Ledger
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSupplier(supplier)
                        setShowPaymentModal(true)
                      }}
                      className="flex-1 text-center py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VIEW FULL PURCHASE ORDER DETAILS (INSPECTION MODAL)    */}
      {/* ------------------------------------------------------------- */}
      {viewingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <FiShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Purchase Order: {viewingPO.poNumber}</h3>
                  <p className="text-xs text-slate-500">
                    Created on {new Date(viewingPO.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingPO(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <FiX size={20} />
              </button>
            </div>

            {/* PO Metadata Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Supplier</span>
                <span className="font-bold text-slate-900">{viewingPO.supplier?.name || 'N/A'}</span>
                {viewingPO.supplier?.phone && <span className="text-[11px] text-slate-500 block">{viewingPO.supplier.phone}</span>}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Site</span>
                <span className="font-bold text-slate-900">{viewingPO.siteName || viewingPO.project?.name || viewingPO.project?.title || 'Central Warehouse'}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Expected Date</span>
                <span className="font-bold text-amber-700">
                  {viewingPO.expectedDeliveryDate ? new Date(viewingPO.expectedDeliveryDate).toLocaleDateString() : 'Immediate'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                  viewingPO.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {viewingPO.status}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Ordered Material Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewingPO.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{item.itemName}</td>
                        <td className="p-2.5 text-slate-500">{item.category || 'General'}</td>
                        <td className="p-2.5 text-center font-semibold">{item.quantity} {item.unit || 'Units'}</td>
                        <td className="p-2.5 text-right text-slate-600">LKR {(item.unitPrice || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          LKR {(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-amber-50 font-bold border-t border-amber-200">
                    <tr>
                      <td colSpan="4" className="p-2.5 text-right text-amber-900">Total PO Value:</td>
                      <td className="p-2.5 text-right text-amber-900 font-mono text-sm">
                        LKR {(viewingPO.totalAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {viewingPO.notes && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Notes &amp; Delivery Instructions:</span>
                <p className="text-slate-600">{viewingPO.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {viewingPO.status !== 'Delivered' && (
                  <button
                    onClick={() => updatePOStatusMutation.mutate({ id: viewingPO._id, status: 'Delivered' })}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <FiCheck size={14} /> Mark Delivered
                  </button>
                )}
                <button
                  onClick={() => {
                    const poToEdit = viewingPO
                    setViewingPO(null)
                    openEditPOModal(poToEdit)
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <FiEdit2 size={13} /> Edit PO
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingPO(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Register Hardware Supplier</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-500 hover:text-slate-900">
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
                <label className="text-xs font-medium text-slate-600">Supplier / Business Name *</label>
                <input
                  type="text" required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. Lanka Hardware Supplies"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Phone Number *</label>
                  <input
                    type="text" required
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Email Address</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Category</label>
                  <select
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Cement & Blocks">Cement & Blocks</option>
                    <option value="Steel & Metal">Steel & Metal</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Paint">Paint</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Business Address</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 text-sm rounded-xl text-slate-500 hover:text-slate-900"
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

      {/* CREATE / EDIT PURCHASE ORDER MODAL */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPOId ? 'Edit Purchase Order (PO)' : 'Create Purchase Order (PO)'}
              </h3>
              <button
                onClick={() => {
                  setShowPOModal(false)
                  setEditingPOId(null)
                }}
                className="text-slate-500 hover:text-slate-900"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handlePOSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Select Supplier *</label>
                  <select
                    required
                    value={poForm.supplierId}
                    onChange={(e) => setPOForm({ ...poForm, supplierId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">Delivery Site / Project</label>
                  <select
                    value={poForm.projectId}
                    onChange={(e) => setPOForm({ ...poForm, projectId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Central Warehouse</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name || p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={poForm.expectedDeliveryDate}
                    onChange={(e) => setPOForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {editingPOId && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">PO Status</label>
                    <select
                      value={poForm.status}
                      onChange={(e) => setPOForm({ ...poForm, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Order Items</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-semibold text-amber-500 hover:underline"
                  >
                    + Add Line Item
                  </button>
                </div>

                {poForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 items-center">
                    <input
                      type="text" required placeholder="Item Description"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      className="col-span-5 bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none"
                    />
                    <input
                      type="number" required min="1" placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="col-span-2 bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none"
                    />
                    <input
                      type="number" required min="0" placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="col-span-3 bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none"
                    />
                    <div className="col-span-1 text-right text-xs font-bold text-amber-600">
                      {(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toLocaleString()}
                    </div>
                    <div className="col-span-1 text-right">
                      {poForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Remove item"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="text-right text-sm font-bold text-slate-900 pt-2">
                  Total Amount: <span className="text-amber-500 font-mono text-base">LKR {calculatePOTotal().toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Notes / Instructions</label>
                <textarea
                  rows="2"
                  value={poForm.notes}
                  onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
                  placeholder="Optional delivery notes or terms..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowPOModal(false)
                    setEditingPOId(null)
                  }}
                  className="px-4 py-2 text-sm rounded-xl text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingPOId ? updatePOMutation.isPending : createPOMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow"
                >
                  {editingPOId
                    ? (updatePOMutation.isPending ? 'Saving...' : 'Save Changes')
                    : (createPOMutation.isPending ? 'Creating PO...' : 'Create Purchase Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER LEDGER MODAL */}
      {showLedgerModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedSupplier.name} — Supplier Ledger</h3>
                <p className="text-xs text-slate-500">Code: {selectedSupplier.code} | Contact: {selectedSupplier.phone}</p>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-500 hover:text-slate-900">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-xs text-slate-500">Total Billed</span>
                <p className="text-base font-bold text-slate-900">LKR {(selectedSupplier.totalBilled || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Total Paid</span>
                <p className="text-base font-bold text-emerald-400">LKR {(selectedSupplier.totalPaid || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Net Outstanding</span>
                <p className="text-base font-bold text-amber-400">LKR {(selectedSupplier.outstandingBalance || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-600">Transaction History</h4>
              {ledgerLoading ? (
                <div className="text-center py-6 text-slate-500">Loading ledger history...</div>
              ) : !ledgerData?.ledger || ledgerData.ledger.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl text-slate-500 text-xs">No transactions recorded in ledger yet.</div>
              ) : (
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Ref #</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
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
                        <td className="p-3 text-slate-500">{entry.notes}</td>
                        <td className={`p-3 text-right font-bold ${entry.transactionType === 'payment' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {entry.transactionType === 'payment' ? '-' : '+'} LKR {(entry.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
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
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Record Payment to Supplier</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-500 hover:text-slate-900">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p><span className="text-slate-500">Supplier:</span> <strong className="text-slate-900">{selectedSupplier.name}</strong></p>
              <p><span className="text-slate-500">Current Outstanding:</span> <strong className="text-amber-400">LKR {(selectedSupplier.outstandingBalance || 0).toLocaleString()}</strong></p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                recordPaymentMutation.mutate({ supplierId: selectedSupplier._id, data: paymentForm })
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-600">Payment Amount (LKR) *</label>
                <input
                  type="number" required min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Reference / Cheque Number</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm rounded-xl text-slate-500 hover:text-slate-900"
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
