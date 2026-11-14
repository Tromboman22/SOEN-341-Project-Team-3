import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["new_application", "status_update", "interview_invitation", "deadline_reminder"], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: "JobPosting" },
  application: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
  read: { type: Boolean, default: false },
  dedupeKey: { type: String },
}, { timestamps: true });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } });
export default mongoose.model("Notification", notificationSchema);
