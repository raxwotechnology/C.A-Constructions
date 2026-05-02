import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialAPI } from '../../api';
import { Modal, ConfirmModal, StatusBadge, TableSkeleton, EmptyState } from '../../components/ui';
import { Plus, Send, Trash2, Edit2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'];

const platformIcons = { facebook: '📘', instagram: '📷', twitter: '🐦', linkedin: '💼', tiktok: '🎵', youtube: '▶️' };
const platformColors = { facebook: 'bg-blue-100 text-blue-700', instagram: 'bg-pink-100 text-pink-700', twitter: 'bg-sky-100 text-sky-700', linkedin: 'bg-blue-50 text-blue-800', tiktok: 'bg-gray-900 text-white', youtube: 'bg-red-100 text-red-700' };

function PostForm({ onSubmit, loading, defaultValues }) {
  const [form, setForm] = useState(defaultValues || { title: '', content: '', platform: ['instagram'], status: 'draft', hashtags: '' });
  const [files, setFiles] = useState([]);
  const h = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const togglePlatform = (p) => {
    setForm(prev => ({
      ...prev,
      platform: prev.platform.includes(p) ? prev.platform.filter(x => x !== p) : [...prev.platform, p]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('content', form.content);
    fd.append('status', form.status);
    fd.append('hashtags', form.hashtags);
    form.platform.forEach(p => fd.append('platform', p));
    files.forEach(f => fd.append('media', f));
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-group"><label className="form-label">Post Title *</label><input name="title" value={form.title} onChange={h} className="form-input" required /></div>
      <div className="form-group"><label className="form-label">Content *</label><textarea name="content" value={form.content} onChange={h} className="form-textarea" rows={5} required placeholder="Write your post content..." /></div>
      <div className="form-group">
        <label className="form-label">Platforms</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {PLATFORMS.map(p => (
            <button key={p} type="button" onClick={() => togglePlatform(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.platform.includes(p) ? 'border-navy bg-navy text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {platformIcons[p]} {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group"><label className="form-label">Status</label><select name="status" value={form.status} onChange={h} className="form-select"><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select></div>
        <div className="form-group"><label className="form-label">Hashtags</label><input name="hashtags" value={form.hashtags} onChange={h} className="form-input" placeholder="#tech #software" /></div>
      </div>
      <div className="form-group"><label className="form-label">Media (images)</label><input type="file" accept="image/*,video/*" multiple onChange={e => setFiles(Array.from(e.target.files))} className="form-input text-xs py-1.5" /></div>
      <div className="flex justify-end"><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : (defaultValues ? 'Update Post' : 'Create Post')}</button></div>
    </form>
  );
}

export default function SocialPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['social-posts', statusFilter],
    queryFn: () => socialAPI.getAll({ status: statusFilter }).then(r => r.data),
  });

  const posts = data?.data || [];

  const createMutation = useMutation({ mutationFn: socialAPI.create, onSuccess: () => { qc.invalidateQueries(['social-posts']); toast.success('Post created!'); setModalOpen(false); } });
  const publishMutation = useMutation({ mutationFn: socialAPI.publish, onSuccess: () => { qc.invalidateQueries(['social-posts']); toast.success('Published!'); } });
  const deleteMutation = useMutation({ mutationFn: socialAPI.delete, onSuccess: () => { qc.invalidateQueries(['social-posts']); toast.success('Post deleted'); setDeleteId(null); } });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div><h1 className="page-title">Social Media</h1><p className="page-subtitle">Manage content and social media posts</p></div>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={15} /> Create Post</button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['', 'draft', 'scheduled', 'published'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === s ? 'bg-white text-navy shadow-sm' : 'text-gray-600'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="card p-5 space-y-3"><div className="skeleton h-4 w-2/3 rounded" /><div className="skeleton h-24 rounded" /><div className="skeleton h-4 w-1/2 rounded" /></div>)}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Share2} title="No posts yet" description="Create your first social media post." action={<button onClick={() => setModalOpen(true)} className="btn-primary btn-sm"><Plus size={13} /> Create Post</button>} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {posts.map((post, i) => (
            <motion.div key={post._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-hover overflow-hidden">
              {/* Media preview */}
              {post.media?.length > 0 && (
                <div className="h-40 bg-gray-100 overflow-hidden">
                  <img src={`${API_URL}/uploads/${post.media[0]}`} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm leading-tight">{post.title}</h4>
                  <StatusBadge status={post.status} />
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">{post.content}</p>
                {/* Platforms */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {post.platform?.map(p => (
                    <span key={p} className={`badge text-[10px] ${platformColors[p] || 'badge-gray'}`}>{platformIcons[p]} {p}</span>
                  ))}
                </div>
                {/* Hashtags */}
                {post.hashtags?.length > 0 && (
                  <p className="text-xs text-blue-500 mb-3">{Array.isArray(post.hashtags) ? post.hashtags.join(' ') : post.hashtags}</p>
                )}
                <p className="text-xs text-gray-400 mb-3">{post.createdAt ? format(new Date(post.createdAt), 'dd MMM yyyy, HH:mm') : ''}</p>
                <div className="flex items-center gap-2">
                  {post.status === 'draft' && (
                    <button onClick={() => publishMutation.mutate(post._id)} className="btn-primary btn-sm flex-1 justify-center">
                      <Send size={12} /> Publish
                    </button>
                  )}
                  <button onClick={() => setEditPost(post)} className="btn-ghost btn-icon"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteId(post._id)} className="btn-ghost btn-icon text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Social Post">
        <PostForm loading={createMutation.isPending} onSubmit={createMutation.mutate} />
      </Modal>
      <Modal open={!!editPost} onClose={() => setEditPost(null)} title="Edit Post">
        {editPost && <PostForm loading={false} onSubmit={(fd) => socialAPI.update(editPost._id, fd).then(() => { qc.invalidateQueries(['social-posts']); toast.success('Updated'); setEditPost(null); })} defaultValues={editPost} />}
      </Modal>
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} title="Delete Post" message="This post will be permanently deleted." />
    </div>
  );
}
