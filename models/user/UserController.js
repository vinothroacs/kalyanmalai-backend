const db = require("../../config/db");

/**
 * ============================
 * CHECK FORM STATUS
 * ============================
 */
exports.checkFormStatus = async (req, res) => {
  const userId = req.user.id;

  const [rows] = await db.query(
    "SELECT status, reject_reason FROM user_forms WHERE user_id = ?",
    [userId]
  );

  if (rows.length === 0) {
    return res.json({ status: null, reject_reason: null });
  }

  res.json({
    status: rows[0].status,
    reject_reason: rows[0].reject_reason || null,
  });
};

/**
 * ============================
 * GET ACCOUNT DETAILS
 * ============================
 */
exports.getAccountDetails = async (req, res) => {
  const [rows] = await db.query(
    `
    SELECT
      u.id AS user_id,
      u.email,
      f.full_name_en,
      f.gender,
      f.location,
      f.occupation_en AS work,
      f.income_en AS salary,
      f.profile_photo
    FROM users u
    LEFT JOIN user_forms f ON f.user_id = u.id
    WHERE u.id = ?
    `,
    [req.user.id]
  );

  res.json(rows[0]);
};

/**
 * ============================
 * UPDATE ACCOUNT DETAILS (SAFE)
 * ============================
 */
exports.updateAccountDetails = async (req, res) => {
  const userId = req.user.id;

  const [columns] = await db.query("SHOW COLUMNS FROM user_forms");
  const validColumns = columns.map(c => c.Field);

  const cleanData = {};
  Object.keys(req.body).forEach(key => {
    if (validColumns.includes(key)) {
      cleanData[key] = req.body[key];
    }
  });

  await db.query(
    "UPDATE user_forms SET ? WHERE user_id = ?",
    [cleanData, userId]
  );

  res.json({ success: true });
};

/**
 * ============================
 * 🔥 GET MATCHES (CARD VIEW)
 * ============================
 */
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user.id;

    const [[me]] = await db.query(
      "SELECT gender FROM user_forms WHERE user_id = ? AND status = 'approved'",
      [userId]
    );

    if (!me || !me.gender) {
      return res.status(400).json({ message: "Profile incomplete" });
    }

    const oppositeGender = me.gender === "Male" ? "Female" : "Male";

    const [rows] = await db.query(
      `
      SELECT 
        u.id,
        f.occupation_en AS work,
        f.income_en AS salary,
        f.location,
        f.profile_photo
      FROM users u
      JOIN user_forms f ON f.user_id = u.id
      WHERE 
        u.status = 'active'
        AND f.status = 'approved'
        AND f.gender = ?
        AND u.id != ?
      `,
      [oppositeGender, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch matches" });
  }
};

/**
 * ============================
 * ❤️ SEND CONNECTION REQUEST
 * ============================
 */
exports.sendConnectionRequest = async (req, res) => {
  const senderId = req.user.id;
  const { receiverId } = req.body;

  await db.query(
    "INSERT INTO connections (sender_id, receiver_id) VALUES (?, ?)",
    [senderId, receiverId]
  );

  res.json({ success: true });
};

/**
 * ============================
 * 🔓 GET FULL PROFILE (24H ONLY)
 * ============================
 */
exports.getFullProfile = async (req, res) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;

  const [[conn]] = await db.query(
    `
    SELECT id FROM connections
    WHERE status = 'approved'
      AND expires_at > NOW()
      AND (
        (sender_id = ? AND receiver_id = ?)
        OR
        (sender_id = ? AND receiver_id = ?)
      )
    `,
    [userId, otherUserId, otherUserId, userId]
  );

  if (!conn) {
    return res.status(403).json({ message: "No active connection" });
  }

  const [[profile]] = await db.query(
    `
    SELECT
      u.id, u.email,
      f.*
    FROM users u
    JOIN user_forms f ON f.user_id = u.id
    WHERE u.id = ?
    `,
    [otherUserId]
  );

  res.json(profile);
};

/**
 * ============================
 * 🔔 GET USER NOTIFICATIONS
 * ============================
 */
exports.getUserNotifications = async (req, res) => {
  const userId = req.user.id;

  const [rows] = await db.query(
    "SELECT id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );

  res.json(rows);
};

/**
 * ============================
 * ✔️ MARK NOTIFICATIONS READ
 * ============================
 */
exports.markNotificationsRead = async (req, res) => {
  const userId = req.user.id;

  await db.query(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
    [userId]
  );

  res.json({ success: true });
};

/**
 * ============================
 * 🔗 GET MY CONNECTIONS (FIXED)
 * ============================
 */
exports.getMyConnections = async (req, res) => {
  const userId = req.user.id;

  const [rows] = await db.query(
    `
    SELECT
      c.id AS connection_id,
      CASE
        WHEN c.sender_id = ? THEN rf.user_id
        ELSE sf.user_id
      END AS other_user_id,
      CASE
        WHEN c.sender_id = ? THEN rf.full_name_en
        ELSE sf.full_name_en
      END AS name,
      c.expires_at
    FROM connections c
    JOIN user_forms sf ON sf.user_id = c.sender_id
    JOIN user_forms rf ON rf.user_id = c.receiver_id
    WHERE
      c.status = 'approved'
      AND c.expires_at > NOW()
      AND (c.sender_id = ? OR c.receiver_id = ?)
    `,
    [userId, userId, userId, userId]
  );

  res.json(rows);
};

/**
 * ============================
 * 📝 SUBMIT / UPDATE USER FORM (FINAL SAFE VERSION)
 * ============================
 */
exports.submitForm = async (req, res) => {
  try {
    console.log("🔥 SUBMIT FORM HIT 🔥");

    const userId = req.user.id;

    // DB-la irukkura columns mattum allow pannum
    const [columns] = await db.query("SHOW COLUMNS FROM user_forms");
    const validColumns = columns.map(c => c.Field);

    const cleanData = {};
    Object.keys(req.body).forEach(key => {
      if (validColumns.includes(key)) {
        cleanData[key] = req.body[key];
      }
    });

    // files
    if (req.files?.profile_photo?.[0]) {
      cleanData.profile_photo = req.files.profile_photo[0].filename;
    }

    if (req.files?.horoscope?.[0]) {
      cleanData.horoscope = req.files.horoscope[0].filename;
    }

    const formData = {
      ...cleanData,
      user_id: userId,
      status: "pending",
    };

    await db.query(
      `INSERT INTO user_forms SET ?
       ON DUPLICATE KEY UPDATE ?`,
      [formData, formData]
    );

    res.json({ success: true });
  } catch (err) {
  console.error("🔥 REAL ERROR 🔥", err);
  return res.status(500).json({
    message: err.message,
    sql: err.sqlMessage,
  });
}

}