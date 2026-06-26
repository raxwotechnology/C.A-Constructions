import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiShield, FiMail, FiMessageSquare, FiCheckSquare, FiActivity } from 'react-icons/fi'
import AdminAuditLogs from './AuditLogs'
import AdminEmailLogs from './EmailLogs'
import AdminSmsLogs from './SmsLogs'
import AdminWorkLogs from './WorkLogs'

export default function LogCentre() {
  const [activeTab, setActiveTab] = useState('audit')

  const tabs = [
    { id: 'audit', label: 'Audit Logs', icon: FiShield, desc: 'Track system actions' },
    { id: 'email', label: 'Email Logs', icon: FiMail, desc: 'Sent system emails' },
    { id: 'sms', label: 'SMS Logs', icon: FiMessageSquare, desc: 'SMSLenz deliveries' },
    { id: 'work', label: 'Work Logs', icon: FiCheckSquare, desc: 'Daily employee logs' },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Enhanced Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <FiActivity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-800">Log Centre</h1>
            <p className="text-slate-500 text-sm mt-1">Centralized view for system activity, communications, and work logs.</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <tab.icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
                <div className="text-left">
                  <p className="leading-none">{tab.label}</p>
                  {/* <span className={`text-[10px] font-normal mt-1 block ${active ? 'text-white/80' : 'text-slate-400'}`}>{tab.desc}</span> */}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[60vh]">
        <AnimatePresence mode="wait">
          {tabs.map(tab => activeTab === tab.id && (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {/* Hide only the titles of the imported components so action buttons remain visible */}
              <div className="[&_.page-title]:hidden [&_.page-subtitle]:hidden [&_.page-header]:!mb-0 [&_.page-header]:!pb-0 [&_.page-header]:border-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-1 sm:p-4">
                {tab.id === 'audit' && <AdminAuditLogs />}
                {tab.id === 'email' && <AdminEmailLogs />}
                {tab.id === 'sms' && <AdminSmsLogs />}
                {tab.id === 'work' && <AdminWorkLogs />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
