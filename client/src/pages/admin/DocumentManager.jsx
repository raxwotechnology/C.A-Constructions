import React, { useState } from 'react'
import {
  FileText, Download, Upload, ShieldCheck, Eye, Plus, Folder, Search, Filter, Trash2,
  Maximize2, Minimize2, ZoomIn, ZoomOut, Layers, CheckCircle2, AlertCircle, X, Check, Grid, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

const initialDocuments = [
  {
    id: 'DOC-101',
    name: 'Lotus Luxury Villa SBD-03 Agreement.pdf',
    category: 'SBD-03 Contracts',
    folderId: 'contracts',
    version: 'v1.2',
    size: '3.4 MB',
    sizeBytes: 3565158,
    updated: '2026-07-28',
    status: 'Approved',
    project: 'Lotus Luxury Villa - Kandy',
    type: 'pdf',
    description: 'Standard Bidding Document (SBD-03) signed agreement with client including BOQ annexures and bank guarantee.'
  },
  {
    id: 'DOC-102',
    name: 'Structural Column Plan Floor 01-03.dwg',
    category: 'CAD Drawings',
    folderId: 'drawings',
    version: 'v2.0',
    size: '18.2 MB',
    sizeBytes: 19084083,
    updated: '2026-07-25',
    status: 'Approved',
    project: 'Rajagiriya Commercial Complex',
    type: 'cad',
    description: 'AutoCAD 2026 structural framing & column reinforcement detail dwg plan with grid lines & beam schedules.'
  },
  {
    id: 'DOC-103',
    name: 'Colombo Municipal Council Building Approval.pdf',
    category: 'Municipal Clearances',
    folderId: 'clearances',
    version: 'v1.0',
    size: '1.8 MB',
    sizeBytes: 1887436,
    updated: '2026-07-20',
    status: 'Approved',
    project: 'Colombo 07 Residence',
    type: 'pdf',
    description: 'CMC approved building plan clearance certificate with stamp and fire department clearance attachment.'
  },
  {
    id: 'DOC-104',
    name: 'Senior Engineer CIDA Registration Cert.pdf',
    category: 'Employee Certificates',
    folderId: 'certificates',
    version: 'v1.0',
    size: '950 KB',
    sizeBytes: 972800,
    updated: '2026-07-15',
    status: 'Approved',
    project: 'Head Office HR',
    type: 'pdf',
    description: 'Chartered Civil Engineer CIDA Grade CS2 registration certificate valid through Dec 2026.'
  },
  {
    id: 'DOC-105',
    name: 'Electrical Conduit & Wiring Layout Floor 02.dwg',
    category: 'CAD Drawings',
    folderId: 'drawings',
    version: 'v1.1',
    size: '14.6 MB',
    sizeBytes: 15309209,
    updated: '2026-07-12',
    status: 'Approved',
    project: 'Lotus Luxury Villa - Kandy',
    type: 'cad',
    description: 'Electrical single line diagram, distribution board layout and conduits for 2nd floor bedrooms.'
  },
  {
    id: 'DOC-106',
    name: 'Substructure Foundation Soil Test Report.pdf',
    category: 'SBD-03 Contracts',
    folderId: 'contracts',
    version: 'v1.0',
    size: '5.2 MB',
    sizeBytes: 5452595,
    updated: '2026-07-08',
    status: 'Approved',
    project: 'Rajagiriya Commercial Complex',
    type: 'pdf',
    description: 'Geotechnical soil bearing capacity test report & borehole logs by National Building Research Organization.'
  }
]

export default function DocumentManager() {
  const [documents, setDocuments] = useState(initialDocuments)
  const [activeFolder, setActiveFolder] = useState('all') // 'all', 'contracts', 'drawings', 'clearances', 'certificates'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  // CAD Viewer Interactive States
  const [zoomLevel, setZoomLevel] = useState(100)
  const [layers, setLayers] = useState({
    grid: true,
    columns: true,
    wiring: true,
    dimensions: true
  })

  // Upload Form State
  const [newDocName, setNewDocName] = useState('')
  const [newDocCategory, setNewDocCategory] = useState('CAD Drawings')
  const [newDocProject, setNewDocProject] = useState('Lotus Luxury Villa - Kandy')
  const [newDocVersion, setNewDocVersion] = useState('v1.0')
  const [newDocDescription, setNewDocDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  // Filtered Documents
  const filteredDocuments = documents.filter((doc) => {
    const matchFolder = activeFolder === 'all' || doc.folderId === activeFolder
    const matchSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.project.toLowerCase().includes(searchQuery.toLowerCase())
    return matchFolder && matchSearch
  })

  // Folder Counts
  const counts = {
    all: documents.length,
    contracts: documents.filter((d) => d.folderId === 'contracts').length,
    drawings: documents.filter((d) => d.folderId === 'drawings').length,
    clearances: documents.filter((d) => d.folderId === 'clearances').length,
    certificates: documents.filter((d) => d.folderId === 'certificates').length
  }

  // Handle Download File Blob Trigger
  const handleDownload = (doc) => {
    try {
      const dummyContent = `RA CREATIONS & CONSTRUCTIONS - DIGITAL REPOSITORY FILE\n=======================================================\nDocument ID: ${doc.id}\nFile Name: ${doc.name}\nCategory: ${doc.category}\nVersion: ${doc.version}\nProject: ${doc.project}\nDate: ${doc.updated}\nDescription: ${doc.description}\n\n[FILE METADATA VERIFIED & SIGNED BY CAD/DOC REPOSITORY SYSTEM]`
      const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Started downloading "${doc.name}"`)
    } catch (e) {
      toast.error('Download failed. Please try again.')
    }
  }

  // Handle Upload Submission
  const handleUploadSubmit = (e) => {
    e.preventDefault()
    if (!newDocName.trim()) {
      toast.error('Please enter a document name.')
      return
    }

    let folderId = 'drawings'
    if (newDocCategory.includes('Contract')) folderId = 'contracts'
    else if (newDocCategory.includes('Clearance')) folderId = 'clearances'
    else if (newDocCategory.includes('Certificate')) folderId = 'certificates'

    const isCad = newDocName.toLowerCase().endsWith('.dwg') || newDocName.toLowerCase().endsWith('.dxf') || newDocCategory.includes('CAD')

    const newEntry = {
      id: `DOC-${100 + documents.length + 1}`,
      name: newDocName,
      category: newDocCategory,
      folderId,
      version: newDocVersion || 'v1.0',
      size: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '2.5 MB',
      sizeBytes: selectedFile ? selectedFile.size : 2621440,
      updated: new Date().toISOString().split('T')[0],
      status: 'Approved',
      project: newDocProject,
      type: isCad ? 'cad' : 'pdf',
      description: newDocDescription || 'Uploaded via Central CAD Document Manager Repository.'
    }

    setDocuments([newEntry, ...documents])
    toast.success(`Uploaded "${newDocName}" successfully!`)

    // Reset Form
    setNewDocName('')
    setNewDocDescription('')
    setSelectedFile(null)
    setUploadModalOpen(false)
  }

  // Delete document
  const handleDeleteDoc = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from the repository?`)) {
      setDocuments(documents.filter((d) => d.id !== id))
      toast.error(`Deleted "${name}"`)
      if (selectedDoc?.id === id) setSelectedDoc(null)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-orange-600/30 border border-orange-500/40 rounded-2xl text-orange-400">
              <Folder size={26} />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">CAD Drawing & Document Repository</h1>
              <p className="text-xs text-slate-200 mt-0.5">
                SBD-03 Legal Contracts, Architectural CAD Drawings (DWG), Municipal Clearances & Structural Plans
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-lg hover:shadow-orange-600/30 transition-all text-xs cursor-pointer"
        >
          <Upload size={16} /> Upload Document / Drawing
        </button>
      </div>

      {/* Folders Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { id: 'all', title: 'All Documents', count: counts.all, icon: FileText },
          { id: 'contracts', title: 'SBD-03 Contracts', count: counts.contracts, icon: ShieldCheck },
          { id: 'drawings', title: 'CAD Drawings', count: counts.drawings, icon: Grid },
          { id: 'clearances', title: 'Municipal Clearances', count: counts.clearances, icon: CheckCircle2 },
          { id: 'certificates', title: 'Certificates', count: counts.certificates, icon: FileText }
        ].map((folder) => {
          const isActive = activeFolder === folder.id
          const IconComponent = folder.icon
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                isActive
                  ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/50'
              }`}
            >
              <span className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>
                <IconComponent size={20} />
              </span>
              <div className="min-w-0">
                <div className={`text-xs font-extrabold truncate ${isActive ? 'text-slate-900' : 'text-slate-900'}`}>
                  {folder.title}
                </div>
                <div className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-orange-100' : 'text-slate-500'}`}>
                  {folder.count} {folder.count === 1 ? 'File' : 'Files'}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Search & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            type="text"
            placeholder="Search drawings, DWG, contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Showing <span className="font-bold text-slate-900">{filteredDocuments.length}</span> of {documents.length} repository files
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Doc ID</th>
                <th className="py-3.5 px-4">File Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Version</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                    No files found in this category.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-600">{doc.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg shrink-0 ${doc.type === 'cad' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                        {doc.type === 'cad' ? <Grid size={15} /> : <FileText size={15} />}
                      </span>
                      <span className="truncate max-w-xs">{doc.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">{doc.category}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-500">{doc.project}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-700">
                      <span className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">{doc.version}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{doc.size}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{doc.updated}</td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl font-bold border border-slate-200 cursor-pointer inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-xl font-bold shadow-xs cursor-pointer inline-flex items-center gap-1 transition-all"
                      >
                        <Download size={13} /> Download
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.name)}
                        className="text-xs bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 p-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer inline-flex items-center"
                        title="Delete Document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CAD Drawing & Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col text-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl ${selectedDoc.type === 'cad' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {selectedDoc.type === 'cad' ? <Grid size={20} /> : <FileText size={20} />}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {selectedDoc.name}
                    <span className="text-xs font-mono bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-md border border-orange-500/30">
                      {selectedDoc.version}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedDoc.project} • {selectedDoc.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedDoc)}
                  className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <Download size={14} /> Download File
                </button>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content - CAD Blueprint Interactive Canvas / PDF Preview */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Main Viewer Area */}
              <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col justify-between p-6">
                {selectedDoc.type === 'cad' ? (
                  /* Interactive CAD Blueprint Viewer */
                  <div className="flex-1 flex flex-col items-center justify-center relative border border-slate-200 rounded-2xl bg-[#090d16] p-4 overflow-hidden">
                    {/* CAD Grid Background */}
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
                        backgroundSize: `${(zoomLevel / 100) * 20}px ${(zoomLevel / 100) * 20}px`
                      }}
                    />

                    {/* Interactive CAD Drawing Canvas Graphic */}
                    <div
                      className="transition-transform duration-200 flex flex-col items-center justify-center"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    >
                      {/* Blueprint Box */}
                      <div className="w-[420px] h-[280px] border-2 border-cyan-400/70 bg-cyan-950/20 rounded-lg relative flex flex-col justify-between p-4 shadow-2xl">
                        {/* Structural Grid Layer */}
                        {layers.grid && (
                          <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-0 border border-cyan-500/20 pointer-events-none">
                            {[...Array(12)].map((_, i) => (
                              <div key={i} className="border border-cyan-500/10 flex items-center justify-center text-[8px] font-mono text-cyan-400/40">
                                G-{i + 1}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Column Beams Layer */}
                        {layers.columns && (
                          <div className="absolute inset-4 border-2 border-dashed border-amber-400/80 rounded-md flex items-center justify-between p-4">
                            <div className="w-6 h-6 bg-amber-500/80 rounded-xs text-[8px] font-bold text-slate-950 flex items-center justify-center">C1</div>
                            <div className="w-6 h-6 bg-amber-500/80 rounded-xs text-[8px] font-bold text-slate-950 flex items-center justify-center">C2</div>
                            <div className="w-6 h-6 bg-amber-500/80 rounded-xs text-[8px] font-bold text-slate-950 flex items-center justify-center">C3</div>
                          </div>
                        )}

                        {/* Wiring Layer */}
                        {layers.wiring && (
                          <div className="absolute inset-8 border border-emerald-400/60 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                              3-Phase Conduit Path (DB-01)
                            </span>
                          </div>
                        )}

                        {/* Dimensions Layer */}
                        {layers.dimensions && (
                          <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-between text-[9px] font-mono text-cyan-300">
                            <span>|&lt;--- 12.50 Meters ---&gt;|</span>
                            <span>Scale 1:50</span>
                          </div>
                        )}

                        {/* Blueprint Title Box */}
                        <div className="self-end bg-white/90 border border-cyan-500/40 p-2 rounded text-[9px] font-mono text-cyan-300 space-y-0.5">
                          <div className="font-bold">RA CONSTRUCTIONS CAD</div>
                          <div>PROJ: {selectedDoc.project}</div>
                          <div>DWG: {selectedDoc.id} | SCALE 1:50</div>
                        </div>
                      </div>
                    </div>

                    {/* Canvas Floating Toolbar */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 border border-slate-200/80 px-4 py-2 rounded-2xl flex items-center gap-3 backdrop-blur-md text-xs font-mono">
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                        className="p-1 text-slate-600 hover:text-slate-900"
                        title="Zoom Out"
                      >
                        <ZoomOut size={16} />
                      </button>
                      <span className="text-orange-400 font-bold">{zoomLevel}%</span>
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                        className="p-1 text-slate-600 hover:text-slate-900"
                        title="Zoom In"
                      >
                        <ZoomIn size={16} />
                      </button>
                      <span className="w-px h-4 bg-slate-200"></span>
                      <button
                        onClick={() => setZoomLevel(100)}
                        className="text-[10px] text-slate-500 hover:text-slate-900 font-sans"
                      >
                        Reset Zoom
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard PDF / Document Preview Reader */
                  <div className="flex-1 flex flex-col items-center justify-center border border-slate-200 rounded-2xl bg-white p-6 overflow-y-auto">
                    <div className="w-full max-w-lg bg-white text-slate-900 p-8 rounded-2xl shadow-2xl space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="font-bold text-slate-900 text-sm">RA CREATIONS / CONSTRUCTIONS</div>
                        <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">VERIFIED DOC</span>
                      </div>

                      <div className="font-mono text-orange-600 font-bold">{selectedDoc.id}</div>
                      <div className="font-bold text-base text-slate-900">{selectedDoc.name}</div>
                      <div className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                        {selectedDoc.description}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                        <div>Project: <span className="font-semibold text-slate-900">{selectedDoc.project}</span></div>
                        <div>Category: <span className="font-semibold text-slate-900">{selectedDoc.category}</span></div>
                        <div>Version: <span className="font-semibold text-slate-900">{selectedDoc.version}</span></div>
                        <div>File Size: <span className="font-semibold text-slate-900">{selectedDoc.size}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Settings & Info */}
              <div className="w-full md:w-72 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-5 space-y-5 flex-shrink-0 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">Document Details</h4>
                  <div className="space-y-2 text-slate-500">
                    <div>
                      <div className="text-[10px] text-slate-500">File Name</div>
                      <div className="font-semibold text-slate-700 break-words">{selectedDoc.name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Associated Project</div>
                      <div className="font-semibold text-slate-700">{selectedDoc.project}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Version History</div>
                      <div className="font-mono font-bold text-orange-400">{selectedDoc.version}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Size</div>
                      <div className="font-mono text-slate-600">{selectedDoc.size}</div>
                    </div>
                  </div>
                </div>

                {selectedDoc.type === 'cad' && (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Layers size={14} className="text-cyan-400" /> CAD Layer Toggles
                    </h4>
                    <div className="space-y-2">
                      {[
                        { key: 'grid', label: 'Architectural Grid' },
                        { key: 'columns', label: 'Structural Columns & Beams' },
                        { key: 'wiring', label: 'Electrical & Conduit Lines' },
                        { key: 'dimensions', label: 'Dimension Annotations' }
                      ].map((lyr) => (
                        <label key={lyr.key} className="flex items-center justify-between text-slate-600 hover:text-slate-900 cursor-pointer p-1.5 rounded-lg bg-slate-50/50">
                          <span>{lyr.label}</span>
                          <input
                            type="checkbox"
                            checked={layers[lyr.key]}
                            onChange={(e) => setLayers({ ...layers, [lyr.key]: e.target.checked })}
                            className="accent-orange-500 rounded"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-slate-50/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-orange-600">
                <Upload size={22} />
                <h3 className="text-lg font-bold text-slate-900">Upload Document / CAD Drawing</h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document / Drawing Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ground Floor Plumbing Detail Plan.dwg"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="CAD Drawings">CAD Drawings (.DWG)</option>
                    <option value="SBD-03 Contracts">SBD-03 Contracts</option>
                    <option value="Municipal Clearances">Municipal Clearances</option>
                    <option value="Employee Certificates">Employee Certificates</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Version Tag</label>
                  <input
                    type="text"
                    placeholder="v1.0"
                    value={newDocVersion}
                    onChange={(e) => setNewDocVersion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Site</label>
                <select
                  value={newDocProject}
                  onChange={(e) => setNewDocProject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Lotus Luxury Villa - Kandy">Lotus Luxury Villa - Kandy</option>
                  <option value="Rajagiriya Commercial Complex">Rajagiriya Commercial Complex</option>
                  <option value="Colombo 07 Residence">Colombo 07 Residence</option>
                  <option value="Head Office HR">Head Office HR</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select File</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0])
                      if (!newDocName) setNewDocName(e.target.files[0].name)
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Enter brief description of drawing or contract annexures..."
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
