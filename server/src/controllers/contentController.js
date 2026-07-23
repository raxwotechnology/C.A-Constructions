const Service = require('../models/Service');
const PortfolioItem = require('../models/PortfolioItem');

// ── SERVICES ──────────────────────────────────────────────────────────────────

exports.getServices = async (req, res, next) => {
  try {
    const isPrivileged = ['admin', 'manager'].includes(req.user?.role);
    const query = isPrivileged ? { archived: { $ne: true } } : { active: true, archived: { $ne: true } };
    let services = await Service.find(query).sort({ order: 1, createdAt: -1 });

    if (services.length === 0) {
      const defaultServices = [
        {
          title: 'Architectural & Structural Design',
          description: 'Full architectural planning, 2D floor plans, 3D elevation designs, and structural engineering calculations.',
          category: 'Architecture',
          priceText: 'Custom Estimate',
          priceType: 'custom',
          features: ['2D Floor Plans & 3D Elevations', 'Structural Engineering', 'Council Drawing Approvals'],
          active: true,
          order: 1,
          type: 'service',
        },
        {
          title: 'Residential & Commercial Construction',
          description: 'Complete turnkey building construction with high-grade materials, quality assurance, and site supervision.',
          category: 'Construction',
          priceText: 'Per Sq. Ft. Estimate',
          priceType: 'custom',
          features: ['Turnkey Construction', 'Foundation to Roof', 'Site Supervision', 'Quality Materials'],
          active: true,
          order: 2,
          type: 'service',
        },
        {
          title: 'Interior Design & Remodeling',
          description: '3D interior rendering, custom ceiling & pantry designs, lighting concepts, and luxury home renovation.',
          category: 'Interior',
          priceText: 'Custom Quote',
          priceType: 'custom',
          features: ['3D Interior Renderings', 'Pantry & Cabinetry Design', 'Full Home Remodeling'],
          active: true,
          order: 3,
          type: 'service',
        },
        {
          title: 'Quantity Surveying & BOQ Estimation',
          description: 'Detailed Bill of Quantities (BOQ), material requirement calculations, and accurate project budgeting.',
          category: 'Estimation',
          priceText: 'Per Project',
          priceType: 'one-time',
          features: ['Detailed BOQ Preparation', 'Material Cost Estimation', 'Budget Planning'],
          active: true,
          order: 4,
          type: 'service',
        },
      ];
      services = await Service.create(defaultServices);
    }

    res.json({ success: true, count: services.length, services });
  } catch (err) { next(err); }
};

exports.getPublicServices = async (req, res, next) => {
  try {
    const services = await Service.find({ active: true, archived: { $ne: true } }).sort({ order: 1, createdAt: -1 });
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

exports.archiveService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { archived: true, active: false }, { new: true });
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

// ── PACKAGE MANAGEMENT ────────────────────────────────────────────────────────

exports.addPackage = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const pkg = {
      name: req.body.name,
      price: Number(req.body.price || 0),
      currency: req.body.currency || 'LKR',
      billingCycle: req.body.billingCycle || 'one-time',
      features: Array.isArray(req.body.features)
        ? req.body.features
        : String(req.body.features || '').split('\n').map(s => s.trim()).filter(Boolean),
      duration: req.body.duration || '',
      discount: Number(req.body.discount || 0),
      promotionLabel: req.body.promotionLabel || '',
      isPopular: req.body.isPopular === true || req.body.isPopular === 'true',
    };

    service.packages.push(pkg);
    await service.save();
    res.status(201).json({ success: true, service });
  } catch (err) { next(err); }
};

exports.updatePackage = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const pkg = service.packages.id(req.params.pkgId);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    const updates = {
      ...req.body,
      ...(req.body.features !== undefined ? {
        features: Array.isArray(req.body.features)
          ? req.body.features
          : String(req.body.features || '').split('\n').map(s => s.trim()).filter(Boolean),
      } : {}),
      ...(req.body.price !== undefined ? { price: Number(req.body.price) } : {}),
      ...(req.body.discount !== undefined ? { discount: Number(req.body.discount) } : {}),
    };

    Object.assign(pkg, updates);
    await service.save();
    res.json({ success: true, service });
  } catch (err) { next(err); }
};

exports.deletePackage = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    service.packages = service.packages.filter(p => String(p._id) !== req.params.pkgId);
    await service.save();
    res.json({ success: true, service });
  } catch (err) { next(err); }
};

// Bulk reorder services
exports.reorderServices = async (req, res, next) => {
  try {
    const { orderedIds } = req.body; // array of ids in new order
    if (!Array.isArray(orderedIds)) return res.status(400).json({ success: false, message: 'orderedIds must be an array' });

    await Promise.all(orderedIds.map((id, idx) =>
      Service.findByIdAndUpdate(id, { order: idx })
    ));
    res.json({ success: true, message: 'Services reordered' });
  } catch (err) { next(err); }
};

// ── PORTFOLIO ─────────────────────────────────────────────────────────────────

exports.getPortfolioItems = async (req, res, next) => {
  try {
    const isPrivileged = ['admin', 'manager'].includes(req.user?.role);
    const query = isPrivileged ? {} : { active: true };
    const items = await PortfolioItem.find(query).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: items.length, items });
  } catch (err) { next(err); }
};

exports.getPublicPortfolio = async (req, res, next) => {
  try {
    const items = await PortfolioItem.find({ active: true }).sort({ order: 1, createdAt: -1 });
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
