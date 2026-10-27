import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import recruiterRoutes from "./routes/recruiterRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();

const app = express();
app.use(cors({ origin: 'https://dreamy-stroopwafel-ddde76.netlify.app', credentials: true }));
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "OK" }));
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/profile", profileRoutes);

// error handler (multer errors included)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() =>
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`))
  )
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
