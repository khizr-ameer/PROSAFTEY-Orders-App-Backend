const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

// ==================== 
// IP WHITELIST MIDDLEWARE
// ====================
const ipWhitelist = (req, res, next) => {
  // Load allowed IPs from environment variable
  // In Render dashboard, set: ALLOWED_IPS=your_home_ip,factory_ip
  const ALLOWED_IPS = process.env.ALLOWED_IPS?.split(",").map((ip) => ip.trim()) || [];

  // Get real client IP (Render uses proxies so we check x-forwarded-for first)
  const clientIP =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket.remoteAddress;

  console.log(`Incoming request from IP: ${clientIP}`); // helpful for debugging

  // If ALLOWED_IPS is empty (not set), block everything as a safety measure
  if (ALLOWED_IPS.length === 0) {
    return res.status(403).json({ message: "Access denied: no IPs configured" });
  }

  if (ALLOWED_IPS.includes(clientIP)) {
    next(); // IP is allowed, continue to route
  } else {
    console.warn(`Blocked request from unauthorized IP: ${clientIP}`);
    return res.status(403).json({ message: "Access denied: unauthorized location" });
  }
};

// ==================== 
// MIDDLEWARES
// ====================

// Enable CORS
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());

// Apply IP whitelist to ALL routes globally
// Make sure this comes AFTER cors and express.json() but BEFORE your routes
app.use(ipWhitelist);

// ==================== 
// ROUTES
// ====================

// 1. Root Route (The "Welcome" Message)
app.get("/", (req, res) => {
  res.send("API is running successfully!");
});

// Auth routes (login / create staff)
app.use("/api/auth", require("./routes/user.routes"));

// Import auth middleware
const { auth } = require("./middleware/auth");

// Protected routes (require JWT)
app.use("/api/clients", auth, require("./routes/client.routes"));
app.use("/api/samples", auth, require("./routes/sample.routes"));
app.use("/api/purchase-orders", auth, require("./routes/purchase.routes"));

// Dashboard
app.use("/api/dashboard", auth, require("./routes/dashboardRoutes"));

// ==================== 
// 404 Handler
// ====================
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ==================== 
// Error Handler
// ====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error", error: err.message });
});

module.exports = app;