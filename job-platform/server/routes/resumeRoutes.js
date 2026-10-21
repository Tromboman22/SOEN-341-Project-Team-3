import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { uploadResume, getResume } from "../controllers/resumeController.js";

const router = Router();
router.post("/", protect, upload.single("resume"), uploadResume);
router.get("/", protect, getResume);

export default router;