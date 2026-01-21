const express = require("express");
const router = express.Router();
const AdminController = require("./AdminController");
const { verifyToken, authorizeRoles } = require("../../middleware/authmiddle");

// =======================
// 📝 PENDING FORMS
// =======================
router.get(
  "/forms/pending",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.getPendingForms
);

router.put(
  "/forms/:formId/approve",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.approveForm
);

router.put(
  "/forms/:formId/reject",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.rejectForm
);

// =======================
// 👥 ALL USERS
// =======================
router.get(
  "/users",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.getAllUsers
);

router.put(
  "/users/:userId/deactivate",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.deactivateUser
);

// =======================
// 🔗 CONNECTIONS
// =======================

// GET pending connections
router.get(
  "/connections/pending",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.getPendingConnections
);

// APPROVE connection
router.put(
  "/connections/:connectionId/approve",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.approveConnection
);

// REJECT connection
router.put(
  "/connections/:connectionId/reject",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.rejectConnection
);

module.exports = router;
