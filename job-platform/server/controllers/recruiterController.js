import fs from "fs";
import mongoose from "mongoose";
import JobPosting from "../models/JobPosting.js";
import Application, { APPLICATION_STATUSES } from "../models/Application.js";
import Applicant from "../models/Applicant.js";

// Only these fields may be set from the request body (blocks mass-assignment
// of `recruiter`, `_id`, etc.)
const EDITABLE = [
  "title",
  "location",
  "remote",
  "type",
  "description",
  "requirements",
  "salaryMin",
  "salaryMax",
  "deadline",
  "status",
];

const pickJobFields = (body) => {
  const data = {};
  for (const key of EDITABLE) if (body[key] !== undefined) data[key] = body[key];
  if (typeof data.requirements === "string")
    data.requirements = data.requirements
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  for (const k of ["salaryMin", "salaryMax", "deadline"])
    if (data[k] === "" || data[k] === null) data[k] = undefined;
  return data;
};

// Find a job only if it belongs to the logged-in recruiter
const ownedJob = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  return JobPosting.findOne({ _id: req.params.id, recruiter: req.user._id });
};

// ---------- jobs ----------

export const createJob = async (req, res) => {
  try {
    const job = await JobPosting.create({
      ...pickJobFields(req.body),
      recruiter: req.user._id,
      company: req.user.companyName,
    });
    res.status(201).json({ job });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const listMyJobs = async (req, res) => {
  try {
    const jobs = await JobPosting.find({ recruiter: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    const counts = await Application.aggregate([
      { $match: { job: { $in: jobs.map((j) => j._id) } } },
      { $group: { _id: "$job", count: { $sum: 1 } } },
    ]);
    const byJob = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
    res.json({
      jobs: jobs.map((j) => ({ ...j, applicationCount: byJob[String(j._id)] || 0 })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await ownedJob(req);
    if (!job) return res.status(404).json({ message: "Job not found" });
    job.set(pickJobFields(req.body));
    await job.save();
    res.json({ job });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await ownedJob(req);
    if (!job) return res.status(404).json({ message: "Job not found" });
    await Application.deleteMany({ job: job._id });
    await job.deleteOne();
    res.json({ message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- applications ----------

export const listJobApplications = async (req, res) => {
  try {
    const job = await ownedJob(req);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const applications = await Application.find({ job: job._id })
      .sort({ createdAt: -1 })
      .populate("applicant", "name email headline resume.originalName resume.size resume.uploadedAt")
      .lean();
    res.json({ job, applications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Loads an application only if its job belongs to this recruiter
const ownedApplication = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  const application = await Application.findById(req.params.id);
  if (!application) return null;
  const job = await JobPosting.findOne({
    _id: application.job,
    recruiter: req.user._id,
  });
  return job ? application : null;
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!APPLICATION_STATUSES.includes(status))
      return res.status(400).json({ message: "Invalid status" });
    const application = await ownedApplication(req);
    if (!application)
      return res.status(404).json({ message: "Application not found" });
    application.status = status;
    await application.save();
    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getApplicantResume = async (req, res) => {
  try {
    const application = await ownedApplication(req);
    if (!application)
      return res.status(404).json({ message: "Application not found" });
    const applicant = await Applicant.findById(application.applicant);
    if (!applicant?.resume?.path || !fs.existsSync(applicant.resume.path))
      return res.status(404).json({ message: "No resume found" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(applicant.resume.originalName)}"`
    );
    fs.createReadStream(applicant.resume.path).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- stats ----------

export const getStats = async (req, res) => {
  try {
    const jobs = await JobPosting.find({ recruiter: req.user._id }, "_id status");
    const jobIds = jobs.map((j) => j._id);
    const byStatus = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const apps = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
    res.json({
      totalJobs: jobs.length,
      openJobs: jobs.filter((j) => j.status === "open").length,
      totalApplications: byStatus.reduce((n, s) => n + s.count, 0),
      applicationsByStatus: apps,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
