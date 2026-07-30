import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiLayers, FiTruck, FiShield, FiAlertTriangle, FiPlus, FiCheckCircle } from 'react-icons/fi'

export default function SiteInventory() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('stock')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)

  const [stockForm, setStockForm] = useState({
    itemName: '', category: 'Cement', quantity: 0, unit: 'bags', unitPrice: 0, reorderLevel: 10, isCentralWarehouse: true, site: ''
  })
  const [transferForm, setTransferForm] = useState({
    fromSite: '', toSite: '', itemName: '', category: 'Cement', quantity: 0, unit: 'bags'
  })

  const { data: inventoryData } = useQuery({
    queryKey: ['site-inventory'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data),
  })

  const { data: transfersData } = useQuery({
    queryKey: ['site-transfers'],
    queryFn: () => api.get('/inventory/transfers').then(r => r.data),
  })

  const { data: grnsData } = useQuery({
    queryKey: ['site-grns'],
    queryFn: () => api.get('/inventory/grn').then(r => r.data),
  })

  const { data: sitesData } = useQuery({
    queryKey: ['sites-list'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const stockList = inventoryData?.stock || []
  const transfersList = transfersData?.transfers || []
  const grnList = grnsData?.grns || []
  const sites = sitesData?.projects || sitesData?.sites || []

  // Add stock mutation
  const addStockMutation = useMutation({
    mutationFn: (data) => api.post('/inventory/stock', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-inventory'] })
      toast.success('Inventory item updated successfully!')
      setShowAddModal(false)
    }
  })

  // Transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: (data) => api.post('/inventory/transfers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['site-inventory'] })
      toast.success('Material Transfer requested!')
      setShowTransferModal(false)
    }
  })

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/30">
            Central Warehouse vs. Site Stock Engine
          </span>
          <h1 className="text-2xl font-black mt-2 text-white">Site Material Stock & Fraud Protection</h1>
          <p className="text-slate-300 text-xs mt-1">Track Central Warehouse to Site transfers, GRN variance warnings & theft tracking.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1">
            <FiPlus /> Add Stock Item
          </button>
          <button onClick={() => setShowTransferModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1">
            <FiTruck /> Transfer Material
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 font-bold text-sm border-b-2 ${activeTab === 'stock' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
        >
          Central & Site Stocks ({stockList.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`pb-3 font-bold text-sm border-b-2 ${activeTab === 'transfers' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
        >
          Material Transfers ({transfersList.length})
        </button>
        <button
          onClick={() => setActiveTab('grn')}
          className={`pb-3 font-bold text-sm border-b-2 ${activeTab === 'grn' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
        >
          GRN Fraud Warnings ({grnList.filter(g => g.hasVariance).length})
        </button>
      </div>

      {/* Tab 1: Stock List */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
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
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{item.itemName}</td>
                    <td className="p-4 text-slate-600">{item.category}</td>
                    <td className="p-4 font-semibold text-slate-700">
                      {item.isCentralWarehouse ? '🏢 CENTRAL WAREHOUSE' : (item.site?.title || 'Site')}
                    </td>
                    <td className="p-4 font-bold text-emerald-700">{item.quantity} {item.unit}</td>
                    <td className="p-4 font-semibold">LKR {item.unitPrice?.toLocaleString()}</td>
                    <td className="p-4">
                      {item.quantity <= item.reorderLevel ? (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">REORDER WARNING</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">IN STOCK</span>
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
            {transfersList.map(t => (
              <div key={t._id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{t.transferNo}</span>
                    <h4 className="text-sm font-bold text-slate-900">{t.itemName} - {t.quantity} {t.unit}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">From: {t.fromSite?.title || 'Central Warehouse'} ➔ To: {t.toSite?.title || 'Site'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.status === 'discrepancy_flagged' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'}`}>
                  {t.status.toUpperCase().replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: GRN Variance */}
      {activeTab === 'grn' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-rose-600">
            <FiShield /> GRN Variance Delivery Fraud Warnings
          </h3>
          <div className="space-y-3">
            {grnList.map(g => (
              <div key={g._id} className={`p-4 border rounded-xl ${g.hasVariance ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900">{g.grnNo} - {g.itemName}</span>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded ${g.hasVariance ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {g.hasVariance ? 'PAYMENT HELD FOR VARIANCE' : 'VERIFIED MATCH'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">Ordered: {g.orderedQty} {g.unit} vs Received: {g.receivedQty} {g.unit}</p>
                {g.varianceReason && <p className="text-xs font-bold text-rose-800 mt-1">{g.varianceReason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add Inventory Stock Item</h3>
            <input
              type="text" placeholder="Item Name (e.g. Cement, Tor Steel)"
              value={stockForm.itemName} onChange={e => setStockForm({ ...stockForm, itemName: e.target.value })}
              className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number" placeholder="Quantity"
                value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
                className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold"
              />
              <input
                type="number" placeholder="Unit Price (LKR)"
                value={stockForm.unitPrice} onChange={e => setStockForm({ ...stockForm, unitPrice: Number(e.target.value) })}
                className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold"
              />
            </div>
            <button
              onClick={() => addStockMutation.mutate(stockForm)}
              className="w-full py-3 bg-amber-500 text-slate-950 font-black text-sm rounded-xl"
            >
              SAVE STOCK ITEM
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
