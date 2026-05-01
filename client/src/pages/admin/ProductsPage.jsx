import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productAPI } from '../../api';
import { Modal, ConfirmModal, StatusBadge, SearchInput, Pagination, TableSkeleton, EmptyState } from '../../components/ui';
import { Plus, Edit2, Trash2, Package, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function ProductForm({ defaultValues, onSubmit, loading }) {
  const [form, setForm] = useState(defaultValues || { name: '', description: '', category: '', price: '', salePrice: '', stock: '', sku: '', tags: '', status: 'active', featured: false });
  const [files, setFiles] = useState([]);
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    files.forEach(f => fd.append('images', f));
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="form-label">Product Name *</label><input name="name" value={form.name} onChange={handleChange} className="form-input" required /></div>
        <div className="form-group col-span-2"><label className="form-label">Description</label><textarea name="description" value={form.description} onChange={handleChange} className="form-textarea" rows={3} /></div>
        <div className="form-group"><label className="form-label">Category *</label><input name="category" value={form.category} onChange={handleChange} className="form-input" required /></div>
        <div className="form-group"><label className="form-label">SKU</label><input name="sku" value={form.sku} onChange={handleChange} className="form-input" /></div>
        <div className="form-group"><label className="form-label">Price (₨) *</label><input name="price" type="number" value={form.price} onChange={handleChange} className="form-input" required /></div>
        <div className="form-group"><label className="form-label">Sale Price (₨)</label><input name="salePrice" type="number" value={form.salePrice} onChange={handleChange} className="form-input" /></div>
        <div className="form-group"><label className="form-label">Stock Qty</label><input name="stock" type="number" value={form.stock} onChange={handleChange} className="form-input" /></div>
        <div className="form-group"><label className="form-label">Status</label><select name="status" value={form.status} onChange={handleChange} className="form-select"><option value="active">Active</option><option value="inactive">Inactive</option><option value="out_of_stock">Out of Stock</option></select></div>
        <div className="form-group col-span-2"><label className="form-label">Tags (comma separated)</label><input name="tags" value={form.tags} onChange={handleChange} className="form-input" /></div>
        <div className="form-group col-span-2">
          <label className="form-label">Product Images</label>
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files))} className="form-input text-xs py-1.5" />
        </div>
        <div className="form-group col-span-2 flex items-center gap-2">
          <input type="checkbox" name="featured" id="featured" checked={form.featured} onChange={handleChange} className="w-4 h-4" />
          <label htmlFor="featured" className="text-sm text-gray-700 cursor-pointer">Featured product</label>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : (defaultValues ? 'Update Product' : 'Add Product')}</button>
      </div>
    </form>
  );
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [viewMode, setViewMode] = useState('table');

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page],
    queryFn: () => productAPI.getAll({ search, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  });

  const products = data?.data || [];
  const pagination = data?.pagination || {};

  const createMutation = useMutation({ mutationFn: productAPI.create, onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product added!'); setModalOpen(false); } });
  const updateMutation = useMutation({ mutationFn: ({ id, fd }) => productAPI.update(id, fd), onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product updated!'); setEditProduct(null); } });
  const deleteMutation = useMutation({ mutationFn: productAPI.delete, onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product deleted'); setDeleteId(null); } });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div><h1 className="page-title">Products</h1><p className="page-subtitle">Manage your product catalog</p></div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')} className="btn-outline btn-sm">
            {viewMode === 'table' ? 'Grid View' : 'Table View'}
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={15} /> Add Product</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="text-sm text-gray-500">{pagination.total || 0} products</span>
          <SearchInput value={search} onChange={setSearch} placeholder="Search products..." />
        </div>

        {viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? <p className="text-sm text-gray-400 col-span-4 text-center py-8">Loading...</p> :
              products.length === 0 ? (
                <div className="col-span-4"><EmptyState icon={Package} title="No products yet" description="Add your first product to the catalog." action={<button onClick={() => setModalOpen(true)} className="btn-primary btn-sm"><Plus size={13} /> Add Product</button>} /></div>
              ) : products.map((p, i) => (
                <motion.div key={p._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className="card-hover rounded-xl overflow-hidden">
                  <div className="h-36 bg-gray-100 flex items-center justify-center">
                    {p.images?.[0] ? (
                      <img src={`${API_URL}/uploads/${p.images[0]}`} alt={p.name} className="h-full w-full object-cover" />
                    ) : <Package size={32} className="text-gray-300" />}
                  </div>
                  <div className="p-3">
                    {p.featured && <Star size={12} className="text-amber-400 fill-amber-400 mb-1" />}
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-sm font-bold text-navy">₨{Number(p.price).toLocaleString()}</p>
                        {p.salePrice && <p className="text-xs text-gray-400 line-through">₨{Number(p.salePrice).toLocaleString()}</p>}
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => setEditProduct(p)} className="btn-ghost btn-icon btn-sm flex-1"><Edit2 size={12} /></button>
                      <button onClick={() => setDeleteId(p._id)} className="btn-ghost btn-icon btn-sm text-red-400 flex-1"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Sale Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              {isLoading ? <TableSkeleton rows={8} cols={7} /> : (
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon={Package} title="No products yet" description="Add your first product." action={<button onClick={() => setModalOpen(true)} className="btn-primary btn-sm"><Plus size={13} /> Add Product</button>} /></td></tr>
                  ) : products.map(p => (
                    <tr key={p._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {p.images?.[0] ? <img src={`${API_URL}/uploads/${p.images[0]}`} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-gray-400" />}
                          </div>
                          <div><p className="font-medium text-gray-900">{p.name}</p>{p.sku && <p className="text-xs text-gray-400">SKU: {p.sku}</p>}</div>
                        </div>
                      </td>
                      <td className="text-sm">{p.category}</td>
                      <td className="text-sm font-semibold">₨{Number(p.price).toLocaleString()}</td>
                      <td className="text-sm">{p.salePrice ? `₨${Number(p.salePrice).toLocaleString()}` : '—'}</td>
                      <td className="text-sm">{p.stock}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td><div className="flex gap-1"><button onClick={() => setEditProduct(p)} className="btn-ghost btn-icon"><Edit2 size={14} /></button><button onClick={() => setDeleteId(p._id)} className="btn-ghost btn-icon text-red-400"><Trash2 size={14} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
        <Pagination page={page} pages={pagination.pages || 1} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Product">
        <ProductForm loading={createMutation.isPending} onSubmit={(fd) => createMutation.mutate(fd)} />
      </Modal>
      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title="Edit Product">
        {editProduct && <ProductForm defaultValues={{ ...editProduct, tags: editProduct.tags?.join(', ') || '' }} loading={updateMutation.isPending} onSubmit={(fd) => updateMutation.mutate({ id: editProduct._id, fd })} />}
      </Modal>
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} title="Delete Product" message="This product will be permanently deleted." />
    </div>
  );
}
