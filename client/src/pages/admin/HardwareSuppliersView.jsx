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
  const [activeTab, setActiveTab] = useState('pos') // 'pos' | 'return_pos' | 'suppliers'
  const [searchQuery, setSearchQuery] = useState('')
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [supplierFilter, setSupplierFilter] = useState('ALL')
  const [projectFilter, setProjectFilter] = useState('ALL')

  // Sorting State for Purchase Orders
  const [poSortBy, setPoSortBy] = useState('createdAt') // 'createdAt' | 'expectedDeliveryDate' | 'poNumber' | 'totalAmount' | 'supplier' | 'project' | 'status' | 'items'
  const [poSortOrder, setPoSortOrder] = useState('desc') // 'asc' | 'desc'

  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState(null)
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
    totalBilled: 0,
    totalPaid: 0,
    outstandingBalance: 0,
  })

  // PO Form State
  const [poForm, setPOForm] = useState({
    supplierId: '',
    projectId: '',
    expectedDeliveryDate: '',
    notes: '',
    status: 'Pending',
    isReturn: false,
    items: [{ itemName: '', category: 'Hardware', quantity: 1, unit: 'Units', unitPrice: 0 }],
  })

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    chequeNumber: '',
    notes: '',
    poNumber: '',
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
        category: 'Hardware', address: '', brNumber: '', bankName: '', accountNumber: '', accountName: '',
        totalBilled: 0, totalPaid: 0, outstandingBalance: 0
      })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to register supplier')
    }
  })

  // Update Supplier Mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await api.put(`/suppliers/${id}`, data)
    },
    onSuccess: () => {
      toast.success('Supplier updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      setShowSupplierModal(false)
      setEditingSupplierId(null)
      setSupplierForm({
        name: '', code: '', contactPerson: '', phone: '', email: '',
        category: 'Hardware', address: '', brNumber: '', bankName: '', accountNumber: '', accountName: '',
        totalBilled: 0, totalPaid: 0, outstandingBalance: 0
      })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update supplier')
    }
  })

  // Delete Supplier Mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/suppliers/${id}`)
    },
    onSuccess: () => {
      toast.success('Supplier deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete supplier')
    }
  })

  // Create PO Mutation
  const createPOMutation = useMutation({
    mutationFn: async (data) => {
      return await api.post('/suppliers/pos', data)
    },
    onSuccess: (res, vars) => {
      toast.success(vars?.isReturn ? 'Return Purchase Order created successfully!' : 'Purchase Order created successfully!')
      queryClient.invalidateQueries({ queryKey: ['hardware-pos'] })
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', selectedSupplier?._id] })
      setShowPOModal(false)
      setPOForm({
        supplierId: '',
        projectId: '',
        expectedDeliveryDate: '',
        notes: '',
        status: 'Pending',
        isReturn: false,
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
    onSuccess: (res, vars) => {
      toast.success(vars?.data?.isReturn ? 'Return Purchase Order updated successfully!' : 'Purchase Order updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['hardware-pos'] })
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin-financial'] })
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
      queryClient.invalidateQueries({ queryKey: ['finance-site-summary'] })
      queryClient.invalidateQueries({ queryKey: ['projects-list'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
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
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin-financial'] })
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
      queryClient.invalidateQueries({ queryKey: ['finance-site-summary'] })
      queryClient.invalidateQueries({ queryKey: ['projects-list'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
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
    onSuccess: (res, vars) => {
      toast.success(vars?.status === 'Delivered'
        ? 'Purchase Order marked as Delivered!'
        : `Purchase Order status updated to ${vars?.status}!`)
      queryClient.invalidateQueries({ queryKey: ['hardware-pos'] })
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['site-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin-financial'] })
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
      queryClient.invalidateQueries({ queryKey: ['finance-entries-category'] })
      queryClient.invalidateQueries({ queryKey: ['finance-site-summary'] })
      queryClient.invalidateQueries({ queryKey: ['projects-list'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      if (viewingPO) {
        setViewingPO(prev => prev ? { ...prev, status: vars?.status || 'Delivered' } : null)
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    }
  })

  const openCreateSupplierModal = () => {
    setEditingSupplierId(null)
    setSupplierForm({
      name: '', code: '', contactPerson: '', phone: '', email: '',
      category: 'Hardware', address: '', brNumber: '', bankName: '', accountNumber: '', accountName: '',
      totalBilled: 0, totalPaid: 0, outstandingBalance: 0
    })
    setShowSupplierModal(true)
  }

  const openEditSupplierModal = (supplier) => {
    setEditingSupplierId(supplier._id)
    setSupplierForm({
      name: supplier.name || '',
      code: supplier.code || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      category: supplier.category || 'Hardware',
      address: supplier.address || '',
      brNumber: supplier.brNumber || '',
      bankName: supplier.bankName || supplier.bankDetails?.bankName || '',
      accountNumber: supplier.accountNumber || supplier.bankDetails?.accountNumber || '',
      accountName: supplier.accountName || supplier.bankDetails?.accountName || '',
      totalBilled: supplier.totalBilled !== undefined ? supplier.totalBilled : 0,
      totalPaid: supplier.totalPaid !== undefined ? supplier.totalPaid : 0,
      outstandingBalance: supplier.outstandingBalance !== undefined ? supplier.outstandingBalance : 0,
    })
    setShowSupplierModal(true)
  }

  const handleDeleteSupplier = (supplier) => {
    if (window.confirm(`Are you sure you want to delete supplier "${supplier.name}" (${supplier.code})?`)) {
      deleteSupplierMutation.mutate(supplier._id)
    }
  }

  const openNewPOModal = () => {
    setEditingPOId(null)
    setPOForm({
      supplierId: suppliersData?.[0]?._id || '',
      projectId: '',
      expectedDeliveryDate: '',
      notes: '',
      status: 'Pending',
      isReturn: false,
      items: [{ itemName: '', category: 'Hardware', quantity: 1, unit: 'Units', unitPrice: 0 }],
    })
    setShowPOModal(true)
  }

  const openNewReturnPOModal = () => {
    setEditingPOId(null)
    setPOForm({
      supplierId: suppliersData?.[0]?._id || '',
      projectId: '',
      expectedDeliveryDate: new Date().toISOString().slice(0, 10),
      notes: '',
      status: 'Returned',
      isReturn: true,
      items: [{ itemName: '', category: 'Hardware', quantity: 1, unit: 'Units', unitPrice: 0 }],
    })
    setShowPOModal(true)
  }

  const openEditPOModal = (po) => {
    setEditingPOId(po._id)
    const isReturnOrder = Boolean(po.isReturn || po.status === 'Returned' || po.poNumber?.startsWith('RPO-'))
    const formattedDeliveryDate = po.expectedDeliveryDate
      ? new Date(po.expectedDeliveryDate).toISOString().slice(0, 10)
      : ''
    setPOForm({
      supplierId: po.supplier?._id || po.supplier || '',
      projectId: po.project?._id || po.project || '',
      expectedDeliveryDate: formattedDeliveryDate,
      notes: po.notes || '',
      status: po.status || (isReturnOrder ? 'Returned' : 'Pending'),
      isReturn: isReturnOrder,
      items: (po.items && po.items.length > 0)
        ? po.items.map(item => ({
            itemName: item.itemName || '',
            category: item.category || 'Hardware',
            quantity: (item.quantity !== undefined && item.quantity !== null && item.quantity !== '') ? item.quantity : 1,
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
      toast.success('Payment recorded and added to Expenses!')
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', selectedSupplier?._id] })
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin-financial'] })
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
      queryClient.invalidateQueries({ queryKey: ['finance-site-summary'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowPaymentModal(false)
      setPaymentForm({
        amount: '',
        paymentMethod: 'bank_transfer',
        referenceNumber: '',
        chequeNumber: '',
        notes: '',
        poNumber: '',
      })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to record payment')
    }
  })

  const deleteLedgerEntryMutation = useMutation({
    mutationFn: async (entryId) => {
      return await api.delete(`/suppliers/ledger/${entryId}`)
    },
    onSuccess: () => {
      toast.success('Ledger entry deleted')
      queryClient.invalidateQueries({ queryKey: ['hardware-suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', selectedSupplier?._id] })
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete ledger entry')
    }
  })

  const suppliers = suppliersData || []
  const pos = posData || []

  // Separate regular POs and return POs
  const regularPOs = useMemo(() => {
    return pos.filter(p => !p.isReturn && p.status !== 'Returned' && !p.poNumber?.startsWith('RPO-'))
  }, [pos])

  const returnPOs = useMemo(() => {
    return pos.filter(p => p.isReturn === true || p.status === 'Returned' || p.poNumber?.startsWith('RPO-'))
  }, [pos])

  const targetPOsList = useMemo(() => {
    return activeTab === 'return_pos' ? returnPOs : regularPOs
  }, [activeTab, returnPOs, regularPOs])

  // Filter and Sort POs with full multi-criteria & ASC/DESC direction
  const sortedAndFilteredPOs = useMemo(() => {
    let list = [...targetPOsList]

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
  }, [targetPOsList, statusFilter, supplierFilter, projectFilter, deliveryDateFilter, searchQuery, poSortBy, poSortOrder])

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
  const totalPOAmount = useMemo(() => regularPOs.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0), [regularPOs])
  const pendingPOs = useMemo(() => regularPOs.filter(p => p.status === 'Pending'), [regularPOs])
  const pendingPOAmount = useMemo(() => pendingPOs.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0), [pendingPOs])
  const deliveredPOs = useMemo(() => regularPOs.filter(p => p.status === 'Delivered'), [regularPOs])
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
                Sort, filter by Order Direction (ASC/DESC), track site deliveries, return orders, and manage vendor ledgers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={openCreateSupplierModal}
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

          <button
            onClick={openNewReturnPOModal}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all text-xs cursor-pointer"
          >
            <FiRotateCcw className="w-4 h-4" />
            <span>+ New Return PO</span>
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
          <p className="text-xl font-extrabold text-slate-900 mt-1">{regularPOs.length}</p>
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
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 flex-wrap">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pos' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiShoppingBag size={14} />
            Purchase Orders ({regularPOs.length})
          </button>

          <button
            onClick={() => setActiveTab('return_pos')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'return_pos' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiRotateCcw size={14} />
            Return POs ({returnPOs.length})
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
      {/* TAB 1 & 2: PURCHASE ORDERS & RETURN POS                      */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'pos' || activeTab === 'return_pos') && (
        <div className="space-y-4">
          {/* Enhanced Order / Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            {/* Top row: Sort Controls & Direction Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              {/* Order Direction Toggle: ASC vs DESC */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <FiFilter className={activeTab === 'return_pos' ? 'text-rose-500' : 'text-amber-500'} /> Sort Order:
                </span>

                <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPoSortOrder('asc')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      poSortOrder === 'asc'
                        ? (activeTab === 'return_pos' ? 'bg-rose-500 text-white shadow-xs' : 'bg-amber-500 text-slate-950 shadow-xs')
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
                        ? (activeTab === 'return_pos' ? 'bg-rose-500 text-white shadow-xs' : 'bg-amber-500 text-slate-950 shadow-xs')
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
                  <option value="expectedDeliveryDate">{activeTab === 'return_pos' ? 'Return Date' : 'Expected Delivery Date'} ({poSortOrder === 'asc' ? 'Earliest → Latest' : 'Latest → Earliest'})</option>
                  <option value="poNumber">{activeTab === 'return_pos' ? 'Return PO #' : 'PO Number'} ({poSortOrder === 'asc' ? 'A → Z' : 'Z → A'})</option>
                  <option value="totalAmount">Total Amount ({poSortOrder === 'asc' ? 'Low → High' : 'High → Low'})</option>
                  <option value="supplier">Supplier Name ({poSortOrder === 'asc' ? 'A → Z' : 'Z → A'})</option>
                  <option value="project">{activeTab === 'return_pos' ? 'Return Site / Project' : 'Site / Project'} ({poSortOrder === 'asc' ? 'A → Z' : 'Z → A'})</option>
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
                  placeholder={activeTab === 'return_pos' ? 'Search Return PO #, supplier, item...' : 'Search PO #, supplier, item...'}
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
                {activeTab === 'return_pos' ? (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="ALL">All Return Statuses ({returnPOs.length})</option>
                    <option value="Returned">Returned ({returnPOs.filter(p => p.status === 'Returned' || p.isReturn).length})</option>
                  </select>
                ) : (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="ALL">All Statuses ({regularPOs.length})</option>
                    <option value="Pending">Pending ({regularPOs.filter(p => p.status === 'Pending').length})</option>
                    <option value="Approved">Approved ({regularPOs.filter(p => p.status === 'Approved').length})</option>
                    <option value="Delivered">Delivered ({regularPOs.filter(p => p.status === 'Delivered').length})</option>
                    <option value="Cancelled">Cancelled ({regularPOs.filter(p => p.status === 'Cancelled').length})</option>
                  </select>
                )}
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
                  title={activeTab === 'return_pos' ? 'Filter by Return Date' : 'Filter by Expected Delivery Date'}
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

          {/* PO / Return PO Table */}
          {posLoading ? (
            <div className="text-center py-12 text-slate-500">
              {activeTab === 'return_pos' ? 'Loading Return Purchase Orders...' : 'Loading Purchase Orders...'}
            </div>
          ) : targetPOsList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
              <p>
                {activeTab === 'return_pos'
                  ? 'No Return POs recorded yet. Click "+ New Return PO" to record a return and deduct from supplier ledger.'
                  : 'No Purchase Orders found. Click "+ New Purchase Order (PO)" to issue orders to suppliers.'}
              </p>
              {activeTab === 'return_pos' && (
                <button
                  type="button"
                  onClick={openNewReturnPOModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  <FiRotateCcw className="w-3.5 h-3.5" />
                  <span>+ Create First Return PO</span>
                </button>
              )}
            </div>
          ) : sortedAndFilteredPOs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
              <p>No {activeTab === 'return_pos' ? 'Return POs' : 'Purchase Orders'} found matching your current filter and sort criteria.</p>
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
                          <span>{activeTab === 'return_pos' ? 'Return PO #' : 'PO Number'}</span>
                          {poSortBy === 'poNumber' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} /> : <FiArrowDown className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} />
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
                            poSortOrder === 'asc' ? <FiArrowUp className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} /> : <FiArrowDown className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} />
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
                          <span>{activeTab === 'return_pos' ? 'Return Site / Project' : 'Delivery Site / Project'}</span>
                          {poSortBy === 'project' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} /> : <FiArrowDown className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} />
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
                          <span>{activeTab === 'return_pos' ? 'Return Date' : 'Expected Delivery'}</span>
                          {poSortBy === 'expectedDeliveryDate' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} /> : <FiArrowDown className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} />
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
                            poSortOrder === 'asc' ? <FiArrowUp className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} /> : <FiArrowDown className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} />
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
                          <span>{activeTab === 'return_pos' ? 'Return Amount' : 'Total Amount'}</span>
                          {poSortBy === 'totalAmount' ? (
                            poSortOrder === 'asc' ? <FiArrowUp className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} /> : <FiArrowDown className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} />
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
                            poSortOrder === 'asc' ? <FiArrowUp className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} /> : <FiArrowDown className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'} />
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
                        <td className={`p-3.5 font-mono font-bold ${activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'}`}>
                          <button
                            type="button"
                            onClick={() => setViewingPO(po)}
                            className="hover:underline text-left cursor-pointer inline-flex items-center gap-1.5"
                          >
                            {activeTab === 'return_pos' && <FiRotateCcw size={12} className="text-rose-500 shrink-0" />}
                            <span>{po.poNumber}</span>
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
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                              activeTab === 'return_pos'
                                ? 'bg-rose-50 text-rose-900 border-rose-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}>
                              <FiCalendar className={`w-3 h-3 ${activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'}`} />
                              {new Date(po.expectedDeliveryDate).toLocaleDateString('en-CA')}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not set</span>
                          )}
                        </td>

                        <td className="p-3.5 font-medium text-slate-700">
                          <span className={`px-2 py-0.5 rounded-md font-bold ${activeTab === 'return_pos' ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-800'}`}>
                            {po.items?.length || 0}
                          </span>
                        </td>

                        <td className={`p-3.5 font-extrabold ${activeTab === 'return_pos' ? 'text-rose-600' : 'text-slate-900'}`}>
                          {activeTab === 'return_pos' ? '- ' : ''}LKR {(po.totalAmount || 0).toLocaleString()}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              po.isReturn || po.status === 'Returned'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : po.status === 'Delivered'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : po.status === 'Approved'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : po.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {(po.isReturn || po.status === 'Returned') && <FiRotateCcw className="w-3 h-3" />}
                            {po.status === 'Delivered' && <FiCheckCircle className="w-3 h-3" />}
                            {po.status === 'Pending' && <FiClock className="w-3 h-3" />}
                            {po.isReturn && po.status !== 'Returned' ? 'Returned' : (po.status || 'Returned')}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Inspect / View Details Button */}
                            <button
                              onClick={() => setViewingPO(po)}
                              title="View Details"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            >
                              <FiEye size={15} />
                            </button>

                            {/* Mark Delivered Button (Regular POs only) */}
                            {activeTab === 'pos' && po.status !== 'Delivered' && (
                              <button
                                onClick={() => updatePOStatusMutation.mutate({ id: po._id, status: 'Delivered' })}
                                title="Mark Delivered"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
                              >
                                <FiCheck size={12} />
                                <span>Delivered</span>
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditPOModal(po)}
                              title={activeTab === 'return_pos' ? 'Edit Return PO' : 'Edit Purchase Order'}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                activeTab === 'return_pos'
                                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              <FiEdit2 size={14} />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeletePO(po)}
                              title={activeTab === 'return_pos' ? 'Delete Return PO' : 'Delete Purchase Order'}
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
                  <span className="font-bold text-slate-900">{targetPOsList.length}</span> {activeTab === 'return_pos' ? 'Return Orders' : 'Purchase Orders'}
                </div>
                <div className="flex items-center gap-4">
                  <span>
                    Filtered Total: <strong className={activeTab === 'return_pos' ? 'text-rose-600 font-bold' : 'text-slate-900'}>
                      {activeTab === 'return_pos' ? '- ' : ''}LKR {sortedAndFilteredPOs.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0).toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    Order: <strong className={activeTab === 'return_pos' ? 'text-rose-600' : 'text-amber-600'}>{poSortBy} ({poSortOrder.toUpperCase()})</strong>
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
                      <div className="flex items-center gap-1">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                          {supplier.category || 'Hardware'}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditSupplierModal(supplier)}
                          title="Edit Supplier"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplier(supplier)}
                          title="Delete Supplier"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
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
                <div className={`p-2 rounded-lg ${viewingPO.isReturn || viewingPO.status === 'Returned' || viewingPO.poNumber?.startsWith('RPO-') ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                  {viewingPO.isReturn || viewingPO.status === 'Returned' || viewingPO.poNumber?.startsWith('RPO-') ? (
                    <FiRotateCcw size={18} />
                  ) : (
                    <FiShoppingBag size={18} />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {viewingPO.isReturn || viewingPO.status === 'Returned' || viewingPO.poNumber?.startsWith('RPO-')
                      ? `Return Purchase Order: ${viewingPO.poNumber}`
                      : `Purchase Order: ${viewingPO.poNumber}`}
                  </h3>
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {viewingPO.isReturn || viewingPO.status === 'Returned' ? 'Return Site' : 'Delivery Site'}
                </span>
                <span className="font-bold text-slate-900">{viewingPO.siteName || viewingPO.project?.name || viewingPO.project?.title || 'Central Warehouse'}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {viewingPO.isReturn || viewingPO.status === 'Returned' ? 'Return Date' : 'Expected Date'}
                </span>
                <span className={`font-bold ${viewingPO.isReturn || viewingPO.status === 'Returned' ? 'text-rose-700' : 'text-amber-700'}`}>
                  {viewingPO.expectedDeliveryDate ? new Date(viewingPO.expectedDeliveryDate).toLocaleDateString() : 'Immediate'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                  viewingPO.isReturn || viewingPO.status === 'Returned'
                    ? 'bg-rose-100 text-rose-800'
                    : viewingPO.status === 'Delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {viewingPO.status || (viewingPO.isReturn ? 'Returned' : 'Pending')}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase">
                {viewingPO.isReturn || viewingPO.status === 'Returned' ? 'Returned Material Items' : 'Ordered Material Items'}
              </h4>
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
                  <tfoot className={viewingPO.isReturn || viewingPO.status === 'Returned' ? 'bg-rose-50 font-bold border-t border-rose-200' : 'bg-amber-50 font-bold border-t border-amber-200'}>
                    <tr>
                      <td colSpan="4" className={`p-2.5 text-right ${viewingPO.isReturn || viewingPO.status === 'Returned' ? 'text-rose-900' : 'text-amber-900'}`}>
                        {viewingPO.isReturn || viewingPO.status === 'Returned' ? 'Total Return Value (Deduction):' : 'Total PO Value:'}
                      </td>
                      <td className={`p-2.5 text-right font-mono text-sm ${viewingPO.isReturn || viewingPO.status === 'Returned' ? 'text-rose-700' : 'text-amber-900'}`}>
                        {viewingPO.isReturn || viewingPO.status === 'Returned' ? '- ' : ''}LKR {(viewingPO.totalAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {viewingPO.notes && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">
                  {viewingPO.isReturn || viewingPO.status === 'Returned' ? 'Return Reason & Notes:' : 'Notes & Delivery Instructions:'}
                </span>
                <p className="text-slate-600">{viewingPO.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {!viewingPO.isReturn && viewingPO.status !== 'Returned' && viewingPO.status !== 'Delivered' && (
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
                  <FiEdit2 size={13} /> {viewingPO.isReturn || viewingPO.status === 'Returned' ? 'Edit Return PO' : 'Edit PO'}
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
              <h3 className="text-lg font-bold text-slate-900">
                {editingSupplierId ? 'Edit Hardware Supplier' : 'Register Hardware Supplier'}
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (editingSupplierId) {
                  updateSupplierMutation.mutate({ id: editingSupplierId, data: supplierForm })
                } else {
                  createSupplierMutation.mutate(supplierForm)
                }
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

              {/* Financial Balances */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 block">Financial &amp; Ledger Balances (LKR)</span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Total Billed</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={supplierForm.totalBilled}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0
                        const paid = Number(supplierForm.totalPaid) || 0
                        setSupplierForm({
                          ...supplierForm,
                          totalBilled: e.target.value,
                          outstandingBalance: val - paid,
                        })
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2 text-xs mt-1 focus:border-amber-500 focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Total Paid</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={supplierForm.totalPaid}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0
                        const billed = Number(supplierForm.totalBilled) || 0
                        setSupplierForm({
                          ...supplierForm,
                          totalPaid: e.target.value,
                          outstandingBalance: billed - val,
                        })
                      }}
                      className="w-full bg-white border border-slate-200 text-emerald-600 rounded-lg p-2 text-xs mt-1 focus:border-emerald-500 focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Outstanding Balance</label>
                    <input
                      type="number"
                      step="any"
                      value={supplierForm.outstandingBalance}
                      onChange={(e) => setSupplierForm({ ...supplierForm, outstandingBalance: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-amber-700 rounded-lg p-2 text-xs mt-1 focus:border-amber-500 focus:outline-none font-semibold"
                    />
                  </div>
                </div>
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
                  disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow cursor-pointer"
                >
                  {createSupplierMutation.isPending || updateSupplierMutation.isPending
                    ? (editingSupplierId ? 'Saving...' : 'Registering...')
                    : (editingSupplierId ? 'Save Changes' : 'Register Supplier')}
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
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {poForm.isReturn ? (
                  <>
                    <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg"><FiRotateCcw size={16} /></span>
                    <span>{editingPOId ? 'Edit Return Purchase Order (Return PO)' : 'Create Return Purchase Order (Return PO)'}</span>
                  </>
                ) : (
                  <>
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><FiShoppingBag size={16} /></span>
                    <span>{editingPOId ? 'Edit Purchase Order (PO)' : 'Create Purchase Order (PO)'}</span>
                  </>
                )}
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
                  <label className="text-xs font-medium text-slate-600">
                    {poForm.isReturn ? 'Return Site / Project' : 'Delivery Site / Project'}
                  </label>
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
                  <label className="text-xs font-medium text-slate-600">
                    {poForm.isReturn ? 'Return Date *' : 'Expected Delivery Date'}
                  </label>
                  <input
                    type="date"
                    value={poForm.expectedDeliveryDate}
                    onChange={(e) => setPOForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {editingPOId && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Status</label>
                    <select
                      value={poForm.status}
                      onChange={(e) => setPOForm({ ...poForm, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none"
                    >
                      {poForm.isReturn ? (
                        <option value="Returned">Returned</option>
                      ) : (
                        <>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </>
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">
                    {poForm.isReturn ? 'Returned Items' : 'Order Items'}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className={`text-xs font-semibold hover:underline ${poForm.isReturn ? 'text-rose-600' : 'text-amber-500'}`}
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
                      type="number" step="any" required min="0" placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="col-span-2 bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none"
                    />
                    <input
                      type="number" step="any" required min="0" placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="col-span-3 bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none"
                    />
                    <div className={`col-span-1 text-right text-xs font-bold ${poForm.isReturn ? 'text-rose-600' : 'text-amber-600'}`}>
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
                  {poForm.isReturn ? 'Total Return Deduction:' : 'Total Amount:'}{' '}
                  <span className={poForm.isReturn ? 'text-rose-600 font-mono text-base' : 'text-amber-500 font-mono text-base'}>
                    {poForm.isReturn ? '- ' : ''}LKR {calculatePOTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  {poForm.isReturn ? 'Return Reason / Notes' : 'Notes / Instructions'}
                </label>
                <textarea
                  rows="2"
                  value={poForm.notes}
                  onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
                  placeholder={poForm.isReturn ? 'Reason for return (damaged, excess stock, wrong specification)...' : 'Optional delivery notes or terms...'}
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
                  className={`px-5 py-2 text-sm font-semibold rounded-xl text-white shadow cursor-pointer ${
                    poForm.isReturn ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {editingPOId
                    ? (updatePOMutation.isPending ? 'Saving...' : 'Save Changes')
                    : (createPOMutation.isPending
                        ? (poForm.isReturn ? 'Creating Return PO...' : 'Creating PO...')
                        : (poForm.isReturn ? 'Create Return PO' : 'Create Purchase Order'))}
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
                <p className="text-base font-bold text-slate-900">LKR {(ledgerData?.supplier?.totalBilled ?? selectedSupplier.totalBilled ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Total Paid</span>
                <p className="text-base font-bold text-emerald-600">LKR {(ledgerData?.supplier?.totalPaid ?? selectedSupplier.totalPaid ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Net Outstanding</span>
                <p className="text-base font-bold text-amber-600">LKR {(ledgerData?.supplier?.outstandingBalance ?? selectedSupplier.outstandingBalance ?? 0).toLocaleString()}</p>
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
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ledgerData.ledger.map((entry) => (
                      <tr key={entry._id}>
                        <td className="p-3">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.transactionType === 'payment'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : entry.transactionType === 'return_po'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-200'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {entry.transactionType === 'payment'
                              ? 'PAYMENT'
                              : entry.transactionType === 'return_po'
                              ? 'RETURN PO'
                              : 'PO BILL'}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{entry.referenceNumber || entry.referencePO?.poNumber || '-'}</td>
                        <td className="p-3 text-slate-500">{entry.notes}</td>
                        <td className={`p-3 text-right font-bold ${
                          entry.transactionType === 'payment'
                            ? 'text-emerald-600'
                            : entry.transactionType === 'return_po'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}>
                          {entry.transactionType === 'payment' || entry.transactionType === 'return_po' ? '-' : '+'} LKR {(entry.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          LKR {(entry.runningBalance || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this ledger entry? This cannot be undone.')) {
                                deleteLedgerEntryMutation.mutate(entry._id)
                              }
                            }}
                            disabled={deleteLedgerEntryMutation.isPending}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Delete entry"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
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

              <div>
                <label className="text-xs font-medium text-slate-600">PO Number</label>
                <input
                  type="text"
                  value={paymentForm.poNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, poNumber: e.target.value })}
                  placeholder="Enter PO Number (optional)"
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
