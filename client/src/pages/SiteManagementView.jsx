import React, { useState, useMemo } from 'react';
import { 
  HardHat, ClipboardList, Truck, ShieldAlert, Sun, Plus, CheckCircle2, X, 
  Calendar, User, AlertTriangle, RefreshCw, Layers, FileText, ChevronRight,
  Edit2, Trash2, Save, PlusCircle, Filter, Search, Printer, Wrench, Fuel,
  Activity, Clock, MapPin, Building, Briefcase, Check, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const WORKER_TYPES = [
  'Mason', 'Helper', 'Carpenter', 'Bar Bender', 'Electrician', 'Plumber', 'Unskilled'
];

const HSE_SEVERITIES = ['Near Miss', 'Minor', 'Major', 'Critical'];

export default function SiteManagementView() {
  const queryClient = useQueryClient();
  const [activeSubView, setActiveSubView] = useState('dsr');
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH
  const [selectedDiary, setSelectedDiary] = useState(null);

  // Modals state
  const [showDsrModal, setShowDsrModal] = useState(false);
  const [editingDiaryId, setEditingDiaryId] = useState(null);
  const [showLabourModal, setShowLabourModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showMachineryModal, setShowMachineryModal] = useState(false);
  const [showHseModal, setShowHseModal] = useState(false);

  // Sub-modal specific form states
  const [labourRows, setLabourRows] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);
  const [machineryRows, setMachineryRows] = useState([]);
  const [hseRows, setHseRows] = useState([]);

  // Master DSR Form State
  const [dsrForm, setDsrForm] = useState({
    project: '',
    date: new Date().toISOString().slice(0, 10),
    weather: 'Sunny',
    workCompletedSummary: '',
    siteSupervisor: '',
    inspectorLogs: '',
    labourAttendance: [
      { workerType: 'Mason', count: 8, regularHours: 8, otHours: 2 },
      { workerType: 'Helper', count: 12, regularHours: 8, otHours: 1 },
      { workerType: 'Bar Bender', count: 4, regularHours: 8, otHours: 2 },
    ],
    materialUsage: [
      { materialName: 'Portland Cement (50kg)', quantityUsed: 25, unit: 'Bags' },
      { materialName: '16mm Tor Steel Reinforcement', quantityUsed: 350, unit: 'Kg' },
    ],
    machineryUsage: [
      { machineName: 'JCB Excavator 01', hoursWorked: 6, fuelConsumedLiters: 45 },
      { machineName: 'Concrete Vibrator & Poker', hoursWorked: 4, fuelConsumedLiters: 10 },
    ],
    hseIncidents: [],
  });

  // 1. Fetch Projects from backend
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data),
  });
  const projects = Array.isArray(projectsData?.projects) 
    ? projectsData.projects 
    : Array.isArray(projectsData) ? projectsData : [];

  // 2. Fetch Daily Diaries from backend API
  const { data: diariesData, isLoading: isDiariesLoading, refetch } = useQuery({
    queryKey: ['daily-diaries'],
    queryFn: () => api.get('/daily-diary').then((r) => r.data),
  });
  const diaries = diariesData?.diaries || [];

  // Mutations
  const createDiaryMutation = useMutation({
    mutationFn: (payload) => api.post('/daily-diary', payload),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Daily Site Report saved successfully!');
      queryClient.invalidateQueries(['daily-diaries']);
      setShowDsrModal(false);
      setEditingDiaryId(null);
      if (res.data?.diary) {
        setSelectedDiary(res.data.diary);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save Daily Site Report');
    },
  });

  const updateDiaryMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/daily-diary/${id}`, payload),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Daily Site Report updated successfully!');
      queryClient.invalidateQueries(['daily-diaries']);
      setShowDsrModal(false);
      setShowLabourModal(false);
      setShowMaterialModal(false);
      setShowMachineryModal(false);
      setShowHseModal(false);
      setEditingDiaryId(null);
      if (res.data?.diary) {
        setSelectedDiary(res.data.diary);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update Daily Site Report');
    },
  });

  const deleteDiaryMutation = useMutation({
    mutationFn: (id) => api.delete(`/daily-diary/${id}`),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Daily Site Report deleted successfully!');
      queryClient.invalidateQueries(['daily-diaries']);
      setSelectedDiary(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete Daily Site Report');
    },
  });

  // Filtered Diaries according to Sitewise & search filter
  const filteredDiaries = useMemo(() => {
    return diaries.filter((d) => {
      // Sitewise match
      const pId = d.project?._id || d.project?.id || d.project;
      if (selectedProjectId !== 'ALL' && pId !== selectedProjectId) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'ALL') {
        const reportDate = new Date(d.date || d.createdAt);
        const today = new Date();
        if (dateFilter === 'TODAY') {
          if (reportDate.toDateString() !== today.toDateString()) return false;
        } else if (dateFilter === 'WEEK') {
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          if (reportDate < weekAgo) return false;
        } else if (dateFilter === 'MONTH') {
          const monthAgo = new Date();
          monthAgo.setDate(today.getDate() - 30);
          if (reportDate < monthAgo) return false;
        }
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (d.project?.name || d.project?.title || '').toLowerCase();
        const pCode = (d.project?.code || '').toLowerCase();
        const summary = (d.workCompletedSummary || '').toLowerCase();
        const supervisor = (d.siteSupervisor?.name || '').toLowerCase();
        const weather = (d.weather || '').toLowerCase();
        return (
          pName.includes(q) ||
          pCode.includes(q) ||
          summary.includes(q) ||
          supervisor.includes(q) ||
          weather.includes(q)
        );
      }

      return true;
    });
  }, [diaries, selectedProjectId, dateFilter, searchQuery]);

  // Selected Active Diary
  const activeDiary = useMemo(() => {
    if (selectedDiary && filteredDiaries.some((d) => d._id === selectedDiary._id)) {
      return filteredDiaries.find((d) => d._id === selectedDiary._id);
    }
    return filteredDiaries.length > 0 ? filteredDiaries[0] : null;
  }, [selectedDiary, filteredDiaries]);

  // Selected Project Object (if any)
  const currentProjectObj = useMemo(() => {
    if (selectedProjectId === 'ALL') return null;
    return projects.find((p) => (p._id || p.id) === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Handlers for Master DSR Modal
  const openNewDsrModal = () => {
    setEditingDiaryId(null);
    const defaultProjId = selectedProjectId !== 'ALL' ? selectedProjectId : (projects[0]?._id || projects[0]?.id || '');
    setDsrForm({
      project: defaultProjId,
      date: new Date().toISOString().slice(0, 10),
      weather: 'Sunny',
      workCompletedSummary: '',
      siteSupervisor: '',
      inspectorLogs: '',
      labourAttendance: [
        { workerType: 'Mason', count: 6, regularHours: 8, otHours: 2 },
        { workerType: 'Helper', count: 10, regularHours: 8, otHours: 1 },
        { workerType: 'Bar Bender', count: 4, regularHours: 8, otHours: 2 },
      ],
      materialUsage: [
        { materialName: 'Portland Cement 50kg', quantityUsed: 20, unit: 'Bags' },
      ],
      machineryUsage: [
        { machineName: 'Concrete Mixer & Hoist', hoursWorked: 5, fuelConsumedLiters: 15 },
      ],
      hseIncidents: [],
    });
    setShowDsrModal(true);
  };

  const openEditDsrModal = (diary) => {
    if (!diary) return;
    setEditingDiaryId(diary._id);
    setDsrForm({
      project: diary.project?._id || diary.project?.id || diary.project || '',
      date: diary.date ? new Date(diary.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      weather: diary.weather || 'Sunny',
      workCompletedSummary: diary.workCompletedSummary || '',
      siteSupervisor: diary.siteSupervisor?._id || diary.siteSupervisor || '',
      inspectorLogs: diary.inspectorLogs || '',
      labourAttendance: Array.isArray(diary.labourAttendance) && diary.labourAttendance.length > 0
        ? [...diary.labourAttendance]
        : [{ workerType: 'Mason', count: 5, regularHours: 8, otHours: 0 }],
      materialUsage: Array.isArray(diary.materialUsage) && diary.materialUsage.length > 0
        ? [...diary.materialUsage]
        : [],
      machineryUsage: Array.isArray(diary.machineryUsage) && diary.machineryUsage.length > 0
        ? [...diary.machineryUsage]
        : [],
      hseIncidents: Array.isArray(diary.hseIncidents) && diary.hseIncidents.length > 0
        ? [...diary.hseIncidents]
        : [],
    });
    setShowDsrModal(true);
  };

  const handleDsrSubmit = (e) => {
    e.preventDefault();
    const targetProject = dsrForm.project || (projects[0]?._id || projects[0]?.id);
    if (!targetProject) {
      toast.error('Please select a valid construction site / project!');
      return;
    }

    const payload = {
      project: targetProject,
      date: dsrForm.date ? new Date(dsrForm.date) : new Date(),
      weather: dsrForm.weather,
      workCompletedSummary: dsrForm.workCompletedSummary,
      labourAttendance: dsrForm.labourAttendance.filter((l) => Number(l.count) > 0),
      materialUsage: dsrForm.materialUsage.filter((m) => m.materialName && Number(m.quantityUsed) > 0),
      machineryUsage: dsrForm.machineryUsage.filter((mc) => mc.machineName && Number(mc.hoursWorked) > 0),
      hseIncidents: dsrForm.hseIncidents.filter((h) => h.description),
      inspectorLogs: dsrForm.inspectorLogs,
    };

    if (editingDiaryId) {
      updateDiaryMutation.mutate({ id: editingDiaryId, payload });
    } else {
      createDiaryMutation.mutate(payload);
    }
  };

  const handleDeleteDiary = (diary, e) => {
    if (e) e.stopPropagation();
    if (!diary) return;
    const dateStr = new Date(diary.date || diary.createdAt).toLocaleDateString();
    if (window.confirm(`Are you sure you want to permanently delete the DSR for ${dateStr}?`)) {
      deleteDiaryMutation.mutate(diary._id);
    }
  };

  // Sub-modal Open Handlers
  const openEditLabourModal = (diary) => {
    if (!diary) return;
    setLabourRows(
      Array.isArray(diary.labourAttendance) && diary.labourAttendance.length > 0
        ? diary.labourAttendance.map((l) => ({ ...l }))
        : [{ workerType: 'Mason', count: 4, regularHours: 8, otHours: 0 }]
    );
    setShowLabourModal(true);
  };

  const saveLabourModal = () => {
    if (!activeDiary) return;
    const payload = {
      project: activeDiary.project?._id || activeDiary.project?.id || activeDiary.project,
      date: activeDiary.date,
      weather: activeDiary.weather,
      workCompletedSummary: activeDiary.workCompletedSummary,
      materialUsage: activeDiary.materialUsage || [],
      machineryUsage: activeDiary.machineryUsage || [],
      hseIncidents: activeDiary.hseIncidents || [],
      labourAttendance: labourRows.filter((r) => Number(r.count) > 0),
    };
    updateDiaryMutation.mutate({ id: activeDiary._id, payload });
  };

  const openEditMaterialModal = (diary) => {
    if (!diary) return;
    setMaterialRows(
      Array.isArray(diary.materialUsage) && diary.materialUsage.length > 0
        ? diary.materialUsage.map((m) => ({ ...m }))
        : [{ materialName: 'Portland Cement (50kg)', quantityUsed: 10, unit: 'Bags' }]
    );
    setShowMaterialModal(true);
  };

  const saveMaterialModal = () => {
    if (!activeDiary) return;
    const payload = {
      project: activeDiary.project?._id || activeDiary.project?.id || activeDiary.project,
      date: activeDiary.date,
      weather: activeDiary.weather,
      workCompletedSummary: activeDiary.workCompletedSummary,
      labourAttendance: activeDiary.labourAttendance || [],
      machineryUsage: activeDiary.machineryUsage || [],
      hseIncidents: activeDiary.hseIncidents || [],
      materialUsage: materialRows.filter((r) => r.materialName && Number(r.quantityUsed) > 0),
    };
    updateDiaryMutation.mutate({ id: activeDiary._id, payload });
  };

  const openEditMachineryModal = (diary) => {
    if (!diary) return;
    setMachineryRows(
      Array.isArray(diary.machineryUsage) && diary.machineryUsage.length > 0
        ? diary.machineryUsage.map((m) => ({ ...m }))
        : [{ machineName: 'JCB Excavator 01', hoursWorked: 4, fuelConsumedLiters: 20 }]
    );
    setShowMachineryModal(true);
  };

  const saveMachineryModal = () => {
    if (!activeDiary) return;
    const payload = {
      project: activeDiary.project?._id || activeDiary.project?.id || activeDiary.project,
      date: activeDiary.date,
      weather: activeDiary.weather,
      workCompletedSummary: activeDiary.workCompletedSummary,
      labourAttendance: activeDiary.labourAttendance || [],
      materialUsage: activeDiary.materialUsage || [],
      hseIncidents: activeDiary.hseIncidents || [],
      machineryUsage: machineryRows.filter((r) => r.machineName && Number(r.hoursWorked) > 0),
    };
    updateDiaryMutation.mutate({ id: activeDiary._id, payload });
  };

  const openEditHseModal = (diary) => {
    if (!diary) return;
    setHseRows(
      Array.isArray(diary.hseIncidents) && diary.hseIncidents.length > 0
        ? diary.hseIncidents.map((h) => ({ ...h }))
        : [{ severity: 'Near Miss', description: '', actionTaken: '' }]
    );
    setShowHseModal(true);
  };

  const saveHseModal = () => {
    if (!activeDiary) return;
    const payload = {
      project: activeDiary.project?._id || activeDiary.project?.id || activeDiary.project,
      date: activeDiary.date,
      weather: activeDiary.weather,
      workCompletedSummary: activeDiary.workCompletedSummary,
      labourAttendance: activeDiary.labourAttendance || [],
      materialUsage: activeDiary.materialUsage || [],
      machineryUsage: activeDiary.machineryUsage || [],
      hseIncidents: hseRows.filter((r) => r.description && r.description.trim()),
    };
    updateDiaryMutation.mutate({ id: activeDiary._id, payload });
  };

  // Quick stats calculation
  const totalWorkersToday = (activeDiary?.labourAttendance || []).reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
  const totalMaterialItems = (activeDiary?.materialUsage || []).length;
  const totalMachineryHours = (activeDiary?.machineryUsage || []).reduce((acc, curr) => acc + (Number(curr.hoursWorked) || 0), 0);
  const zeroIncidentCount = diaries.filter((d) => !d.hseIncidents || d.hseIncidents.length === 0).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Site Operations &amp; Engineering
            </span>
            <button 
              onClick={() => refetch()} 
              title="Refresh Data"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <RefreshCw size={15} className={isDiariesLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1.5">
            Site Management &amp; Daily Site Report (DSR)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track and manage Labour Attendance, Material Usage (MR), Heavy Plant Machinery &amp; HSE Incident logs per site.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={openNewDsrModal}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all text-xs sm:text-sm cursor-pointer"
          >
            <Plus size={18} />
            Submit Daily Site Report (DSR)
          </button>
        </div>
      </div>

      {/* Sitewise Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Construction Site Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium">
            <Building size={16} className="text-orange-600 shrink-0" />
            <span className="font-bold text-slate-700">Project / Site:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Construction Sites ({projects.length})</option>
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name || p.title} ({p.code || p.location || 'Site'})
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs">
            <Calendar size={15} className="text-slate-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today Only</option>
              <option value="WEEK">Past 7 Days</option>
              <option value="MONTH">Past 30 Days</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by supervisor, work summary, weather..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Selected Project Quick Badge */}
        {currentProjectObj && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 px-3.5 py-2 rounded-xl text-xs">
            <div className="font-bold text-orange-900">
              {currentProjectObj.name || currentProjectObj.title}
            </div>
            <span className="text-[10px] bg-orange-600 text-white font-bold px-2 py-0.5 rounded-md">
              {currentProjectObj.code || 'ACTIVE'}
            </span>
            <span className="text-slate-600 hidden sm:inline">
              Location: <b>{currentProjectObj.location || 'Site'}</b>
            </span>
          </div>
        )}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>DSR Reports Logged</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{filteredDiaries.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {selectedProjectId === 'ALL' ? 'Across all sites' : 'For selected site'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Workers on Site Today</span>
            <HardHat size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{totalWorkersToday}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active report skilled &amp; helpers</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Machinery Hours</span>
            <Truck size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">{totalMachineryHours} hrs</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Excavator &amp; heavy plant logged</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Zero Accident Days</span>
            <ShieldAlert size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {zeroIncidentCount} / {diaries.length || 1}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">100% Safety compliance</div>
        </div>
      </div>

      {/* Main Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs sm:text-sm font-bold overflow-x-auto pb-0.5">
        {[
          { id: 'dsr', label: `Daily Site Diary (${filteredDiaries.length})`, icon: ClipboardList },
          { id: 'labour', label: 'Labour Attendance', icon: HardHat },
          { id: 'mr', label: 'Material Requisitions (MR)', icon: Layers },
          { id: 'machinery', label: 'Machinery & Heavy Plant', icon: Truck },
          { id: 'hse', label: 'HSE Safety & Quality', icon: ShieldAlert },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeSubView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubView(tab.id)}
              className={`flex items-center gap-1.5 pb-3 px-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TabIcon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUBVIEW 1: DAILY SITE DIARY (DSR) MASTER VIEW                 */}
      {/* ------------------------------------------------------------- */}
      {activeSubView === 'dsr' && (
        <div className="space-y-6">
          {isDiariesLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <RefreshCw size={28} className="animate-spin mx-auto text-orange-600" />
              <p className="text-sm font-medium">Loading Daily Site Reports from database...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2 Cols): Active DSR Comprehensive Inspector */}
              <div className="lg:col-span-2 space-y-6">
                {activeDiary ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                    {/* Header Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {activeDiary.project?.code || 'SITE'}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {activeDiary.project?.name || activeDiary.project?.title || 'Site Project'}
                          </span>
                        </div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mt-1">
                          <ClipboardList size={20} className="text-orange-600" />
                          Daily Progress Log — {new Date(activeDiary.date || activeDiary.createdAt).toLocaleDateString()}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                          <Sun size={13} className="text-amber-500" /> {activeDiary.weather || 'Sunny'}
                        </span>

                        <button
                          onClick={() => openEditDsrModal(activeDiary)}
                          title="Edit Entire Daily Site Report"
                          className="flex items-center gap-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          <Edit2 size={13} /> Edit DSR
                        </button>

                        <button
                          onClick={(e) => handleDeleteDiary(activeDiary, e)}
                          title="Delete Daily Site Report"
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Section 1: Work Completed Summary */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                          <Activity size={14} className="text-orange-600" />
                          Daily Work Progress &amp; Tasks Completed:
                        </label>
                      </div>
                      <div className="text-xs sm:text-sm bg-slate-50/80 p-4 rounded-xl text-slate-800 leading-relaxed border border-slate-200">
                        {activeDiary.workCompletedSummary || 'No detailed summary provided.'}
                      </div>
                    </div>

                    {/* Section 2: Labour Attendance Breakdown */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                          <HardHat size={15} className="text-amber-600" /> Labour Attendance Breakdown
                        </h3>
                        <button
                          onClick={() => openEditLabourModal(activeDiary)}
                          className="text-xs text-orange-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={12} /> Manage Labour
                        </button>
                      </div>

                      {activeDiary.labourAttendance && activeDiary.labourAttendance.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {activeDiary.labourAttendance.map((a, i) => (
                            <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center space-y-0.5">
                              <div className="text-xl font-black text-orange-600">{a.count}</div>
                              <div className="text-xs font-bold text-slate-800">{a.workerType}</div>
                              <div className="text-[10px] text-slate-500">
                                {a.regularHours || 8}h Reg {a.otHours ? `+ ${a.otHours}h OT` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-200">
                          No labour recorded for this date.
                        </div>
                      )}
                    </div>

                    {/* Section 3: Materials Used & Requisitions */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                          <Layers size={15} className="text-blue-600" /> Materials Used &amp; Requisitions (MR)
                        </h3>
                        <button
                          onClick={() => openEditMaterialModal(activeDiary)}
                          className="text-xs text-orange-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={12} /> Manage Materials
                        </button>
                      </div>

                      {activeDiary.materialUsage && activeDiary.materialUsage.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {activeDiary.materialUsage.map((m, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800">{m.materialName || m.itemName}</span>
                              <span className="font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                                {m.quantityUsed || m.quantity} {m.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl border border-slate-200">
                          No material consumption logged yet.
                        </div>
                      )}
                    </div>

                    {/* Section 4: Machinery & Heavy Plant */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                          <Truck size={15} className="text-purple-600" /> Machinery &amp; Plant Operating Hours
                        </h3>
                        <button
                          onClick={() => openEditMachineryModal(activeDiary)}
                          className="text-xs text-orange-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={12} /> Manage Plant
                        </button>
                      </div>

                      {activeDiary.machineryUsage && activeDiary.machineryUsage.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {activeDiary.machineryUsage.map((mc, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center text-xs">
                              <div>
                                <span className="font-bold text-slate-800 block">{mc.machineName}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Fuel size={11} className="text-amber-500" /> Fuel: {mc.fuelConsumedLiters || 0} L
                                </span>
                              </div>
                              <span className="font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                                {mc.hoursWorked} hrs
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl border border-slate-200">
                          No machinery or equipment logged for this date.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                    <FileText size={40} className="text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">No Daily Site Reports Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      There are no DSR reports matching the current filter selection. Click below to submit a new Daily Site Report.
                    </p>
                    <button
                      onClick={openNewDsrModal}
                      className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm"
                    >
                      <Plus size={16} /> Submit Daily Site Report
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Sitewise Saved DSR List & Safety Summary */}
              <div className="space-y-6">
                {/* HSE Incident Box */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldAlert size={18} className="text-emerald-600" />
                      HSE Safety Incident Log
                    </h3>
                    {activeDiary && (
                      <button
                        onClick={() => openEditHseModal(activeDiary)}
                        className="text-xs text-orange-600 hover:underline font-bold cursor-pointer"
                      >
                        Edit Safety Log
                      </button>
                    )}
                  </div>

                  {activeDiary?.hseIncidents && activeDiary.hseIncidents.length > 0 ? (
                    <div className="space-y-2">
                      {activeDiary.hseIncidents.map((h, hIdx) => (
                        <div key={hIdx} className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-amber-800">
                            <AlertTriangle size={15} /> Incident: {h.severity}
                          </div>
                          <p className="text-slate-700">{h.description}</p>
                          {h.actionTaken && (
                            <p className="text-[11px] text-slate-500 italic">Action Taken: {h.actionTaken}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 size={16} /> Zero Incidents Reported
                      </div>
                      <p className="text-slate-600 text-[11px]">100% PPE compliance verified on site.</p>
                    </div>
                  )}
                </div>

                {/* History List of DSR Reports */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Calendar size={16} className="text-orange-600" />
                      Saved Reports ({filteredDiaries.length})
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Click to Inspect</span>
                  </div>

                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {filteredDiaries.length > 0 ? (
                      filteredDiaries.map((diary) => {
                        const isSelected = activeDiary?._id === diary._id;
                        return (
                          <div
                            key={diary._id}
                            onClick={() => setSelectedDiary(diary)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-orange-50 border-orange-400 shadow-xs ring-1 ring-orange-400'
                                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span className="flex items-center gap-1">
                                <Calendar size={13} className="text-orange-600" />
                                {new Date(diary.date || diary.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-bold">
                                  {diary.weather || 'Sunny'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDsrModal(diary);
                                  }}
                                  title="Edit Report"
                                  className="p-1 hover:bg-orange-200 text-slate-500 hover:text-orange-700 rounded transition"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteDiary(diary, e)}
                                  title="Delete Report"
                                  className="p-1 hover:bg-rose-200 text-slate-500 hover:text-rose-700 rounded transition"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            <div className="text-[11px] font-bold text-orange-600 mt-1 truncate">
                              {diary.project?.name || diary.project?.title || 'Site Project'}
                            </div>

                            <div className="text-[11px] text-slate-600 mt-1 line-clamp-1 italic">
                              "{diary.workCompletedSummary}"
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-slate-400 text-center py-6">
                        No saved reports for this filter.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBVIEW 2: LABOUR ATTENDANCE TRACKING                         */}
      {/* ------------------------------------------------------------- */}
      {activeSubView === 'labour' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <HardHat size={20} className="text-amber-600" />
                Labour Attendance Tracking (Sitewise)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeDiary
                  ? `Showing records for: ${activeDiary.project?.name || 'Active Site'} (${new Date(activeDiary.date || activeDiary.createdAt).toLocaleDateString()})`
                  : 'Manage skilled trades and helper check-in shifts.'}
              </p>
            </div>
            {activeDiary && (
              <button
                onClick={() => openEditLabourModal(activeDiary)}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs text-xs cursor-pointer transition-all"
              >
                <Plus size={14} /> Add / Update Labour Attendance
              </button>
            )}
          </div>

          {activeDiary?.labourAttendance && activeDiary.labourAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-3 px-3">Trade / Worker Category</th>
                    <th className="py-3 px-3 text-center">Head Count</th>
                    <th className="py-3 px-3 text-center">Regular Hours</th>
                    <th className="py-3 px-3 text-center">Overtime Hours</th>
                    <th className="py-3 px-3 text-right">Total Man Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeDiary.labourAttendance.map((item, idx) => {
                    const totalHours = (Number(item.count) || 0) * ((Number(item.regularHours) || 8) + (Number(item.otHours) || 0));
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-800">{item.workerType}</td>
                        <td className="py-3 px-3 text-center font-black text-orange-600 text-sm">{item.count}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{item.regularHours || 8} hrs</td>
                        <td className="py-3 px-3 text-center text-slate-600 font-bold text-amber-600">+{item.otHours || 0} hrs</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">{totalHours} hrs</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <p>No labour records logged for this site report.</p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBVIEW 3: MATERIAL REQUISITIONS & USAGE                      */}
      {/* ------------------------------------------------------------- */}
      {activeSubView === 'mr' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers size={20} className="text-blue-600" />
                Material Requisitions &amp; Site Consumption (MR)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeDiary
                  ? `Showing materials consumed on site: ${activeDiary.project?.name || 'Active Site'} (${new Date(activeDiary.date || activeDiary.createdAt).toLocaleDateString()})`
                  : 'Track cement, steel, sand, tiles, and consumables used.'}
              </p>
            </div>
            {activeDiary && (
              <button
                onClick={() => openEditMaterialModal(activeDiary)}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs text-xs cursor-pointer transition-all"
              >
                <Plus size={14} /> Add / Update Material Requisition
              </button>
            )}
          </div>

          {activeDiary?.materialUsage && activeDiary.materialUsage.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-3 px-3">Material Description</th>
                    <th className="py-3 px-3 text-center">Unit</th>
                    <th className="py-3 px-3 text-right">Quantity Consumed</th>
                    <th className="py-3 px-3 text-center">Inventory Deduction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeDiary.materialUsage.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-bold text-slate-800">{m.materialName || m.itemName}</td>
                      <td className="py-3 px-3 text-center text-slate-500 font-semibold">{m.unit}</td>
                      <td className="py-3 px-3 text-right font-black text-orange-600 text-sm">
                        {m.quantityUsed || m.quantity} {m.unit}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <Check size={11} /> Auto-Deducted
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <p>No material requisitions logged for this site report.</p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBVIEW 4: MACHINERY & HEAVY PLANT TRACKING                   */}
      {/* ------------------------------------------------------------- */}
      {activeSubView === 'machinery' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Truck size={20} className="text-purple-600" />
                Machinery &amp; Heavy Plant Operating Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeDiary
                  ? `Showing equipment operating hours: ${activeDiary.project?.name || 'Active Site'} (${new Date(activeDiary.date || activeDiary.createdAt).toLocaleDateString()})`
                  : 'Track excavators, mixers, tippers, generators, and poker vibrators.'}
              </p>
            </div>
            {activeDiary && (
              <button
                onClick={() => openEditMachineryModal(activeDiary)}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs text-xs cursor-pointer transition-all"
              >
                <Plus size={14} /> Add / Update Machinery Log
              </button>
            )}
          </div>

          {activeDiary?.machineryUsage && activeDiary.machineryUsage.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-3 px-3">Equipment / Machine Name</th>
                    <th className="py-3 px-3 text-center">Operating Hours</th>
                    <th className="py-3 px-3 text-right">Fuel Consumed (Liters)</th>
                    <th className="py-3 px-3 text-center">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeDiary.machineryUsage.map((mc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-bold text-slate-800">{mc.machineName}</td>
                      <td className="py-3 px-3 text-center font-black text-purple-600 text-sm">{mc.hoursWorked} hrs</td>
                      <td className="py-3 px-3 text-right font-bold text-amber-600">{mc.fuelConsumedLiters || 0} L</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <Check size={11} /> Running
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <p>No machinery logs recorded for this site report.</p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBVIEW 5: HSE SAFETY INCIDENTS & QUALITY                     */}
      {/* ------------------------------------------------------------- */}
      {activeSubView === 'hse' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert size={20} className="text-emerald-600" />
                HSE Safety &amp; Incident Log (Sitewise)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record Near Misses, Minor First Aid, and Site Safety Audits.
              </p>
            </div>
            {activeDiary && (
              <button
                onClick={() => openEditHseModal(activeDiary)}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs text-xs cursor-pointer transition-all"
              >
                <Plus size={14} /> Add / Update HSE Incident
              </button>
            )}
          </div>

          {activeDiary?.hseIncidents && activeDiary.hseIncidents.length > 0 ? (
            <div className="space-y-3">
              {activeDiary.hseIncidents.map((h, idx) => (
                <div key={idx} className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-800 flex items-center gap-1.5 text-sm">
                      <AlertTriangle size={16} /> Severity: {h.severity}
                    </span>
                    <span className="text-[10px] font-bold uppercase bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                      Incident #{idx + 1}
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium">{h.description}</p>
                  {h.actionTaken && (
                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-amber-100">
                      <b>Corrective Action:</b> {h.actionTaken}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-center space-y-2">
              <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
              <h3 className="text-sm font-black text-emerald-900">Zero Critical Safety Incidents Reported</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Daily toolbox talk and standard safety protocols are in place for this construction site.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: MASTER DSR MODAL (CREATE & FULL EDIT)               */}
      {/* ------------------------------------------------------------- */}
      {showDsrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingDiaryId ? 'Edit Daily Site Report (DSR)' : 'Submit Daily Site Report (DSR)'}
              </h3>
              <button
                onClick={() => {
                  setShowDsrModal(false);
                  setEditingDiaryId(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDsrSubmit} className="space-y-4 text-xs">
              {/* Site and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Construction Site / Project *</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    value={dsrForm.project}
                    onChange={(e) => setDsrForm({ ...dsrForm, project: e.target.value })}
                  >
                    {projects.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.name || p.title} ({p.code || p.location || 'Site'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Report Date *</label>
                  <input
                    type="date"
                    required
                    value={dsrForm.date}
                    onChange={(e) => setDsrForm({ ...dsrForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Weather Condition */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Site Weather Condition</label>
                <select
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-semibold"
                  value={dsrForm.weather}
                  onChange={(e) => setDsrForm({ ...dsrForm, weather: e.target.value })}
                >
                  <option value="Sunny">Sunny (Fine Weather)</option>
                  <option value="Cloudy">Cloudy</option>
                  <option value="Rainy">Rainy (Site Disruption)</option>
                  <option value="Stormy">Stormy</option>
                </select>
              </div>

              {/* Work Completed Summary */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Daily Work Completed Summary *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe shuttering, concrete pouring, rebar fabrication, brick masonry completed today..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none leading-relaxed"
                  value={dsrForm.workCompletedSummary}
                  onChange={(e) => setDsrForm({ ...dsrForm, workCompletedSummary: e.target.value })}
                />
              </div>

              {/* Dynamic Labour Attendance in Master Form */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <HardHat size={15} className="text-amber-600" /> Labour Attendance (Headcount &amp; OT)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDsrForm({
                        ...dsrForm,
                        labourAttendance: [
                          ...dsrForm.labourAttendance,
                          { workerType: 'Mason', count: 2, regularHours: 8, otHours: 0 },
                        ],
                      })
                    }
                    className="text-orange-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Plus size={12} /> Add Trade Row
                  </button>
                </div>

                <div className="space-y-2">
                  {dsrForm.labourAttendance.map((l, lIdx) => (
                    <div key={lIdx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                      <select
                        className="bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-semibold flex-1"
                        value={l.workerType}
                        onChange={(e) => {
                          const updated = [...dsrForm.labourAttendance];
                          updated[lIdx].workerType = e.target.value;
                          setDsrForm({ ...dsrForm, labourAttendance: updated });
                        }}
                      >
                        {WORKER_TYPES.map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="Count"
                        title="Headcount"
                        className="w-16 bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-center"
                        value={l.count}
                        onChange={(e) => {
                          const updated = [...dsrForm.labourAttendance];
                          updated[lIdx].count = Number(e.target.value);
                          setDsrForm({ ...dsrForm, labourAttendance: updated });
                        }}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="OT"
                        title="OT Hours"
                        className="w-16 bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-center"
                        value={l.otHours}
                        onChange={(e) => {
                          const updated = [...dsrForm.labourAttendance];
                          updated[lIdx].otHours = Number(e.target.value);
                          setDsrForm({ ...dsrForm, labourAttendance: updated });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = dsrForm.labourAttendance.filter((_, idx) => idx !== lIdx);
                          setDsrForm({ ...dsrForm, labourAttendance: updated });
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDsrModal(false);
                    setEditingDiaryId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDiaryMutation.isPending || updateDiaryMutation.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                >
                  {createDiaryMutation.isPending || updateDiaryMutation.isPending
                    ? 'Saving...'
                    : editingDiaryId
                    ? 'Update Daily Report'
                    : 'Submit Daily Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: EDIT LABOUR MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      {showLabourModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <HardHat size={18} className="text-amber-600" />
                Manage Labour Attendance
              </h3>
              <button onClick={() => setShowLabourModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              {labourRows.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <select
                    className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold flex-1"
                    value={r.workerType}
                    onChange={(e) => {
                      const updated = [...labourRows];
                      updated[idx].workerType = e.target.value;
                      setLabourRows(updated);
                    }}
                  >
                    {WORKER_TYPES.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    placeholder="Count"
                    className="w-20 bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-center"
                    value={r.count}
                    onChange={(e) => {
                      const updated = [...labourRows];
                      updated[idx].count = Number(e.target.value);
                      setLabourRows(updated);
                    }}
                  />

                  <input
                    type="number"
                    min="0"
                    placeholder="OT Hrs"
                    className="w-20 bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-center"
                    value={r.otHours}
                    onChange={(e) => {
                      const updated = [...labourRows];
                      updated[idx].otHours = Number(e.target.value);
                      setLabourRows(updated);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setLabourRows(labourRows.filter((_, i) => i !== idx))}
                    className="p-1 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setLabourRows([...labourRows, { workerType: 'Mason', count: 2, regularHours: 8, otHours: 0 }])
                }
                className="w-full py-2 bg-orange-50 border border-orange-200 text-orange-600 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add Worker Category
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLabourModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLabourModal}
                disabled={updateDiaryMutation.isPending}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm cursor-pointer text-xs"
              >
                {updateDiaryMutation.isPending ? 'Saving...' : 'Save Labour Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: EDIT MATERIAL REQUISITIONS MODAL                    */}
      {/* ------------------------------------------------------------- */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-blue-600" />
                Manage Material Requisitions &amp; Usage
              </h3>
              <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              {materialRows.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Material Name (e.g. 16mm Tor Steel)"
                    className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold flex-1"
                    value={m.materialName}
                    onChange={(e) => {
                      const updated = [...materialRows];
                      updated[idx].materialName = e.target.value;
                      setMaterialRows(updated);
                    }}
                  />

                  <input
                    type="number"
                    min="0"
                    placeholder="Quantity"
                    className="w-20 bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-center"
                    value={m.quantityUsed}
                    onChange={(e) => {
                      const updated = [...materialRows];
                      updated[idx].quantityUsed = Number(e.target.value);
                      setMaterialRows(updated);
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Unit"
                    className="w-16 bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-center"
                    value={m.unit}
                    onChange={(e) => {
                      const updated = [...materialRows];
                      updated[idx].unit = e.target.value;
                      setMaterialRows(updated);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setMaterialRows(materialRows.filter((_, i) => i !== idx))}
                    className="p-1 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setMaterialRows([...materialRows, { materialName: '', quantityUsed: 10, unit: 'Bags' }])
                }
                className="w-full py-2 bg-blue-50 border border-blue-200 text-blue-600 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add Material Row
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMaterialModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveMaterialModal}
                disabled={updateDiaryMutation.isPending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm cursor-pointer text-xs"
              >
                {updateDiaryMutation.isPending ? 'Saving...' : 'Save Materials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: EDIT MACHINERY MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      {showMachineryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Truck size={18} className="text-purple-600" />
                Manage Machinery &amp; Plant Logs
              </h3>
              <button onClick={() => setShowMachineryModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              {machineryRows.map((mc, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Machine Name (e.g. JCB Excavator)"
                    className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold flex-1"
                    value={mc.machineName}
                    onChange={(e) => {
                      const updated = [...machineryRows];
                      updated[idx].machineName = e.target.value;
                      setMachineryRows(updated);
                    }}
                  />

                  <input
                    type="number"
                    min="0"
                    placeholder="Hours"
                    className="w-20 bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-center"
                    value={mc.hoursWorked}
                    onChange={(e) => {
                      const updated = [...machineryRows];
                      updated[idx].hoursWorked = Number(e.target.value);
                      setMachineryRows(updated);
                    }}
                  />

                  <input
                    type="number"
                    min="0"
                    placeholder="Fuel (L)"
                    className="w-20 bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-center"
                    value={mc.fuelConsumedLiters}
                    onChange={(e) => {
                      const updated = [...machineryRows];
                      updated[idx].fuelConsumedLiters = Number(e.target.value);
                      setMachineryRows(updated);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setMachineryRows(machineryRows.filter((_, i) => i !== idx))}
                    className="p-1 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setMachineryRows([...machineryRows, { machineName: '', hoursWorked: 4, fuelConsumedLiters: 10 }])
                }
                className="w-full py-2 bg-purple-50 border border-purple-200 text-purple-600 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add Machinery Row
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMachineryModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveMachineryModal}
                disabled={updateDiaryMutation.isPending}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-sm cursor-pointer text-xs"
              >
                {updateDiaryMutation.isPending ? 'Saving...' : 'Save Machinery Logs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: EDIT HSE SAFETY MODAL                                */}
      {/* ------------------------------------------------------------- */}
      {showHseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert size={18} className="text-emerald-600" />
                Manage HSE Safety &amp; Incident Logs
              </h3>
              <button onClick={() => setShowHseModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              {hseRows.map((h, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Severity:</span>
                    <select
                      className="bg-white border border-slate-300 rounded-lg p-1 text-xs font-bold text-slate-800"
                      value={h.severity}
                      onChange={(e) => {
                        const updated = [...hseRows];
                        updated[idx].severity = e.target.value;
                        setHseRows(updated);
                      }}
                    >
                      {HSE_SEVERITIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Describe what occurred (e.g. Scaffolding plank slipped, no injuries)..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                    value={h.description}
                    onChange={(e) => {
                      const updated = [...hseRows];
                      updated[idx].description = e.target.value;
                      setHseRows(updated);
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Corrective Action Taken..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                    value={h.actionTaken}
                    onChange={(e) => {
                      const updated = [...hseRows];
                      updated[idx].actionTaken = e.target.value;
                      setHseRows(updated);
                    }}
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setHseRows(hseRows.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                    >
                      Remove Incident
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setHseRows([...hseRows, { severity: 'Near Miss', description: '', actionTaken: '' }])
                }
                className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add New Safety Incident
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHseModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveHseModal}
                disabled={updateDiaryMutation.isPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm cursor-pointer text-xs"
              >
                {updateDiaryMutation.isPending ? 'Saving...' : 'Save HSE Incidents'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


