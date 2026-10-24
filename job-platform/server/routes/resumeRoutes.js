import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { uploadResume, getResume } from "../controllers/resumeController.js";

const router = Router();
router.post(
  "/",
  protect,
  requireRole("applicant"),
  upload.single("resume"),
  uploadResume
);
router.get("/", protect, requireRole("applicant"), getResume);

export default router;
