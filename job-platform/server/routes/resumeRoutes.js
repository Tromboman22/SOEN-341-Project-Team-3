import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
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

export default router;