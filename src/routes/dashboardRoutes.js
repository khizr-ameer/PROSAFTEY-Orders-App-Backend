const express = require("express");
const router = express.Router();
const { getOwnerDashboardStats } = require("../controllers/dashboardController");
const { auth, ownerOnly } = require("../middleware/auth");

router.get("/owner", auth,  getOwnerDashboardStats);

module.exports = router;
