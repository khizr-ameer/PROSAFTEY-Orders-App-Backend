const router = require("express").Router();
const controller = require("../controllers/user.controller");
const { auth, ownerOnly } = require("../middleware/auth"); 

// Public route
router.post("/login", controller.login);

// Owner-only routes
router.post("/staff", auth, ownerOnly, controller.createStaff);
router.patch("/change-password", auth, controller.changePassword);
router.patch("/reset-password/:id", auth, ownerOnly, controller.resetStaffPassword);
router.get("/users", auth, ownerOnly, controller.getAllUsers);
// Staff management (OWNER)
router.get("/getstaff", auth, ownerOnly, controller.getStaff);
router.delete("/staff/:id", auth, ownerOnly, controller.deleteStaff);

// user.routes.js
router.get("/me", auth, controller.getCurrentUser);

module.exports = router;
