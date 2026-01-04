const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyName: String,
  phone: { type: String, required: true },
  email: String,
  address: String,
  notes: String
}, { timestamps: true });

module.exports = mongoose.model("Client", clientSchema);
