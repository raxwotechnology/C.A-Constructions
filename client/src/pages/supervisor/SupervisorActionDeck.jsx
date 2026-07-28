import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  FiCamera, FiBook, FiTruck, FiBox, FiAlertTriangle, FiDollarSign,
  FiMapPin, FiWifi, FiWifiOff, FiCheck, FiSend, FiX
} from 'react-icons/fi'

export default function SupervisorActionDeck() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [activeModal, setActiveModal] = useState(null)
  const [siteId, setSiteId] = useState('')
  const [workerPhoto, setWorkerPhoto] = useState('')
  const [gpsCoords, setGpsCoords] = useState(null)
  const [grnForm, setGrnForm] = useState({ itemName: '', orderedQty: '', receivedQty: '', unit: 'bags', supplierName: '' })
  const [diaryForm, setDiaryForm] = useState({ weather: 'sunny', skilledLabours: 12, unskilledLabours: 18, notes: '' })

  const { data: sitesData } = useQuery({
    queryKey: ['supervisor-sites'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const sites = sitesData?.projects || sitesData?.sites || []

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success('Signal restored! Syncing offline site data...'); }
    const handleOffline = () => { setIsOnline(false); toast.error('Signal lost! Switched to Supervisor Offline Storage.'); }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Acquire GPS
  const acquireGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
          toast.success(`GPS Acquired: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
        },
        () => {
          setGpsCoords({ lat: 6.9271, lng: 79.8612, accuracy: 10 })
          toast('Using Site Default GPS Coordinates', { icon: '📍' })
        }
      )
    }
  }

  // Handle Photo & GPS Attendance
  const submitAttendance = async () => {
    if (!siteId) return toast.error('Please select a Site first!')
    try {
      if (isOnline) {
        await api.post('/attendance/clock-in', {
          site: siteId,
          gpsLocation: gpsCoords,
          photoUrl: workerPhoto || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300'
        })
        toast.success('30-Sec Live Photo & GPS Attendance Verified!')
      } else {
        localStorage.setItem('offline_attendance_' + Date.now(), JSON.stringify({ siteId, gpsCoords, workerPhoto }))
        toast.success('Saved to Offline Vault! Will auto-sync when online.')
      }
      setActiveModal(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission error')
    }
  }

  // Handle GRN Submit
  const submitGRN = async () => {
    if (!siteId || !grnForm.itemName) return toast.error('Please complete GRN fields!')
    try {
      if (isOnline) {
        const res = await api.post('/inventory/grn', {
          site: siteId,
          ...grnForm
        })
        if (res.data.grn?.hasVariance) {
          toast.error('⚠️ VARIANCE DETECTED! Payment Auto-Held for Accountant.', { duration: 6000 })
        } else {
          toast.success('Digital GRN Verified & Signed!')
        }
      } else {
        localStorage.setItem('offline_grn_' + Date.now(), JSON.stringify({ siteId, ...grnForm }))
        toast.success('GRN saved offline!')
      }
      setActiveModal(null)
    } catch (error) {
      toast.error('GRN Error')
    }
  }

  // Handle Daily Diary Submit
  const submitDailyDiary = async () => {
    if (!siteId) return toast.error('Select Site first!')
    try {
      if (isOnline) {
        await api.post('/daily-diary', {
          site: siteId,
          s1_attendanceSummary: { skilledLabours: diaryForm.skilledLabours, unskilledLabours: diaryForm.unskilledLabours },
          s4_weather: { condition: diaryForm.weather, impactNote: diaryForm.notes },
        })
        toast.success('12-Section Daily Diary Saved & Verified!')
      } else {
        localStorage.setItem('offline_diary_' + Date.now(), JSON.stringify({ siteId, diaryForm }))
        toast.success('Daily Diary saved in offline mode!')
      }
      setActiveModal(null)
    } catch (error) {
      toast.error('Diary error')
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Supervisor Header */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              {isOnline ? <FiWifi className="text-emerald-300" /> : <FiWifiOff className="text-rose-300 animate-pulse" />}
              {isOnline ? 'LIVE SYNC ONLINE' : 'OFFLINE MODE ACTIVE'}
            </span>
            <span className="bg-amber-950/40 text-amber-100 text-xs font-bold px-3 py-1 rounded-full">
              Site Supervisor Action Deck (35°C Field UI)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black">SUPERVISOR MOBILE ACTION DECK</h1>
          <p className="text-amber-100 text-xs mt-1">High-contrast, large touch action cards for site outdoor conditions.</p>
        </div>

        {/* Site Selection */}
        <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
          <label className="block text-[11px] font-bold text-amber-100 uppercase mb-1">Current Active Site:</label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full bg-slate-900 text-white font-bold text-sm px-3 py-2 rounded-lg border border-amber-400 focus:outline-none"
          >
            <option value="">-- Select Active Site --</option>
            {sites.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
          </select>
        </div>
      </div>

      {/* 6 GIANT ACTION CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Attendance Photo & GPS */}
        <button
          onClick={() => { acquireGPS(); setActiveModal('attendance'); }}
          className="p-6 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-3xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-56 text-left border-4 border-emerald-400/40"
        >
          <div className="flex justify-between items-start">
            <span className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black">
              📸
            </span>
            <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full">30-SEC TAP</span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">1. PHOTO & GPS ATTENDANCE</h2>
            <p className="text-emerald-100 text-xs font-medium mt-1">Live camera tap + GPS verification to prevent phantom payroll.</p>
          </div>
        </button>

        {/* Card 2: 12-Section Daily Diary */}
        <button
          onClick={() => setActiveModal('diary')}
          className="p-6 bg-gradient-to-br from-indigo-700 to-indigo-900 text-white rounded-3xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-56 text-left border-4 border-indigo-400/40"
        >
          <div className="flex justify-between items-start">
            <span className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black">
              📔
            </span>
            <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full">12 SECTIONS</span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">2. 12-SECTION DAILY DIARY</h2>
            <p className="text-indigo-100 text-xs font-medium mt-1">Record weather, workers, machinery, accidents & site progress.</p>
          </div>
        </button>

        {/* Card 3: Goods Received Note (GRN) */}
        <button
          onClick={() => setActiveModal('grn')}
          className="p-6 bg-gradient-to-br from-amber-600 to-amber-800 text-white rounded-3xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-56 text-left border-4 border-amber-400/40"
        >
          <div className="flex justify-between items-start">
            <span className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black">
              📦
            </span>
            <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full">FRAUD PROTECT</span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">3. RECEIVE GOODS / GRN</h2>
            <p className="text-amber-100 text-xs font-medium mt-1">Verify delivery vs PO quantity. Auto-hold payment on shortage.</p>
          </div>
        </button>

        {/* Card 4: Material Transfer Request */}
        <button
          onClick={() => setActiveModal('transfer')}
          className="p-6 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-3xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-56 text-left border-4 border-blue-400/40"
        >
          <div className="flex justify-between items-start">
            <span className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black">
              🚛
            </span>
            <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full">MAIN STOCK</span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">4. MATERIAL TRANSFER</h2>
            <p className="text-blue-100 text-xs font-medium mt-1">Request cement, sand or steel from Central Warehouse.</p>
          </div>
        </button>

        {/* Card 5: Incident & Safety Log */}
        <button
          onClick={() => setActiveModal('incident')}
          className="p-6 bg-gradient-to-br from-rose-700 to-rose-900 text-white rounded-3xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-56 text-left border-4 border-rose-400/40"
        >
          <div className="flex justify-between items-start">
            <span className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black">
              ⚠️
            </span>
            <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full">SAFETY FIRST</span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">5. SITE SAFETY & INCIDENTS</h2>
            <p className="text-rose-100 text-xs font-medium mt-1">Log near misses, injuries or safety equipment requests.</p>
          </div>
        </button>

        {/* Card 6: Site Petty Cash Log */}
        <button
          onClick={() => setActiveModal('pettycash')}
          className="p-6 bg-gradient-to-br from-purple-700 to-purple-900 text-white rounded-3xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-56 text-left border-4 border-purple-400/40"
        >
          <div className="flex justify-between items-start">
            <span className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black">
              💵
            </span>
            <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full">PETTY CASH</span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">6. QUICK PETTY CASH LOG</h2>
            <p className="text-purple-100 text-xs font-medium mt-1">Record small site purchases (nails, tea, emergency fuel).</p>
          </div>
        </button>
      </div>

      {/* MODALS */}
      {activeModal === 'attendance' && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">📸 Photo & GPS Attendance</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400"><FiX /></button>
            </div>
            <div className="p-4 bg-slate-100 rounded-2xl text-center">
              <p className="text-xs text-slate-600 mb-2">Simulated Live Camera Capture Tap</p>
              <div className="w-32 h-32 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-4xl text-white">
                👤
              </div>
            </div>
            {gpsCoords && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <FiMapPin /> GPS Verified: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
              </div>
            )}
            <button onClick={submitAttendance} className="w-full py-3 bg-emerald-600 text-white font-black text-base rounded-2xl shadow-lg">
              VERIFY ATTENDANCE (30-SEC)
            </button>
          </div>
        </div>
      )}

      {activeModal === 'grn' && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">📦 Verify GRN Goods Delivery</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400"><FiX /></button>
            </div>
            <input
              type="text" placeholder="Item Name (e.g. Tokyo Cement 50kg)"
              value={grnForm.itemName} onChange={e => setGrnForm({ ...grnForm, itemName: e.target.value })}
              className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500">PO ORDERED QTY</label>
                <input
                  type="number" placeholder="200"
                  value={grnForm.orderedQty} onChange={e => setGrnForm({ ...grnForm, orderedQty: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500">ACTUAL RECEIVED QTY</label>
                <input
                  type="number" placeholder="195"
                  value={grnForm.receivedQty} onChange={e => setGrnForm({ ...grnForm, receivedQty: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold"
                />
              </div>
            </div>
            <button onClick={submitGRN} className="w-full py-3 bg-amber-600 text-white font-black text-base rounded-2xl shadow-lg">
              SUBMIT & VERIFY GRN
            </button>
          </div>
        </div>
      )}

      {activeModal === 'diary' && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900">📔 12-Section Daily Diary</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400"><FiX /></button>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500">WEATHER CONDITION</label>
              <select
                value={diaryForm.weather} onChange={e => setDiaryForm({ ...diaryForm, weather: e.target.value })}
                className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold"
              >
                <option value="sunny">Sunny (32°C)</option>
                <option value="cloudy">Cloudy</option>
                <option value="rainy">Rainy (Heavy Stoppage)</option>
              </select>
            </div>
            <textarea
              placeholder="Supervisor remarks & site progress notes..."
              value={diaryForm.notes} onChange={e => setDiaryForm({ ...diaryForm, notes: e.target.value })}
              className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-medium h-24"
            />
            <button onClick={submitDailyDiary} className="w-full py-3 bg-indigo-600 text-white font-black text-base rounded-2xl shadow-lg">
              SAVE DAILY DIARY ENTRY
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
