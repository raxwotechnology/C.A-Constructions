import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Calculator,
  HardHat,
  Ruler,
  Utensils,
  DollarSign,
  Plus,
  Search,
  Filter,
  Printer,
  FileText,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  Building,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { printHtmlContent } from '../../lib/documentPrint'
import { buildCompanyFromSettings, letterheadHtml } from '../../lib/companyBranding'
import LetterheadHeader from '../../components/branding/LetterheadHeader'

export default function DailyWageSubContractView() {
  const queryClient = useQueryClient()

  // Tab State: 'wages' | 'subcontract' | 'logs'
  const [activeTab, setActiveTab] = useState('wages')

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedWorkType, setSelectedWorkType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  // Print Payout Slip Modal State
  const [printLog, setPrintLog] = useState(null)

  // Fetch Branches for Branch-Wise Filtering
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list-dailywage'],
    queryFn: async () => {
      const res = await api.get('/branches')
      return res.data?.branches || res.data?.data || res.data || []
    },
  })

  // Fetch Projects for dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const res = await api.get('/projects')
      return res.data?.projects || res.data?.data || res.data || []
    },
  })

  // Fetch Advances for linking deductions
  const { data: advancesData } = useQuery({
    queryKey: ['advances-active'],
    queryFn: async () => {
      const res = await api.get('/advances?status=active')
      return res.data?.advances || res.data?.data || res.data || []
    },
  })

  // Safe Array Extractors
  const projectsList = Array.isArray(projectsData?.projects)
    ? projectsData.projects
    : Array.isArray(projectsData?.data)
    ? projectsData.data
    : Array.isArray(projectsData)
    ? projectsData
    : []

  const advancesList = Array.isArray(advancesData?.advances)
    ? advancesData.advances
    : Array.isArray(advancesData?.data)
    ? advancesData.data
    : Array.isArray(advancesData)
    ? advancesData
    : []

  // Fetch Daily Wage Logs & Aggregates
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['daily-wage-logs', selectedProject, selectedWorkType, selectedStatus, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedProject) params.append('project', selectedProject)
      if (selectedWorkType) params.append('workType', selectedWorkType)
      if (selectedStatus) params.append('status', selectedStatus)
      if (searchQuery) params.append('search', searchQuery)

      const res = await api.get(`/daily-wages?${params.toString()}`)
      return res.data
    },
  })

  const logs = Array.isArray(logsData?.data)
    ? logsData.data
    : Array.isArray(logsData)
    ? logsData
    : []
  const summary = logsData?.summary || {
    totalNetDailyPay: 0,
    totalSubContractPay: 0,
    totalAllowances: 0,
    totalAdvanceDeductions: 0,
    totalSqftMeasured: 0,
    totalCubicFeetMeasured: 0,
  }

  // Site branding settings for letterhead print
  const { data: siteSettingsData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const res = await api.get('/site-settings')
      return res.data?.settings || {}
    },
  })

  // ---------------------------------------------------------
  // FORM STATES FOR DAILY WAGE CALCULATOR
  // ---------------------------------------------------------
  const [wageForm, setWageForm] = useState({
    workerName: '',
    project: '',
    date: new Date().toISOString().split('T')[0],
    skillLevel: 'Skilled Labour / Baas',
    skillRate: 5000,
    daysWorked: 1.0,
    otHours: 0,
    otRate: 500,
    foodRefreshments: 500,
    travelTransport: 300,
    nightOutstation: 0,
    advanceDeductions: 0,
    linkedAdvance: '',
    mealExpenseAutoLogged: true,
    notes: '',
  })

  // Auto-set default skill rates
  useEffect(() => {
    if (wageForm.skillLevel === 'Skilled Labour / Baas') {
      setWageForm((prev) => ({ ...prev, skillRate: 5000 }))
    } else if (wageForm.skillLevel === 'Unskilled Labour / Helper') {
      setWageForm((prev) => ({ ...prev, skillRate: 3500 }))
    }
  }, [wageForm.skillLevel])

  // Live Net Daily Pay Calculation
  const computedOtPay = Number(wageForm.otHours || 0) * Number(wageForm.otRate || 0)
  const computedTotalAllowances =
    Number(wageForm.foodRefreshments || 0) +
    Number(wageForm.travelTransport || 0) +
    Number(wageForm.nightOutstation || 0)
  const computedGrossDailyPay =
    Number(wageForm.daysWorked || 0) * Number(wageForm.skillRate || 0) +
    computedOtPay +
    computedTotalAllowances
  const computedNetDailyPay = Math.max(0, computedGrossDailyPay - Number(wageForm.advanceDeductions || 0))

  // ---------------------------------------------------------
  // FORM STATES FOR SUB-CONTRACT CALCULATOR
  // ---------------------------------------------------------
  const [subForm, setSubForm] = useState({
    workerName: '',
    project: '',
    date: new Date().toISOString().split('T')[0],
    workCategory: 'Tiling',
    measuredSqft: 0,
    measuredCubicFeet: 0,
    ratePerSqft: 0,
    advanceDeductions: 0,
    linkedAdvance: '',
    notes: '',
  })

  // Live Sub-Contract Pay Calculation
  const computedSubTotalPay = Number(subForm.measuredSqft || 0) * Number(subForm.ratePerSqft || 0)
  const computedSubNetPay = Math.max(0, computedSubTotalPay - Number(subForm.advanceDeductions || 0))

  // Auto-select first project when projects list loads
  useEffect(() => {
    if (projectsList && projectsList.length > 0) {
      const defaultProjId = projectsList[0]._id || projectsList[0].id
      if (!wageForm.project && defaultProjId) {
        setWageForm((prev) => ({ ...prev, project: defaultProjId }))
      }
      if (!subForm.project && defaultProjId) {
        setSubForm((prev) => ({ ...prev, project: defaultProjId }))
      }
    }
  }, [projectsList])

  // ---------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------
  const createLogMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/daily-wages', payload)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Work log created successfully!')
      queryClient.invalidateQueries({ queryKey: ['daily-wage-logs'] })
      queryClient.invalidateQueries({ queryKey: ['projects-list'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      // Reset forms partially
      setWageForm((prev) => ({
        ...prev,
        workerName: '',
        otHours: 0,
        advanceDeductions: 0,
        notes: '',
      }))
      setSubForm((prev) => ({
        ...prev,
        workerName: '',
        measuredSqft: 0,
        advanceDeductions: 0,
        notes: '',
      }))
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save log.')
    },
  })

  const deleteLogMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/daily-wages/${id}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Log entry removed successfully.')
      queryClient.invalidateQueries({ queryKey: ['daily-wage-logs'] })
      queryClient.invalidateQueries({ queryKey: ['projects-list'] })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.put(`/daily-wages/${id}`, { status })
      return res.data
    },
    onSuccess: () => {
      toast.success('Status updated!')
      queryClient.invalidateQueries({ queryKey: ['daily-wage-logs'] })
      queryClient.invalidateQueries({ queryKey: ['projects-list'] })
    },
  })

  // Submit Daily Wage Form
  const handleDailyWageSubmit = (e) => {
    e.preventDefault()
    if (!wageForm.workerName || !wageForm.project) {
      toast.error('Please specify Worker Name and Select a Project.')
      return
    }
    createLogMutation.mutate({
      workerName: wageForm.workerName,
      project: wageForm.project,
      date: wageForm.date,
      workType: 'Daily Wage',
      skillLevel: wageForm.skillLevel,
      skillRate: wageForm.skillRate,
      daysWorked: wageForm.daysWorked,
      otHours: wageForm.otHours,
      otRate: wageForm.otRate,
      allowances: {
        foodRefreshments: wageForm.foodRefreshments,
        travelTransport: wageForm.travelTransport,
        nightOutstation: wageForm.nightOutstation,
      },
      advanceDeductions: wageForm.advanceDeductions,
      linkedAdvance: wageForm.linkedAdvance || null,
      mealExpenseAutoLogged: wageForm.mealExpenseAutoLogged,
      notes: wageForm.notes,
    })
  }

  // Submit Sub-Contract Form
  const handleSubContractSubmit = (e) => {
    e.preventDefault()
    if (!subForm.workerName || !subForm.project) {
      toast.error('Please specify Worker/Sub-contractor Name and Select a Project.')
      return
    }
    createLogMutation.mutate({
      workerName: subForm.workerName,
      project: subForm.project,
      date: subForm.date,
      workType: 'Sub-Contract',
      subContractDetails: {
        workCategory: subForm.workCategory,
        measuredSqft: subForm.measuredSqft,
        measuredCubicFeet: subForm.measuredCubicFeet,
        ratePerSqft: subForm.ratePerSqft,
      },
      advanceDeductions: subForm.advanceDeductions,
      linkedAdvance: subForm.linkedAdvance || null,
      notes: subForm.notes,
    })
  }

  // Printable Payout Slip Handler
  const handlePrintPayoutSlip = async (logItem) => {
    const company = buildCompanyFromSettings(siteSettingsData || {})
    const projName = logItem.project?.name || 'Construction Site'
    const projLoc = logItem.project?.location || 'Sri Lanka'

    const header = letterheadHtml(company, {
      forPrint: true,
      metadata: {
        refNo: logItem.logCode,
        projectName: projName,
        siteLocation: projLoc,
        date: new Date(logItem.date).toLocaleDateString('en-LK'),
      },
    })

    const bodyHtml = `
      <div style="font-family:'Segoe UI',sans-serif;color:#0f172a;max-width:800px;margin:0 auto;padding:10px">
        ${header}
        
        <div style="border:2px solid #0f172a;border-radius:8px;padding:20px;margin-top:20px;background:#ffffff">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px">
            <h2 style="margin:0;font-size:18pt;color:#0f172a;font-weight:900">WORKER PAYOUT VOUCHER</h2>
            <span style="background:#f59e0b;color:#0f172a;padding:4px 12px;border-radius:9999px;font-weight:800;font-size:10pt">${logItem.workType.toUpperCase()}</span>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:11pt">
            <tr>
              <td style="padding:6px;font-weight:700;color:#475569;width:30%">Worker / Sub-contractor:</td>
              <td style="padding:6px;font-weight:800;color:#0f172a;font-size:12pt">${logItem.workerName}</td>
            </tr>
            <tr>
              <td style="padding:6px;font-weight:700;color:#475569">Skill Level / Category:</td>
              <td style="padding:6px">${logItem.workType === 'Daily Wage' ? logItem.skillLevel : logItem.subContractDetails?.workCategory}</td>
            </tr>
            <tr>
              <td style="padding:6px;font-weight:700;color:#475569">Site Location / Project:</td>
              <td style="padding:6px">${projName} (${projLoc})</td>
            </tr>
            <tr>
              <td style="padding:6px;font-weight:700;color:#475569">Voucher Date:</td>
              <td style="padding:6px">${new Date(logItem.date).toLocaleDateString('en-LK')}</td>
            </tr>
          </table>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:20px">
            <h3 style="margin:0 0 12px;font-size:12pt;color:#0f172a;border-bottom:1px solid #cbd5e1;padding-bottom:6px">Earnings &amp; Measurements Breakdown</h3>
            
            ${
              logItem.workType === 'Daily Wage'
                ? `
              <table style="width:100%;border-collapse:collapse;font-size:10.5pt">
                <tr>
                  <td style="padding:4px 0;color:#475569">Days Worked:</td>
                  <td style="padding:4px 0;text-align:right;font-weight:600">${logItem.daysWorked} day(s) @ Rs. ${logItem.skillRate.toLocaleString()}/day</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#475569">Overtime (${logItem.otHours || 0} hrs @ Rs. ${logItem.otRate || 0}/hr):</td>
                  <td style="padding:4px 0;text-align:right;font-weight:600">Rs. ${(logItem.otPay || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#475569">Daily Allowances (Food, Travel, Outstation):</td>
                  <td style="padding:4px 0;text-align:right;font-weight:600">Rs. ${(logItem.totalAllowances || 0).toLocaleString()}</td>
                </tr>
                <tr style="border-top:1px dashed #cbd5e1">
                  <td style="padding:6px 0;font-weight:700">Gross Daily Pay:</td>
                  <td style="padding:6px 0;text-align:right;font-weight:800;color:#0f172a">Rs. ${((logItem.daysWorked * logItem.skillRate) + (logItem.otPay || 0) + (logItem.totalAllowances || 0)).toLocaleString()}</td>
                </tr>
              </table>
              `
                : `
              <table style="width:100%;border-collapse:collapse;font-size:10.5pt">
                <tr>
                  <td style="padding:4px 0;color:#475569">Measured Area:</td>
                  <td style="padding:4px 0;text-align:right;font-weight:600">${logItem.subContractDetails?.measuredSqft || 0} Sqft</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#475569">Rate Per Sqft:</td>
                  <td style="padding:4px 0;text-align:right;font-weight:600">Rs. ${(logItem.subContractDetails?.ratePerSqft || 0).toLocaleString()} / Sqft</td>
                </tr>
                <tr style="border-top:1px dashed #cbd5e1">
                  <td style="padding:6px 0;font-weight:700">Total Measured Pay:</td>
                  <td style="padding:6px 0;text-align:right;font-weight:800;color:#0f172a">Rs. ${(logItem.subContractDetails?.totalMeasuredPay || 0).toLocaleString()}</td>
                </tr>
              </table>
              `
            }
          </div>

          <div style="background:#fffbe6;border:1px solid #ffe58f;border-radius:6px;padding:16px;margin-bottom:24px">
            <table style="width:100%;border-collapse:collapse;font-size:11pt">
              <tr>
                <td style="padding:4px 0;color:#854d0e;font-weight:600">Advance Deductions:</td>
                <td style="padding:4px 0;text-align:right;font-weight:700;color:#dc2626">- Rs. ${(logItem.advanceDeductions || 0).toLocaleString()}</td>
              </tr>
              <tr style="border-top:2px solid #d97706;font-size:14pt">
                <td style="padding:10px 0 0;font-weight:900;color:#0f172a">NET PAYABLE AMOUNT:</td>
                <td style="padding:10px 0 0;text-align:right;font-weight:900;color:#059669">Rs. ${(logItem.workType === 'Daily Wage' ? logItem.netDailyPay : logItem.subContractPay).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          ${logItem.notes ? `<p style="font-size:9.5pt;color:#64748b;font-style:italic">Notes: ${logItem.notes}</p>` : ''}

          <div style="display:flex;justify-content:space-between;margin-top:50px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:10pt;color:#475569">
            <div style="text-align:center">
              <div style="border-bottom:1px solid #94a3b8;width:160px;margin-bottom:4px"></div>
              <span>Worker Signature</span>
            </div>
            <div style="text-align:center">
              <div style="border-bottom:1px solid #94a3b8;width:160px;margin-bottom:4px"></div>
              <span>Site Supervisor / Manager</span>
            </div>
          </div>
        </div>
      </div>
    `

    await printHtmlContent({ title: `Payout Slip - ${logItem.logCode}`, bodyHtml })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner Component */}
      <LetterheadHeader
        logoUrl={siteSettingsData?.logoUrl}
        companyTitle="R.A CREATIONS & HOME DESIGNS (PVT) LTD"
        tagline="Daily Wage & Sub-Contractor Management Portal"
        refNo="MODULE-DW-2026"
        date={new Date().toLocaleDateString('en-LK')}
      />

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Daily Wages Paid</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              Rs. {summary.totalNetDailyPay.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Total Net Daily Pay</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sub-Contract Payouts</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              Rs. {summary.totalSubContractPay.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {summary.totalSqftMeasured.toLocaleString()} Sqft Measured
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Ruler className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Worker Meals &amp; Refreshments</p>
            <h3 className="text-2xl font-black text-cyan-600 mt-1">
              Rs. {summary.totalAllowances.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Site Operating Expenses</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-bold">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Advances Deducted</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">
              Rs. {summary.totalAdvanceDeductions.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Recovered from Payouts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm gap-2">
        <button
          onClick={() => setActiveTab('wages')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'wages'
              ? 'bg-slate-900 text-amber-400 shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calculator className="w-4 h-4" /> Daily Wage Calculator &amp; Entry
        </button>
        <button
          onClick={() => setActiveTab('subcontract')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'subcontract'
              ? 'bg-slate-900 text-amber-400 shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Ruler className="w-4 h-4" /> Sub-Contract (Sqft Basis) Entry
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-amber-400 shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" /> Work Logs &amp; Payout Slips ({logs.length})
        </button>
      </div>

      {/* --------------------------------------------------------- */}
      {/* TAB 1: DAILY WAGE CALCULATOR & FORM */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'wages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <form
            onSubmit={handleDailyWageSubmit}
            className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-500" /> Daily Labour Wage Payout Form
              </h3>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Formula: (Days * Rate) + OT + Allowances - Advances
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Worker / Baas Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Nimal Perera (Baas)"
                  value={wageForm.workerName}
                  onChange={(e) => setWageForm({ ...wageForm, workerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Construction Site / Project *
                </label>
                <select
                  required
                  value={wageForm.project}
                  onChange={(e) => setWageForm({ ...wageForm, project: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="">-- Select Project --</option>
                  {projectsList.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name || p.title || 'Untitled Project'} ({p.location || 'Site'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Skill Rate Category
                </label>
                <select
                  value={wageForm.skillLevel}
                  onChange={(e) => setWageForm({ ...wageForm, skillLevel: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="Skilled Labour / Baas">Skilled Labour / Baas (Rs. 5000/day)</option>
                  <option value="Unskilled Labour / Helper">Unskilled Labour / Helper (Rs. 3500/day)</option>
                  <option value="Custom">Custom Rate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Skill Rate (Rs./Day)
                </label>
                <input
                  type="number"
                  min="0"
                  value={wageForm.skillRate}
                  onChange={(e) => setWageForm({ ...wageForm, skillRate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Days Worked
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={wageForm.daysWorked}
                  onChange={(e) => setWageForm({ ...wageForm, daysWorked: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Log Date
                </label>
                <input
                  type="date"
                  value={wageForm.date}
                  onChange={(e) => setWageForm({ ...wageForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
            </div>

            {/* Overtime Section */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Overtime (OT) Hours &amp; Rate
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">OT Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={wageForm.otHours}
                    onChange={(e) => setWageForm({ ...wageForm, otHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">OT Rate / Hour (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={wageForm.otRate}
                    onChange={(e) => setWageForm({ ...wageForm, otRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Calculated OT Pay</label>
                  <div className="px-3 py-2 bg-amber-50 rounded-lg border border-amber-200 text-sm font-black text-amber-700">
                    Rs. {computedOtPay.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Allowances Section */}
            <div className="bg-cyan-50/50 rounded-xl p-4 border border-cyan-100 space-y-3">
              <h4 className="text-xs font-bold text-cyan-900 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-cyan-600" /> Daily Allowances &amp; Meals
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Daily Food &amp; Refreshments</label>
                  <input
                    type="number"
                    min="0"
                    value={wageForm.foodRefreshments}
                    onChange={(e) => setWageForm({ ...wageForm, foodRefreshments: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Travel &amp; Transport</label>
                  <input
                    type="number"
                    min="0"
                    value={wageForm.travelTransport}
                    onChange={(e) => setWageForm({ ...wageForm, travelTransport: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Night / Outstation Allowance</label>
                  <input
                    type="number"
                    min="0"
                    value={wageForm.nightOutstation}
                    onChange={(e) => setWageForm({ ...wageForm, nightOutstation: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mealExpenseAuto"
                  checked={wageForm.mealExpenseAutoLogged}
                  onChange={(e) => setWageForm({ ...wageForm, mealExpenseAutoLogged: e.target.checked })}
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                />
                <label htmlFor="mealExpenseAuto" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Auto-log Food &amp; Refreshment Allowance to Site Operating Expenses for this Project
                </label>
              </div>
            </div>

            {/* Financial Adjustments / Advances Section */}
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-indigo-600" /> Advance Deductions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link Active Employee Advance</label>
                  <select
                    value={wageForm.linkedAdvance}
                    onChange={(e) => {
                      const selected = advancesList.find((a) => a._id === e.target.value)
                      setWageForm({
                        ...wageForm,
                        linkedAdvance: e.target.value,
                        advanceDeductions: selected ? Math.min(selected.outstandingBalance, 1000) : wageForm.advanceDeductions,
                      })
                    }}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="">-- No Linked Advance --</option>
                    {advancesList.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.employee?.fullName || 'Worker'} (Outstanding: Rs. {a.outstandingBalance})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Advance Amount to Deduct (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={wageForm.advanceDeductions}
                    onChange={(e) => setWageForm({ ...wageForm, advanceDeductions: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm font-semibold text-rose-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes / Description</label>
              <input
                type="text"
                placeholder="e.g., Concrete pouring session extra overtime"
                value={wageForm.notes}
                onChange={(e) => setWageForm({ ...wageForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={createLogMutation.isPending}
              className="w-full py-3 bg-slate-900 text-amber-400 hover:bg-slate-800 font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Save Daily Wage Work Log
            </button>
          </form>

          {/* Live Pay Calculator Summary Card */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white border-2 border-amber-500/40 shadow-xl space-y-5 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Live Pay Calculator</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-full font-bold">
                  Daily Wage
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Base Wage Pay:</span>
                  <span className="font-bold text-white">
                    Rs. {(Number(wageForm.daysWorked || 0) * Number(wageForm.skillRate || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Overtime Pay:</span>
                  <span className="font-bold text-amber-400">+ Rs. {computedOtPay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Allowances:</span>
                  <span className="font-bold text-cyan-400">+ Rs. {computedTotalAllowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700 font-bold text-white">
                  <span>Gross Daily Pay:</span>
                  <span>Rs. {computedGrossDailyPay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Advance Deductions:</span>
                  <span>- Rs. {Number(wageForm.advanceDeductions || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-amber-500/50 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">NET PAYABLE DAILY WAGE</p>
                <h2 className="text-3xl font-black text-emerald-400 mt-1">
                  Rs. {computedNetDailyPay.toLocaleString()}
                </h2>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* TAB 2: SUB-CONTRACT (SQFT BASIS) FORM */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'subcontract' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSubContractSubmit}
            className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-emerald-600" /> Sub-Contract Work Log (Sqft / Cubic Ft Basis)
              </h3>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Formula: (Measured Sqft * Rate/Sqft) - Advances
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Sub-Contractor / Team Leader *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Perera Tiling Sub-Contractors"
                  value={subForm.workerName}
                  onChange={(e) => setSubForm({ ...subForm, workerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Construction Site / Project *
                </label>
                <select
                  required
                  value={subForm.project}
                  onChange={(e) => setSubForm({ ...subForm, project: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="">-- Select Project --</option>
                  {projectsList.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name || p.title || 'Untitled Project'} ({p.location || 'Site'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Work Sub-Category
                </label>
                <select
                  value={subForm.workCategory}
                  onChange={(e) => setSubForm({ ...subForm, workCategory: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="Tiling">Tiling Works</option>
                  <option value="Brickwork">Brickwork / Blockwork</option>
                  <option value="Painting">Painting Works</option>
                  <option value="Plastering">Plastering Works</option>
                  <option value="Piece-rate">Piece-rate Custom Work</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Log Date
                </label>
                <input
                  type="date"
                  value={subForm.date}
                  onChange={(e) => setSubForm({ ...subForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Measured Area (Square Feet - Sqft) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g., 450"
                  value={subForm.measuredSqft}
                  onChange={(e) => setSubForm({ ...subForm, measuredSqft: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Rate Per Sqft (Rs.) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g., 120"
                  value={subForm.ratePerSqft}
                  onChange={(e) => setSubForm({ ...subForm, ratePerSqft: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Optional Measured Cubic Feet (m3 / ft3)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g., 12"
                  value={subForm.measuredCubicFeet}
                  onChange={(e) => setSubForm({ ...subForm, measuredCubicFeet: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Advance Deductions (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  value={subForm.advanceDeductions}
                  onChange={(e) => setSubForm({ ...subForm, advanceDeductions: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-rose-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Work Notes / Measurement Location
              </label>
              <input
                type="text"
                placeholder="e.g., 2nd floor living room floor tiling measurement"
                value={subForm.notes}
                onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={createLogMutation.isPending}
              className="w-full py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Record Sub-Contract Sqft Log
            </button>
          </form>

          {/* Sub-Contract Live Summary Card */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white border-2 border-emerald-500/40 shadow-xl space-y-5 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">Sub-Contract Calculator</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                  {subForm.workCategory}
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Measured Sqft:</span>
                  <span className="font-bold text-white">{subForm.measuredSqft || 0} Sqft</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Per Sqft:</span>
                  <span className="font-bold text-white">Rs. {subForm.ratePerSqft || 0} / Sqft</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700 font-bold text-white">
                  <span>Total Measured Pay:</span>
                  <span>Rs. {computedSubTotalPay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Advance Deductions:</span>
                  <span>- Rs. {Number(subForm.advanceDeductions || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-emerald-500/50 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">NET SUB-CONTRACT PAYOUT</p>
                <h2 className="text-3xl font-black text-emerald-400 mt-1">
                  Rs. {computedSubNetPay.toLocaleString()}
                </h2>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* TAB 3: WORK LOGS DATA TABLE */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          {/* Table Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search worker or log ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none bg-amber-50 text-amber-900 border-amber-300"
              >
                <option value="">All Branches</option>
                {(branchesData || []).map((b) => (
                  <option key={b._id || b.id} value={b._id || b.id}>
                    {b.name} ({b.code || 'Branch'})
                  </option>
                ))}
              </select>

              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none"
              >
                <option value="">All Projects</option>
                {projectsList.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name || p.title || 'Untitled Project'}
                  </option>
                ))}
              </select>

              <select
                value={selectedWorkType}
                onChange={(e) => setSelectedWorkType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none"
              >
                <option value="">All Work Types</option>
                <option value="Daily Wage">Daily Wage</option>
                <option value="Sub-Contract">Sub-Contract</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Log Code / Date</th>
                  <th className="py-3 px-4">Worker / Sub-contractor</th>
                  <th className="py-3 px-4">Project Site</th>
                  <th className="py-3 px-4">Type &amp; Category</th>
                  <th className="py-3 px-4">Output / Measurement</th>
                  <th className="py-3 px-4 text-right">Net Payable Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400 font-medium">
                      Loading work logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400 font-medium">
                      No daily wage or sub-contract logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isDaily = log.workType === 'Daily Wage'
                    const netAmount = isDaily ? log.netDailyPay : log.subContractPay

                    return (
                      <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-800">
                          <div>{log.logCode}</div>
                          <div className="text-[11px] font-normal text-slate-500">
                            {new Date(log.date).toLocaleDateString('en-LK')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {log.workerName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {log.project?.name || log.project?.title || 'Site'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isDaily
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {log.workType} ({isDaily ? log.skillLevel : log.subContractDetails?.workCategory})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700 text-xs">
                          {isDaily
                            ? `${log.daysWorked} Days (${log.otHours || 0} hrs OT)`
                            : `${log.subContractDetails?.measuredSqft || 0} Sqft @ Rs.${log.subContractDetails?.ratePerSqft || 0}`}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 text-base">
                          Rs. {netAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={log.status}
                            onChange={(e) => updateStatusMutation.mutate({ id: log._id, status: e.target.value })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              log.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : log.status === 'Approved'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Paid">Paid</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrintPayoutSlip(log)}
                              title="Print Letterhead Payout Slip"
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteLogMutation.mutate(log._id)}
                              title="Delete Log"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      )}
    </div>
  )
}
