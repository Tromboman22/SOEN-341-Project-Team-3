import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "OK" }));
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);

// error handler (multer errors included)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() =>
  app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`))
);