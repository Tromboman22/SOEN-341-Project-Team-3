import Application from "../models/Application.js";

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
