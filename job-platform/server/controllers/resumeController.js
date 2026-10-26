import fs from "fs";
import Applicant from "../models/Applicant.js";

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No PDF uploaded" });

    const user = await Applicant.findById(req.user._id);
    if (!user) return res.status(403).json({ message: "Applicants only" });

    // delete the previous file
    if (user.resume?.path && fs.existsSync(user.resume.path)) {
      fs.unlinkSync(user.resume.path);
    }

    user.resume = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      uploadedAt: new Date(),
    };
    await user.save();

    res.json({ message: "Resume uploaded", resume: user.resume });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getResume = async (req, res) => {
  try {
    const user = await Applicant.findById(req.user._id);
    if (!user?.resume?.path || !fs.existsSync(user.resume.path)) {
      return res.status(404).json({ message: "No resume found" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${user.resume.originalName}"`
    );
    fs.createReadStream(user.resume.path).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteResume = async (req, res) => {
  try {
    const user = await Applicant.findById(req.user._id);
    if (!user) return res.status(403).json({ message: "Applicants only" });

    if (!user.resume?.path) {
      return res.status(404).json({ message: "No resume to delete" });
    }

    if (fs.existsSync(user.resume.path)) {
      fs.unlinkSync(user.resume.path);
    }

    user.resume = undefined;
    await user.save();

    res.json({ message: "Resume deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};