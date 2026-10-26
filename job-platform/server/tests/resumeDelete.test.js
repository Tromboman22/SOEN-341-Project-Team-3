import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import Applicant from "../models/Applicant.js";
import { deleteResume } from "../controllers/resumeController.js";
import { mockRes } from "./helpers.js";

const id = "507f1f77bcf86cd799439011";
const origFind = Applicant.findById;
test.afterEach(() => { Applicant.findById = origFind; });

const fakeApplicant = (resume) => ({
  _id: id,
  resume,
  saved: false,
  async save() { this.saved = true; },
});

test("deleteResume removes the file and clears the resume field", async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "resume-")), "cv.pdf");
  fs.writeFileSync(file, "%PDF-1.4");
  const user = fakeApplicant({ filename: "cv.pdf", originalName: "My CV.pdf", path: file, size: 8 });
  Applicant.findById = async () => user;

  const res = mockRes();
  await deleteResume({ user: { _id: id } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Resume deleted");
  assert.equal(fs.existsSync(file), false);
  assert.equal(user.resume, undefined);
  assert.equal(user.saved, true);
});

test("deleteResume still clears the record when the file is already gone", async () => {
  const user = fakeApplicant({ filename: "gone.pdf", path: "/no/such/file.pdf" });
  Applicant.findById = async () => user;
  const res = mockRes();
  await deleteResume({ user: { _id: id } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.resume, undefined);
});

test("deleteResume returns 404 when there is no resume", async () => {
  Applicant.findById = async () => fakeApplicant(undefined);
  const res = mockRes();
  await deleteResume({ user: { _id: id } }, res);
  assert.equal(res.statusCode, 404);
});

test("deleteResume returns 403 for a non-applicant", async () => {
  Applicant.findById = async () => null;
  const res = mockRes();
  await deleteResume({ user: { _id: id } }, res);
  assert.equal(res.statusCode, 403);
});
