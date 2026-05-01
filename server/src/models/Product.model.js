const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  salePrice: { type: Number },
  stock: { type: Number, default: 0 },
  sku: { type: String, unique: true, sparse: true },
  images: [{ type: String }],
  tags: [{ type: String }],
  status: { type: String, enum: ['active', 'inactive', 'out_of_stock'], default: 'active' },
  featured: { type: Boolean, default: false },
  specifications: [{ key: String, value: String }],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
