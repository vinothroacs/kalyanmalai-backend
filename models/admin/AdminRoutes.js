const express = require("express");
const router = express.Router();
const AdminController = require("./AdminController");
const { verifyToken, authorizeRoles } = require("../../middleware/authmiddle");

const upload = require("../../middleware/upload");


// =======================
// 📝 PENDING FORMS
// =======================
router.get(
  "/forms/pending",
  verifyToken,
  authorizeRoles(1),
  AdminController.getPendingForms
);

router.put(
  "/form/formId/approve",
  verifyToken,
  authorizeRoles(1),
  AdminController.approveForm
);

router.delete(
  "/form/formId/reject",
  verifyToken,
  authorizeRoles(1),
  AdminController.rejectForm
);

// =======================
// 👥 ALL USERS
// =======================
router.get(
  "/users",
  verifyToken,
  authorizeRoles(1),
  AdminController.getAllUsers
);

router.put(
  "/users/:userId/deactivate",
  verifyToken,
  authorizeRoles(1),
  AdminController.deactivateUser
);

// =======================
// 🔗 CONNECTIONS
// =======================

// GET pending connections
router.get(
  "/connections/pending",
  verifyToken,
  authorizeRoles(1),
  AdminController.getPendingConnections
);

// APPROVE connection
router.put(
  "/connections/:connectionId/approve",
  verifyToken,
  authorizeRoles(1),
  AdminController.approveConnection
);

// REJECT connection
router.delete(
  "/connections/:connectionId",
  AdminController.rejectConnection
);

// 🔁 UPDATE USER STATUS (ACTIVE / INACTIVE)
router.put(
  "/users/:userId/status",
  verifyToken,
  authorizeRoles(1),
  AdminController.updateUserStatus
);

// 👁 ADMIN – VIEW USER FULL PROFILE
router.get(
  "/users/:userId/full-profile",
  verifyToken,
  authorizeRoles(1),
  AdminController.getUserFullProfile
);


// 📊 ADMIN DASHBOARD STATS
router.get(
  "/dashboard/stats",
  verifyToken,
  authorizeRoles(1),
  AdminController.getDashboardStats
);

// admin/AdminRoutes.js
router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles(1), // admin
  (req, res) => {
    res.json({ message: "Admin dashboard" });
  }
);


module.exports = router;
