import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Calendar,
  CheckSquare,
  Camera,
  FileCheck,
  Plus,
  X,
  ArrowRight,
  Filter,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Edit,
  DollarSign,
} from 'lucide-react';
import { PROJECT_SERVICE_TYPES, PROJECT_TRACKING_CATEGORIES } from '../constants/masterCategories';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const DEFAULT_BOQ_ITEMS = [
  {
    code: 'DIV-03-01',
    division: 'Earthworks & Excavation',
    item: 'Site clearing, topsoil stripping & foundation trench excavation',
    unit: 'm3',
    qty: 450,
    rate: 3500,
    amount: 1575000,
  },
  {
    code: 'DIV-04-02',
    division: 'Concrete & Formwork',
    item: 'Grade 30 ReadyMix Concrete for Columns & Beams including shuttering',
    unit: 'm3',
    qty: 180,
    rate: 48000,
    amount: 8640000,
  },
  {
    code: 'DIV-05-01',
    division: 'Reinforcement Steel',
    item: 'High yield Tor Steel (12mm & 16mm TMT) cut, bend & place',
    unit: 'kg',
    qty: 12500,
    rate: 340,
    amount: 4250000,
  },
  {
    code: 'DIV-08-03',
    division: 'Masonry & Wall Construction',
    item: '9 inch thick wire cut brickwork masonry in cement mortar 1:5',
    unit: 'sqft',
    qty: 6200,
    rate: 420,
    amount: 2604000,
  },
  {
    code: 'DIV-12-01',
    division: 'Finishes & Tiling',
    item: '600x600mm homogeneous porcelain floor tiling for main hall & corridors',
    unit: 'sqft',
    qty: 3400,
    rate: 650,
    amount: 2210000,
  },
];

const DEFAULT_MILESTONES = [
  {
    id: 'm1',
    phase: 'Phase 01: Earthwork & Site Excavation (DIV-03)',
    start: 'Month 01',
    end: 'Month 02',
    progress: 100,
    status: 'Completed',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'm2',
    phase: 'Phase 02: Column Footings & Substructure Concrete (DIV-04)',
    start: 'Month 02',
    end: 'Month 04',
    progress: 90,
    status: 'Active',
    color: 'from-orange-500 to-amber-500',
  },
  {
    id: 'm3',
    phase: 'Phase 03: Superstructure Frame & Tor Steel (DIV-05)',
    start: 'Month 04',
    end: 'Month 07',
    progress: 45,
    status: 'In Progress',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'm4',
    phase: 'Phase 04: Brickwork & MEP Electrical Fit-out (DIV-08)',
    start: 'Month 07',
    end: 'Month 09',
    progress: 10,
    status: 'Upcoming',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'm5',
    phase: 'Phase 05: Plastering, Porcelain Tiling & Handover (DIV-12)',
    start: 'Month 09',
    end: 'Month 12',
    progress: 0,
    status: 'Scheduled',
    color: 'from-slate-400 to-slate-500',
  },
];

const DEFAULT_SNAGS = [
  {
    id: 's1',
    code: 'SNAG-001',
    title: 'Plaster Hairline Crack near Living Room Column',
    location: '1st Floor - Living Area',
    division: 'Masonry & Plastering',
    severity: 'Minor',
    assignedTo: 'Nimal Perera (Supervisor)',
    status: 'In Progress',
    dateReported: '2026-08-05',
  },
  {
    id: 's2',
    code: 'SNAG-002',
    title: 'Porcelain Tile Hollow Sound under Master Bedroom',
    location: '2nd Floor - Bed 01',
    division: 'Finishes & Tiling',
    severity: 'Major',
    assignedTo: 'Saman Silva (Tiling Sub-contractor)',
    status: 'Open',
    dateReported: '2026-08-08',
  },
  {
    id: 's3',
    code: 'SNAG-003',
    title: 'Water Seepage Sealant Test in Ground Floor Sump',
    location: 'Basement Sump Tank',
    division: 'Waterproofing & Concrete',
    severity: 'Critical',
    assignedTo: 'Kamal Jayasinghe (Site Engineer)',
    status: 'Open',
    dateReported: '2026-08-10',
  },
  {
    id: 's4',
    code: 'SNAG-004',
    title: 'Conduit Fitting Flush Box Alignment Correction',
    location: 'Kitchen Island',
    division: 'MEP Electrical',
    severity: 'Minor',
    assignedTo: 'Sunil Cooray (Electrician)',
    status: 'Resolved',
    dateReported: '2026-08-01',
  },
];

export default function ProjectsView() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('boq');

  // Modal States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showSnagModal, setShowSnagModal] = useState(false);
  const [showAddBOQModal, setShowAddBOQModal] = useState(false);

  // Edit State
  const [editingBOQCode, setEditingBOQCode] = useState(null);

  // Query BOQ Items from Server
  const { data: boqData } = useQuery({
    queryKey: ['boqs'],
    queryFn: () => api.get('/boqs').then((r) => r.data),
  });

  // Local fallback storage for BOQ items
  const [localBoqList, setLocalBoqList] = useState(() => {
    try {
      const saved = localStorage.getItem('app_boq_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_BOQ_ITEMS;
  });

  // Sync server items to local storage when available
  useEffect(() => {
    if (boqData?.items && Array.isArray(boqData.items) && boqData.items.length > 0) {
      setLocalBoqList(boqData.items);
      localStorage.setItem('app_boq_items', JSON.stringify(boqData.items));
    }
  }, [boqData]);

  const boqList = useMemo(() => {
    if (boqData?.items && Array.isArray(boqData.items) && boqData.items.length > 0) {
      return boqData.items;
    }
    return localBoqList;
  }, [boqData, localBoqList]);

  // Project Form State
  const [projectForm, setProjectForm] = useState({
    title: '',
    serviceType: 'Residential Construction',
    contractValue: '',
    location: '',
    sqftArea: '',
    cubicFeetArea: '',
    boqReferenceCode: '',
    description: '',
  });

  // BOQ Item Form State
  const [boqForm, setBoqForm] = useState({
    code: '',
    division: 'Earthworks & Excavation',
    item: '',
    unit: 'sqft',
    qty: 0,
    rate: 0,
  });

  // Milestones (Gantt) State
  const [milestones, setMilestones] = useState(() => {
    try {
      const saved = localStorage.getItem('app_project_milestones');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_MILESTONES;
  });

  useEffect(() => {
    localStorage.setItem('app_project_milestones', JSON.stringify(milestones));
  }, [milestones]);

  const [milestoneForm, setMilestoneForm] = useState({
    phase: '',
    start: 'Month 01',
    end: 'Month 03',
    progress: 0,
    status: 'Scheduled',
    color: 'from-orange-500 to-amber-500',
  });

  // Snag List & Quality Inspection State
  const [snagList, setSnagList] = useState(() => {
    try {
      const saved = localStorage.getItem('app_project_snags');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SNAGS;
  });

  useEffect(() => {
    localStorage.setItem('app_project_snags', JSON.stringify(snagList));
  }, [snagList]);

  const [snagForm, setSnagForm] = useState({
    title: '',
    location: '',
    division: 'Finishes & Tiling',
    severity: 'Major',
    assignedTo: '',
    status: 'Open',
  });

  const [snagStatusFilter, setSnagStatusFilter] = useState('All');
  const [snagSeverityFilter, setSnagSeverityFilter] = useState('All');

  // Dynamic BOQ Total Calculation
  const totalBOQValue = boqList.reduce((acc, item) => acc + item.amount, 0);

  // Create Project Mutation
  const createProjectMut = useMutation({
    mutationFn: (payload) => api.post('/projects', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-projects'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`Project "${projectForm.title}" created from BOQ standard!`);
      setShowProjectModal(false);
      setProjectForm({
        title: '',
        serviceType: 'Residential Construction',
        contractValue: '',
        location: '',
        sqftArea: '',
        cubicFeetArea: '',
        boqReferenceCode: '',
        description: '',
      });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create project');
    },
  });

  // BOQ Item Mutations
  const addBoqItemMut = useMutation({
    mutationFn: (itemPayload) => api.post('/boqs/items', itemPayload).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['boqs'] });
      toast.success(res.message || 'BOQ Item added successfully!');
      setShowAddBOQModal(false);
      setBoqForm({
        code: '',
        division: 'Earthworks & Excavation',
        item: '',
        unit: 'sqft',
        qty: 0,
        rate: 0,
      });
    },
    onError: () => {
      const amt = Number(boqForm.qty || 0) * Number(boqForm.rate || 0);
      const updatedCode = boqForm.code.toUpperCase().trim();
      const newItem = {
        code: updatedCode,
        division: boqForm.division,
        item: boqForm.item.trim(),
        unit: boqForm.unit,
        qty: Number(boqForm.qty || 0),
        rate: Number(boqForm.rate || 0),
        amount: amt,
      };
      const updatedList = [...boqList, newItem];
      setLocalBoqList(updatedList);
      localStorage.setItem('app_boq_items', JSON.stringify(updatedList));
      qc.setQueryData(['boqs'], { success: true, items: updatedList });
      toast.success(`BOQ Item "${newItem.code}" added to breakdown!`);
      setShowAddBOQModal(false);
      setBoqForm({
        code: '',
        division: 'Earthworks & Excavation',
        item: '',
        unit: 'sqft',
        qty: 0,
        rate: 0,
      });
    }
  });

  const updateBoqItemMut = useMutation({
    mutationFn: ({ codeOrId, data }) => api.put(`/boqs/items/${encodeURIComponent(codeOrId)}`, data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['boqs'] });
      toast.success(res.message || 'BOQ Item updated successfully!');
      setShowAddBOQModal(false);
      setEditingBOQCode(null);
      setBoqForm({
        code: '',
        division: 'Earthworks & Excavation',
        item: '',
        unit: 'sqft',
        qty: 0,
        rate: 0,
      });
    },
    onError: () => {
      const amt = Number(boqForm.qty || 0) * Number(boqForm.rate || 0);
      const updatedCode = boqForm.code.toUpperCase().trim();
      const updatedList = boqList.map((item) =>
        (item.code === editingBOQCode || item._id === editingBOQCode)
          ? {
              ...item,
              code: updatedCode,
              division: boqForm.division,
              item: boqForm.item.trim(),
              unit: boqForm.unit,
              qty: Number(boqForm.qty || 0),
              rate: Number(boqForm.rate || 0),
              amount: amt,
            }
          : item
      );
      setLocalBoqList(updatedList);
      localStorage.setItem('app_boq_items', JSON.stringify(updatedList));
      qc.setQueryData(['boqs'], { success: true, items: updatedList });
      toast.success(`BOQ Item "${updatedCode}" updated!`);
      setShowAddBOQModal(false);
      setEditingBOQCode(null);
      setBoqForm({
        code: '',
        division: 'Earthworks & Excavation',
        item: '',
        unit: 'sqft',
        qty: 0,
        rate: 0,
      });
    }
  });

  const deleteBoqItemMut = useMutation({
    mutationFn: (codeOrId) => api.delete(`/boqs/items/${encodeURIComponent(codeOrId)}`).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['boqs'] });
      toast.success(res.message || 'BOQ Item removed.');
    },
    onError: (err, codeOrId) => {
      const updatedList = boqList.filter((item) => item.code !== codeOrId && item._id !== codeOrId);
      setLocalBoqList(updatedList);
      localStorage.setItem('app_boq_items', JSON.stringify(updatedList));
      qc.setQueryData(['boqs'], { success: true, items: updatedList });
      toast.success(`BOQ Item removed from breakdown.`);
    }
  });

  // Proceed / Action from BOQ item detail
  const handleProceedFromBOQItem = (boqItem) => {
    setProjectForm({
      title: `${boqItem.division} Project (${boqItem.code})`,
      serviceType: 'Residential Construction',
      contractValue: boqItem.amount,
      location: 'Site Site-01',
      sqftArea: boqItem.unit === 'sqft' ? boqItem.qty : '',
      cubicFeetArea: boqItem.unit === 'm3' || boqItem.unit === 'ft3' ? boqItem.qty : '',
      boqReferenceCode: boqItem.code,
      description: `Based on SLS 573 BOQ Breakdown (${boqItem.code}): ${boqItem.item}`,
    });
    setShowProjectModal(true);
  };

  // Edit BOQ Item
  const handleEditBOQItem = (item) => {
    setEditingBOQCode(item._id || item.code);
    setBoqForm({
      code: item.code || item.itemCode || '',
      division: item.division || item.billNo || 'Earthworks & Excavation',
      item: item.item || item.description || '',
      unit: item.unit || 'sqft',
      qty: item.qty ?? item.estimatedQty ?? 0,
      rate: item.rate ?? item.unitRate ?? 0,
    });
    setShowAddBOQModal(true);
  };

  // Delete BOQ Item
  const handleDeleteBOQItem = (itemOrCode) => {
    const target = itemOrCode?._id || itemOrCode?.code || itemOrCode;
    deleteBoqItemMut.mutate(target);
  };

  // Submit Project Form
  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!projectForm.title.trim()) {
      toast.error('Please enter project title!');
      return;
    }
    const val = Number(projectForm.contractValue || 0);
    const payload = {
      title: projectForm.title.trim(),
      name: projectForm.title.trim(),
      serviceType: projectForm.serviceType || 'Residential Construction',
      status: 'planning',
      priority: 'medium',
      budget: val,
      contractValue: val,
      estimatedCost: val,
      location: projectForm.location || 'Site',
      sqftArea: Number(projectForm.sqftArea || 0),
      cubicFeetArea: Number(projectForm.cubicFeetArea || 0),
      progress: 0,
      description: projectForm.description || `BOQ Estimate project — ${projectForm.serviceType}`,
    };
    createProjectMut.mutate(payload);
  };

  // Add / Edit BOQ Item Form Handler
  const handleAddBOQSubmit = (e) => {
    e.preventDefault();
    if (!boqForm.code || !boqForm.item) {
      toast.error('Please enter BOQ Code and Description.');
      return;
    }
    const amt = Number(boqForm.qty || 0) * Number(boqForm.rate || 0);
    const updatedCode = boqForm.code.toUpperCase().trim();

    if (editingBOQCode) {
      updateBoqItemMut.mutate({
        codeOrId: editingBOQCode,
        data: {
          code: updatedCode,
          division: boqForm.division,
          item: boqForm.item.trim(),
          unit: boqForm.unit,
          qty: Number(boqForm.qty || 0),
          rate: Number(boqForm.rate || 0),
          amount: amt,
        }
      });
    } else {
      addBoqItemMut.mutate({
        code: updatedCode,
        division: boqForm.division,
        item: boqForm.item.trim(),
        unit: boqForm.unit,
        qty: Number(boqForm.qty || 0),
        rate: Number(boqForm.rate || 0),
        amount: amt,
      });
    }
  };

  // Add Milestone Form Handler
  const handleAddMilestoneSubmit = (e) => {
    e.preventDefault();
    if (!milestoneForm.phase) {
      toast.error('Please enter Phase / Milestone name.');
      return;
    }
    const newM = {
      id: `m_${Date.now()}`,
      phase: milestoneForm.phase,
      start: milestoneForm.start,
      end: milestoneForm.end,
      progress: Number(milestoneForm.progress || 0),
      status: milestoneForm.status,
      color: milestoneForm.color,
    };
    setMilestones([...milestones, newM]);
    toast.success('Milestone added to Gantt timeline!');
    setShowMilestoneModal(false);
    setMilestoneForm({
      phase: '',
      start: 'Month 01',
      end: 'Month 03',
      progress: 0,
      status: 'Scheduled',
      color: 'from-orange-500 to-amber-500',
    });
  };

  const handleDeleteMilestone = (id) => {
    setMilestones(milestones.filter((m) => m.id !== id));
    toast.success('Milestone deleted.');
  };

  // Add Snag Item Handler
  const handleAddSnagSubmit = (e) => {
    e.preventDefault();
    if (!snagForm.title || !snagForm.location) {
      toast.error('Please specify Defect Title and Location.');
      return;
    }
    const newSnag = {
      id: `s_${Date.now()}`,
      code: `SNAG-00${snagList.length + 1}`,
      title: snagForm.title,
      location: snagForm.location,
      division: snagForm.division,
      severity: snagForm.severity,
      assignedTo: snagForm.assignedTo || 'Site Supervisor',
      status: snagForm.status,
      dateReported: new Date().toISOString().split('T')[0],
    };
    setSnagList([...snagList, newSnag]);
    toast.success(`Snag item "${newSnag.code}" registered!`);
    setShowSnagModal(false);
    setSnagForm({
      title: '',
      location: '',
      division: 'Finishes & Tiling',
      severity: 'Major',
      assignedTo: '',
      status: 'Open',
    });
  };

  const handleDeleteSnag = (id) => {
    setSnagList(snagList.filter((s) => s.id !== id));
    toast.success('Snag item removed.');
  };

  // Filtered Snag List
  const filteredSnagList = snagList.filter((s) => {
    if (snagStatusFilter !== 'All' && s.status !== snagStatusFilter) return false;
    if (snagSeverityFilter !== 'All' && s.severity !== snagSeverityFilter) return false;
    return true;
  });

  const totalSnags = snagList.length;
  const openSnags = snagList.filter((s) => s.status === 'Open').length;
  const criticalSnags = snagList.filter((s) => s.severity === 'Critical').length;
  const resolvedSnags = snagList.filter((s) => s.status === 'Resolved').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Top Header & Summary Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            SLS 573:1999 Standard BOQ Engine
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">
            Project Management &amp; SLS 573 BOQ Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standard Bill of Quantities, Automated Gantt Timeline &amp; Snag Quality Inspection System
          </p>
        </div>

        {/* Dynamic Total BOQ Display Banner */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-md border border-slate-700">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Total BOQ Contract Value
            </p>
            <h2 className="text-2xl font-black text-emerald-400 mt-0.5">
              LKR {totalBOQValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-[11px] text-slate-300 font-medium">
              {boqList.length} SLS 573 Standard Line Items
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm gap-2">
        <button
          onClick={() => setActiveTab('boq')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'boq'
              ? 'bg-orange-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" /> SLS 573 BOQ Breakdown
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-orange-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" /> Milestone Timeline (Gantt)
        </button>
        <button
          onClick={() => setActiveTab('snag')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'snag'
              ? 'bg-orange-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Snag List &amp; Quality Inspection ({openSnags} Open)
        </button>
      </div>

      {/* --------------------------------------------------------- */}
      {/* TAB 1: SLS 573 BOQ BREAKDOWN */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'boq' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers size={20} className="text-orange-600" />
                SLS 573 Standard Bill of Quantities (BOQ)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click "Proceed to Form" to navigate with item details, or use Edit/Delete to manage line items.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                Total BOQ Value: LKR {totalBOQValue.toLocaleString()}
              </span>
              <button
                onClick={() => {
                  setEditingBOQCode(null);
                  setBoqForm({
                    code: '',
                    division: 'Earthworks & Excavation',
                    item: '',
                    unit: 'sqft',
                    qty: 0,
                    rate: 0,
                  });
                  setShowAddBOQModal(true);
                }}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                <Plus size={16} /> Add BOQ Item
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50">
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">SLS 573 Division</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3 text-right">Unit Rate (LKR)</th>
                  <th className="py-3 px-3 text-right">Total Amount (LKR)</th>
                  <th className="py-3 px-3 text-center">Actions &amp; Navigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boqList.map((item, idx) => (
                  <tr key={item._id || item.code || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs font-black text-orange-600">
                      {item.code || item.itemCode}
                    </td>
                    <td className="py-3 px-3 text-xs font-bold text-slate-800">
                      {item.division || item.billNo}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 max-w-xs">{item.item || item.description}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 font-semibold">{item.unit}</td>
                    <td className="py-3 px-3 text-xs text-right font-medium text-slate-700">
                      {Number(item.qty ?? item.estimatedQty ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-xs text-right font-medium text-slate-700">
                      {Number(item.rate ?? item.unitRate ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-xs text-right font-black text-slate-900 text-sm">
                      {Number(item.amount ?? item.totalAmount ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleProceedFromBOQItem(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                          title="Proceed to Project Creation form with these BOQ details"
                        >
                          Proceed to Form <ArrowRight size={13} />
                        </button>
                        <button
                          onClick={() => handleEditBOQItem(item)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all cursor-pointer"
                          title="Edit BOQ Item"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteBOQItem(item)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition-all cursor-pointer"
                          title="Delete BOQ Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* TAB 2: MILESTONE TIMELINE (GANTT) */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'timeline' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase">PROJECT GANTT TIMELINE</span>
              <h2 className="text-lg font-bold text-slate-900">Gantt Milestone Progress Chart</h2>
            </div>
            <button
              onClick={() => setShowMilestoneModal(true)}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} /> Add Task / Milestone
            </button>
          </div>

          <div className="space-y-4">
            {milestones.map((m) => (
              <div key={m.id} className="bg-slate-50 p-4.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900 text-sm">{m.phase}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      {m.start} → {m.end}
                    </span>
                    <button
                      onClick={() => handleDeleteMilestone(m.id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      title="Delete Milestone"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${m.color} rounded-full transition-all duration-500`}
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>
                    Status:{' '}
                    <b
                      className={`font-extrabold ${
                        m.status === 'Completed'
                          ? 'text-emerald-600'
                          : m.status === 'Active' || m.status === 'In Progress'
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {m.status}
                    </b>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-emerald-700 font-mono text-sm">{m.progress}% Complete</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={m.progress}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMilestones(
                          milestones.map((item) =>
                            item.id === m.id
                              ? {
                                  ...item,
                                  progress: val,
                                  status: val === 100 ? 'Completed' : val > 0 ? 'In Progress' : 'Scheduled',
                                }
                              : item
                          )
                        );
                      }}
                      className="w-24 accent-orange-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* TAB 3: SNAG LIST & QUALITY INSPECTION */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'snag' && (
        <div className="space-y-5">
          {/* Snag Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Total Reported Snags</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalSnags}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Defects Logged</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <CheckSquare size={20} />
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Open Defects</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{openSnags}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Pending Rectification</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Critical Issues</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{criticalSnags}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Requires High Priority</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle size={20} />
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Resolved Defects</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{resolvedSnags}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Inspected &amp; Closed</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle size={20} />
              </div>
            </div>
          </div>

          {/* Snag List Filter & Add Option */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare size={20} className="text-orange-600" />
                  Snag List &amp; Quality Inspection Defect Tracker
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filter by status or severity level, and log quality defects found during site inspection.
                </p>
              </div>

              <button
                onClick={() => setShowSnagModal(true)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                <Plus size={16} /> Add Snag / Quality Item
              </button>
            </div>

            {/* Auto-Filter Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Filter size={14} /> Auto Filters:
              </span>
              <div>
                <label className="text-slate-500 mr-1">Status:</label>
                <select
                  value={snagStatusFilter}
                  onChange={(e) => setSnagStatusFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 mr-1">Severity:</label>
                <select
                  value={snagSeverityFilter}
                  onChange={(e) => setSnagSeverityFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                >
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="Major">Major</option>
                  <option value="Minor">Minor</option>
                </select>
              </div>
            </div>

            {/* Snag Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50">
                    <th className="py-3 px-3">Ref Code / Date</th>
                    <th className="py-3 px-3">Snag Defect &amp; Location</th>
                    <th className="py-3 px-3">SLS Division</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Assigned Inspector</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSnagList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500 font-medium">
                        No snag items found for selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSnagList.map((snag) => (
                      <tr key={snag.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs font-bold text-slate-800">
                          <div>{snag.code}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{snag.dateReported}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-xs">{snag.title}</div>
                          <div className="text-[11px] text-slate-500 font-medium">{snag.location}</div>
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold text-slate-700">{snag.division}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                              snag.severity === 'Critical'
                                ? 'bg-rose-100 text-rose-800'
                                : snag.severity === 'Major'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {snag.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-700 font-medium">{snag.assignedTo}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              snag.status === 'Resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : snag.status === 'In Progress'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {snag.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {snag.status !== 'Resolved' ? (
                              <button
                                onClick={() => {
                                  setSnagList(
                                    snagList.map((s) =>
                                      s.id === snag.id ? { ...s, status: 'Resolved' } : s
                                    )
                                  );
                                  toast.success(`Snag item ${snag.code} marked as Resolved!`);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <CheckCircle size={12} /> Mark Resolved
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-600 font-bold">✓ Closed</span>
                            )}
                            <button
                              onClick={() => handleDeleteSnag(snag.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                              title="Delete Snag"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 1: CREATE PROJECT FORM (PRE-FILLED FROM BOQ ITEM) */}
      {/* --------------------------------------------------------- */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                Project Creation (SLS 573 BOQ Driven)
              </h3>
              <button
                onClick={() => setShowProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Project Name / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Luxury Residence - Nugegoda"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Service Category</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={projectForm.serviceType}
                  onChange={(e) => setProjectForm({ ...projectForm, serviceType: e.target.value })}
                >
                  {PROJECT_SERVICE_TYPES.map((s) => (
                    <option key={s.id} value={s.labelEn}>
                      {s.labelEn} ({s.labelSi})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Contract Value (LKR)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 45000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold text-emerald-700"
                    value={projectForm.contractValue}
                    onChange={(e) => setProjectForm({ ...projectForm, contractValue: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Site Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Nugegoda, Colombo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={projectForm.location}
                    onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sqft Area</label>
                  <input
                    type="number"
                    placeholder="e.g. 3400"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={projectForm.sqftArea}
                    onChange={(e) => setProjectForm({ ...projectForm, sqftArea: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cubic Feet Area</label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                    value={projectForm.cubicFeetArea}
                    onChange={(e) => setProjectForm({ ...projectForm, cubicFeetArea: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / BOQ Details</label>
                <textarea
                  rows="2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMut.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {createProjectMut.isPending ? 'Saving...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 2: ADD / EDIT BOQ ITEM MODAL */}
      {/* --------------------------------------------------------- */}
      {showAddBOQModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingBOQCode ? `Edit BOQ Line Item (${editingBOQCode})` : 'Add SLS 573 BOQ Line Item'}
              </h3>
              <button
                onClick={() => {
                  setShowAddBOQModal(false);
                  setEditingBOQCode(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddBOQSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DIV-06-01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-orange-600 font-bold"
                    value={boqForm.code}
                    onChange={(e) => setBoqForm({ ...boqForm, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Division *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    value={boqForm.division}
                    onChange={(e) => setBoqForm({ ...boqForm, division: e.target.value })}
                  >
                    <option value="Earthworks & Excavation">Earthworks &amp; Excavation</option>
                    <option value="Concrete & Formwork">Concrete &amp; Formwork</option>
                    <option value="Reinforcement Steel">Reinforcement Steel</option>
                    <option value="Masonry & Wall Construction">Masonry &amp; Wall Construction</option>
                    <option value="Roofing & Waterproofing">Roofing &amp; Waterproofing</option>
                    <option value="Finishes & Tiling">Finishes &amp; Tiling</option>
                    <option value="MEP Electrical & Plumbing">MEP Electrical &amp; Plumbing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Item Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Waterproofing membrane application for bathrooms"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  value={boqForm.item}
                  onChange={(e) => setBoqForm({ ...boqForm, item: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="sqft / m3"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    value={boqForm.unit}
                    onChange={(e) => setBoqForm({ ...boqForm, unit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    placeholder="100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                    value={boqForm.qty}
                    onChange={(e) => setBoqForm({ ...boqForm, qty: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rate (LKR)</label>
                  <input
                    type="number"
                    placeholder="500"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                    value={boqForm.rate}
                    onChange={(e) => setBoqForm({ ...boqForm, rate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBOQModal(false);
                    setEditingBOQCode(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBoqItemMut.isPending || updateBoqItemMut.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {addBoqItemMut.isPending || updateBoqItemMut.isPending
                    ? 'Saving...'
                    : editingBOQCode
                    ? 'Update BOQ Item'
                    : 'Save BOQ Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 3: ADD MILESTONE (GANTT) MODAL */}
      {/* --------------------------------------------------------- */}
      {showMilestoneModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add Gantt Milestone Phase</h3>
              <button onClick={() => setShowMilestoneModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMilestoneSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phase / Task Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phase 06: External Landscaping & Boundary Wall"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  value={milestoneForm.phase}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, phase: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Timeline</label>
                  <input
                    type="text"
                    placeholder="Month 01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    value={milestoneForm.start}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Timeline</label>
                  <input
                    type="text"
                    placeholder="Month 03"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    value={milestoneForm.end}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, end: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Progress %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-emerald-700"
                    value={milestoneForm.progress}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, progress: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    value={milestoneForm.status}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL 4: ADD SNAG / QUALITY INSPECTION ITEM MODAL */}
      {/* --------------------------------------------------------- */}
      {showSnagModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add Quality Snag Inspection Item</h3>
              <button onClick={() => setShowSnagModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSnagSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Defect Description / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wall plaster moisture mark near window frame"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  value={snagForm.title}
                  onChange={(e) => setSnagForm({ ...snagForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Site Location / Room *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2nd Floor Master Bedroom North Wall"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  value={snagForm.location}
                  onChange={(e) => setSnagForm({ ...snagForm, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SLS Division</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    value={snagForm.division}
                    onChange={(e) => setSnagForm({ ...snagForm, division: e.target.value })}
                  >
                    <option value="Masonry & Plastering">Masonry &amp; Plastering</option>
                    <option value="Finishes & Tiling">Finishes &amp; Tiling</option>
                    <option value="Waterproofing & Concrete">Waterproofing &amp; Concrete</option>
                    <option value="MEP Electrical">MEP Electrical</option>
                    <option value="Plumbing & Sanitary">Plumbing &amp; Sanitary</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Severity</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                    value={snagForm.severity}
                    onChange={(e) => setSnagForm({ ...snagForm, severity: e.target.value })}
                  >
                    <option value="Minor">Minor</option>
                    <option value="Major">Major</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Supervisor / Contractor</label>
                <input
                  type="text"
                  placeholder="e.g. Nimal Perera (Supervisor)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  value={snagForm.assignedTo}
                  onChange={(e) => setSnagForm({ ...snagForm, assignedTo: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSnagModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                >
                  Save Snag Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
