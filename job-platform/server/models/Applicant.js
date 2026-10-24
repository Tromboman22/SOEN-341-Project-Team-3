import mongoose from "mongoose";
import User, { ROLES } from "./User.js";

const applicantSchema = new mongoose.Schema({
  headline: { type: String, trim: true, default: "" },
  resume: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: Date,
  },
});

applicantSchema.methods.toPublic = function () {
  return {
    ...User.schema.methods.toPublic.call(this),
    headline: this.headline,
    resume: this.resume?.filename ? this.resume : null,
  };
};

export default User.discriminator(ROLES.APPLICANT, applicantSchema);
