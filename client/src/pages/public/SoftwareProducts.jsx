import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { FiLayers, FiPackage, FiTruck, FiShield, FiFileText } from 'react-icons/fi'

const STATIC_PRODUCTS = [
  { _id: 'p1', icon: FiFileText, title: 'SLS 573:1999 Auto BOQ Engine', category: 'BOQ Engine', colorFrom: '#3b82f6', colorTo: '#1d4ed8', description: 'Auto-generate Sri Lankan Standard Bill of Quantities with accurate itemized pricing in 60 seconds.', features: ['SLS 573 standard format', 'Auto rate calculation', 'PDF/Excel instant export', 'Multi-site template builder'], priceText: 'Included in Site Matrix' },
  { _id: 'p2', icon: FiShield, title: 'SBD-03 Court-Ready Contracts', category: 'Legal Contracts', colorFrom: '#4f46e5', colorTo: '#3730a3', description: 'Standard Building Document SBD-03 compliant agreements for Subcontractors, Suppliers, Workers & Clients.', features: ['4-page legally binding format', 'Subcontractor & Supplier templates', 'Digital signatures & seals', 'Defects liability clauses'], priceText: 'Standard Included' },
  { _id: 'p3', icon: FiPackage, title: 'Central Warehouse & Site Stock Engine', category: 'Inventory Engine', colorFrom: '#059669', colorTo: '#047857', description: 'Real-time stock transfer tracking from Central Warehouse to 10+ construction sites with delivery fraud protection.', features: ['GRN Variance Warning holds', 'Cement, Sand & Steel 100% accounting', 'Site transfer dispatch logs', 'Automatic reorder alerts'], priceText: 'Included in Portal' },
  { _id: 'p4', icon: FiTruck, title: 'ReadyMix Concrete & Machinery Rental', category: 'Supplies & Rental', colorFrom: '#d97706', colorTo: '#b45309', description: 'Direct supply of ReadyMix concrete, Tokyo cement, Melwa steel, excavators, and tower cranes.', features: ['Daily / Weekly rental rates', 'Digital GRN supervisor signatures', 'Supplier price indexing alerts', 'Site delivery tracking'], priceText: 'Market Rates' },
]

export default function SoftwareProducts() {
  return (
    <div className="space-y-12 pb-16">
      {/* Header */}
      <section className="bg-white section-padding pt-32 text-center relative overflow-hidden text-slate-900">
        <div className="container-max relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col items-center">
            <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-4 py-1.5 rounded-full border border-amber-400/30 mb-4">
              Construction ERP & Civil Engineering Solutions
            </span>
            <h1 className="text-3xl lg:text-5xl font-black mb-4">
              C.A-Constructions <span className="text-amber-400">Engineering Solutions</span>
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto text-base">
              SLS 573 BOQ Generator, SBD-03 Legal Contracts Engine, Stock Transfers, and Heavy Machinery Supply.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Grid */}
      <section className="container-max px-4">
        <div className="grid md:grid-cols-2 gap-6">
          {STATIC_PRODUCTS.map(p => {
            const Icon = p.icon
            return (
              <div key={p._id} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-bold mb-4">
                  <Icon />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{p.title}</h3>
                <p className="text-xs text-slate-600 mb-4">{p.description}</p>
                <div className="space-y-1.5 border-t pt-4">
                  {p.features.map((f, i) => (
                    <p key={i} className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span> {f}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
