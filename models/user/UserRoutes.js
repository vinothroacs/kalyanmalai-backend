const express = require("express");
const router = express.Router();

const UserController = require("./UserController");
const { verifyToken } = require("../../middleware/authmiddle");
const upload = require("../../middleware/upload");

// 📝 SUBMIT FORM
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

// 👤 ACCOUNT DETAILS
router.get(
  "/account-details",
  verifyToken,
  UserController.getAccountDetails
);

router.put(
  "/account-details",
  verifyToken,
  UserController.updateAccountDetails
);

// 🔥 MATCHES
router.get(
  "/matches",
  verifyToken,
  UserController.getMatches
);

// ❤️ CONNECTION REQUEST
router.post(
  "/connect/request",
  verifyToken,
  UserController.sendConnectionRequest
);

// 🔓 FULL PROFILE
router.get(
  "/connect/full-profile/:otherUserId",
  verifyToken,
  UserController.getFullProfile
);

// 🔔 NOTIFICATIONS
router.get(
  "/notifications",
  verifyToken,
  UserController.getUserNotifications
);

router.put(
  "/notifications/mark-read",
  verifyToken,
  UserController.markNotificationsRead
);

// ❤️ CONNECTIONS
router.get(
  "/connections",
  verifyToken,
  UserController.getMyConnections
);

module.exports = router;
