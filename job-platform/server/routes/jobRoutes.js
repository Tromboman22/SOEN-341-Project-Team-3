import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { listOpenJobs, getJob, applyToJob } from "../controllers/jobController.js";

const router = Router();
router.get("/", listOpenJobs);
router.get("/:id", getJob);
router.post("/:id/apply", protect, requireRole("applicant"), applyToJob);

export default router;
