import Applicant from "../models/Applicant.js";
import Recruiter from "../models/Recruiter.js";
import { ROLES } from "../models/User.js";

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

// Fields each role may edit through PUT /api/profile
const APPLICANT_FIELDS = ["headline", "bio", "location", "phone", "skills", "links"];
const RECRUITER_FIELDS = [
  "companyName",
  "position",
  "companyWebsite",
  "companyBio",
  "location",
  "phone",
];

export const getProfile = async (req, res) => {
  try {
    // req.user is already the correct discriminator instance from `protect`
    res.json({ profile: req.user.toPublic() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const isApplicant = (req.user.role || ROLES.APPLICANT) === ROLES.APPLICANT;
    const Model = isApplicant ? Applicant : Recruiter;
    const allowed = isApplicant ? APPLICANT_FIELDS : RECRUITER_FIELDS;

    const user = await Model.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updates = pick(req.body, allowed);

    // Normalize skills: accept "a, b, c" string or array of strings
    if (isApplicant && updates.skills !== undefined) {
      if (typeof updates.skills === "string") {
        updates.skills = updates.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (!Array.isArray(updates.skills)) {
        delete updates.skills;
      }
    }

    // Normalize links object: only keep known keys, coerce to string
    if (isApplicant && updates.links && typeof updates.links === "object") {
      const known = ["linkedin", "github", "portfolio"];
      updates.links = known.reduce((acc, k) => {
        if (updates.links[k] !== undefined) {
          acc[k] = String(updates.links[k]).trim();
        } else if (user.links?.[k] !== undefined) {
          acc[k] = user.links[k];
        }
        return acc;
      }, {});
    }

    // Recruiter must keep a non-empty companyName
    if (!isApplicant && updates.companyName !== undefined && !updates.companyName.trim()) {
      return res.status(400).json({ message: "Company name cannot be empty" });
    }

    Object.assign(user, updates);
    await user.save();

    res.json({ message: "Profile updated", profile: user.toPublic() });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};