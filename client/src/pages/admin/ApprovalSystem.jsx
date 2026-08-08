import React, { useState } from 'react'
import {
  CheckCircle2, XCircle, Clock, ShieldCheck, FileText, Package, DollarSign,
  UserCheck, ArrowRight, Eye, MessageSquare, AlertCircle, Filter, Search, Check, X, Send, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

const initialRequests = [
  {
    id: 'REQ-1092',
    type: 'Material Requisition (MR)',
    requestedBy: 'Sunil Perera (Site Supervisor)',
    project: 'Lotus Luxury Villa - Kandy',
    details: '150 Bags Tokyo Super Cement + 2 Tons TMT Steel Bars',
    amount: 'LKR 845,000',
    amountVal: 845000,
    currentStepIndex: 0, // 0: Supervisor, 1: Project Manager, 2: Director
    status: 'Pending Supervisor',
    date: '2026-07-30',
    priority: 'High',
    items: [
      { name: 'Tokyo Super Cement (50kg)', qty: '150 Bags', rate: 'LKR 3,100', total: 'LKR 465,000' },
      { name: 'TMT Steel Bars 12mm', qty: '2 Tons', rate: 'LKR 190,000', total: 'LKR 380,000' }
    ],
    stages: [
      { title: 'Supervisor Review', role: 'Site Supervisor', assignedTo: 'Sunil Perera', status: 'pending', note: 'Awaiting site physical check' },
      { title: 'Project Manager Approval', role: 'Project Manager', assignedTo: 'Eng. K. Silva', status: 'upcoming', note: 'Pending PM budget verify' },
      { title: 'Director Final Approval', role: 'CEO / Director', assignedTo: 'Director Bandara', status: 'upcoming', note: 'Financial authorization required for >500k' }
    ],
    history: [
      { date: '2026-07-30 08:30 AM', user: 'Sunil Perera', action: 'Created Requisition', comment: 'Urgent for slab casting on Friday.' }
    ]
  },
  {
    id: 'REQ-1093',
    type: 'Purchase Order (PO)',
    requestedBy: 'Eng. K. Silva (Procurement)',
    project: 'Rajagiriya Commercial Complex',
    details: '20 Cubes Washing Sand via Supplier Lanka Sand (Pvt) Ltd',
    amount: 'LKR 320,000',
    amountVal: 320000,
    currentStepIndex: 1,
    status: 'Supervisor Approved',
    date: '2026-07-29',
    priority: 'Medium',
    items: [
      { name: 'Washing River Sand', qty: '20 Cubes', rate: 'LKR 16,000', total: 'LKR 320,000' }
    ],
    stages: [
      { title: 'Supervisor Review', role: 'Site Supervisor', assignedTo: 'Sunil Perera', status: 'approved', note: 'Verified quality and site demand', date: '2026-07-29 10:15 AM' },
      { title: 'Project Manager Approval', role: 'Project Manager', assignedTo: 'Eng. K. Silva', status: 'pending', note: 'Awaiting PO issuance sign-off' },
      { title: 'Director Final Approval', role: 'CEO / Director', assignedTo: 'Director Bandara', status: 'upcoming', note: 'Standard PO threshold check' }
    ],
    history: [
      { date: '2026-07-29 09:00 AM', user: 'Eng. K. Silva', action: 'Created Purchase Order', comment: 'Supplier quote attached.' },
      { date: '2026-07-29 10:15 AM', user: 'Sunil Perera', action: 'Supervisor Approved', comment: 'Site capacity verified.' }
    ]
  },
  {
    id: 'REQ-1094',
    type: 'Employee Leave Request',
    requestedBy: 'Perera M. (Senior Mason Operator)',
    project: 'Lotus Luxury Villa - Kandy',
    details: 'Medical Leave (3 Days: Aug 02 - Aug 04) - Medical Certificate Attached',
    amount: 'N/A',
    amountVal: 0,
    currentStepIndex: 2,
    status: 'Manager Approved',
    date: '2026-07-28',
    priority: 'Normal',
    items: [
      { name: 'Medical Leave Duration', qty: '3 Days', rate: 'N/A', total: 'Paid Leave' }
    ],
    stages: [
      { title: 'Supervisor Review', role: 'Site Supervisor', assignedTo: 'Sunil Perera', status: 'approved', note: 'Work replacement arranged', date: '2026-07-28 11:00 AM' },
      { title: 'Project Manager Approval', role: 'Project Manager', assignedTo: 'Eng. K. Silva', status: 'approved', note: 'Approved schedule adjustment', date: '2026-07-28 02:30 PM' },
      { title: 'Director Final Approval', role: 'CEO / Director', assignedTo: 'HR Director', status: 'pending', note: 'Awaiting final HR portal sync' }
    ],
    history: [
      { date: '2026-07-28 08:00 AM', user: 'Perera M.', action: 'Applied for Leave', comment: 'Doctor consultation note submitted.' },
      { date: '2026-07-28 11:00 AM', user: 'Sunil Perera', action: 'Supervisor Approved', comment: 'Replacement operator assigned.' },
      { date: '2026-07-28 02:30 PM', user: 'Eng. K. Silva', action: 'PM Approved', comment: 'Schedule updated.' }
    ]
  },
  {
    id: 'REQ-1095',
    type: 'Expense Voucher',
    requestedBy: 'Nimal Bandara (Accountant)',
    project: 'Head Office - Colombo',
    details: 'Site Transport & Heavy Machinery Generator Fuel Reimbursement',
    amount: 'LKR 142,500',
    amountVal: 142500,
    currentStepIndex: 3,
    status: 'Director Approved',
    date: '2026-07-27',
    priority: 'High',
    items: [
      { name: 'Diesel Fuel 400 Litres', qty: '400L', rate: 'LKR 330', total: 'LKR 132,000' },
      { name: 'Highway Toll Receipts', qty: '7 Receipts', rate: 'LKR 1,500', total: 'LKR 10,500' }
    ],
    stages: [
      { title: 'Supervisor Review', role: 'Site Supervisor', assignedTo: 'Sunil Perera', status: 'approved', note: 'Fuel receipts checked', date: '2026-07-27 09:30 AM' },
      { title: 'Project Manager Approval', role: 'Project Manager', assignedTo: 'Eng. K. Silva', status: 'approved', note: 'Budget verified', date: '2026-07-27 11:45 AM' },
      { title: 'Director Final Approval', role: 'CEO / Director', assignedTo: 'Director Bandara', status: 'approved', note: 'Payment voucher released', date: '2026-07-27 04:15 PM' }
    ],
    history: [
      { date: '2026-07-27 08:30 AM', user: 'Nimal Bandara', action: 'Submitted Expense Voucher', comment: 'Attached Lanka IOC fuel bills.' },
      { date: '2026-07-27 09:30 AM', user: 'Sunil Perera', action: 'Approved', comment: 'Vehicle mileage log matches.' },
      { date: '2026-07-27 11:45 AM', user: 'Eng. K. Silva', action: 'PM Approved', comment: 'Passed to accounts.' },
      { date: '2026-07-27 04:15 PM', user: 'Director Bandara', action: 'Director Final Approved', comment: 'Cheque issued.' }
    ]
  }
]

export default function ApprovalSystem() {
  const [requests, setRequests] = useState(initialRequests)
  const [filterType, setFilterType] = useState('ALL')
  const [filterStage, setFilterStage] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReq, setSelectedReq] = useState(null)
  const [rejectModalReq, setRejectModalReq] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionNote, setActionNote] = useState('')

  // Metrics
  const totalCount = requests.length
  const pendingSupervisor = requests.filter(r => r.currentStepIndex === 0 && r.status !== 'Rejected').length
  const pendingPM = requests.filter(r => r.currentStepIndex === 1 && r.status !== 'Rejected').length
  const pendingDirector = requests.filter(r => r.currentStepIndex === 2 && r.status !== 'Rejected').length
  const fullyApproved = requests.filter(r => r.currentStepIndex >= 3 || r.status === 'Director Approved').length
  const totalValueLKR = requests.reduce((acc, curr) => acc + (curr.amountVal || 0), 0)

  // Filtered list
  const filteredRequests = requests.filter(r => {
    const matchType = filterType === 'ALL' || r.type === filterType
    const matchSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.details.toLowerCase().includes(searchQuery.toLowerCase())

    let matchStage = true
    if (filterStage === 'PENDING_SUPERVISOR') matchStage = r.currentStepIndex === 0 && r.status !== 'Rejected'
    if (filterStage === 'PENDING_PM') matchStage = r.currentStepIndex === 1 && r.status !== 'Rejected'
    if (filterStage === 'PENDING_DIRECTOR') matchStage = r.currentStepIndex === 2 && r.status !== 'Rejected'
    if (filterStage === 'APPROVED') matchStage = r.currentStepIndex >= 3 || r.status === 'Director Approved'
    if (filterStage === 'REJECTED') matchStage = r.status === 'Rejected'

    return matchType && matchSearch && matchStage
  })

  // Next stage progression logic
  const handleApproveStage = (reqId) => {
    setRequests(prev => prev.map(req => {
      if (req.id !== reqId) return req

      const nextIndex = req.currentStepIndex + 1
      const updatedStages = req.stages.map((stg, idx) => {
        if (idx === req.currentStepIndex) {
          return {
            ...stg,
            status: 'approved',
            date: new Date().toLocaleString(),
            note: actionNote || 'Approved at this stage.'
          }
        }
        if (idx === nextIndex) {
          return { ...stg, status: 'pending' }
        }
        return stg
      })

      let newStatus = req.status
      if (nextIndex === 1) newStatus = 'Supervisor Approved'
      else if (nextIndex === 2) newStatus = 'Manager Approved'
      else if (nextIndex >= 3) newStatus = 'Director Approved'

      const newHistoryItem = {
        date: new Date().toLocaleString(),
        user: 'Current Manager',
        action: `Approved Stage ${req.currentStepIndex + 1} (${req.stages[req.currentStepIndex]?.title})`,
        comment: actionNote || 'Stage approval confirmed.'
      }

      toast.success(`Request ${req.id} advanced to ${newStatus}!`)

      return {
        ...req,
        currentStepIndex: nextIndex,
        status: newStatus,
        stages: updatedStages,
        history: [newHistoryItem, ...req.history]
      }
    }))

    setActionNote('')
    if (selectedReq?.id === reqId) {
      setSelectedReq(null)
    }
  }

  // Reject logic
  const handleConfirmReject = () => {
    if (!rejectModalReq) return
    if (!rejectionReason.trim()) {
      toast.error('Please enter a reason for rejection.')
      return
    }

    setRequests(prev => prev.map(req => {
      if (req.id !== rejectModalReq.id) return req

      const updatedStages = req.stages.map((stg, idx) => {
        if (idx === req.currentStepIndex) {
          return {
            ...stg,
            status: 'rejected',
            date: new Date().toLocaleString(),
            note: rejectionReason
          }
        }
        return stg
      })

      const newHistoryItem = {
        date: new Date().toLocaleString(),
        user: 'Current Reviewer',
        action: 'Rejected Request',
        comment: rejectionReason
      }

      return {
        ...req,
        status: 'Rejected',
        stages: updatedStages,
        history: [newHistoryItem, ...req.history]
      }
    }))

    toast.error(`Request ${rejectModalReq.id} has been rejected.`)
    setRejectModalReq(null)
    setRejectionReason('')
    if (selectedReq?.id === rejectModalReq.id) {
      setSelectedReq(null)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 p-6 rounded-3xl text-slate-900 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-orange-600/30 border border-orange-500/40 rounded-2xl text-orange-400">
              <ShieldCheck size={26} />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Central Multi-Level Approval System</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Structured 3-Stage Workflow: Supervisor Review → Project Manager Approval → Director Sign-Off
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100/80 border border-slate-200/80 px-4 py-2 rounded-2xl text-right">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Value</div>
            <div className="text-sm font-mono font-extrabold text-orange-400">LKR {totalValueLKR.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Requests</span>
            <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600"><FileText size={16} /></span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">All active & past</div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/30 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Stage 1: Supervisor</span>
            <span className="p-1.5 bg-amber-100 rounded-lg text-amber-600"><Clock size={16} /></span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">{pendingSupervisor}</div>
          <div className="text-[10px] text-amber-600 font-medium mt-1">Awaiting Site Review</div>
        </div>

        <div className="bg-white border border-blue-200 bg-blue-50/30 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">Stage 2: PM Review</span>
            <span className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><UserCheck size={16} /></span>
          </div>
          <div className="text-2xl font-black text-blue-900 mt-2">{pendingPM}</div>
          <div className="text-[10px] text-blue-600 font-medium mt-1">Awaiting PM Sign-Off</div>
        </div>

        <div className="bg-white border border-purple-200 bg-purple-50/30 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700">Stage 3: Director</span>
            <span className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><ShieldCheck size={16} /></span>
          </div>
          <div className="text-2xl font-black text-purple-900 mt-2">{pendingDirector}</div>
          <div className="text-[10px] text-purple-600 font-medium mt-1">Final Approval Deck</div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/30 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Fully Approved</span>
            <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600"><CheckCircle2 size={16} /></span>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2">{fullyApproved}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">Completed & Ready</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          {/* Request Type Tabs */}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {['ALL', 'Material Requisition (MR)', 'Purchase Order (PO)', 'Employee Leave Request', 'Expense Voucher'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  filterType === t 
                    ? 'bg-orange-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Search REQ ID, Project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold flex items-center gap-1"><Filter size={13} /> Filter Stage:</span>
          {[
            { id: 'ALL', label: 'All Stages' },
            { id: 'PENDING_SUPERVISOR', label: 'Stage 1: Supervisor' },
            { id: 'PENDING_PM', label: 'Stage 2: PM' },
            { id: 'PENDING_DIRECTOR', label: 'Stage 3: Director' },
            { id: 'APPROVED', label: 'Completed' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((stg) => (
            <button
              key={stg.id}
              onClick={() => setFilterStage(stg.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterStage === stg.id 
                  ? 'bg-slate-100 text-slate-900 font-bold' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {stg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Approvals Table with Visual Stage Steppers & Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Req Details</th>
                <th className="py-3.5 px-4">Requested By</th>
                <th className="py-3.5 px-4">Project / Site</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4 min-w-[280px]">Multi-Level Stage Progression</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                    No approval requests found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => {
                  const isRejected = r.status === 'Rejected'
                  const isCompleted = r.currentStepIndex >= 3 || r.status === 'Director Approved'

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Req Details */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-mono font-bold text-orange-600 text-xs">{r.id}</div>
                        <div className="font-bold text-slate-900 mt-0.5">{r.type}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{r.details}</div>
                      </td>

                      {/* Requested By */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-slate-800">{r.requestedBy}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{r.date}</div>
                      </td>

                      {/* Project */}
                      <td className="py-4 px-4 align-top font-medium text-slate-700">
                        {r.project}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-mono font-bold text-slate-900">{r.amount}</div>
                      </td>

                      {/* Visual Multi-Stage Workflow Tracker */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            {r.stages.map((stg, sIdx) => {
                              let badgeStyle = 'bg-slate-100 border-slate-200 text-slate-500'
                              let icon = <span className="w-3.5 h-3.5 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center text-[9px] font-bold">{sIdx + 1}</span>

                              if (isRejected) {
                                if (sIdx === r.currentStepIndex) {
                                  badgeStyle = 'bg-rose-100 border-rose-300 text-rose-700 font-bold'
                                  icon = <XCircle size={13} className="text-rose-600 shrink-0" />
                                }
                              } else if (sIdx < r.currentStepIndex || isCompleted) {
                                badgeStyle = 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold'
                                icon = <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                              } else if (sIdx === r.currentStepIndex) {
                                badgeStyle = 'bg-amber-100 border-amber-300 text-amber-900 font-bold animate-pulse'
                                icon = <Clock size={13} className="text-amber-600 shrink-0" />
                              }

                              return (
                                <React.Fragment key={stg.title}>
                                  <div
                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] whitespace-nowrap ${badgeStyle}`}
                                    title={`${stg.title} (${stg.assignedTo}) - ${stg.note}`}
                                  >
                                    {icon}
                                    <span>{sIdx === 0 ? 'Supervisor' : sIdx === 1 ? 'PM' : 'Director'}</span>
                                  </div>
                                  {sIdx < r.stages.length - 1 && (
                                    <ChevronRight size={12} className="text-slate-600 shrink-0" />
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Current Action: <span className="font-bold text-slate-800">{isRejected ? 'Rejected' : isCompleted ? 'Fully Approved' : r.stages[r.currentStepIndex]?.title}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 align-top text-center">
                        <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                          isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          r.currentStepIndex === 2 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          r.currentStepIndex === 1 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-top text-right space-y-1.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReq(r)}
                            className="p-1.5 text-slate-600 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>

                          {!isCompleted && !isRejected && (
                            <>
                              <button
                                onClick={() => handleApproveStage(r.id)}
                                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold shadow-xs cursor-pointer text-[11px] transition-all"
                              >
                                <Check size={13} /> Approve
                              </button>
                              <button
                                onClick={() => setRejectModalReq(r)}
                                className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg font-bold shadow-xs cursor-pointer text-[11px] transition-all"
                              >
                                <X size={13} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details & History Modal */}
      {selectedReq && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
                  {selectedReq.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{selectedReq.type}</h3>
                <p className="text-xs text-slate-500">{selectedReq.project}</p>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1 text-slate-500 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Item Breakdown</h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-3">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 font-bold border-b border-slate-200 pb-2">
                      <th className="py-1">Description</th>
                      <th className="py-1">Quantity</th>
                      <th className="py-1">Rate</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReq.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-2 text-slate-600">{item.qty}</td>
                        <td className="py-2 text-slate-600">{item.rate}</td>
                        <td className="py-2 font-mono font-bold text-slate-900 text-right">{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approval Stages Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Approval Stage Workflow</h4>
              <div className="space-y-2">
                {selectedReq.stages.map((stg, idx) => (
                  <div
                    key={stg.title}
                    className={`p-3 rounded-xl border flex items-start justify-between ${
                      stg.status === 'approved' ? 'bg-emerald-50/50 border-emerald-200' :
                      stg.status === 'pending' ? 'bg-amber-50/50 border-amber-200' :
                      stg.status === 'rejected' ? 'bg-rose-50/50 border-rose-200' :
                      'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {stg.status === 'approved' ? <CheckCircle2 size={18} className="text-emerald-600" /> :
                         stg.status === 'pending' ? <Clock size={18} className="text-amber-600" /> :
                         stg.status === 'rejected' ? <XCircle size={18} className="text-rose-600" /> :
                         <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{stg.title} ({stg.role})</div>
                        <div className="text-[11px] text-slate-600">Assigned: <span className="font-semibold">{stg.assignedTo}</span></div>
                        <div className="text-[11px] text-slate-500 mt-1 italic">"{stg.note}"</div>
                      </div>
                    </div>
                    {stg.date && <div className="text-[10px] text-slate-500 font-mono">{stg.date}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Note Input (If active) */}
            {selectedReq.currentStepIndex < 3 && selectedReq.status !== 'Rejected' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <label className="text-xs font-bold text-slate-700">Add Approval Note / Comment (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Budget checked, approved for processing..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs rounded-lg p-2 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
              {selectedReq.currentStepIndex < 3 && selectedReq.status !== 'Rejected' && (
                <button
                  onClick={() => handleApproveStage(selectedReq.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Approve Current Stage
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <XCircle size={24} />
              <h3 className="text-lg font-bold text-slate-900">Reject Request ({rejectModalReq.id})</h3>
            </div>

            <p className="text-xs text-slate-600">
              Please specify the reason for rejecting <span className="font-bold">{rejectModalReq.type}</span> requested by {rejectModalReq.requestedBy}.
            </p>

            <textarea
              rows={3}
              placeholder="Enter rejection reason or requested changes..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
