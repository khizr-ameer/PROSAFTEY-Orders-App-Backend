const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ====================
// MIDDLEWARES
// ====================

// Enable CORS for frontend (adjust origin as needed)
app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,
  })
);

// Parse JSON requests
app.use(express.json());

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);


// ====================
// ROUTES
// ====================

// Auth routes (login / create staff)
app.use("/api/auth", require("./routes/user.routes"));

// Import auth middleware
const { auth } = require("./middleware/auth");

// Protected routes (require JWT)
app.use("/api/clients", auth, require("./routes/client.routes"));
app.use("/api/samples", auth, require("./routes/sample.routes"));
app.use("/api/purchase-orders", auth, require("./routes/purchase.routes"));

//Dasboard 
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
