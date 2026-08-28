const Service = require('../models/Service');
const PortfolioItem = require('../models/PortfolioItem');

exports.getServices = async (req, res, next) => {
  try {
    const query = req.user?.role === 'admin' ? {} : { active: true };
    const services = await Service.find(query).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: services.length, services });
  } catch (err) { next(err); }
};

exports.createService = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      features: Array.isArray(req.body.features)
        ? req.body.features
        : String(req.body.features || '').split(',').map((s) => s.trim()).filter(Boolean),
    };
    const service = await Service.create(payload);
    res.status(201).json({ success: true, service });
  } catch (err) { next(err); }
};

exports.updateService = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      ...(req.body.features !== undefined ? {
        features: Array.isArray(req.body.features)
          ? req.body.features
          : String(req.body.features || '').split(',').map((s) => s.trim()).filter(Boolean),
      } : {}),
    };
    const service = await Service.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, service });
  } catch (err) { next(err); }
};

exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) { next(err); }
};

exports.getPortfolioItems = async (req, res, next) => {
  try {
    const query = req.user?.role === 'admin' ? {} : { active: true };
    const items = await PortfolioItem.find(query).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: items.length, items });
  } catch (err) { next(err); }
};

exports.createPortfolioItem = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      technologies: Array.isArray(req.body.technologies)
        ? req.body.technologies
        : String(req.body.technologies || '').split(',').map((s) => s.trim()).filter(Boolean),
    };
    const item = await PortfolioItem.create(payload);
    res.status(201).json({ success: true, item });
  } catch (err) { next(err); }
};

exports.updatePortfolioItem = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      ...(req.body.technologies !== undefined ? {
        technologies: Array.isArray(req.body.technologies)
          ? req.body.technologies
          : String(req.body.technologies || '').split(',').map((s) => s.trim()).filter(Boolean),
      } : {}),
    };
    const item = await PortfolioItem.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    res.json({ success: true, item });
  } catch (err) { next(err); }
};

exports.deletePortfolioItem = async (req, res, next) => {
  try {
    const item = await PortfolioItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    res.json({ success: true, message: 'Portfolio item deleted' });
  } catch (err) { next(err); }
};

