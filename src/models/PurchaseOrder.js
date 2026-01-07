const mongoose = require("mongoose");

/* =========================
   Product Schema
   (Each product ALWAYS has sizes)
========================= */
const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
  },

  // Total quantity (auto-calculated from sizes in controller)
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },

  // Dynamic & user-defined sizes
  sizes: [
    {
      sizeName: {
        type: String, // XS, M, 32, Free Size, etc.
        required: true,
        trim: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],

  productImage: {
    type: String,
  },
});

/* =========================
   Purchase Order Schema
========================= */
const purchaseOrderSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    poNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    products: {
      type: [productSchema],
      required: true,
    },

    invoiceFile: {
      type: String,
    },

    trackingNumber: {
      type: String,
    },

    status: {
      type: String,
      enum: [
        "Tech Pack Received",
        "Cutting",
        "Production",
        "Quality Control",
        "Completed",
      ],
      default: "Tech Pack Received",
    },

    paymentReceived: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===== Track who updated status =====
    statusUpdatedBy: {
      email: String,
      role: String, 
    },
    statusUpdatedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
