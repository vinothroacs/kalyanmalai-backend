// backend/models/user/UserController.js
const db = require("../../config/db");

/* ============================
   CHECK FORM STATUS
============================ */
exports.checkFormStatus = async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch status" });
  }
};

/* ============================
   GET ACCOUNT DETAILS
============================ */
exports.getAccountDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      "SELECT * FROM user_forms WHERE user_id = ?",
      [userId]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================
   UPDATE ACCOUNT DETAILS
============================ */
exports.updateAccountDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const allowedFields = [
      "full_name_en",
      "gender",
      "location",
      "occupation_en",
      "income_en",
      "dob",
      "birth_time",
      "birth_place",
      "kuladeivam",
      "education_en",
      "father_name_en",
      "mother_name_en",
      "siblings",
      "own_house",
      "raasi_en",
      "dosham",
      "phone",
      "kalyanamalai_interest",
    ];

    const cleanData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        cleanData[field] = req.body[field];
      }
    });

    if (!Object.keys(cleanData).length) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const setClause = Object.keys(cleanData)
      .map((f) => `${f} = ?`)
      .join(", ");

    await db.query(
      `UPDATE user_forms SET ${setClause} WHERE user_id = ?`,
      [...Object.values(cleanData), userId]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================
   GET MATCHES
============================ */
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user.id;

    const [[me]] = await db.query(
      "SELECT gender FROM user_forms WHERE user_id = ? AND status = 'approved'",
      [userId]
    );

    if (!me?.gender) {
      return res.status(400).json({ message: "Profile incomplete" });
    }

    const oppositeGender = me.gender === "Male" ? "Female" : "Male";

    const [rows] = await db.query(
      `
      SELECT
        u.id,
        f.full_name_en,
        f.occupation_en,
        f.location,
        f.profile_photo
      FROM users u
      JOIN user_forms f ON f.user_id = u.id
      WHERE f.gender = ?
        AND f.status = 'approved'
        AND u.id != ?
      `,
      [oppositeGender, userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch matches" });
  }
};

/* ============================
   SEND CONNECTION REQUEST
============================ */
exports.sendConnectionRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    const [[existing]] = await db.query(
      "SELECT id FROM connections WHERE sender_id = ? AND receiver_id = ?",
      [senderId, receiverId]
    );

    if (existing) {
      return res.status(400).json({ message: "Already requested" });
    }

    await db.query(
      `
      INSERT INTO connections
        (sender_id, receiver_id, status, created_at)
      VALUES (?, ?, 'pending', NOW())
      `,
      [senderId, receiverId]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Request failed" });
  }
};

/* ============================
   GET FULL PROFILE (APPROVED ONLY)
============================ */
exports.getFullProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    const [[connection]] = await db.query(
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

    if (!connection) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [[profile]] = await db.query(
      `
      SELECT
        u.email,
        f.*
      FROM users u
      JOIN user_forms f ON f.user_id = u.id
      WHERE u.id = ?
      `,
      [otherUserId]
    );

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/* ============================
   NOTIFICATIONS
============================ */
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `
      SELECT id, message, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to update notifications" });
  }
};

/* ============================
   ❤️ MY CONNECTIONS (FULL DETAILS)
============================ */
exports.getMyConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `
      SELECT
        c.id AS connection_id,
        c.approved_at,
        c.expires_at,
        f.*
      FROM connections c
      JOIN user_forms f
        ON f.user_id = (
          CASE
            WHEN c.sender_id = ? THEN c.receiver_id
            ELSE c.sender_id
          END
        )
      WHERE
        c.status = 'approved'
        AND c.expires_at > NOW()
        AND (c.sender_id = ? OR c.receiver_id = ?)
      ORDER BY c.approved_at DESC
      `,
      [userId, userId, userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch connections" });
  }
};

/* ============================
   SUBMIT USER FORM
============================ */
exports.submitForm = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Allowed DB columns (24 fields only)
    const allowedFields = [
      "full_name_en",
      "gender",
      "dob",
      "phone",
      "email",
      "address_en",
      "religion_en",
      "caste_en",
      "gothram_en",
      "star_en",
      "raasi_en",
      "height",
      "weight",
      "complexion_en",
      "education_en",
      "occupation_en",
      "income_en",
      "father_name_en",
      "mother_name_en",
      "siblings",
      "location",
      "marital_status",
      "birth_time",
      "birth_place",
      "kuladeivam",
      "own_house",
      "kalyanamalai_interest"
    ];

    const cleanData = {};

    // ✅ BODY DATA
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        cleanData[field] = req.body[field];
      }
    });

    // ✅ FILES
    if (req.files?.profile_photo?.[0]) {
      cleanData.profile_photo = req.files.profile_photo[0].filename;
    }

    if (req.files?.horoscope?.[0]) {
      cleanData.horoscope = req.files.horoscope[0].filename;
    }

    cleanData.status = "pending";

    // 🔎 Check existing form
    const [[existing]] = await db.query(
      "SELECT id FROM user_forms WHERE user_id = ?",
      [userId]
    );

    if (existing) {
      // UPDATE
      await db.query(
        "UPDATE user_forms SET ? WHERE user_id = ?",
        [cleanData, userId]
      );
    } else {
      // INSERT
      await db.query(
        "INSERT INTO user_forms SET ?",
        [{ ...cleanData, user_id: userId }]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("FORM SUBMIT ERROR:", err);
    res.status(500).json({ message: "Form submit failed" });
  }
};

/* ============================
   DELETE USER PROFILE (SOFT)
============================ */
exports.deleteAccountDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      `
      UPDATE user_forms
      SET
        status = 'deleted',
        reject_reason = NULL,
        full_name_en = NULL,
        gender = NULL,
        location = NULL,
        occupation_en = NULL,
        income_en = NULL,
        profile_photo = NULL,
        horoscope = NULL
      WHERE user_id = ?
      `,
      [userId]
    );

    res.json({ success: true, message: "Profile deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
};
