import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiX, FiSend, FiPlus, FiTrash2 } from 'react-icons/fi'

export default function MaterialRequestModal({ isOpen, onClose, defaultProjectId }) {
  const queryClient = useQueryClient()

  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [urgency, setUrgency] = useState('Medium')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([
    { itemName: '', category: 'Cement', requestedQty: 50, unit: 'Bags' }
  ])

  // Fetch Projects for site selector
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const res = await api.get('/projects')
      return res.data?.projects || res.data || []
    }
  })

  // Submit Request Mutation
  const submitMutation = useMutation({
    mutationFn: async (data) => await api.post('/material-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      onClose()
    }
  })

  if (!isOpen) return null

  const handleAddItem = () => {
    setItems([...items, { itemName: '', category: 'Materials', requestedQty: 10, unit: 'Units' }])
  }

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-lg font-bold text-slate-900">Site Supervisor Material Request Form</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitMutation.mutate({ projectId, items, urgency, notes })
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-slate-300">Select Construction Site / Project *</label>
            <select
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 text-sm mt-1 focus:border-orange-500 focus:outline-none"
            >
              <option value="">-- Choose Site --</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name || p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300">Request Urgency Level</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 text-sm mt-1 focus:border-orange-500 focus:outline-none font-semibold text-amber-600"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Urgent">Urgent / Critical Shortage</option>
            </select>
          </div>

          {/* Requested Material Items List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-slate-300">Materials Needed *</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-amber-600 font-semibold hover:underline"
              >
                + Add Item
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 items-center">
                <input
                  type="text" required placeholder="Material Name (e.g. Cement 50kg)"
                  value={item.itemName}
                  onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                  className="col-span-6 bg-white border border-slate-200 text-slate-800 p-2 text-xs rounded-lg focus:outline-none"
                />
                <input
                  type="number" required min="1" placeholder="Qty"
                  value={item.requestedQty}
                  onChange={(e) => handleItemChange(idx, 'requestedQty', e.target.value)}
                  className="col-span-3 bg-white border border-slate-200 text-slate-800 p-2 text-xs rounded-lg focus:outline-none font-bold"
                />
                <input
                  type="text" placeholder="Unit (Bags/Cubes)"
                  value={item.unit}
                  onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                  className="col-span-2 bg-white border border-slate-200 text-slate-800 p-2 text-xs rounded-lg focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="col-span-1 text-slate-500 hover:text-red-400 p-1"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300">Supervisor Remarks / Reason</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Current cement stock below 50 bags limit; slab casting scheduled for Friday."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 text-sm mt-1 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl text-slate-400 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow flex items-center gap-1.5"
            >
              <FiSend className="w-4 h-4" />
              {submitMutation.isPending ? 'Submitting...' : 'Submit Request to Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
