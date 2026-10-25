import mongoose from "mongoose";
import User, { ROLES } from "./User.js";

const applicantSchema = new mongoose.Schema({
    headline: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    skills: { type: [String], default: [] },
    links: {
        linkedin: { type: String, trim: true, default: "" },
        github: { type: String, trim: true, default: "" },
        portfolio: { type: String, trim: true, default: "" },
    },
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
        bio: this.bio,
        location: this.location,
        phone: this.phone,
        skills: this.skills,
        links: this.links,
        resume: this.resume?.filename ? this.resume : null,
    };
};

export default User.discriminator(ROLES.APPLICANT, applicantSchema);