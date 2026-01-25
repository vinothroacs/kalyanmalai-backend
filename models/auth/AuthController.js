const db = require("../../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendSignupMail = require("../../utils/sendSignupMail");

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔒 Validation
    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 📱 Mobile or Email
    const isMobile = /^[0-9]{10}$/.test(email);

    const query = isMobile
      ? "SELECT * FROM users WHERE mobile = ? LIMIT 1"
      : "SELECT * FROM users WHERE email = ? LIMIT 1";

    const [rows] = await db.query(query, [email]);

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    // 🔐 Password check
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ ROLE FIX (IMPORTANT)
    // DB: role = 1 (admin), role = 2 (user)
    const roleId = Number(user.role);

    // 🔥 Check user form only for USERS
    let hasSubmittedForm = false;

    if (roleId === 2) {
      const [forms] = await db.query(
        "SELECT id FROM user_forms WHERE user_id = ? LIMIT 1",
        [user.id]
      );
      hasSubmittedForm = forms.length > 0;
    }

    // 🎫 JWT
    const token = jwt.sign(
      { id: user.id, roleId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // // ✅ FINAL RESPONSE
    // return res.json({
    //   token,
    //   user: {
    //     roleId,            // 1 = admin, 2 = user
    //     hasSubmittedForm,  // true / false
    //   },
    // });
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,        // Render HTTPS
      sameSite: "none",    // Netlify ↔ Render
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

return res.json({
  success: true,
  token,   // 🔥 ADD THIS LINE
  user: {
    roleId,
    hasSubmittedForm,
  },
});



  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;

    // 🔒 Validation
    if (!fullName || !email || !mobile || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 🔍 Check existing user
    const [exist] = await db.query(
      "SELECT id FROM users WHERE email = ? OR mobile = ?",
      [email, mobile]
    );

    if (exist.length) {
      return res.status(409).json({ message: "User already exists" });
    }

   // // 🔐 Hash password
    const hash = await bcrypt.hash(password, 10);

    // ✅ Insert USER (role = 2)
    await db.query(
      `INSERT INTO users (name, email, mobile, password, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fullName, email, mobile, hash, 2, "active"]
    );

    // 📧 Send signup mail (non-blocking)
    sendSignupMail(email, fullName).catch(() => {});

    return res.status(201).json({ message: "Registered successfully" });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
