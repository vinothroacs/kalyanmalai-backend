const db = require("../../config/db");

/* =====================================================
   📝 GET PENDING USER FORMS
===================================================== */
exports.getPendingForms = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        uf.id AS form_id,
        uf.user_id,
        uf.full_name_en,
        uf.gender,
        uf.phone,
        u.email AS user_email
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
        u.id,
        u.name AS user_name,
        u.email,
        f.gender,
        u.status
      FROM users u
      LEFT JOIN user_forms f ON f.user_id = u.id
      WHERE u.role = '2'
      ORDER BY u.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

/* =====================================================
   👁 ADMIN VIEW FULL USER PROFILE
===================================================== */
exports.getUserFullProfile = async (req, res) => {
  const { userId } = req.params;

  try {
    const [[profile]] = await db.query(
      `
      SELECT 
        u.email,
        u.phone,
        u.gender,
        u.marital_status,
        u.status,
        f.*
      FROM users u
      LEFT JOIN user_forms f ON f.user_id = u.id
      WHERE u.id = ?
      `,
      [userId]
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // File URLs
    if (profile.profile_photo) {
      profile.profile_photo = `http://localhost:5000/uploads/${profile.profile_photo}`;
    }

    if (profile.horoscope) {
      profile.horoscope = `http://localhost:5000/uploads/${profile.horoscope}`;
    }

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch full profile" });
  }
};




/* =====================================================
   🔁 UPDATE USER STATUS (ACTIVE / INACTIVE)
===================================================== */
exports.updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body; // 'active' | 'inactive'

  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    await db.query(
      "UPDATE users SET status = ? WHERE id = ? AND role = '2'",
      [status, userId]
    );

    res.json({ success: true, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Status update failed" });
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
        c.sender_id,
        c.receiver_id,
        sf.full_name_en AS sender_name,
        rf.full_name_en AS receiver_name,
        c.status,
        c.created_at
      FROM connections c
      INNER JOIN user_forms sf ON sf.user_id = c.sender_id
      INNER JOIN user_forms rf ON rf.user_id = c.receiver_id
      WHERE c.status = 'pending'
        AND sf.status = 'approved'
        AND rf.status = 'approved'
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

/* =====================================================
   📊 ADMIN DASHBOARD STATS (USER GROWTH)
===================================================== */
/* =====================================================
   📊 ADMIN DASHBOARD STATS
===================================================== */
/* =====================================================
   📊 ADMIN DASHBOARD STATS (ALL COUNTS)
===================================================== */
exports.getDashboardStats = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS totalUsers,
        SUM(LOWER(TRIM(status)) = 'active') AS activeUsers,
        SUM(LOWER(TRIM(status)) = 'inactive') AS inactiveUsers,
        SUM(gender = 'Male') AS maleUsers,
        SUM(gender = 'Female') AS femaleUsers
      FROM users
      WHERE role = 2
    `);

    res.json({
      labels: ["Users"],
      totalUsers: rows[0].totalUsers,
      activeUsers: rows[0].activeUsers,
      inactiveUsers: rows[0].inactiveUsers,
      maleUsers: rows[0].maleUsers,
      femaleUsers: rows[0].femaleUsers,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Dashboard stats failed" });
  }
};
