import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.js";
import {
  createJob,
  listMyJobs,
  updateJob,
  deleteJob,
  listJobApplications,
  updateApplicationStatus,
  getApplicantResume,
  getStats,
} from "../controllers/recruiterController.js";

const router = Router();
router.use(protect, requireRole("recruiter"));

router.get("/stats", getStats);

router.route("/jobs").get(listMyJobs).post(createJob);
router.route("/jobs/:id").put(updateJob).delete(deleteJob);
router.get("/jobs/:id/applications", listJobApplications);

router.patch("/applications/:id", updateApplicationStatus);
router.get("/applications/:id/resume", getApplicantResume);

export default router;
