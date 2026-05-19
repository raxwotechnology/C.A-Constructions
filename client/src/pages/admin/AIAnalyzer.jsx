import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { FiZap, FiTrendingUp, FiTrendingDown, FiActivity, FiGlobe, FiInstagram, FiTwitter, FiSearch, FiTarget, FiBarChart2 } from 'react-icons/fi'
import { formatMoney, chartMoneyTick } from '../../lib/currencies'

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Simulated marketing analyzer data (per platform)
const PLATFORM_CONFIG = {
  facebook: { base: 12000, label: 'Facebook', icon: '📘', audience: '25–44 business owners' },
  instagram: { base: 8500, label: 'Instagram', icon: '📷', audience: '18–34 visual-first users' },
  tiktok: { base: 45000, label: 'TikTok', icon: '🎵', audience: '16–28 Gen Z creators' },
  linkedin: { base: 6200, label: 'LinkedIn', icon: '💼', audience: 'B2B professionals & decision makers' },
  youtube: { base: 15800, label: 'YouTube', icon: '▶️', audience: 'Tutorial & product research viewers' },
}

const genSocialData = (platform) => {
  const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram
  const base = cfg.base
  const isVideo = platform === 'youtube' || platform === 'tiktok'
  const isLinkedIn = platform === 'linkedin'
  const followers = base + Math.floor(Math.random() * 2000)
  const engagementRate = (Math.random() * 4 + (isLinkedIn ? 0.8 : 1)).toFixed(2)
  const recommendations = [
    isLinkedIn
      ? 'Publish thought-leadership posts twice weekly with industry hashtags'
      : isVideo
        ? 'Add keyword-rich titles and end-screen CTAs on top-performing videos'
        : 'Increase carousel posts with clear CTAs to drive profile visits',
    isVideo
      ? 'Batch-record 4 short videos per session to maintain upload consistency'
      : 'Reply to comments within 2 hours to boost engagement signals',
    'Run A/B tests on posting times using insights from the last 30 days',
    isLinkedIn
      ? 'Share employee advocacy content to expand organic reach'
      : 'Refresh cover art and bio links to match current campaigns',
  ]
  return {
    platform: cfg.label,
    icon: cfg.icon,
    followers,
    subscribers: isVideo ? followers : null,
    followersGrowth: (Math.random() * 8 + 1).toFixed(1),
    engagementRate,
    reach: Math.floor(base * 2.5),
    impressions: Math.floor(base * 4),
    postsThisMonth: Math.floor(Math.random() * 20 + (isVideo ? 4 : 10)),
    videosThisMonth: isVideo ? Math.floor(Math.random() * 8 + 2) : 0,
    avgLikes: Math.floor(Math.random() * 500 + 100),
    avgComments: Math.floor(Math.random() * 50 + 10),
    avgViews: isVideo ? Math.floor(base * 1.8 + Math.random() * 5000) : 0,
    watchTimeHours: isVideo ? Math.floor(Math.random() * 400 + 120) : 0,
    bestTime: ['9:00 AM', '12:00 PM', '6:00 PM', '8:00 PM'][Math.floor(Math.random() * 4)],
    topHashtags: isLinkedIn
      ? ['#B2B', '#Leadership', '#SaaS', '#Hiring'].slice(0, 4)
      : isVideo
        ? ['#tutorial', '#howto', '#review', '#tips'].slice(0, 4)
        : ['#digitalmarketing', '#webdesign', '#seo', '#branding'].slice(0, 4),
    audienceInsight: cfg.audience,
    seoTips: isVideo
      ? ['Optimize video titles with primary keywords', 'Add chapters for retention', 'Use custom thumbnails with contrast']
      : ['Use alt text on images', 'Pin top-performing posts', 'Cross-link to website landing pages'],
    recommendations,
    contentPerformance: [
      { type: isVideo ? 'Tutorial' : isLinkedIn ? 'Article' : 'Carousel', score: 92 },
      { type: isVideo ? 'Short' : 'Reel', score: 87 },
      { type: 'Promo', score: 74 },
    ],
    growthData: Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      followers: base + i * Math.floor(Math.random() * 200 + 50),
      engagement: (Math.random() * 5 + 1).toFixed(1),
    })),
  }
}

const genWebsiteData = (url) => ({
  seoScore: Math.floor(Math.random() * 30 + 60),
  speedScore: Math.floor(Math.random() * 25 + 55),
  mobileScore: Math.floor(Math.random() * 20 + 65),
  securityScore: Math.floor(Math.random() * 15 + 80),
  accessibilityScore: Math.floor(Math.random() * 25 + 60),
  uiuxScore: Math.floor(Math.random() * 20 + 65),
  contentScore: Math.floor(Math.random() * 20 + 70),
  issues: ['Missing meta descriptions on 3 pages', 'Images lack alt text', 'Page speed could improve with compression', 'SSL certificate valid', 'Mobile viewport configured'],
  suggestions: ['Add structured data markup', 'Compress images with WebP format', 'Implement lazy loading', 'Add more internal links', 'Improve CTA button contrast'],
})

const TABS = [
  { id: 'business', label: '📊 Business AI', icon: FiBarChart2 },
  { id: 'website', label: '🌐 Website', icon: FiGlobe },
  { id: 'social', label: '📱 Social Media', icon: FiInstagram },
  { id: 'marketing', label: '📢 Marketing', icon: FiTarget },
  { id: 'suggestions', label: '🧠 AI Suggestions', icon: FiZap },
]

const ScoreGauge = ({ label, score, color }) => (
  <div className="flex flex-col items-center">
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black text-primary">{score}</span>
      </div>
    </div>
    <p className="text-xs font-semibold text-slate-600 mt-1 text-center">{label}</p>
  </div>
)

export default function AdminAIAnalyzer() {
  const [activeTab, setActiveTab] = useState('business')
  const [lookback, setLookback] = useState(6)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [websiteResult, setWebsiteResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [socialPlatform, setSocialPlatform] = useState('instagram')
  const [socialData, setSocialData] = useState(null)
  const [socialAnalyzing, setSocialAnalyzing] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ai-predictions', lookback],
    queryFn: () => api.get(`/analytics/ai-predict?months=${lookback}`).then(r => r.data),
  })

  const historical = data?.historical || {}
  const predictions = data?.predictions || {}
  const suggestions = data?.suggestions || []
  const nextMonth = months[new Date().getMonth() === 11 ? 0 : new Date().getMonth() + 1]

  const revChartData = [
    ...(historical.revenue || []).map(d => ({ label: d.label, actual: d.value })),
    { label: `${nextMonth} (Pred.)`, predicted: predictions.revenue?.nextValue || 0 },
  ]

  const analyzeWebsite = async () => {
    if (!websiteUrl) return
    setAnalyzing(true)
    await new Promise(r => setTimeout(r, 2500))
    setWebsiteResult(genWebsiteData(websiteUrl))
    setAnalyzing(false)
  }

  const analyzeSocial = async () => {
    setSocialAnalyzing(true)
    await new Promise(r => setTimeout(r, 1800))
    setSocialData(genSocialData(socialPlatform))
    setSocialAnalyzing(false)
  }

  const aiSuggestions = [
    { cat: 'Marketing', icon: '📣', color: 'from-pink-500 to-rose-500', items: ['Run A/B tests on your landing page CTAs', 'Increase posting frequency on TikTok by 3x', 'Add retargeting campaigns for website visitors'] },
    { cat: 'SEO', icon: '🔍', color: 'from-blue-500 to-cyan-500', items: ['Optimize page titles with primary keywords', 'Build backlinks from industry directories', 'Create blog content targeting long-tail keywords'] },
    { cat: 'Design', icon: '🎨', color: 'from-purple-500 to-violet-500', items: ['Improve mobile navigation UX', 'Use more whitespace in service pages', 'Add video backgrounds to hero sections'] },
    { cat: 'Growth', icon: '📈', color: 'from-emerald-500 to-teal-500', items: ['Launch referral program for existing clients', 'Partner with complementary agencies', 'Create case study content for portfolio'] },
    { cat: 'Content', icon: '✍️', color: 'from-amber-500 to-orange-500', items: ['Post behind-the-scenes team content', 'Create educational tutorial videos', 'Share client success stories weekly'] },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Analyzer</h1>
          <p className="page-subtitle">AI-powered analytics, predictions, and marketing intelligence</p>
        </div>
        {activeTab === 'business' && (
          <div className="flex items-center gap-3">
            <select className="form-select text-sm" value={lookback} onChange={e => setLookback(Number(e.target.value))}>
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
            <button onClick={() => refetch()} className="btn-primary btn-sm gap-1"><FiZap size={14}/> Re-analyze</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 flex-wrap shadow-sm">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-gradient-to-r from-secondary to-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Business AI Tab */}
      {activeTab === 'business' && (
        isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"/>
            <p className="text-slate-500 text-sm font-medium">AI is analyzing your business data…</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Revenue Prediction', val: formatMoney(predictions.revenue?.nextValue || 0), trend: predictions.revenue?.trend || 0, color: 'kpi-blue' },
                { label: 'Payroll Prediction', val: formatMoney(predictions.payroll?.nextValue || 0), trend: predictions.payroll?.trend || 0, color: 'kpi-green' },
                { label: 'New Projects', val: `${predictions.projects?.nextValue || 0} projects`, trend: predictions.projects?.trend || 0, color: 'kpi-purple' },
              ].map((c, i) => (
                <motion.div key={c.label} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.1 }} className={`kpi-card ${c.color}`}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{c.label}</p>
                  <p className="text-xs text-purple-600 font-medium flex items-center gap-1 mb-1"><FiZap size={10}/> {nextMonth} Prediction</p>
                  <p className="text-2xl font-bold text-primary">{c.val}</p>
                  <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${c.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {c.trend >= 0 ? <FiTrendingUp size={12}/> : <FiTrendingDown size={12}/>}
                    {Math.abs(c.trend).toFixed(1)}% trend
                  </div>
                </motion.div>
              ))}
            </div>
            {suggestions.length > 0 && (
              <div className="card card-body">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"><FiZap className="text-white" size={14}/></div>
                  <h3 className="font-bold text-primary">AI Insights & Recommendations</h3>
                </div>
                <div className="space-y-3">
                  {suggestions.map((s, i) => (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${s.type === 'positive' ? 'bg-green-50 border-green-200 text-green-800' : s.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                      <span className="text-xl shrink-0">{s.icon}</span>
                      <p className="text-sm font-medium">{s.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card card-body">
              <h3 className="font-bold text-primary mb-1">Revenue Trend & Prediction</h3>
              <p className="text-xs text-slate-400 mb-4">Blue = actual · Purple dashed = AI prediction</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={revChartData}>
                  <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={chartMoneyTick}/>
                  <Tooltip contentStyle={{ borderRadius:'10px', fontSize:'12px' }}/>
                  <Area type="monotone" dataKey="actual" name="Actual" stroke="#2563EB" strokeWidth={2.5} fill="url(#rg)" dot={{ fill:'#2563EB', r:3 }} connectNulls={false}/>
                  <Area type="monotone" dataKey="predicted" name="Predicted" stroke="#8B5CF6" strokeWidth={2.5} strokeDasharray="6 3" fill="none" dot={{ fill:'#8B5CF6', r:5 }} connectNulls={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      )}

      {/* Website Analyzer Tab */}
      {activeTab === 'website' && (
        <div className="space-y-5">
          <div className="card card-body">
            <h3 className="font-bold text-primary mb-3">🌐 Website Analyzer</h3>
            <div className="flex gap-3">
              <input className="form-input flex-1" placeholder="https://yourwebsite.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
              <button onClick={analyzeWebsite} disabled={!websiteUrl || analyzing} className="btn-primary gap-2 px-6">
                {analyzing ? <><span className="spinner"/> Scanning...</> : <><FiSearch size={14}/> Analyze</>}
              </button>
            </div>
          </div>

          {analyzing && (
            <div className="card card-body text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"/>
              <p className="font-semibold text-primary">Scanning website...</p>
              <p className="text-sm text-slate-400 mt-1">Checking SEO, performance, security & more</p>
            </div>
          )}

          {websiteResult && !analyzing && (
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="space-y-5">
              <div className="card card-body">
                <h3 className="font-bold text-primary mb-4">Analysis Results — {websiteUrl}</h3>
                <div className="flex flex-wrap gap-6 justify-around">
                  <ScoreGauge label="SEO" score={websiteResult.seoScore} color="#3B82F6"/>
                  <ScoreGauge label="Speed" score={websiteResult.speedScore} color="#10B981"/>
                  <ScoreGauge label="Mobile" score={websiteResult.mobileScore} color="#8B5CF6"/>
                  <ScoreGauge label="Security" score={websiteResult.securityScore} color="#F59E0B"/>
                  <ScoreGauge label="Accessibility" score={websiteResult.accessibilityScore} color="#EC4899"/>
                  <ScoreGauge label="UI/UX" score={websiteResult.uiuxScore} color="#06B6D4"/>
                  <ScoreGauge label="Content" score={websiteResult.contentScore} color="#84CC16"/>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="card card-body">
                  <h4 className="font-bold text-primary mb-3">⚠️ Issues Found</h4>
                  <ul className="space-y-2">
                    {websiteResult.issues.map((iss, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"/>
                        {iss}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card card-body">
                  <h4 className="font-bold text-primary mb-3">💡 Suggestions</h4>
                  <ul className="space-y-2">
                    {websiteResult.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <FiZap size={14} className="text-secondary shrink-0 mt-0.5"/>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Social Media Tab */}
      {activeTab === 'social' && (
        <div className="space-y-5">
          <div className="card card-body">
            <div className="flex items-center gap-4 flex-wrap">
              <h3 className="font-bold text-primary">Social Media Analytics</h3>
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                {['facebook','instagram','tiktok','linkedin','youtube'].map(p => (
                  <button key={p} onClick={() => setSocialPlatform(p)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${socialPlatform === p ? 'bg-white shadow text-secondary' : 'text-slate-500'}`}>
                    {PLATFORM_CONFIG[p]?.icon || '📱'} {p}
                  </button>
                ))}
              </div>
              <button onClick={analyzeSocial} disabled={socialAnalyzing} className="btn-primary btn-sm gap-1">
                {socialAnalyzing ? <span className="spinner"/> : <FiZap size={14}/>} {socialAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>

          {socialAnalyzing && (
            <div className="card card-body text-center py-12">
              <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"/>
              <p className="font-semibold text-primary">Analyzing {socialPlatform}...</p>
            </div>
          )}

          {socialData && !socialAnalyzing && (
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="space-y-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: socialData.subscribers ? 'Subscribers' : 'Followers', val: (socialData.subscribers || socialData.followers).toLocaleString(), sub: `+${socialData.followersGrowth}% growth`, color: 'kpi-blue' },
                  { label: 'Engagement Rate', val: `${socialData.engagementRate}%`, sub: 'avg per post/video', color: 'kpi-green' },
                  { label: 'Monthly Reach', val: socialData.reach.toLocaleString(), sub: `${socialData.impressions.toLocaleString()} impressions`, color: 'kpi-purple' },
                  { label: socialData.avgViews ? 'Avg Views' : 'Avg Likes', val: (socialData.avgViews || socialData.avgLikes).toLocaleString(), sub: `Best time: ${socialData.bestTime}`, color: 'kpi-orange' },
                ].map(c => (
                  <div key={c.label} className={`kpi-card ${c.color}`}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{c.label}</p>
                    <p className="text-2xl font-bold text-primary mt-1">{c.val}</p>
                    <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
                  </div>
                ))}
              </div>
              <div className="card card-body">
                <h3 className="font-bold text-primary mb-4">Weekly Followers Growth</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={socialData.growthData}>
                    <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="day" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ borderRadius:'10px', fontSize:'12px' }}/>
                    <Area type="monotone" dataKey="followers" name="Followers" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#sg)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="card card-body">
                <h4 className="font-bold text-primary mb-3">👥 Audience & recommendations</h4>
                <p className="text-sm text-slate-600 mb-3">{socialData.audienceInsight}</p>
                <ul className="space-y-1.5 mb-4">
                  {(socialData.recommendations || []).map((r, i) => (
                    <li key={i} className="text-sm text-slate-600 flex gap-2"><FiZap size={14} className="text-secondary shrink-0"/>{r}</li>
                  ))}
                </ul>
                <h4 className="font-bold text-primary mb-2">🏷️ Top hashtags / SEO</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {socialData.topHashtags.map((h, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-secondary/10 to-blue-100 text-secondary text-sm font-semibold rounded-full border border-secondary/20">{h}</span>
                  ))}
                </div>
                <ul className="space-y-1">
                  {(socialData.seoTips || []).map((t, i) => (
                    <li key={i} className="text-xs text-slate-500">• {t}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Marketing Tab */}
      {activeTab === 'marketing' && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Facebook Analysis', icon: '📘', desc: 'Page performance, ad reach, audience demographics', color: 'from-blue-600 to-blue-700' },
              { title: 'Instagram Analysis', icon: '📷', desc: 'Profile analytics, story performance, hashtag reach', color: 'from-pink-500 to-rose-600' },
              { title: 'TikTok Analysis', icon: '🎵', desc: 'Video performance, trending sounds, creator analytics', color: 'from-slate-800 to-slate-900' },
              { title: 'LinkedIn Analysis', icon: '💼', desc: 'Follower growth, engagement, B2B audience insights', color: 'from-blue-700 to-blue-900' },
              { title: 'YouTube Analysis', icon: '▶️', desc: 'Subscribers, watch time, video SEO optimization', color: 'from-red-600 to-red-800' },
              { title: 'Competitor Analysis', icon: '🔍', desc: 'Compare with competitors, market positioning', color: 'from-amber-500 to-orange-600' },
              { title: 'Campaign Analysis', icon: '🎯', desc: 'Ad performance, ROI, conversion tracking', color: 'from-emerald-500 to-teal-600' },
              { title: 'Ad Performance', icon: '💰', desc: 'CPC, CTR, ROAS, budget optimization', color: 'from-purple-500 to-violet-600' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.08 }}
                className="group card border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className={`h-2 bg-gradient-to-r ${item.color}`}/>
                <div className="p-5">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-bold text-primary mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500 mb-4">{item.desc}</p>
                  <button className="btn-outline btn-sm text-xs gap-1 group-hover:bg-secondary group-hover:text-white group-hover:border-secondary transition-colors">
                    <FiZap size={11}/> Run Analysis
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <div className="card card-body bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"><FiZap className="text-white" size={18}/></div>
              <div>
                <h3 className="font-bold text-primary">AI-Powered Recommendations</h3>
                <p className="text-xs text-slate-500">Based on your business data and industry trends</p>
              </div>
            </div>
          </div>
          {aiSuggestions.map((cat, ci) => (
            <motion.div key={ci} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay: ci*0.1 }}
              className="card card-body">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-lg`}>{cat.icon}</div>
                <h3 className="font-bold text-primary">{cat.cat} Recommendations</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {cat.items.map((item, ii) => (
                  <div key={ii} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{ii+1}</span>
                    <p className="text-sm text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
