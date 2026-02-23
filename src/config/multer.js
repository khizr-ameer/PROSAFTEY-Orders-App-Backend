const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const path = require("path"); // ✅ needed to extract extension

// ====================
// Configure Cloudinary
// ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ====================
// Storage config (Cloudinary)
// ====================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isImage = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype);
    const isPDF = file.mimetype === "application/pdf";
    const resourceType = isImage || isPDF ? "auto" : "raw";

    // ✅ Preserve the original file extension in the public_id
    const ext = path.extname(file.originalname).toLowerCase(); // e.g. ".xlsx"
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;

    return {
      folder: "factory-orders",
      resource_type: resourceType,
      public_id: uniqueName, // ✅ now saves as e.g. "1740234567-123456789.xlsx"
    };
  },
});

// ====================
// File filter
// ====================
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",                                                          // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",    // .docx
    "application/vnd.ms-excel",                                                   // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",          // .xlsx
    "text/csv",                                                                   // .csv
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new Error("Only images, PDF, Word, and Excel documents are allowed"),
      false
    );
  }
  cb(null, true);
};

// ====================
// Export multer
// ====================
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 40 * 1024 * 1024 }, // 10MB limit
});