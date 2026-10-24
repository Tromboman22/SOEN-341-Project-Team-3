import mongoose from "mongoose";

export const JOB_TYPES = ["full-time", "part-time", "contract", "internship"];
export const JOB_STATUSES = ["draft", "open", "closed"];

const jobPostingSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, trim: true, default: "" },
    remote: { type: Boolean, default: false },
    type: { type: String, enum: JOB_TYPES, default: "full-time" },
    description: { type: String, required: true, trim: true },
    requirements: { type: [String], default: [] },
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    deadline: { type: Date },
    status: { type: String, enum: JOB_STATUSES, default: "open", index: true },
  },
  { timestamps: true }
);

jobPostingSchema.pre("validate", function (next) {
  if (
    this.salaryMin != null &&
    this.salaryMax != null &&
    this.salaryMin > this.salaryMax
  ) {
    return next(new Error("salaryMin cannot be greater than salaryMax"));
  }
  next();
});

export default mongoose.model("JobPosting", jobPostingSchema);
