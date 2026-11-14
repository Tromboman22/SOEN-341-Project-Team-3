import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { generateDeadlineReminders } from "../services/notificationService.js";

export async function listNotifications(req, res) {
  try {
    if ((req.user.role || "applicant") === "applicant") await generateDeadlineReminders(req.user._id);
    const recipient = req.user._id;
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient }).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ recipient, read: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (err) { res.status(500).json({ message: "Could not load notifications" }); }
}

export async function markRead(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Notification not found" });
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id }, { $set: { read: true } }, { new: true });
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ notification });
  } catch (err) { res.status(500).json({ message: "Could not update notification" }); }
}

export async function markAllRead(req, res) {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
    res.json({ message: "All notifications marked as read" });
  } catch (err) { res.status(500).json({ message: "Could not update notifications" }); }
}
