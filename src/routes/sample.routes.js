const router = require("express").Router();
const { auth } = require("../middleware/auth");
const upload = require("../config/multer");
const {
  createSampleOrder,
  getSamplesByClient,
  getSampleById,
  getAllSamples,
  updateSampleOrder,
  updateSampleStatus,
  deleteSampleOrder
} = require("../controllers/sample.controller");

// Protect all routes with authentication
router.use(auth);

// Create Sample Order with file uploads
router.post(
  "/",
  upload.fields([
    { name: "techPack", maxCount: 1 },
    { name: "pattern", maxCount: 1 },
    { name: "graphic", maxCount: 1 },
  ]),
  createSampleOrder
);

// Get all samples for a client
router.get("/client/:clientId", getSamplesByClient);

// Get single sample
router.get("/:id", getSampleById);

//get all sample orders
router.get("/", getAllSamples);

// Update full sample with file uploads
router.put(
  "/:id",
  upload.fields([
    { name: "techPackFile", maxCount: 1 },
    { name: "patternFile", maxCount: 1 },
    { name: "graphicFile", maxCount: 1 },
  ]),
  updateSampleOrder
);

// Update status only
router.patch("/:id/status", updateSampleStatus);

// Delete sample
router.delete("/:id", deleteSampleOrder);

module.exports = router;
