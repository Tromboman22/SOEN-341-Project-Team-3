import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { listMyApplications, getMyAnalytics } from "../controllers/applicationController.js";

const router = Router();
router.get("/my", protect, requireRole("applicant"), listMyApplications);
router.get("/my/analytics", protect, requireRole("applicant"), getMyAnalytics);
export default router;
