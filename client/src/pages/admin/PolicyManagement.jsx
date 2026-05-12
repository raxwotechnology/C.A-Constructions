import { useState } from 'react'
import LeavePolicies from './LeavePolicies'
import AttendancePolicies from './AttendancePolicies'
import { FiShield, FiClock } from 'react-icons/fi'

export default function PolicyManagement() {
  const [tab, setTab] = useState('leave')
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Policy Management</h1>
          <p className="page-subtitle">Manage leave and attendance policies for your organization</p>
        </div>
      </div>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[['leave','Leave Policies',<FiShield size={14}/>],['attendance','Attendance Policies',<FiClock size={14}/>]].map(([key,label,icon])=>(
          <button key={key} onClick={()=>setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===key?'bg-white shadow text-primary':'text-slate-500 hover:text-slate-700'}`}>
            {icon}{label}
          </button>
        ))}
      </div>
      {tab==='leave' && <LeavePolicies />}
      {tab==='attendance' && <AttendancePolicies />}
    </div>
  )
}
