import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { ROLES } from "../models/User.js";
import Applicant from "../models/Applicant.js";
import Recruiter from "../models/Recruiter.js";

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

export const me = async (req, res) => {
  res.json({ user: req.user.toPublic() });
};
