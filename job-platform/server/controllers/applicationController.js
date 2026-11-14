import Application from "../models/Application.js";
import {
  computeApplicantAnalytics,
  INTERVALS,
  isValidTimeZone,
} from "../services/applicantAnalytics.js";

// Only the authenticated applicant can view their own applications.
export const listMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .populate("job", "title company location type remote status")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ applications });
  } catch (err) {
    res.status(500).json({ message: "Could not load applications" });
  }
};

// GET /api/applications/my/analytics?interval=week|month&tz=America/Toronto
// Status breakdown and activity metrics for the logged-in applicant.
// `tz` is the browser's IANA time zone, so weeks and months follow the
// user's calendar instead of the server's (UTC on Render).
export const getMyAnalytics = async (req, res) => {
  try {
    const interval = req.query?.interval ?? "week";
    if (typeof interval !== "string" || !Object.hasOwn(INTERVALS, interval))
      return res.status(400).json({ message: "interval must be week or month" });

    const timeZone = req.query?.tz ?? "UTC";
    if (!isValidTimeZone(timeZone))
      return res.status(400).json({ message: "Invalid time zone" });

    const applications = await Application.find({ applicant: req.user._id })
      .select("status createdAt")
      .lean();

    res.json(
      computeApplicantAnalytics(applications, { interval, timeZone, now: new Date() })
    );
  } catch (err) {
    res.status(500).json({ message: "Could not load analytics" });
  }
};
