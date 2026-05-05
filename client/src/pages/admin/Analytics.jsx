import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#2563EB','#22C55E','#F59E0B','#EF4444','#8B5CF6','#06B6D4']
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
  })
  const kpis = data?.kpis || {}
  const charts = data?.charts || {}

  const payrollChart = (charts.payrollCost || []).map(d => ({ month: months[d._id-1], cost: d.total }))
  const deptChart = (charts.deptDist || []).map(d => ({ dept: d._id, count: d.count }))
  const projectPie = (charts.projectStatus || []).map(d => ({ name: d._id, value: d.count }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p className="page-subtitle">Business intelligence for {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Employees', value: kpis.totalEmployees||0, sub:`${kpis.activeEmployees||0} active` },
          { label:'Total Projects', value: kpis.totalProjects||0, sub:`${kpis.activeProjects||0} active` },
          { label:'Total Clients', value: kpis.clientCount||0, sub:'registered' },
          { label:'Applications', value: kpis.totalApplications||0, sub:`${kpis.newApplications||0} new` },
        ].map((k,i)=>(
          <motion.div key={k.label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}
            className="card card-body text-center">
            <p className="text-3xl font-bold text-primary font-heading">{k.value}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
            <p className="text-xs text-gray-400">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-1">Monthly Payroll Cost</h3>
          <p className="text-xs text-gray-400 mb-4">Total net payroll per month (LKR)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payrollChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>[`LKR ${v.toLocaleString()}`,'Payroll']} contentStyle={{borderRadius:'10px',fontSize:'12px'}}/>
              <Bar dataKey="cost" fill="#2563EB" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
          {payrollChart.length === 0 && <div className="text-center text-gray-400 text-sm py-4">No payroll data yet</div>}
        </div>

        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-1">Project Status Distribution</h3>
          <p className="text-xs text-gray-400 mb-4">Breakdown of all projects by status</p>
          {projectPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={projectPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}>
                  {projectPie.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{borderRadius:'10px',fontSize:'12px'}}/>
                <Legend iconType="circle" iconSize={8} formatter={v=><span style={{fontSize:11,color:'#6B7280',textTransform:'capitalize'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No project data</div>}
        </div>
      </div>

      {/* Dept bar chart */}
      <div className="card card-body">
        <h3 className="font-bold text-primary font-heading mb-1">Employees by Department</h3>
        <p className="text-xs text-gray-400 mb-4">Headcount per department</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={deptChart} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
            <XAxis type="number" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
            <YAxis dataKey="dept" type="category" tick={{fontSize:11,fill:'#6B7280'}} axisLine={false} tickLine={false} width={90}/>
            <Tooltip contentStyle={{borderRadius:'10px',fontSize:'12px'}}/>
            <Bar dataKey="count" fill="#0B1F3A" radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
        {deptChart.length === 0 && <div className="text-center text-gray-400 text-sm py-4">No department data</div>}
      </div>
    </div>
  )
}
