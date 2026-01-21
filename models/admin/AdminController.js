const db = require("../../config/db");

/* =====================================================
   📝 GET PENDING USER FORMS
===================================================== */
exports.getPendingForms = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        uf.id,
        uf.full_name_en,
        uf.gender,
        uf.location,
        uf.status,
        u.email
      FROM user_forms uf
      JOIN users u ON u.id = uf.user_id
      WHERE uf.status = 'pending'
      ORDER BY uf.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch pending forms" });
  }
};

/* =====================================================
   ✅ APPROVE FORM
===================================================== */
exports.approveForm = async (req, res) => {
  const { formId } = req.params;

  try {
    const [[form]] = await db.query(
      "SELECT user_id FROM user_forms WHERE id = ?",
      [formId]
    );

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    await db.query(
      "UPDATE user_forms SET status='approved' WHERE id=?",
      [formId]
    );

    await db.query(
      "UPDATE users SET status='active' WHERE id=?",
      [form.user_id]
    );

    await db.query(
      "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
      [form.user_id, "🎉 Your profile has been approved by admin"]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Approve failed" });
  }
};

/* =====================================================
   ❌ REJECT FORM
===================================================== */
exports.rejectForm = async (req, res) => {
  const { formId } = req.params;

  try {
    const [[form]] = await db.query(
      "SELECT user_id FROM user_forms WHERE id = ?",
      [formId]
    );

    await db.query(
      "UPDATE user_forms SET status='rejected' WHERE id=?",
      [formId]
    );

    if (form) {
      await db.query(
        "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
        [form.user_id, "❌ Your profile was rejected by admin"]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reject failed" });
  }
};

/* =====================================================
   👥 GET ALL USERS
===================================================== */
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        name AS user_name,
        email,
        gender,
        status
      FROM users
      WHERE role = 'user'
      ORDER BY id DESC
    `);

    res.json(rows); // 👈 IMPORTANT (array only)
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};


/* =====================================================
   🔴 DEACTIVATE USER
===================================================== */
exports.deactivateUser = async (req, res) => {
  const { userId } = req.params;

  try {
    await db.query(
      "UPDATE users SET status='inactive' WHERE id=? AND role='user'",
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Deactivate failed" });
  }
};

/* =====================================================
   🔗 GET PENDING CONNECTION REQUESTS
===================================================== */
exports.getPendingConnections = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.id,
        su.name AS sender_name,
        su.email AS sender_email,
        ru.name AS receiver_name,
        ru.email AS receiver_email,
        c.status,
        c.created_at
      FROM connections c
      JOIN users su ON su.id = c.sender_id
      JOIN users ru ON ru.id = c.receiver_id
      WHERE c.status = 'pending'
      ORDER BY c.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch pending connections" });
  }
};

/* =====================================================
   ✅ APPROVE CONNECTION (24 HOURS)
===================================================== */
exports.approveConnection = async (req, res) => {
  const { connectionId } = req.params;

  try {
    await db.query(
      `
      UPDATE connections
      SET 
        status='approved',
        approved_at=NOW(),
        expires_at=DATE_ADD(NOW(), INTERVAL 24 HOUR)
      WHERE id=?
      `,
      [connectionId]
    );

    const [[conn]] = await db.query(
      "SELECT sender_id, receiver_id FROM connections WHERE id=?",
      [connectionId]
    );

    if (conn) {
      await db.query(
        "INSERT INTO notifications (user_id, message) VALUES (?, ?), (?, ?)",
        [
          conn.sender_id,
          "❤️ Your connection has been approved (valid for 24 hours)",
          conn.receiver_id,
          "❤️ Your connection has been approved (valid for 24 hours)",
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Approve connection failed" });
  }
};

/* =====================================================
   ❌ REJECT CONNECTION
===================================================== */
exports.rejectConnection = async (req, res) => {
  const { connectionId } = req.params;

  try {
    const [[conn]] = await db.query(
      "SELECT sender_id FROM connections WHERE id=?",
      [connectionId]
    );

    await db.query(
      "UPDATE connections SET status='rejected' WHERE id=?",
      [connectionId]
    );

    if (conn) {
      await db.query(
        "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
        [conn.sender_id, "❌ Your connection request was rejected by admin"]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reject connection failed" });
  }
};
