import { extractResumeText } from "../utils/extractResumeText.js";
import Applicant from "../models/Applicant.js";

export const getResumeSuggestions = async (req, res) => {
    try {
        // Read env at request time
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

        if (!GEMINI_KEY || GEMINI_KEY === "CHANGE_ME") {
            return res
                .status(500)
                .json({ message: "AI service not configured ¡ª set GEMINI_API_KEY" });
        }

        console.log("1. handler entered");

        const user = await Applicant.findById(req.user._id);
        if (!user?.resume?.path) {
            return res.status(404).json({ message: "No resume uploaded" });
        }
        console.log("2. user loaded, resume path:", user.resume.path);

        // Guard against pdf-parse hanging on malformed PDFs
        let resumeText;
        try {
            resumeText = await Promise.race([
                extractResumeText(user.resume.path),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("PDF extraction timed out")), 15000)
                ),
            ]);
        } catch (err) {
            console.error("PDF extraction failed:", err.message);
            return res
                .status(500)
                .json({ message: "Could not read PDF: " + err.message });
        }
        console.log("3. text extracted, length:", resumeText?.length);

        if (!resumeText || resumeText.trim().length < 50) {
            return res
                .status(400)
                .json({ message: "Could not extract readable text from PDF" });
        }

        const prompt = `You are a resume reviewer. Analyze the following resume text.
Return a JSON object with this exact structure:
{
  "overall_score": number (0-100),
  "strengths": string[] (3 items),
  "improvements": string[] (3-5 actionable items),
  "missing_keywords": string[] (5 likely keywords for the candidate's field that are absent),
  "rewrite_example": { "original": string, "improved": string }
}

IMPORTANT RULES:
- Do NOT invent experience, skills, or achievements.
- Only suggest based on what is present in the text.
- The rewrite example should pick ONE weak bullet point from the resume and improve it using only existing information.

RESUME TEXT:
${resumeText.slice(0, 8000)}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

        const body = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                responseMimeType: "application/json",
            },
        };

        console.log("4. calling Gemini with model:", GEMINI_MODEL);

        // 60-second timeout for Gemini
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        let response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_KEY,
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        } catch (err) {
            if (err.name === "AbortError") {
                console.error("Gemini request timed out after 60s");
                return res.status(504).json({ message: "AI request timed out. Please try again." });
            }
            throw err;
        } finally {
            clearTimeout(timeout);
        }

        console.log("5. Gemini responded with status:", response.status);

        const rawBody = await response.text();

        if (!response.ok) {
            console.error("Gemini API error:", rawBody);
            return res
                .status(502)
                .json({ message: "AI service unavailable ¡ª see server logs" });
        }

        let data;
        try {
            data = JSON.parse(rawBody);
        } catch (err) {
            console.error("Could not parse Gemini JSON envelope:", rawBody.slice(0, 500));
            return res.status(502).json({ message: "AI returned malformed response" });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            console.error("Gemini no text:", JSON.stringify(data, null, 2));
            return res.status(502).json({ message: "AI returned an empty response" });
        }

        // Strip optional ```json fences just in case
        const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

        let suggestions;
        try {
            suggestions = JSON.parse(cleaned);
        } catch (err) {
            console.error("Could not parse AI JSON output:", cleaned.slice(0, 500));
            return res
                .status(502)
                .json({ message: "AI output was not valid JSON ¡ª see server logs" });
        }

        console.log("6. suggestions parsed successfully");
        console.log("DEBUG: Sending to client:", JSON.stringify(suggestions).slice(0, 200) + "...");

        res.json({ suggestions });
    } catch (err) {
        console.error("Suggestion error:", err);
        res.status(500).json({ message: err.message });
    }
};