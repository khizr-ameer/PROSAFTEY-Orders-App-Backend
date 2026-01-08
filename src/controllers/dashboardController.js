const Client = require("../models/Client");
const User = require("../models/User");
const SampleOrder = require("../models/SampleOrder");
const PurchaseOrder = require("../models/PurchaseOrder");

exports.getOwnerDashboardStats = async (req, res) => {
  try {
    /* ================= COUNTS ================= */
    const totalClients = await Client.countDocuments();

    const totalStaff = await User.countDocuments({ role: "STAFF" });

    /* ================= ORDERS ================= */
    const activeSampleOrders = await SampleOrder.countDocuments({
      status: { $ne: "Completed" },
    });

    const activePurchaseOrders = await PurchaseOrder.countDocuments({
      status: { $ne: "Completed" },
    });

    const completedSampleOrders = await SampleOrder.countDocuments({
      status: "Completed",
    });

    const completedPurchaseOrders = await PurchaseOrder.countDocuments({
      status: "Completed",
    });

    const activeOrders = activeSampleOrders + activePurchaseOrders;
    const completedOrders =
      completedSampleOrders + completedPurchaseOrders;

    /* ================= STATUS BREAKDOWN ================= */
    const sampleStatus = await SampleOrder.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const purchaseStatus = await PurchaseOrder.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusBreakdown = {};

    [...sampleStatus, ...purchaseStatus].forEach((item) => {
      statusBreakdown[item._id] =
        (statusBreakdown[item._id] || 0) + item.count;
    });

    /* ================= PAYMENTS ================= */
    const pendingPayments = await PurchaseOrder.countDocuments({
      paymentReceived: { $lt: 100 },
    });

    /* ================= DUE SOON ================= */
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    const dueSoonOrders = await SampleOrder.countDocuments({
      productionDueDate: { $lte: threeDaysLater },
      status: { $ne: "Completed" },
    });

    res.json({
      totalClients,
      totalStaff,
      activeOrders,
      completedOrders,
      statusBreakdown,
      pendingPayments,
      dueSoonOrders,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({
      message: "Failed to load dashboard stats",
    });
  }
};
