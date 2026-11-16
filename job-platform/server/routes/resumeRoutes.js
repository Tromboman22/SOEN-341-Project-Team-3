import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { getResumeSuggestions } from "../controllers/aiResumeController.js";
import {
  uploadResume,
  getResume,
  deleteResume,
} from "../controllers/resumeController.js";

const router = Router();

router.post(
  "/",
  protect,
  requireRole("applicant"),
  upload.single("resume"),
  uploadResume
);

router.get("/", protect, requireRole("applicant"), getResume);

router.delete("/", protect, requireRole("applicant"), deleteResume);



router.get("/suggestions", protect, requireRole("applicant"), getResumeSuggestions);

export default router;