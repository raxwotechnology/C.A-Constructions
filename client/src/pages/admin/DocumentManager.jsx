import React, { useState } from 'react';
import { FileText, Download, Upload, ShieldCheck, Eye, Plus, Folder } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentManager() {
  const [activeFolder, setActiveFolder] = useState('contracts');

  const documents = [
    { id: 'DOC-101', name: 'Lotus Luxury Villa SBD-03 Agreement.pdf', category: 'SBD-03 Contracts', version: 'v1.2', size: '3.4 MB', updated: '2026-07-28', status: 'Approved' },
    { id: 'DOC-102', name: 'Structural Column Plan Floor 01-03.dwg', category: 'CAD Drawings', version: 'v2.0', size: '18.2 MB', updated: '2026-07-25', status: 'Approved' },
    { id: 'DOC-103', name: 'Colombo Municipal Council Building Approval.pdf', category: 'Municipal Clearances', version: 'v1.0', size: '1.8 MB', updated: '2026-07-20', status: 'Approved' },
    { id: 'DOC-104', name: 'Senior Engineer CIDA Registration Cert.pdf', category: 'Employee Certificates', version: 'v1.0', size: '950 KB', updated: '2026-07-15', status: 'Approved' },
  ];

  const handleUpload = () => {
    toast.success('Document uploaded to repository successfully!');
  };

  const handleDownload = (name) => {
    toast.success(`Downloading "${name}"...`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Document & CAD Drawing Management Repository
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            SBD-03 Contracts, Architectural CAD Drawings (DWG/PDF), Employee Certificates & Municipal Clearances
          </p>
        </div>
        <button 
          onClick={handleUpload}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm text-sm cursor-pointer"
        >
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
              activeFolder === folder.id 
                ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' 
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <Folder size={28} className="text-orange-600 shrink-0" />
            <div>
              <div className="text-sm font-bold text-slate-900">{folder.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{folder.count} Files</div>
            </div>
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                <th className="py-3 px-2">Doc ID</th>
                <th className="py-3 px-2">File Name</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Version</th>
                <th className="py-3 px-2">Size</th>
                <th className="py-3 px-2">Last Updated</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-2 font-mono text-xs font-bold text-orange-600">{doc.id}</td>
                  <td className="py-3 px-2 font-semibold text-slate-800 flex items-center gap-2">
                    <FileText size={16} className="text-orange-600 shrink-0" />
                    {doc.name}
                  </td>
                  <td className="py-3 px-2 text-xs text-slate-500">{doc.category}</td>
                  <td className="py-3 px-2 font-mono text-xs font-bold text-orange-700">{doc.version}</td>
                  <td className="py-3 px-2 font-mono text-xs text-slate-500">{doc.size}</td>
                  <td className="py-3 px-2 text-xs text-slate-500">{doc.updated}</td>
                  <td className="py-3 px-2 text-right space-x-2">
                    <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-semibold border border-slate-200 cursor-pointer">
                      View
                    </button>
                    <button 
                      onClick={() => handleDownload(doc.name)}
                      className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-xl font-bold shadow-xs cursor-pointer"
                    >
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
