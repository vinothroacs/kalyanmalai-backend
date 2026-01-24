// backend/models/user/UserRoutes.js  ✅ FIXED & COMPLETE
const express = require("express");
const router = express.Router();

const UserController = require("./UserController");
// const { verifyToken } = require("../../middleware/authmiddle");

const { verifyToken, authorizeRoles } = require("../../middleware/authmiddle");
const upload = require("../../middleware/upload");

/* =========================
   USER FORM
========================= */

// 📝 SUBMIT / UPDATE FORM
router.post(
  "/forms",
  verifyToken,
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "horoscope", maxCount: 1 },
  ]),
  UserController.submitForm
);

// 🔍 FORM STATUS
router.get(
  "/forms/status",
  verifyToken,
  UserController.checkFormStatus
);

/* =========================
   ACCOUNT
========================= */

// 👤 GET ACCOUNT DETAILS
router.get(
  "/account-details",
  verifyToken,
  UserController.getAccountDetails
);

// ✏️ UPDATE ACCOUNT DETAILS
router.put(
  "/account-details",
  verifyToken,
  UserController.updateAccountDetails
);

// 🗑️ DELETE ACCOUNT (SOFT)
router.delete(
  "/account-details",
  verifyToken,
  UserController.deleteAccountDetails
);

/* =========================
   MATCHES & CONNECTIONS
========================= */

// 🔥 MATCHES
router.get(
  "/matches",
  verifyToken,
  UserController.getMatches
);

// ❤️ SEND CONNECTION REQUEST
router.post(
  "/connect/request",
  verifyToken,
  UserController.sendConnectionRequest
);

// ❤️ MY CONNECTIONS (APPROVED)
router.get(
  "/connections",
  verifyToken,
  UserController.getMyConnections
);

// 👁 FULL PROFILE (ONLY APPROVED CONNECTION)
router.get(
  "/connect/full-profile/:otherUserId",
  verifyToken,
  UserController.getFullProfile
);

/* =========================
   NOTIFICATIONS
========================= */

// 🔔 GET NOTIFICATIONS
router.get(
  "/notifications",
  verifyToken,
  UserController.getUserNotifications
);

// ✅ MARK AS READ
router.put(
  "/notifications/mark-read",
  verifyToken,
  UserController.markNotificationsRead
);

// user/UserRoutes.js
router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles(2), // user
  (req, res) => {
    res.json({ message: "User dashboard" });
  }
);

module.exports = router;
