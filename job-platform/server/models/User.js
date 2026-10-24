import mongoose from "mongoose";

/**
 * Base user. Applicant and Recruiter extend this via Mongoose discriminators,
 * so all users live in ONE "users" collection and are told apart by `role`.
 *
 *   User.findById(id)        -> returns an Applicant or Recruiter instance
 *   Applicant.find()         -> only applicants
 *   Recruiter.find()         -> only recruiters
 */
const baseOptions = {
  discriminatorKey: "role",
  timestamps: true,
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
  },
  baseOptions
);

// Safe shape to send to the client (never includes the password)
userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role || "applicant", // legacy users created before roles existed
  };
};

export const ROLES = Object.freeze({
  APPLICANT: "applicant",
  RECRUITER: "recruiter",
});

export default mongoose.model("User", userSchema);
