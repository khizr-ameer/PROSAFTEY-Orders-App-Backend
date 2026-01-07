const SampleOrder = require("../models/SampleOrder");

// ===============================
// CREATE Sample Order
// ===============================
exports.createSampleOrder = async (req, res) => {
  try {
    const data = req.body;

    if (!data.sampleName || !data.clientId) {
      return res.status(400).json({ message: "sampleName and clientId are required" });
    }

    // ===============================
    // Handle file uploads
    // ===============================
    if (req.files) {
      if (req.files.techPack) {
        data.techPackFile = `uploads/${req.files.techPack[0].filename}`.replace(/\\/g, "/");
      }
      if (req.files.pattern) {
        data.patternFile = `uploads/${req.files.pattern[0].filename}`.replace(/\\/g, "/");
      }
      if (req.files.graphic) {
        data.graphicFile = `uploads/${req.files.graphic[0].filename}`.replace(/\\/g, "/");
      }
    }

    data.paymentReceived = data.paymentReceived ? Number(data.paymentReceived) : 0;

    // ===============================
    // Parse sizes safely
    // ===============================
    if (data.sizes) {
      try {
        if (typeof data.sizes === "string") data.sizes = JSON.parse(data.sizes);
        for (const key in data.sizes) data.sizes[key] = Number(data.sizes[key] || 0);
      } catch (err) {
        return res.status(400).json({ message: "Invalid sizes format", error: err.message });
      }
    }

    const sample = await SampleOrder.create(data);
    res.status(201).json(sample);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ===============================
// GET all samples for a client
// ===============================
exports.getSamplesByClient = async (req, res) => {
  try {
    const samples = await SampleOrder.find({ clientId: req.params.clientId }).sort({ createdAt: -1 });
    res.json(samples);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ===============================
// GET single sample
// ===============================
exports.getSampleById = async (req, res) => {
  try {
    const sample = await SampleOrder.findById(req.params.id);
    res.json(sample);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ===============================
// UPDATE Sample Order (files + data)
// ===============================
exports.updateSampleOrder = async (req, res) => {
  try {
    const updateData = req.body;

    // ===============================
    // Handle file uploads
    // ===============================
    if (req.files) {
      // These field names must match multer.fields in your route
      if (req.files.techPackFile) {
        updateData.techPackFile = `uploads/${req.files.techPackFile[0].filename}`.replace(/\\/g, "/");
      }
      if (req.files.patternFile) {
        updateData.patternFile = `uploads/${req.files.patternFile[0].filename}`.replace(/\\/g, "/");
      }
      if (req.files.graphicFile) {
        updateData.graphicFile = `uploads/${req.files.graphicFile[0].filename}`.replace(/\\/g, "/");
      }
    }

    if (updateData.paymentReceived) {
      updateData.paymentReceived = Number(updateData.paymentReceived);
    }

    const updated = await SampleOrder.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ===============================
// UPDATE Sample Status only
// ===============================
exports.updateSampleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const sample = await SampleOrder.findById(req.params.id);
    if (!sample) {
      return res.status(404).json({ message: "Sample order not found" });
    }

    sample.status = status;
    sample.statusUpdatedBy = {
      email: req.user.email,
      role: req.user.role,
    };
    sample.statusUpdatedAt = new Date();

    await sample.save();

    res.json(sample);
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};


// ===============================
// DELETE Sample Order
// ===============================
exports.deleteSampleOrder = async (req, res) => {
  try {
    await SampleOrder.findByIdAndDelete(req.params.id);
    res.json({ message: "Sample order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};
  