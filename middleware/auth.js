const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Please log in first." });
  }

  try {
    const secret = require("../secret");
    req.user = jwt.verify(header.slice(7), secret);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Session expired or invalid. Please log in again." });
  }
}

function adminOnly(req, res, next) {
  // DB stores role as 'Admin' — compare case-insensitively
  const role = req.user && req.user.role ? String(req.user.role).trim().toLowerCase() : "";
  if (role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }
  next();
}

module.exports = { auth, adminOnly };
