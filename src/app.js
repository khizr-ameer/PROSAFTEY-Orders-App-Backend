const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ====================
// MIDDLEWARES
// ====================

// Enable CORS
// UPDATED: Allows all origins for now so you can test. 
// Later, change origin to your actual deployed frontend URL (e.g., "https://prosafety.netlify.app")
app.use(
  cors({
    origin: "*", 
    credentials: true,
  })
);

app.use(express.json()); // <--- IMPORTANT: You likely forgot this line! (Needed to read JSON body)

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