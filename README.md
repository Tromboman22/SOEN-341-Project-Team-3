# SOEN 341 – Project Team 3 (Fall 2026)

## CareerConnect – Job Search and Application Tracking Platform

CareerConnect is a web-based platform designed to help job seekers and recruiters manage the recruitment process in one centralized application.

Job seekers can create profiles, upload resumes, search and filter job opportunities, submit applications, and track their application statuses. Recruiters can create and manage job postings, review applicants, update application statuses, and view recruitment statistics.

The platform also includes notification features, application analytics, and AI-assisted functionality to improve the job search experience.

## Team Members

| Name | Student ID |
|---|---|
| Samuel Pineau | 40317711 |
| Philip Corriveau-Pelletier | 26466141 |
| Shengyuan Wang | 40281234 |
| Odinakachukwu Obiudoh | 40109139 |
| Yansong Li | 40212154 |
| Maxime Duquette | 40248944 |

## Technologies Used

| Component | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Frontend Hosting | Netlify |
| Backend Hosting | Render |
| Version Control | Git and GitHub |
| Continuous Integration | GitHub Actions |
| Testing | Node.js built-in test runner |

## Live Website

**Website:** https://dreamy-stroopwafel-ddde76.netlify.app

Users can register or log in using their email and password and access the platform as either an applicant or a recruiter.

## Main Features

### Job Seekers
- User registration and authentication
- Profile and resume management
- Job searching and filtering
- Job application submission
- Application status tracking
- Saved jobs
- Application analytics
- Notifications and reminders
- AI-assisted resume feedback and job matching

### Recruiters
- Recruiter registration and authentication
- Job posting creation, editing, and management
- Applicant review and filtering
- Application status updates
- Recruitment dashboard and statistics
- Applicant resume viewing

## Project Structure

```text
SOEN-341-Project-Team-3/
├── job-platform/
│   ├── client/          # React frontend
│   └── server/          # Express backend
│       ├── controllers/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── tests/       # Backend unit and edge-case tests
└── .github/
    └── workflows/
        └── ci.yml       # GitHub Actions CI workflow
```

## Running the Project Locally

### Prerequisites

Make sure the following are installed:

- Node.js and npm
- Git
- Access to a MongoDB database

### 1. Clone the Repository

```bash
git clone https://github.com/pcp-philip/SOEN-341-Project-Team-3.git
cd SOEN-341-Project-Team-3
```

### 2. Install Backend Dependencies

```bash
cd job-platform/server
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside `job-platform/server` and configure the environment variables required by the backend, including the MongoDB connection string and authentication secrets.

Do not commit `.env` files or credentials to GitHub.

### 4. Start the Backend

From `job-platform/server`:

```bash
npm run dev
```

### 5. Install and Start the Frontend

Open another terminal and navigate to the frontend:

```bash
cd job-platform/client
npm install
npm run dev
```

The frontend and backend should now be running locally, provided the environment variables are configured correctly.

## Unit Testing and Edge-Case Testing

The backend includes automated unit tests and edge-case tests covering features such as:

- User registration, login, and authentication
- Job posting creation and management
- Job searching and filtering
- Resume management
- Application submission and status updates
- Recruiter dashboard functionality
- Notifications
- Application analytics
- Input validation and error handling

### Running All Backend Tests

Navigate to the backend directory:

```bash
cd job-platform/server
```

Install dependencies if necessary:

```bash
npm install
```

Run the complete backend test suite:

```bash
npm test
```

The test runner displays the number of tests executed, passed, and failed, along with any error details.

### Running a Specific Test File

To run only one test file:

```bash
node --test tests/recruiter.test.js
```

For example, to execute the Sprint 3 recruiter dashboard tests:

```bash
node --test tests/sprint3Samuel.test.js
```

### Testing Framework

The project uses the built-in Node.js test runner (`node:test`) and Node.js assertions (`node:assert/strict`).

Tests use mocked dependencies where appropriate to verify backend functionality without requiring a live database connection.

## Continuous Integration (CI)

The project uses **GitHub Actions** to automatically execute backend tests.

The CI workflow is defined in:

```text
.github/workflows/ci.yml
```

The workflow runs when code is pushed or a pull request is opened or updated, according to its configured branch triggers.

### CI Process

1. GitHub Actions checks out the repository.
2. Node.js is configured.
3. Backend dependencies are installed using `npm ci`.
4. The backend test suite runs using `npm test`.
5. GitHub Actions reports whether the tests passed or failed.

This helps identify regressions before changes are merged into the main branch.

### Viewing Test Results

1. Open the repository on GitHub.
2. Navigate to the **Actions** tab.
3. Select the latest workflow run.
4. Open the `backend-tests` job to view the results.

## Development Workflow

The team uses GitHub for version control and collaboration.

Development work is completed on separate branches and submitted through pull requests.

Changes can be reviewed and tested before being merged into `main`.

## Course Information

**Course:** SOEN 341 – Software Process  
**Term:** Fall 2026  
**Project:** CareerConnect  
**Team:** 3
