import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { listMyApplications } from "../controllers/applicationController.js";

const router = Router();
router.get("/my", protect, requireRole("applicant"), listMyApplications);
export default router;
