import mongoose from "mongoose";
import User, { ROLES } from "./User.js";

const recruiterSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  position: { type: String, trim: true, default: "Recruiter" },
  companyWebsite: { type: String, trim: true, default: "" },
});

recruiterSchema.methods.toPublic = function () {
  return {
    ...User.schema.methods.toPublic.call(this),
    companyName: this.companyName,
    position: this.position,
    companyWebsite: this.companyWebsite,
  };
};

export default User.discriminator(ROLES.RECRUITER, recruiterSchema);
