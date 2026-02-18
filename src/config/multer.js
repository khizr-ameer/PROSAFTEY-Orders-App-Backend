const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

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
  params: {
    folder: "factory-orders",
    allowed_formats: [
      "jpg", "jpeg", "png", "webp",
      "pdf", "doc", "docx",
      "xlsx", "xls", "csv", // ✅ Added Excel and CSV
    ],
    resource_type: "auto", // Handles images, PDFs, documents automatically
    public_id: (req, file) => {
      const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return uniqueName;
    },
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
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    // ✅ Excel formats
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // ✅ CSV format
    "text/csv",
    "application/csv",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new Error("Only images, PDF, Word, Excel, and CSV files are allowed"),
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});