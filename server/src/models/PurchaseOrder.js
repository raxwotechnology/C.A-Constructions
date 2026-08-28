const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  itemCode: { type: String, default: '' },
  category: { type: String, default: 'Hardware' },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, default: 'Units' },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true, uppercase: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    siteName: { type: String, default: '' },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date },
    items: [poItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    deliveryStatus: {
      type: String,
      enum: ['Pending', 'Received'],
      default: 'Pending',
    },
    deliveredAt: { type: Date },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
