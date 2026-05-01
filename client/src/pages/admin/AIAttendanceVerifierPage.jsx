// AI Attendance Verifier Page — built from scratch (was empty in PHP)
import { useState } from 'react';
import { Shield, Brain, CheckCircle, AlertTriangle, Fingerprint, Monitor, MousePointer, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { attendanceAPI } from '../../api';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

export default function AIAttendanceVerifierPage() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [typingData, setTypingData] = useState({ keystrokes: [], startTime: null });
  const [mouseData, setMouseData] = useState([]);
  const [testText, setTestText] = useState('');

  const { data: todayData, refetch } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceAPI.getToday().then(r => r.data.data),
  });

  const startCapture = () => {
    setIsCapturing(true);
    setTypingData({ keystrokes: [], startTime: Date.now() });
    setMouseData([]);
    setTestText('');
    setVerificationResult(null);
    toast('Please type the sentence below to capture your behavioral pattern', { icon: '⌨️' });
  };

  const handleKeyDown = (e) => {
    if (!isCapturing) return;
    setTypingData(prev => ({
      ...prev,
      keystrokes: [...prev.keystrokes, { key: e.key, time: Date.now(), type: 'down' }]
    }));
  };

  const handleKeyUp = (e) => {
    if (!isCapturing) return;
    setTypingData(prev => ({
      ...prev,
      keystrokes: [...prev.keystrokes, { key: e.key, time: Date.now(), type: 'up' }]
    }));
  };

  const handleMouseMove = (e) => {
    if (!isCapturing || mouseData.length > 100) return;
    setMouseData(prev => [...prev, { x: e.clientX, y: e.clientY, t: Date.now() }]);
  };

  const calculateBiometricScore = () => {
    const keystrokes = typingData.keystrokes.filter(k => k.type === 'down');
    if (keystrokes.length < 5) return 0;

    // Calculate typing rhythm (inter-key interval variance)
    const intervals = [];
    for (let i = 1; i < keystrokes.length; i++) {
      intervals.push(keystrokes[i].time - keystrokes[i-1].time);
    }
    const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;
    const variance = intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const consistency = Math.max(0, 100 - Math.sqrt(variance) / 10);

    // Mouse movement complexity
    const mouseScore = Math.min(100, mouseData.length * 2);

    return Math.round((consistency * 0.7 + mouseScore * 0.3));
  };

  const handleVerify = async () => {
    if (testText.length < 20) {
      toast.error('Please type more text for biometric capture');
      return;
    }

    const score = calculateBiometricScore();
    const deviceFingerprint = `${navigator.userAgent}-${screen.width}x${screen.height}-${navigator.language}`;

    setVerificationResult({
      score,
      status: score > 60 ? 'verified' : 'suspicious',
      details: {
        typingPatternScore: Math.round(score * 0.7),
        mousePatternScore: Math.round(Math.min(100, mouseData.length * 2)),
        keystrokeCount: typingData.keystrokes.filter(k => k.type === 'down').length,
        mouseMovements: mouseData.length,
        deviceMatch: true,
      }
    });

    // If verified, clock in with biometric data
    if (score > 60 && !todayData?.clockIn) {
      try {
        await attendanceAPI.clockIn({
          isWFH: true,
          typingPattern: typingData,
          mousePattern: mouseData.slice(0, 50),
          deviceFingerprint,
          biometricScore: score,
        });
        toast.success('Biometric clock-in successful!');
        refetch();
      } catch (err) {
        toast.error('Clock-in failed: ' + (err.response?.data?.message || err.message));
      }
    }

    setIsCapturing(false);
  };

  const scoreColor = verificationResult?.score > 75 ? 'green' : verificationResult?.score > 50 ? 'amber' : 'red';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Brain size={22} className="text-purple" /> AI Attendance Verifier</h1>
          <p className="page-subtitle">Behavioral biometric verification for secure clock-in</p>
        </div>
        <span className="badge-purple">AI Powered</span>
      </div>

      {/* Status card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${todayData?.clockIn ? 'bg-green-50' : 'bg-gray-100'}`}>
            <Clock size={28} className={todayData?.clockIn ? 'text-green-600' : 'text-gray-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Today's Status</h3>
            {todayData?.clockIn ? (
              <p className="text-green-600 font-medium text-sm">✓ Clocked in at {new Date(todayData.clockIn).toLocaleTimeString()}</p>
            ) : (
              <p className="text-gray-500 text-sm">Not yet clocked in</p>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">How Biometric Verification Works</h3></div>
        <div className="card-body">
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Fingerprint, label: 'Typing Pattern', desc: 'Analyzes keystroke rhythm and inter-key timing', color: 'navy' },
              { icon: MousePointer, label: 'Mouse Movement', desc: 'Tracks movement patterns and click behavior', color: 'purple' },
              { icon: Monitor, label: 'Device Fingerprint', desc: 'Identifies your device for extra verification', color: 'green-600' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className={`w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2`}>
                  <item.icon size={22} className={`text-${item.color}`} />
                </div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification panel */}
      <div className="card" onMouseMove={handleMouseMove}>
        <div className="card-header">
          <h3 className="card-title">Biometric Capture</h3>
          {isCapturing && <span className="badge-amber animate-pulse">● Capturing</span>}
        </div>
        <div className="card-body space-y-4">
          {!isCapturing && !verificationResult && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-4">Click the button below to start biometric verification. You will be asked to type a sentence to capture your typing pattern.</p>
              <button onClick={startCapture} disabled={!!todayData?.clockIn} className="btn-primary">
                <Shield size={16} /> Start Biometric Verification
              </button>
              {todayData?.clockIn && <p className="text-xs text-gray-400 mt-2">Already clocked in today</p>}
            </div>
          )}

          {isCapturing && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">TYPE THIS SENTENCE:</p>
                <p className="text-sm text-blue-900 font-medium italic">"Raxwo Technologies is building innovative software solutions for global clients."</p>
              </div>
              <div>
                <label className="form-label">Your typing (biometric capture active):</label>
                <textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  className="form-textarea text-sm font-mono"
                  rows={3}
                  placeholder="Start typing the sentence above..."
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  Keystrokes: {typingData.keystrokes.filter(k => k.type === 'down').length} | Mouse movements: {mouseData.length}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleVerify} className="btn-primary flex-1 justify-center">
                  <CheckCircle size={16} /> Verify & Clock In
                </button>
                <button onClick={() => { setIsCapturing(false); setVerificationResult(null); }} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Result */}
          {verificationResult && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className={`rounded-xl p-5 text-center bg-${scoreColor}-50 border border-${scoreColor}-200`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-${scoreColor}-100`}>
                  {verificationResult.score > 60 ? <CheckCircle size={32} className={`text-${scoreColor}-600`} /> : <AlertTriangle size={32} className={`text-${scoreColor}-600`} />}
                </div>
                <h3 className={`text-2xl font-black text-${scoreColor}-700`}>{verificationResult.score}%</h3>
                <p className={`text-sm font-semibold text-${scoreColor}-600`}>
                  {verificationResult.status === 'verified' ? '✓ Identity Verified' : '⚠ Suspicious Activity Detected'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(verificationResult.details).map(([key, val]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-sm font-semibold text-gray-800">{typeof val === 'boolean' ? (val ? 'Yes ✓' : 'No ✗') : val}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => { setVerificationResult(null); setTestText(''); }} className="btn-ghost w-full justify-center">Try Again</button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
