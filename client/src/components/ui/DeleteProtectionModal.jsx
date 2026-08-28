import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiShield, FiX, FiLock, FiSend, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function DeleteProtectionModal({
  open,
  module = 'Record',
  entityId,
  entityName = 'Selected Item',
  onClose,
  onDeleted,
}) {
  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'request'
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  // Direct Admin Password Delete Authorization
  const handleVerifyAndPasswordDelete = async (e) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      toast.error('Please enter Admin Password!');
      return;
    }
    setLoading(true);
    try {
      // 1. Verify Admin Password
      const verRes = await api.post('/deletion-requests/verify-password', { password: adminPassword });
      if (verRes.data?.success) {
        // 2. Perform direct deletion
        if (onDeleted) {
          await onDeleted(adminPassword);
        } else {
          toast.success(`Record "${entityName}" deleted successfully!`);
        }
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Admin Password verification failed!');
    } finally {
      setLoading(false);
    }
  };

  // Submit Delete Request to Admin
  const handleSendDeleteRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/deletion-requests/request', {
        module,
        entityId,
        entityName,
        reason: deleteReason || `Deletion requested by user.`,
      });
      if (res.data?.success) {
        toast.success('Delete request sent to Admin successfully! The record will be deleted once approved by Admin.', { duration: 5000 });
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit delete request.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between border-b border-amber-500/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FiShield size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base font-heading text-white">Delete Protection Logic</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Deleting: <span className="font-bold text-amber-400">{entityName}</span> ({module})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Action Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'password'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <FiLock size={15} className="text-amber-500" /> Immediate Delete (Admin Password)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'request'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <FiSend size={15} className="text-blue-500" /> Request Delete to Admin
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {activeTab === 'password' ? (
            <form onSubmit={handleVerifyAndPasswordDelete} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                <FiAlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-900 leading-relaxed">
                  Enter <strong>Admin Passcode / Password</strong> to authorize instant deletion of this record from the database.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Admin Passcode / Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter Admin Password to confirm..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <span className="spinner" /> : <><FiCheck size={16} /> Authorize & Delete</>}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSendDeleteRequest} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
                <FiSend className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-blue-900 leading-relaxed">
                  Managers and non-admin roles can submit a <strong>Delete Request</strong>. Admin will be notified to review and approve deletion.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Reason for Deletion Request
                </label>
                <textarea
                  rows={3}
                  placeholder="State reason why this record should be removed..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <span className="spinner" /> : <><FiSend size={16} /> Submit Request to Admin</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
