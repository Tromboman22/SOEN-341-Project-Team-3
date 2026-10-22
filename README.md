# SOEN-341-Project-Team-3 -- Fall 2026 
Project Title: CareerConnect- Job Search and Application Tracking Platform

### Team Members
* Samuel Pineau 40317711
* Philip Corriveau-Pelletier 26466141
* Shengyuan Wang 40281234
* Odinakachukwu Obiudoh 40109139
* Yansong Li 40212154
* Maxime Duquette 40248944

## About the Project
This is a web-based Job Search and Application Tracking Platform designed to help job seekers manage their career development activities in a centralized hub. The system enables candidates to create profiles, upload resumes, discover job opportunities, track real-time application stages (Applied, Interview, Offered, Rejected), and receive AI-driven feedback. Recruiters can post listings, manage active job postings, and review applicants,while generative AI features assist with resume optimization and candidate matching. The application streamlines the end-to-end recruitment process, keeps job seekers organized, and provides recruiters with a unified pipeline to discover and evaluate talent.
## Technologies
Backend : Express.js 
Frontend : React.js


# Connecting to the Database:
# Setup Guide: Run CareerConnect Locally and Connect to the Database

## Prerequisites
- [Node.js LTS](https://nodejs.org) (includes npm). Restart your computer and VS Code after installing.
- Git
- Verify with `node --version` and `npm --version`

## 1. Clone the repo
```
git clone https://github.com/pcp-philip/SOEN-341-Project-Team-3.git
cd SOEN-341-Project-Team-3/job-platform
```

## 2. Get database access
The project uses a shared MongoDB Atlas cluster.

1. Ask the project owner for the **database username and password** (do not post them in the repo or issues).
2. The owner must add your IP address in Atlas under **Network Access** (or allow `0.0.0.0/0` for development).
3. If you are on a new network (home, campus, etc.), your IP may change and need to be re-added.

## 3. Create `server/.env`
This file is git-ignored, so each person creates their own. In the `server` folder, create a file named exactly `.env`:

```
PORT=5000
MONGO_URI=mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.l4zzfk6.mongodb.net/jobplatform?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
JWT_SECRET=<any long random string>
```

- Replace `<USERNAME>` and `<PASSWORD>` with the credentials from the owner (no `<` `>` brackets).
- If the password contains special characters (`@ # / : ?`), URL-encode them.
- Keep `/jobplatform` before the `?`. It is the database name.
- Never commit `.env`.

## 4. Start the backend
```
cd server
npm install
npm run dev
```
Wait for `✅ MongoDB connected` and `🚀 Server on http://localhost:5000`.

## 5. Start the frontend (second terminal)
```
cd client
npm install
npm run dev
```
Open **http://localhost:5173**.
