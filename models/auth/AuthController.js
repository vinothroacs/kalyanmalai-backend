const db = require("../../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = rows[0];

 if (user.status === "inactive") {
  return res.status(403).json({
    message: "Your profile is waiting for admin approval",
  });
}


    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name_en: user.full_name_en,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.register = async (req, res) => {
  const { email, password, full_name_en } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (email, password, full_name_en, role) VALUES (?, ?, ?, 'user')",
      [email, hash, full_name_en]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
};
