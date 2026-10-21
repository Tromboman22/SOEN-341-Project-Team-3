import fs from "fs";
import path from "path";
import User from "../models/User.js";

export const uploadResume = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: "No PDF uploaded" });

        const user = await User.findById(req.user._id);

        // É¾³ı¾É¼òÀúÎÄ¼ş
        if (user.resume?.path && fs.existsSync(user.resume.path)) {
            fs.unlinkSync(user.resume.path);
        }

        user.resume = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            uploadedAt: new Date(),
        };
        await user.save();

        res.json({ message: "Resume uploaded", resume: user.resume });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getResume = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user.resume?.path || !fs.existsSync(user.resume.path)) {
            return res.status(404).json({ message: "No resume found" });
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${user.resume.originalName}"`
        );
        fs.createReadStream(user.resume.path).pipe(res);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};