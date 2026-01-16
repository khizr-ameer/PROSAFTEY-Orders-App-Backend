const router = require("express").Router();
const { auth } = require("../middleware/auth");
const upload = require("../config/multer");

const {
  createPurchaseOrder,
  getPurchaseByClient,
  getPurchaseById,
  getAllPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseStatus,
  deletePurchaseOrder,
  downloadPurchaseCSV
} = require("../controllers/purchase.controller");

// Protect all routes
router.use(auth);

// Create purchase order
router.post(
  "/",
  upload.fields([
    { name: "invoice", maxCount: 1 },
    { name: "productImages", maxCount: 20 },
  ]),
  createPurchaseOrder
);

// Get all purchase orders for a client
router.get("/client/:clientId", getPurchaseByClient);

// Get single purchase order
router.get("/:id", getPurchaseById);

// Get all purchase orders
router.get("/", getAllPurchaseOrders);

// Download CSV of a purchase order
router.get("/:id/download-csv", downloadPurchaseCSV);

// Update full purchase order (WITH FILES)
router.put(
  "/:id",
  upload.fields([
    { name: "invoice", maxCount: 1 },
    { name: "productImages", maxCount: 20 },
  ]),
  updatePurchaseOrder
);

// Update purchase status only
router.patch("/:id/status", updatePurchaseStatus);

// Delete purchase order
router.delete("/:id", deletePurchaseOrder);




module.exports = router;
