import mongoose from "mongoose";
import JobPosting from "../models/JobPosting.js";
import Application from "../models/Application.js";

// ---------- public / applicant side ----------

// GET /api/jobs?search=&type=&remote=
export const listOpenJobs = async (req, res) => {
  try {
    const { search, type, remote } = req.query;
    const filter = { status: "open" };
    if (type) filter.type = type;
    if (remote === "true") filter.remote = true;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { company: rx }, { location: rx }];
    }
    const jobs = await JobPosting.find(filter).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs/:id
export const getJob = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Job not found" });
    const job = await JobPosting.findOne({
      _id: req.params.id,
      status: "open",
    });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/jobs/:id/apply   (applicants only)
export const applyToJob = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Job not found" });
    const job = await JobPosting.findOne({
      _id: req.params.id,
      status: "open",
    });
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.deadline && job.deadline < new Date())
      return res.status(400).json({ message: "Application deadline has passed" });

    const application = await Application.create({
      job: job._id,
      applicant: req.user._id,
      coverLetter: req.body.coverLetter,
    });
    res.status(201).json({ application });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "You already applied to this job" });
    res.status(500).json({ message: err.message });
  }
};
