const mongoose = require('mongoose');
require('dotenv').config();
const PortfolioItem = require('./src/models/PortfolioItem');
const Service = require('./src/models/Service');

const STATIC_PROJECTS = [
  { title: 'Colombo Commercial High-Rise Tower', category: 'Structural', tech: ['Reinforced Concrete', 'Post-Tensioned Slabs', 'Curtain Wall Cladding'], desc: '28-story luxury commercial high-rise tower in Colombo 03 featuring basement parking and green building design.', colorFrom: '#3b82f6', colorTo: '#1d4ed8', result: 'Completed 2 months ahead of schedule' },
  { title: 'Kandy Luxury Residential Villas Complex', category: 'Residential', tech: ['Retaining Walls', 'Timber Roofing', 'Smart MEP'], desc: '14-villa luxury gated community in Kandy featuring eco-friendly retaining walls and architectural finishes.', colorFrom: '#a855f7', colorTo: '#7e22ce', result: '100% SLS 573 Compliant' },
  { title: 'Galle Highway & Overpass Extension', category: 'Infrastructure', tech: ['Earthworks', 'Bridge Girders', 'Asphalt Paving'], desc: 'Civil engineering highway extension including 4-lane overpass bridges and heavy earthwork excavation.', colorFrom: '#22c55e', colorTo: '#15803d', result: 'Zero Safety Incidents' },
  { title: 'Gampaha Industrial Warehouse Complex', category: 'Industrial', tech: ['Pre-Engineered Steel', 'Industrial Flooring', 'MEP Racks'], desc: '120,000 sq ft industrial logistics warehouse built with heavy pre-engineered steel frames and heavy-duty concrete floors.', colorFrom: '#f97316', colorTo: '#c2410c', result: '30% cost efficiency gain' },
  { title: 'Negombo Beach Resort Structural Upgrade', category: 'Commercial', tech: ['Deep Piling', 'Waterproofing', 'HVAC MEP'], desc: 'Structural retrofitting and luxury beachfront hotel expansion built to withstand coastal corrosion.', colorFrom: '#ef4444', colorTo: '#b91c1c', result: 'SBD-03 Compliant Execution' },
];

const STATIC_SERVICES = [
  {
    icon: 'FiLayers', title: 'Earthworks & Foundation Piling', colorFrom: '#3b82f6', colorTo: '#2563eb',
    description: 'Professional site excavation, mass earthworks, slope stabilization, sheet piling, and bored piling for commercial & residential foundations.',
    features: ['Mass Excavation & Earth Cutting', 'Bored Piling & Sheet Piling', 'Retaining Wall Construction', 'Soil Stabilization'],
    priceText: 'From LKR 450,000'
  },
  {
    icon: 'FiBriefcase', title: 'Structural & Concrete Construction', colorFrom: '#22c55e', colorTo: '#16a34a',
    description: 'Turnkey structural concrete framing, post-tensioned slabs, steel structures, and multi-story building construction.',
    features: ['Reinforced Concrete Framing', 'Post-Tensioned Slabs', 'Structural Steel Fabrication', 'Bridge & Infrastructure Concrete'],
    priceText: 'From LKR 1,500,000'
  },
  {
    icon: 'FiZap', title: 'MEP (Mechanical, Electrical, Plumbing)', colorFrom: '#a855f7', colorTo: '#9333ea',
    description: 'Comprehensive MEP engineering including high-voltage wiring, HVAC air conditioning, plumbing riser stacks, and fire safety systems.',
    features: ['HVAC & Air Distribution', 'High Voltage & Electrical Distribution', 'Plumbing Riser Stacks', 'Fire Suppression Systems'],
    priceText: 'From LKR 800,000'
  },
  {
    icon: 'FiHome', title: 'Architectural Finishing & Interiors', colorFrom: '#f97316', colorTo: '#ea580c',
    description: 'High-end architectural finishes, luxury tiling, aluminum curtain wall cladding, partition walls, and interior fit-outs.',
    features: ['Granite & Porcelain Tiling', 'Aluminum Glass Cladding', 'Gypsum Partitions & Ceiling', 'Waterproofing Systems'],
    priceText: 'From LKR 600,000'
  },
  {
    icon: 'FiTruck', title: 'Construction Material & Machinery Supply', colorFrom: '#ef4444', colorTo: '#dc2626',
    description: 'Direct supply of ReadyMix concrete, Tokyo cement, Melwa steel, sand cubes, excavators, tower cranes, and heavy machinery rental.',
    features: ['ReadyMix Concrete & Cement', 'Tor Steel & Rebar Supply', 'Excavator & Crane Sub-leasing', 'Digital GRN Tracking'],
    priceText: 'Daily / Unit Rates'
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  await PortfolioItem.deleteMany({});
  for (let i = 0; i < STATIC_PROJECTS.length; i++) {
    const p = STATIC_PROJECTS[i];
    await PortfolioItem.create({
      title: p.title,
      category: p.category,
      technologies: p.tech,
      description: p.desc,
      colorFrom: p.colorFrom,
      colorTo: p.colorTo,
      result: p.result,
      order: i,
    });
  }
  console.log('Seeded Construction PortfolioItems');

  await Service.deleteMany({});
  for (let i = 0; i < STATIC_SERVICES.length; i++) {
    const s = STATIC_SERVICES[i];
    await Service.create({
      icon: s.icon,
      title: s.title,
      description: s.description,
      features: s.features,
      priceText: s.priceText,
      colorFrom: s.colorFrom,
      colorTo: s.colorTo,
      order: i,
    });
  }
  console.log('Seeded Construction Services');

  mongoose.connection.close();
}

if (require.main === module) {
  seed();
}
