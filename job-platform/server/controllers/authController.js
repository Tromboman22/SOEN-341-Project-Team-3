import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import User, { ROLES } from "../models/User.js";
import Applicant from "../models/Applicant.js";
import Recruiter from "../models/Recruiter.js";
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from "../services/passwordResetEmail.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export const hashResetToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export const register = async (req, res) => {
  try {
    const { name, email, password, role = ROLES.APPLICANT, companyName } =
      req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });
    if (![ROLES.APPLICANT, ROLES.RECRUITER].includes(role))
      return res.status(400).json({ message: "Invalid role" });
    if (role === ROLES.RECRUITER && !companyName?.trim())
      return res
        .status(400)
        .json({ message: "Company name is required for recruiters" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user =
      role === ROLES.RECRUITER
        ? await Recruiter.create({
            name,
            email,
            password: hashed,
            companyName,
          })
        : await Applicant.create({ name, email, password: hashed });

    res.status(201).json({
      token: generateToken(user._id),
      user: user.toPublic(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      token: generateToken(user._id),
      user: user.toPublic(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const requestPasswordReset = async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ message: "A valid email is required" });

  if (!isPasswordResetEmailConfigured())
    return res
      .status(503)
      .json({ message: "Password reset email is not configured" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: PASSWORD_RESET_MESSAGE });

    const resetToken = randomBytes(32).toString("hex");
    const resetPasswordToken = hashResetToken(resetToken);
    const resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await User.findByIdAndUpdate(user._id, {
      $set: { resetPasswordToken, resetPasswordExpires },
    });

    try {
      await sendPasswordResetEmail({ to: user.email, token: resetToken });
    } catch (error) {
      await User.updateOne(
        { _id: user._id, resetPasswordToken },
        { $unset: { resetPasswordToken: "", resetPasswordExpires: "" } }
      );
      console.error("Password reset email delivery failed:", error);
      return res
        .status(503)
        .json({ message: "Unable to send a reset email. Please try again later." });
    }

    return res.json({ message: PASSWORD_RESET_MESSAGE });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return res.status(500).json({ message: "Unable to process password reset" });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    return res.status(400).json({ message: "Missing or invalid reset token" });
  if (typeof password !== "string" || password.length < 6)
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });

  try {
    const tokenQuery = {
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpires: { $gt: new Date() },
    };
    if (!(await User.exists(tokenQuery)))
      return res
        .status(400)
        .json({ message: "This reset link is invalid or has expired" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      tokenQuery,
      {
        $set: { password: passwordHash },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
      },
      { new: true, runValidators: true }
    );

    if (!user)
      return res
        .status(400)
        .json({ message: "This reset link is invalid or has expired" });

    return res.json({ message: "Password updated. You can now log in." });
  } catch (error) {
    console.error("Password reset failed:", error);
    return res.status(500).json({ message: "Unable to reset password" });
  }
};

export const me = async (req, res) => {
  res.json({ user: req.user.toPublic() });
};
