const express = require("express");
const cors = require("cors");

const app = express();

/* ✅ CORS – ONLY ONCE */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://kalyanamalai.netlify.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* ✅ Body parsers */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ✅ Routes */
app.use("/api/v1/auth", require("./models/auth/AuthRoutes"));
app.use("/api/v1/user", require("./models/user/UserRoutes"));
app.use("/api/v1/admin", require("./models/admin/AdminRoutes"));

app.get("/", (req, res) => {
  res.send("API running...");
});

module.exports = app;
