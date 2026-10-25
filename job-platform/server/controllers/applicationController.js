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

export const deleteResume = async (req, res) => {
    try {
        const user = await Applicant.findById(req.user._id);
        if (!user) return res.status(403).json({ message: "Applicants only" });

        if (!user.resume?.path) {
            return res.status(404).json({ message: "No resume to delete" });
        }

        // Remove file from disk (ignore if already gone)
        if (fs.existsSync(user.resume.path)) {
            fs.unlinkSync(user.resume.path);
        }

        // Clear the subdocument
        user.resume = undefined;
        await user.save();

        res.json({ message: "Resume deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};