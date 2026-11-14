import Notification from "../models/Notification.js";
import Application from "../models/Application.js";

export async function notify(data) {
  try {
    if (data.dedupeKey) {
      await Notification.updateOne({ recipient: data.recipient, dedupeKey: data.dedupeKey }, { $setOnInsert: data }, { upsert: true });
    } else {
      await Notification.create(data);
    }
  } catch (error) {
    // Notifications should never turn a successful application/status update into a failure.
    console.error("Notification creation failed:", error);
  }
}

export async function generateDeadlineReminders(userId, now = new Date()) {
  const until = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const applications = await Application.find({ applicant: userId })
    .populate({ path: "job", match: { status: "open", deadline: { $gt: now, $lte: until } }, select: "title deadline" });
  for (const application of applications) {
    if (!application.job) continue;
    const job = application.job;
    await notify({ recipient: userId, type: "deadline_reminder", title: "Upcoming job deadline",
      message: `The deadline for ${job.title} is ${job.deadline.toLocaleDateString()}.`,
      job: job._id, application: application._id,
      dedupeKey: `deadline:${job._id}:${job.deadline.toISOString()}` });
  }
}
