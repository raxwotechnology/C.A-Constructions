import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FiUsers, FiFolder, FiDollarSign, FiClock, FiBriefcase, FiCalendar, FiUserPlus, FiBarChart2, FiServer, FiCreditCard, FiShield, FiMapPin, FiFileText, FiTrendingUp, FiAlertTriangle, FiCheckCircle, FiArrowRight, FiZap, FiActivity } from 'react-icons/fi'

const COLORS = ['#2563EB','#22C55E','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316']
const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt = v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v || 0)
const tt = { borderRadius: '10px', fontSize: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }

const QuickLink = ({ to, icon: Icon, label, color }) => (
  <Link to={to} className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium text-gray-600 transition-all duration-150 ${color}`}>
    <Icon size={15}/><span>{label}</span><FiArrowRight size={11} className="ml-auto opacity-40"/>
  </Link>
)

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    refetchInterval: 60000,
  })

  const kpis = data?.kpis || {}
  const charts = data?.charts || {}
  const recent = data?.recent || {}

  // Build 12-month merged chart
  const revExpChart = M.map((m, i) => ({
    month: m,
    revenue: (charts.revenueData || []).find(d => d._id === i+1)?.total || 0,
    expense: (charts.expenseData || []).find(d => d._id === i+1)?.total || 0,
  }))
  const payrollChart = (charts.payrollCost || []).map(d => ({ month: M[d._id-1], cost: d.total }))
  const projectPie = (charts.projectStatus || []).map(d => ({ name: d._id, value: d.count }))
  const attChart = (charts.attendanceByStatus || []).map(d => ({ name: d._id, value: d.count }))

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/>
    </div>
  )

  const netProfit = (kpis.netProfit || 0)
  const profitPositive = netProfit >= 0

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Complete business overview — {new Date().toLocaleDateString('en-LK', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin/employees" className="btn-outline btn-sm"><FiUserPlus size={13}/> Add Employee</Link>
          <Link to="/admin/projects" className="btn-primary btn-sm"><FiFolder size={13}/> New Project</Link>
        </div>
      </div>

      {/* ── KPI Row 1 — Financials ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">💰 Financials</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label:'Revenue YTD', value:`LKR ${fmt(kpis.totalRevenue)}`, sub:'Paid invoices', icon:FiDollarSign, accent:'#22c55e', bg:'bg-green-50 text-green-600' },
            { label:'Expenses YTD', value:`LKR ${fmt(kpis.totalExpenses)}`, sub:'Recorded expenses', icon:FiActivity, accent:'#ef4444', bg:'bg-red-50 text-red-600' },
            { label:'Net Profit', value:`LKR ${fmt(Math.abs(netProfit))}`, sub:profitPositive?'Profit':'Loss', icon:FiTrendingUp, accent:profitPositive?'#22c55e':'#ef4444', bg:profitPositive?'bg-green-50 text-green-600':'bg-red-50 text-red-600' },
            { label:'Subscription MRR', value:`LKR ${fmt(kpis.subscriptionRevenue)}`, sub:`${kpis.activeSubscriptions||0} active`, icon:FiServer, accent:'#8b5cf6', bg:'bg-purple-50 text-purple-600' },
          ].map((c,i) => (
            <motion.div key={c.label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className="card card-body relative overflow-hidden">
              <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:c.accent,borderRadius:'12px 0 0 12px'}}/>
              <div className="flex items-start justify-between pl-2">
                <div><p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">{c.label}</p>
                  <p className="text-xl font-bold text-primary font-heading">{c.value}</p>
                  <p className="text-xs text-gray-400">{c.sub}</p></div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}><c.icon size={16}/></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── KPI Row 2 — People ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">👥 People & HR</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label:'Total Employees', value:kpis.totalEmployees||0, sub:`${kpis.activeEmployees||0} active`, icon:FiUsers, accent:'#2563eb', bg:'bg-blue-50 text-blue-600' },
            { label:'Pending Leaves', value:kpis.pendingLeaves||0, sub:'Awaiting approval', icon:FiClock, accent:'#f59e0b', bg:'bg-yellow-50 text-yellow-600', alert:kpis.pendingLeaves>0 },
            { label:'Open Applications', value:kpis.newApplications||0, sub:`${kpis.totalApplications||0} total`, icon:FiBriefcase, accent:'#6366f1', bg:'bg-indigo-50 text-indigo-600' },
            { label:'On Leave Today', value:(charts.attendanceToday||[]).find(d=>d._id==='leave')?.count||0, sub:'Based on today\'s records', icon:FiCalendar, accent:'#06b6d4', bg:'bg-cyan-50 text-cyan-600' },
          ].map((c,i) => (
            <motion.div key={c.label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className={`card card-body relative overflow-hidden ${c.alert?'border-yellow-300':''}`}>
              <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:c.accent,borderRadius:'12px 0 0 12px'}}/>
              <div className="flex items-start justify-between pl-2">
                <div><p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">{c.label}</p>
                  <p className="text-xl font-bold text-primary font-heading">{c.value}</p>
                  <p className="text-xs text-gray-400">{c.sub}</p></div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}><c.icon size={16}/></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── KPI Row 3 — Projects & Clients ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">📁 Projects & Clients</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label:'Active Projects', value:kpis.activeProjects||0, sub:`${kpis.completedProjects||0} completed`, icon:FiFolder, accent:'#8b5cf6', bg:'bg-purple-50 text-purple-600' },
            { label:'Total Clients', value:kpis.clientCount||0, sub:'Registered clients', icon:FiUsers, accent:'#06b6d4', bg:'bg-cyan-50 text-cyan-600' },
            { label:'Pending Invoices', value:kpis.pendingInvoices||0, sub:'Unpaid / overdue', icon:FiCreditCard, accent:'#f97316', bg:'bg-orange-50 text-orange-600', alert:kpis.pendingInvoices>0 },
            { label:'Overdue Subscriptions', value:kpis.overdueSubscriptions||0, sub:`${kpis.totalSubscriptions||0} total`, icon:FiAlertTriangle, accent:'#ef4444', bg:'bg-red-50 text-red-600', alert:kpis.overdueSubscriptions>0 },
          ].map((c,i) => (
            <motion.div key={c.label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className={`card card-body relative overflow-hidden ${c.alert?'border-orange-200':''}`}>
              <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:c.accent,borderRadius:'12px 0 0 12px'}}/>
              <div className="flex items-start justify-between pl-2">
                <div><p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">{c.label}</p>
                  <p className="text-xl font-bold text-primary font-heading">{c.value}</p>
                  <p className="text-xs text-gray-400">{c.sub}</p></div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}><c.icon size={16}/></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Revenue vs Expenses Chart ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card card-body">
          <h3 className="font-bold text-primary font-heading mb-0.5">Revenue vs Expenses</h3>
          <p className="text-xs text-gray-400 mb-4">Monthly comparison for {new Date().getFullYear()}</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revExpChart}>
              <defs>
                <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient>
                <linearGradient id="eG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={fmt}/>
              <Tooltip formatter={(v,n) => [`LKR ${Number(v).toLocaleString()}`,n]} contentStyle={tt}/>
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2.5} fill="url(#rG)"/>
              <Area type="monotone" dataKey="expense" name="Expenses" stroke="#EF4444" strokeWidth={2} fill="url(#eG)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-0.5">Project Status</h3>
          <p className="text-xs text-gray-400 mb-3">All projects by status</p>
          {projectPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={projectPie} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {projectPie.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={tt}/>
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{fontSize:10,color:'#6B7280',textTransform:'capitalize'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No project data</div>}
        </div>
      </div>

      {/* ── Payroll + Attendance ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card card-body">
          <h3 className="font-bold text-primary font-heading mb-0.5">Payroll Cost</h3>
          <p className="text-xs text-gray-400 mb-4">Monthly net salary (approved/paid)</p>
          {payrollChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={payrollChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={fmt}/>
                <Tooltip formatter={v => [`LKR ${Number(v).toLocaleString()}`,'Payroll']} contentStyle={tt}/>
                <Bar dataKey="cost" fill="#2563EB" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-44 flex items-center justify-center text-gray-400 text-sm">No payroll data yet</div>}
        </div>

        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-0.5">Attendance This Month</h3>
          <p className="text-xs text-gray-400 mb-3">Status breakdown</p>
          {attChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={attChart} cx="50%" cy="50%" innerRadius={48} outerRadius={76} dataKey="value" paddingAngle={3}>
                  {attChart.map((d,i) => <Cell key={i} fill={d.name==='present'?'#22c55e':d.name==='absent'?'#ef4444':d.name==='leave'?'#f59e0b':'#2563eb'}/>)}
                </Pie>
                <Tooltip contentStyle={tt}/>
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{fontSize:10,color:'#6B7280',textTransform:'capitalize'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-44 flex items-center justify-center text-gray-400 text-sm">No attendance records</div>}
        </div>
      </div>

      {/* ── Department bars + Recent Projects ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4">Team by Department</h3>
          <div className="space-y-3">
            {(charts.deptDist || []).slice(0,7).map((d,i) => (
              <div key={d._id} className="flex items-center gap-3">
                <div className="w-28 text-xs text-gray-600 font-medium truncate">{d._id}</div>
                <div className="flex-1 progress-bar"><div className="progress-fill" style={{width:`${Math.round((d.count/(kpis.totalEmployees||1))*100)}%`,backgroundColor:COLORS[i%COLORS.length]}}/></div>
                <span className="w-5 text-xs text-gray-500 text-right">{d.count}</span>
              </div>
            ))}
            {!(charts.deptDist||[]).length && <p className="text-gray-400 text-sm text-center py-6">No department data</p>}
          </div>
        </div>

        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary font-heading">Recent Projects</h3>
            <Link to="/admin/projects" className="text-secondary text-xs font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {(recent.recentProjects||[]).slice(0,5).map(p => (
              <div key={p._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <FiFolder className="text-secondary" size={13}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400">{p.client?.name||'Internal'} · {p.progress||0}% done</p>
                </div>
                <span className={`badge text-xs capitalize ${p.status==='active'?'badge-green':p.status==='completed'?'badge-blue':'badge-yellow'}`}>{p.status}</span>
              </div>
            ))}
            {!(recent.recentProjects||[]).length && <p className="text-gray-400 text-sm text-center py-6">No projects yet</p>}
          </div>
        </div>
      </div>

      {/* ── Alerts + Quick Actions ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Alerts */}
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4 flex items-center gap-2"><FiAlertTriangle size={15} className="text-orange-500"/> Alerts & Pending Items</h3>
          <div className="space-y-2.5">
            {kpis.pendingLeaves > 0 && (
              <Link to="/admin/leaves" className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition-colors">
                <FiClock size={15} className="text-yellow-600 flex-shrink-0"/>
                <div className="flex-1"><p className="text-sm font-semibold text-yellow-800">{kpis.pendingLeaves} Leave Request{kpis.pendingLeaves!==1?'s':''} Pending</p><p className="text-xs text-yellow-600">Awaiting your approval</p></div>
                <FiArrowRight size={13} className="text-yellow-500"/>
              </Link>
            )}
            {kpis.overdueSubscriptions > 0 && (
              <Link to="/admin/subscriptions" className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                <FiServer size={15} className="text-red-600 flex-shrink-0"/>
                <div className="flex-1"><p className="text-sm font-semibold text-red-800">{kpis.overdueSubscriptions} Overdue Subscription{kpis.overdueSubscriptions!==1?'s':''}</p><p className="text-xs text-red-600">Payment overdue — action needed</p></div>
                <FiArrowRight size={13} className="text-red-500"/>
              </Link>
            )}
            {kpis.pendingInvoices > 0 && (
              <Link to="/admin/invoices" className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors">
                <FiCreditCard size={15} className="text-orange-600 flex-shrink-0"/>
                <div className="flex-1"><p className="text-sm font-semibold text-orange-800">{kpis.pendingInvoices} Unpaid Invoice{kpis.pendingInvoices!==1?'s':''}</p><p className="text-xs text-orange-600">Outstanding payments</p></div>
                <FiArrowRight size={13} className="text-orange-500"/>
              </Link>
            )}
            {kpis.newApplications > 0 && (
              <Link to="/admin/recruitment" className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors">
                <FiBriefcase size={15} className="text-indigo-600 flex-shrink-0"/>
                <div className="flex-1"><p className="text-sm font-semibold text-indigo-800">{kpis.newApplications} New Application{kpis.newApplications!==1?'s':''}</p><p className="text-xs text-indigo-600">Unreviewed job applications</p></div>
                <FiArrowRight size={13} className="text-indigo-500"/>
              </Link>
            )}
            {!kpis.pendingLeaves && !kpis.overdueSubscriptions && !kpis.pendingInvoices && !kpis.newApplications && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <FiCheckCircle size={18} className="text-green-600"/>
                <p className="text-sm font-semibold text-green-800">All clear — no pending actions!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4 flex items-center gap-2"><FiZap size={15} className="text-secondary"/> Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink to="/admin/employees" icon={FiUserPlus} label="Add Employee" color="hover:bg-blue-50 hover:border-blue-200 border-gray-100"/>
            <QuickLink to="/admin/projects" icon={FiFolder} label="New Project" color="hover:bg-purple-50 hover:border-purple-200 border-gray-100"/>
            <QuickLink to="/admin/payroll" icon={FiDollarSign} label="Run Payroll" color="hover:bg-green-50 hover:border-green-200 border-gray-100"/>
            <QuickLink to="/admin/leaves" icon={FiCalendar} label="Leave Requests" color="hover:bg-yellow-50 hover:border-yellow-200 border-gray-100"/>
            <QuickLink to="/admin/quotations" icon={FiFileText} label="New Quotation" color="hover:bg-orange-50 hover:border-orange-200 border-gray-100"/>
            <QuickLink to="/admin/attendance" icon={FiClock} label="Mark Attendance" color="hover:bg-cyan-50 hover:border-cyan-200 border-gray-100"/>
            <QuickLink to="/admin/recruitment" icon={FiBriefcase} label="Recruitment" color="hover:bg-indigo-50 hover:border-indigo-200 border-gray-100"/>
            <QuickLink to="/admin/analytics" icon={FiBarChart2} label="Analytics" color="hover:bg-gray-50 hover:border-gray-300 border-gray-100"/>
            <QuickLink to="/admin/ai-analyzer" icon={FiZap} label="AI Analyzer" color="hover:bg-violet-50 hover:border-violet-200 border-gray-100"/>
            <QuickLink to="/admin/audit-logs" icon={FiShield} label="Audit Logs" color="hover:bg-red-50 hover:border-red-200 border-gray-100"/>
            <QuickLink to="/admin/branches" icon={FiMapPin} label="Branches" color="hover:bg-teal-50 hover:border-teal-200 border-gray-100"/>
            <QuickLink to="/admin/performance" icon={FiTrendingUp} label="Performance" color="hover:bg-pink-50 hover:border-pink-200 border-gray-100"/>
          </div>
        </div>
      </div>

    </div>
  )
}
