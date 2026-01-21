const express = require("express");
const router = express.Router();

// ✅ MUST destructure
const AuthController = require("./AuthController");

router.post("/login", AuthController.login);
router.post("/register", AuthController.register);

module.exports = router;
