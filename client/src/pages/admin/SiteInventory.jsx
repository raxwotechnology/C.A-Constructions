import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiLayers, FiTruck, FiShield, FiAlertTriangle, FiPlus, FiCheckCircle, FiX, FiFileText, FiTrash2, FiChevronDown, FiChevronUp, FiUnlock } from 'react-icons/fi'

export default function SiteInventory() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('stock')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showGrnModal, setShowGrnModal] = useState(false)
  const [expandedGrnId, setExpandedGrnId] = useState(null)

  // Local state fallbacks for instant UI reactivity
  const [resolvedGrns, setResolvedGrns] = useState({})
  const [receivedTransfers, setReceivedTransfers] = useState({})

  const [stockForm, setStockForm] = useState({
    itemName: '', category: 'Cement', quantity: 0, unit: 'bags', unitPrice: 0, reorderLevel: 10, isCentralWarehouse: true, site: ''
  })
  const [transferForm, setTransferForm] = useState({
    fromSite: 'Central Warehouse', toSite: 'Colombo Commercial Tower', itemName: 'Tokyo Super Cement 50kg', category: 'Cement', quantity: 50, unit: 'bags'
  })

  // Professional Multi-Item GRN Form State
  const [grnHeader, setGrnHeader] = useState({
    supplierName: 'LankaCement PLC',
    poNumber: 'PO-8812',
    site: 'Colombo Commercial Tower',
  })

  const [grnItems, setGrnItems] = useState([
    { id: 1, itemName: 'Tokyo Super Cement 50kg', category: 'Cement', orderedQty: 200, receivedQty: 195, unit: 'bags', unitPrice: 2350 },
    { id: 2, itemName: 'Melwa Tor Steel 16mm', category: 'Steel', orderedQty: 500, receivedQty: 500, unit: 'kg', unitPrice: 320 },
  ])

  const { data: inventoryData } = useQuery({
    queryKey: ['site-inventory'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data).catch(() => ({ stock: [] })),
  })

  const { data: transfersData } = useQuery({
    queryKey: ['site-transfers'],
    queryFn: () => api.get('/inventory/transfers').then(r => r.data).catch(() => ({ transfers: [] })),
  })

  const { data: grnsData } = useQuery({
    queryKey: ['site-grns'],
    queryFn: () => api.get('/inventory/grn').then(r => r.data).catch(() => ({ grns: [] })),
  })

  const stockList = inventoryData?.stock || []

  const transfersList = transfersData?.transfers || []

  const grnList = grnsData?.grns || []

  // Action: Clear / Release GRN Payment Hold
  const handleResolveGrn = (grnId) => {
    api.put(`/inventory/grn/${grnId}/resolve`, { resolutionNotes: 'Payment Hold Released by Accountant' })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['site-grns'] })
        setResolvedGrns(prev => ({ ...prev, [grnId]: true }))
        toast.success(`GRN (${grnId}) Payment Hold released & marked as RESOLVED!`)
      })
      .catch((err) => {
        toast.error(`Failed to resolve GRN: ${err?.response?.data?.message || 'Server error'}`)
      })
  }

  // Action: Update Transfer Status (IN TRANSIT -> RECEIVED AT SITE)
  const handleReceiveTransfer = (transferId, transferNo) => {
    api.put(`/inventory/transfers/${transferId}/status`, { status: 'received' })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['site-transfers'] })
        setReceivedTransfers(prev => ({ ...prev, [transferId]: true }))
        toast.success(`Transfer ${transferNo} marked as RECEIVED AT SITE!`)
      })
      .catch((err) => {
        toast.error(`Failed to update transfer: ${err?.response?.data?.message || 'Server error'}`)
      })
  }

  // Add Item to GRN
  const handleAddGrnLineItem = () => {
    setGrnItems([
      ...grnItems,
      { id: Date.now(), itemName: '', category: 'General', orderedQty: 10, receivedQty: 10, unit: 'bags', unitPrice: 1000 }
    ])
  }

  // Remove Item from GRN
  const handleRemoveGrnLineItem = (id) => {
    if (grnItems.length <= 1) {
      toast.error('A GRN must contain at least one line item!')
      return
    }
    setGrnItems(grnItems.filter(item => item.id !== id))
  }

  // Update GRN Line Item Field
  const handleUpdateGrnItem = (id, field, value) => {
    setGrnItems(grnItems.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  // Total GRN Amount Calculation
  const totalGrnAmount = grnItems.reduce((sum, item) => sum + (Number(item.receivedQty || 0) * Number(item.unitPrice || 0)), 0)
  
  // Check if any line item has quantity variance
  const grnHasVariance = grnItems.some(item => Number(item.orderedQty || 0) !== Number(item.receivedQty || 0))

  const handleSaveStock = (e) => {
    e.preventDefault()
    if (!stockForm.itemName.trim()) {
      toast.error('Please enter item name!')
      return
    }
    api.post('/inventory/stock', stockForm)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['site-inventory'] })
        toast.success(`Stock item "${stockForm.itemName}" saved!`)
        setShowAddModal(false)
      })
      .catch((err) => {
        toast.error(`Failed to save stock: ${err?.response?.data?.message || 'Server error'}`)
      })
  }

  const handleSaveTransfer = (e) => {
    e.preventDefault()
    const reqQty = Number(transferForm.quantity) || 0
    if (!transferForm.itemName.trim() || reqQty <= 0) {
      toast.error('Please enter item name and valid quantity!')
      return
    }

    // Match stock item to check available stock
    const matchedStock = stockList.find(
      s => s.itemName.trim().toLowerCase() === transferForm.itemName.trim().toLowerCase()
    )
    const available = matchedStock
      ? (Number(matchedStock.quantity !== undefined && matchedStock.quantity !== null ? matchedStock.quantity : (matchedStock.centralStockQty || 0)))
      : 0

    if (matchedStock && reqQty > available) {
      toast.error(`ප්‍රමාණවත් stock එකක් නොමැත! Available: ${available} ${matchedStock.unit || 'units'}`)
      return
    }

    api.post('/inventory/transfers', transferForm)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['site-transfers'] })
        queryClient.invalidateQueries({ queryKey: ['site-inventory'] })
        toast.success(`Material transfer for "${transferForm.itemName}" initiated!`)
        setShowTransferModal(false)
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to create transfer')
      })
  }

  // Save Multi-Item GRN
  const handleSaveMultiItemGrn = (e) => {
    e.preventDefault()
    if (grnItems.some(item => !item.itemName.trim())) {
      toast.error('Please enter material item names for all line items!')
      return
    }

    const payload = {
      supplierName: grnHeader.supplierName,
      poNumber: grnHeader.poNumber,
      siteName: grnHeader.site,
      items: grnItems,
    }
    
    api.post('/inventory/grn', payload)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['site-grns'] })
        queryClient.invalidateQueries({ queryKey: ['site-inventory'] })
        if (grnHasVariance) {
          toast.error(`Multi-Item GRN Warning: Quantity variance detected! Payment auto-HELD for Accountant verification.`);
        } else {
          toast.success(`Multi-Item GRN (${grnItems.length} products) received & verified! Site stock updated.`);
        }
        setShowGrnModal(false)
      })
      .catch((err) => {
        toast.error(`Failed to create GRN: ${err?.response?.data?.message || 'Server error'}`)
      })
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
            Professional Multi-Item GRN & Status Control Center
          </span>
          <h1 className="text-2xl font-bold mt-2 text-slate-900">Site Material Stock & GRN Deliveries</h1>
          <p className="text-slate-500 text-xs mt-1">Track multi-product site deliveries, clear payment holds & confirm material arrival status.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => setShowGrnModal(true)} 
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FiFileText size={16} /> Create Multi-Item GRN
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FiPlus size={16} /> Add Stock Item
          </button>
          <button 
            onClick={() => setShowTransferModal(true)} 
            className="px-4 py-2.5 bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FiTruck size={16} /> Transfer Material
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 font-bold border-b-2 transition-colors ${activeTab === 'stock' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Central & Site Stocks ({stockList.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`pb-3 font-bold border-b-2 transition-colors ${activeTab === 'transfers' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Material Transfers ({transfersList.length})
        </button>
        <button
          onClick={() => setActiveTab('grn')}
          className={`pb-3 font-bold border-b-2 transition-colors ${activeTab === 'grn' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          GRN Delivery Log & Audit Warnings ({grnList.length})
        </button>
      </div>

      {/* Tab 1: Stock List */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Location / Site</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4">Unit Price (LKR)</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockList.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{item.itemName}</td>
                    <td className="p-4 text-slate-600">{item.category}</td>
                    <td className="p-4 font-semibold text-slate-700">
                      {item.isCentralWarehouse ? '🏢 CENTRAL WAREHOUSE' : (item.site?.title || item.site || 'Site')}
                    </td>
                    <td className="p-4 font-bold text-orange-600">
                      {(item.quantity !== undefined && item.quantity !== null) ? item.quantity : (item.centralStockQty || 0)} {item.unit || 'Units'}
                    </td>
                    <td className="p-4 font-semibold">LKR {(item.unitPrice || 0).toLocaleString()}</td>
                    <td className="p-4">
                      {((item.quantity !== undefined ? item.quantity : (item.centralStockQty || 0)) <= (item.reorderLevel || item.minThresholdQty || 10)) ? (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full">REORDER WARNING</span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">IN STOCK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Transfers List */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Stock Material Transfers Log</h3>
          <div className="space-y-3">
            {transfersList.map(t => {
              const isReceived = receivedTransfers[t._id] || t.status === 'received';
              
              return (
                <div key={t._id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">{t.transferNo}</span>
                      <h4 className="text-sm font-bold text-slate-900">{t.itemName} - {t.quantity} {t.unit}</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">From: {t.fromSite?.title || t.fromSite || 'Central Warehouse'} ➔ To: {t.toSite?.title || t.toSite || 'Site'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isReceived ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                      {isReceived ? 'RECEIVED AT SITE' : 'IN TRANSIT'}
                    </span>

                    {!isReceived && (
                      <button
                        onClick={() => handleReceiveTransfer(t._id, t.transferNo)}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-xs cursor-pointer transition-all"
                      >
                        <FiCheckCircle size={14} /> Confirm Received at Site
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: GRN Delivery Log & Audit Warnings */}
      {activeTab === 'grn' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-slate-900 text-base">
            <FiShield className="text-orange-600" /> Multi-Item Goods Received Note (GRN) Delivery & Audit Log
          </h3>
          <div className="space-y-4">
            {grnList.map(g => {
              const isExpanded = expandedGrnId === g._id;
              const isResolved = resolvedGrns[g._id] || g.status === 'resolved' || (!g.hasVariance && !g.paymentHoldFlag);
              const itemList = g.items || [
                { itemName: g.itemName || 'Material Item', orderedQty: g.orderedQty, receivedQty: g.receivedQty, unit: g.unit, unitPrice: g.unitPrice, hasVariance: g.hasVariance }
              ];
              
              return (
                <div key={g._id} className={`border rounded-2xl overflow-hidden transition-all ${!isResolved ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200'}`}>
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">{g.grnNo}</span>
                        <h4 className="text-sm font-bold text-slate-900">{g.supplierName} ({g.poNumber || 'PO'})</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Site: <span className="font-semibold text-slate-700">{g.siteName || 'Construction Site'}</span> | Line Items: <span className="font-bold text-orange-600">{itemList.length} Products</span></p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-900">Total: LKR {(g.totalAmount || 0).toLocaleString()}</span>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${!isResolved ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                        {!isResolved ? 'PAYMENT HELD FOR VARIANCE' : 'RESOLVED / VERIFIED'}
                      </span>

                      {!isResolved && (
                        <button
                          onClick={() => handleResolveGrn(g._id)}
                          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-xs cursor-pointer transition-all"
                        >
                          <FiUnlock size={14} /> Release Payment Hold
                        </button>
                      )}

                      <button 
                        onClick={() => setExpandedGrnId(isExpanded ? null : g._id)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                      >
                        {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {!isResolved && g.varianceReason && (
                    <div className="p-3 bg-rose-100/60 border-b border-rose-200 text-xs font-semibold text-rose-900 flex items-center gap-2">
                      <FiAlertTriangle className="text-rose-600 flex-shrink-0" size={16} />
                      {g.varianceReason}
                    </div>
                  )}

                  {/* Line Items Table */}
                  <div className="p-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 font-semibold border-b border-slate-200 pb-2 uppercase">
                          <th className="pb-2">Product / Material</th>
                          <th className="pb-2 text-right">Ordered</th>
                          <th className="pb-2 text-right">Received</th>
                          <th className="pb-2 text-right">Unit Price</th>
                          <th className="pb-2 text-right">Line Total</th>
                          <th className="pb-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemList.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 font-bold text-slate-800">{item.itemName}</td>
                            <td className="py-2.5 text-right font-medium text-slate-600">{item.orderedQty} {item.unit}</td>
                            <td className="py-2.5 text-right font-bold text-slate-900">{item.receivedQty} {item.unit}</td>
                            <td className="py-2.5 text-right font-medium text-slate-600">LKR {(item.unitPrice || 0).toLocaleString()}</td>
                            <td className="py-2.5 text-right font-bold text-slate-900">LKR {((item.receivedQty || 0) * (item.unitPrice || 0)).toLocaleString()}</td>
                            <td className="py-2.5 text-center">
                              {!isResolved && item.hasVariance ? (
                                <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">SHORTAGE</span>
                              ) : (
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-sans">MATCH</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add Inventory Stock Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Item Name</label>
                <input
                  type="text" required placeholder="Item Name (e.g. Tokyo Super Cement 50kg)"
                  value={stockForm.itemName} onChange={e => setStockForm({ ...stockForm, itemName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Category</label>
                <select 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  value={stockForm.category} onChange={e => setStockForm({ ...stockForm, category: e.target.value })}
                >
                  {['Cement', 'Steel', 'Sand/Soil', 'Metal', 'Bricks/Blocks', 'Tiles/Granite', 'Electrical', 'Plumbing', 'Hardware', 'Paint', 'Timber', 'Chemicals/Waterproofing', 'Ready-Mix Concrete'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="number" required placeholder="Quantity"
                    value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit Price (LKR)</label>
                  <input
                    type="number" required placeholder="Unit Price"
                    value={stockForm.unitPrice} onChange={e => setStockForm({ ...stockForm, unitPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  SAVE STOCK ITEM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Material Modal */}
      {showTransferModal && (() => {
        const matchedItem = stockList.find(
          s => s.itemName.trim().toLowerCase() === (transferForm.itemName || '').trim().toLowerCase()
        )
        const availableQty = matchedItem
          ? (matchedItem.quantity !== undefined && matchedItem.quantity !== null ? matchedItem.quantity : (matchedItem.centralStockQty || 0))
          : null
        const isOverTransfer = availableQty !== null && Number(transferForm.quantity) > availableQty
        const isStockDepleted = availableQty !== null && availableQty <= 0

        return (
          <div className="fixed inset-0 bg-white/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Transfer Material between Sites</h3>
                  <p className="text-[11px] text-slate-500">Dispatch stock from warehouse/site to another project location.</p>
                </div>
                <button onClick={() => setShowTransferModal(false)} className="text-slate-500 hover:text-slate-600">
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveTransfer} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Material / Item Name *</label>
                    {availableQty !== null && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        availableQty > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        Available: {availableQty} {transferForm.unit || matchedItem?.unit || 'units'}
                      </span>
                    )}
                  </div>
                  {stockList.length > 0 ? (
                    <select
                      required
                      value={transferForm.itemName}
                      onChange={e => {
                        const selName = e.target.value
                        const found = stockList.find(s => s.itemName === selName)
                        setTransferForm({
                          ...transferForm,
                          itemName: selName,
                          category: found?.category || transferForm.category,
                          unit: found?.unit || transferForm.unit,
                        })
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="">-- Select Material from Stock --</option>
                      {stockList.map(s => (
                        <option key={s._id} value={s.itemName}>
                          {s.itemName} ({s.quantity !== undefined ? s.quantity : (s.centralStockQty || 0)} {s.unit || 'units'} available)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text" required placeholder="e.g. Tokyo Super Cement 50kg"
                      value={transferForm.itemName} onChange={e => setTransferForm({ ...transferForm, itemName: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">From Location</label>
                    <input
                      type="text" required placeholder="Central Warehouse"
                      value={transferForm.fromSite} onChange={e => setTransferForm({ ...transferForm, fromSite: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">To Site / Project</label>
                    <input
                      type="text" required placeholder="Target Site Name"
                      value={transferForm.toSite} onChange={e => setTransferForm({ ...transferForm, toSite: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Quantity to Transfer</label>
                    <input
                      type="number" required min="1"
                      max={availableQty !== null ? availableQty : undefined}
                      placeholder="50"
                      value={transferForm.quantity}
                      onChange={e => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-slate-800 font-bold ${
                        isOverTransfer || isStockDepleted ? 'border-rose-400 text-rose-700 bg-rose-50' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Unit</label>
                    <input
                      type="text" required placeholder="bags / cubes / kg"
                      value={transferForm.unit} onChange={e => setTransferForm({ ...transferForm, unit: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                </div>

                {/* Over-transfer Warning Message */}
                {(isOverTransfer || isStockDepleted) && (
                  <div className="p-3 bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                    <FiAlertTriangle className="text-rose-600 shrink-0" size={16} />
                    <span>
                      {isStockDepleted
                        ? `ප්‍රමාණවත් stock එකක් නොමැත! Stock එක 0 වී ඇත.`
                        : `ප්‍රමාණවත් stock එකක් නොමැත! Available: ${availableQty} ${transferForm.unit || 'units'}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button" onClick={() => setShowTransferModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isOverTransfer || isStockDepleted || Number(transferForm.quantity) <= 0}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    INITIATE TRANSFER
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {/* Professional Multi-Item GRN Creation Modal */}
      {showGrnModal && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Professional Goods Received Note (GRN)</h3>
                <p className="text-xs text-slate-500">Record multi-product site deliveries from a single supplier delivery ticket.</p>
              </div>
              <button onClick={() => setShowGrnModal(false)} className="text-slate-500 hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMultiItemGrn} className="space-y-4 text-xs">
              {/* Header Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier Name</label>
                  <input
                    type="text" required placeholder="e.g. LankaCement PLC"
                    value={grnHeader.supplierName} onChange={e => setGrnHeader({ ...grnHeader, supplierName: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">PO Number</label>
                  <input
                    type="text" required placeholder="e.g. PO-8812"
                    value={grnHeader.poNumber} onChange={e => setGrnHeader({ ...grnHeader, poNumber: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Receiving Site Location</label>
                  <input
                    type="text" required placeholder="Colombo Commercial Tower"
                    value={grnHeader.site} onChange={e => setGrnHeader({ ...grnHeader, site: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              {/* Dynamic Line Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">Material Line Items ({grnItems.length} Products)</h4>
                  <button
                    type="button"
                    onClick={handleAddGrnLineItem}
                    className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer"
                  >
                    <FiPlus size={14} /> Add Product Item
                  </button>
                </div>

                <div className="space-y-3">
                  {grnItems.map((item, index) => {
                    const lineTotal = Number(item.receivedQty || 0) * Number(item.unitPrice || 0);
                    const itemHasVar = Number(item.orderedQty || 0) !== Number(item.receivedQty || 0);

                    return (
                      <div key={item.id} className={`p-4 rounded-xl border space-y-3 ${itemHasVar ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Line Item #{index + 1}</span>
                          {grnItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGrnLineItem(item.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="font-semibold text-slate-600 block mb-1">Product Description</label>
                            <input
                              type="text" required placeholder="e.g. Tokyo Super Cement 50kg"
                              value={item.itemName} onChange={e => handleUpdateGrnItem(item.id, 'itemName', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">Ordered Qty (PO)</label>
                            <input
                              type="number" required placeholder="200"
                              value={item.orderedQty} onChange={e => handleUpdateGrnItem(item.id, 'orderedQty', Number(e.target.value))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">Received Qty</label>
                            <input
                              type="number" required placeholder="195"
                              value={item.receivedQty} onChange={e => handleUpdateGrnItem(item.id, 'receivedQty', Number(e.target.value))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">Unit (bags / kg / cubes)</label>
                            <input
                              type="text" required placeholder="bags"
                              value={item.unit} onChange={e => handleUpdateGrnItem(item.id, 'unit', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">Unit Price (LKR)</label>
                            <input
                              type="number" required placeholder="2350"
                              value={item.unitPrice} onChange={e => handleUpdateGrnItem(item.id, 'unitPrice', Number(e.target.value))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-600 block mb-1">Line Total (LKR)</label>
                            <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 font-bold text-right">
                              LKR {lineTotal.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total & Fraud Protection Warning Summary */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block">Grand Total GRN Value</span>
                  <span className="text-xl font-extrabold text-slate-900">LKR {totalGrnAmount.toLocaleString()}</span>
                </div>

                {grnHasVariance && (
                  <div className="bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                    <FiAlertTriangle size={18} />
                    <span>VARIANCE DETECTED: Payment will be auto-HELD for Accountant audit</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button" onClick={() => setShowGrnModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  CONFIRM & RECEIVE MULTI-ITEM GRN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
