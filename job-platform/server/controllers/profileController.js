import Applicant from "../models/Applicant.js";
import Recruiter from "../models/Recruiter.js";
import JobPosting from "../models/JobPosting.js";
import { ROLES } from "../models/User.js";

// ---------- limits ----------

export const LIMITS = Object.freeze({
  name: 80,
  headline: 120,
  bio: 2000,
  location: 100,
  phone: 30,
  skill: 50,
  skillsCount: 30,
  url: 200,
  companyName: 100,
  position: 100,
  companyBio: 2000,
});

const LINK_KEYS = ["linkedin", "github", "portfolio"];
const PHONE_RE = /^[0-9+()\-.\s]*$/;

// ---------- field helpers ----------
// Each helper returns the cleaned value, or throws a ProfileError with a
// message that is safe to show to the user.

class ProfileError extends Error {}

const text = (value, field, max, { required = false } = {}) => {
  if (typeof value !== "string")
    throw new ProfileError(`${field} must be text`);
  const v = value.trim();
  if (required && !v) throw new ProfileError(`${field} cannot be empty`);
  if (v.length > max)
    throw new ProfileError(`${field} must be ${max} characters or fewer`);
  return v;
};

const phone = (value) => {
  const v = text(value, "Phone", LIMITS.phone);
  if (!PHONE_RE.test(v))
    throw new ProfileError(
      "Phone can only contain digits, spaces and + - ( ) ."
    );
  return v;
};

// Empty string is allowed (clears the link). "linkedin.com/in/x" becomes
// "https://linkedin.com/in/x". Anything that isn't http(s) is rejected, so a
// stored link can never be a javascript: URL.
const url = (value, field) => {
  let v = text(value, field, LIMITS.url);
  if (!v) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = `https://${v}`;
  let parsed;
  try {
    parsed = new URL(v);
  } catch {
    throw new ProfileError(`${field} must be a valid URL`);
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes("."))
    throw new ProfileError(`${field} must be a valid http(s) URL`);
  return v;
};

// Accepts "React, Node" or ["React", "Node"]. Trims, drops blanks and
// case-insensitive duplicates (keeps the first spelling).
const skills = (value) => {
  let list;
  if (typeof value === "string") list = value.split(",");
  else if (Array.isArray(value)) list = value;
  else throw new ProfileError("Skills must be a list or comma-separated text");

  const seen = new Set();
  const out = [];
  for (const raw of list) {
    if (typeof raw !== "string")
      throw new ProfileError("Each skill must be text");
    const s = raw.trim();
    if (!s) continue;
    if (s.length > LIMITS.skill)
      throw new ProfileError(
        `Each skill must be ${LIMITS.skill} characters or fewer`
      );
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  if (out.length > LIMITS.skillsCount)
    throw new ProfileError(`You can list up to ${LIMITS.skillsCount} skills`);
  return out;
};

// Only known keys are kept; keys not sent keep their current value.
const links = (value, current = {}) => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new ProfileError("Links must be an object");
  const names = { linkedin: "LinkedIn", github: "GitHub", portfolio: "Portfolio" };
  const out = {};
  for (const k of LINK_KEYS) {
    out[k] = value[k] !== undefined ? url(value[k], names[k]) : current?.[k] || "";
  }
  return out;
};

// ---------- validation ----------

/**
 * Turns a request body into a safe update object for the given role.
 * Fields that are not listed for the role (email, password, role, resume, _id
 * ...) are ignored, so they can't be changed through this endpoint.
 *
 * @returns {{ updates: object } | { error: string }}
 */
export const validateProfileUpdate = (body, role, current = {}) => {
  try {
    const b = body && typeof body === "object" ? body : {};
    const u = {};

    // shared fields
    if (b.name !== undefined) u.name = text(b.name, "Name", LIMITS.name, { required: true });
    if (b.location !== undefined) u.location = text(b.location, "Location", LIMITS.location);
    if (b.phone !== undefined) u.phone = phone(b.phone);

    if (role === ROLES.RECRUITER) {
      if (b.companyName !== undefined)
        u.companyName = text(b.companyName, "Company name", LIMITS.companyName, { required: true });
      if (b.position !== undefined) u.position = text(b.position, "Position", LIMITS.position);
      if (b.companyWebsite !== undefined) u.companyWebsite = url(b.companyWebsite, "Company website");
      if (b.companyBio !== undefined) u.companyBio = text(b.companyBio, "About the company", LIMITS.companyBio);
    } else {
      if (b.headline !== undefined) u.headline = text(b.headline, "Headline", LIMITS.headline);
      if (b.bio !== undefined) u.bio = text(b.bio, "Bio", LIMITS.bio);
      if (b.skills !== undefined) u.skills = skills(b.skills);
      if (b.links !== undefined) u.links = links(b.links, current.links);
    }

    return { updates: u };
  } catch (err) {
    if (err instanceof ProfileError) return { error: err.message };
    throw err;
  }
};

// ---------- handlers ----------

// GET /api/profile
export const getProfile = async (req, res) => {
  try {
    // req.user is already the right Applicant/Recruiter instance (see protect)
    res.json({ profile: req.user.toPublic() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    const role = req.user.role || ROLES.APPLICANT; // legacy users = applicant
    const Model = role === ROLES.RECRUITER ? Recruiter : Applicant;

    const user = await Model.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const result = validateProfileUpdate(req.body, role, user);
    if (result.error) return res.status(400).json({ message: result.error });

    const oldCompany = user.companyName;
    user.set(result.updates);
    await user.save();

    // Job postings store the company name, so keep them in sync
    if (role === ROLES.RECRUITER && user.companyName !== oldCompany) {
      await JobPosting.updateMany(
        { recruiter: user._id },
        { company: user.companyName }
      );
    }

    res.json({ message: "Profile updated", profile: user.toPublic() });
  } catch (err) {
    if (err.name === "ValidationError")
      return res.status(400).json({ message: err.message });
    res.status(500).json({ message: "Could not update profile" });
  }
};
