import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Usage: router.get("/x", protect, requireRole("recruiter"), handler)
// Users created before roles existed have no role and are treated as applicants.
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    const role = req.user?.role || "applicant";
    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden for your role" });
    }
    next();
  };
