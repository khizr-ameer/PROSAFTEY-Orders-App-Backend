const mongoose = require("mongoose");

const sampleOrderSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },

  sampleName: { type: String, required: true },
  fabricDetails: String,

  techPackFile: String,
  patternFile: String,
  graphicFile: String,

  productionDueDate: Date,
  trackingNumber: String,

  status: {
    type: String,
    enum: [
      "Tech Pack Received",
      "Cutting",
      "Production",
      "Quality Control",
      "Completed"
    ],
    default: "Tech Pack Received"
  },

  paymentReceived: {
    type: Number, // store as % or amount
    default: 0
  }

}, { timestamps: true });

module.exports = mongoose.model("SampleOrder", sampleOrderSchema);
