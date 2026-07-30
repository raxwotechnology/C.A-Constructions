import React, { useState } from 'react';
import { FileText, Download, Upload, ShieldCheck, Eye, Plus, Folder } from 'lucide-react';

export default function DocumentManager() {
  const [activeFolder, setActiveFolder] = useState('contracts');

  const documents = [
    { id: 'DOC-101', name: 'Lotus Luxury Villa SBD-03 Agreement.pdf', category: 'SBD-03 Contracts', version: 'v1.2', size: '3.4 MB', updated: '2026-07-28', status: 'Approved' },
    { id: 'DOC-102', name: 'Structural Column Plan Floor 01-03.dwg', category: 'CAD Drawings', version: 'v2.0', size: '18.2 MB', updated: '2026-07-25', status: 'Approved' },
    { id: 'DOC-103', name: 'Colombo Municipal Council Building Approval.pdf', category: 'Municipal Clearances', version: 'v1.0', size: '1.8 MB', updated: '2026-07-20', status: 'Approved' },
    { id: 'DOC-104', name: 'Senior Engineer CIDA Registration Cert.pdf', category: 'Employee Certificates', version: 'v1.0', size: '950 KB', updated: '2026-07-15', status: 'Approved' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Document & CAD Drawing Management Repository
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            SBD-03 Contracts, Architectural CAD Drawings (DWG/PDF), Employee Certificates & Municipal Clearances
          </p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg text-sm">
          <Upload size={18} /> Upload Document / Drawing
        </button>
      </div>

      {/* Folders Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 'contracts', title: 'SBD-03 Contracts', count: 14 },
          { id: 'drawings', title: 'CAD Architectural Drawings', count: 38 },
          { id: 'clearances', title: 'Municipal Clearances', count: 9 },
          { id: 'certificates', title: 'Employee Certificates', count: 22 },
        ].map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolder(folder.id)}
            className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
              activeFolder === folder.id ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-lg' : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            <Folder size={28} className="text-cyan-400 shrink-0" />
            <div>
              <div className="text-sm font-bold">{folder.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">{folder.count} Files</div>
            </div>
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-3">Doc ID</th>
                <th className="p-3">File Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Version</th>
                <th className="p-3">Size</th>
                <th className="p-3">Last Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-mono text-cyan-400 font-bold">{doc.id}</td>
                  <td className="p-3 font-medium text-slate-100 flex items-center gap-2">
                    <FileText size={16} className="text-cyan-400 shrink-0" />
                    {doc.name}
                  </td>
                  <td className="p-3 text-xs text-slate-400">{doc.category}</td>
                  <td className="p-3 font-mono text-xs font-bold text-amber-400">{doc.version}</td>
                  <td className="p-3 font-mono text-xs text-slate-400">{doc.size}</td>
                  <td className="p-3 text-xs text-slate-400">{doc.updated}</td>
                  <td className="p-3 text-right space-x-2">
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-600">
                      View
                    </button>
                    <button className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg">
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
