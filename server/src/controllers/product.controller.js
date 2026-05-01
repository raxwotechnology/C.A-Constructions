const Product = require('../models/Product.model');

exports.getProducts = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });
    res.json({ success: true, data: products, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createProduct = async (req, res) => {
  try {
    const productData = { ...req.body, createdBy: req.user._id };
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(f => `products/${f.filename}`);
    }
    const product = await Product.create(productData);
    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateProduct = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map(f => `products/${f.filename}`);
    }
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product updated', data: product });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ success: true, data: categories });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
