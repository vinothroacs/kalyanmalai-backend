const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cookieParser());

const cookieParser = require("cookie-parser");

app.use(cookieParser());


/* ✅ STATIC FILES */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ✅ BODY PARSERS (🔥 MUST BE BEFORE ROUTES) */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/* ✅ COOKIE PARSER (🔥 AFTER body parser, BEFORE routes) */
app.use(cookieParser());

/* ✅ CORS */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://kalyanamalai-frontend.onrender.com/",
  
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* ✅ ROUTES */
app.use("/api/v1/auth", require("./models/auth/AuthRoutes"));
app.use("/api/v1/user", require("./models/user/UserRoutes"));
app.use("/api/v1/admin", require("./models/admin/AdminRoutes"));
app.use("/api/user", require("./models/user/UserRoutes"));


app.get("/", (req, res) => {
  res.send("API running...");
});

module.exports = app;
