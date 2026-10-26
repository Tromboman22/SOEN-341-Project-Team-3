import test from "node:test";
import assert from "node:assert/strict";
import Applicant from "../models/Applicant.js";
import Recruiter from "../models/Recruiter.js";
import JobPosting from "../models/JobPosting.js";
import {
  validateProfileUpdate,
  getProfile,
  updateProfile,
  LIMITS,
} from "../controllers/profileController.js";
import { mockRes } from "./helpers.js";

const id = "507f1f77bcf86cd799439011";
const orig = {
  aFind: Applicant.findById,
  rFind: Recruiter.findById,
  jUpdate: JobPosting.updateMany,
};
test.afterEach(() => {
  Applicant.findById = orig.aFind;
  Recruiter.findById = orig.rFind;
  JobPosting.updateMany = orig.jUpdate;
});

// Minimal stand-in for a Mongoose document
function fakeUser(fields = {}) {
  return {
    _id: id,
    role: "applicant",
    name: "Max",
    email: "m@x.com",
    password: "hash",
    saved: false,
    set(u) { Object.assign(this, u); },
    async save() { this.saved = true; },
    toPublic() {
      const { password, saved, set, save, toPublic, ...pub } = this;
      return pub;
    },
    ...fields,
  };
}

// ---------- validateProfileUpdate: applicant ----------

test("applicant update trims text, cleans skills and adds https to links", () => {
  const { updates, error } = validateProfileUpdate(
    {
      name: "  Max D  ",
      headline: " Backend dev ",
      location: " Montreal ",
      phone: "+1 (514) 555-0100",
      bio: " Hi ",
      skills: " React, node ,, React , MongoDB ",
      links: { linkedin: "linkedin.com/in/max", github: "https://github.com/max", portfolio: "" },
    },
    "applicant"
  );
  assert.equal(error, undefined);
  assert.equal(updates.name, "Max D");
  assert.equal(updates.headline, "Backend dev");
  assert.equal(updates.location, "Montreal");
  assert.equal(updates.bio, "Hi");
  assert.deepEqual(updates.skills, ["React", "node", "MongoDB"]);
  assert.deepEqual(updates.links, {
    linkedin: "https://linkedin.com/in/max",
    github: "https://github.com/max",
    portfolio: "",
  });
});

test("skills can be sent as an array; duplicates are case-insensitive", () => {
  const { updates } = validateProfileUpdate({ skills: ["SQL", " sql ", "Go"] }, "applicant");
  assert.deepEqual(updates.skills, ["SQL", "Go"]);
});

test("empty skills string clears the list", () => {
  const { updates } = validateProfileUpdate({ skills: "  ,  " }, "applicant");
  assert.deepEqual(updates.skills, []);
});

test("protected fields (email, password, role, resume, _id) are ignored", () => {
  const { updates } = validateProfileUpdate(
    { email: "x@y.com", password: "p", role: "recruiter", resume: {}, _id: "evil", headline: "Dev" },
    "applicant"
  );
  assert.deepEqual(updates, { headline: "Dev" });
});

test("recruiter-only fields are ignored for applicants", () => {
  const { updates } = validateProfileUpdate({ companyName: "Fake Co", companyBio: "x" }, "applicant");
  assert.deepEqual(updates, {});
});

test("links not sent keep their current value", () => {
  const current = { links: { linkedin: "https://linkedin.com/in/old", github: "https://github.com/old", portfolio: "" } };
  const { updates } = validateProfileUpdate({ links: { github: "github.com/new" } }, "applicant", current);
  assert.deepEqual(updates.links, {
    linkedin: "https://linkedin.com/in/old",
    github: "https://github.com/new",
    portfolio: "",
  });
});

test("applicant update rejects invalid input with a readable message", () => {
  const cases = [
    [{ name: "   " }, /Name cannot be empty/],
    [{ name: 42 }, /Name must be text/],
    [{ headline: ["x"] }, /Headline must be text/],
    [{ headline: "x".repeat(LIMITS.headline + 1) }, /Headline must be 120 characters or fewer/],
    [{ bio: "x".repeat(LIMITS.bio + 1) }, /Bio must be 2000 characters or fewer/],
    [{ phone: "555-0100 ext. abc" }, /Phone can only contain/],
    [{ skills: 5 }, /Skills must be a list/],
    [{ skills: ["ok", 3] }, /Each skill must be text/],
    [{ skills: "x".repeat(LIMITS.skill + 1) }, /Each skill must be 50 characters or fewer/],
    [{ skills: Array.from({ length: LIMITS.skillsCount + 1 }, (_, i) => `s${i}`) }, /up to 30 skills/],
    [{ links: "https://github.com/max" }, /Links must be an object/],
    [{ links: ["https://github.com/max"] }, /Links must be an object/],
    [{ links: { github: "javascript:alert(1)" } }, /GitHub must be a valid http\(s\) URL/],
    [{ links: { portfolio: "ftp://files.example.com" } }, /Portfolio must be a valid http\(s\) URL/],
    [{ links: { linkedin: "not a url" } }, /LinkedIn must be a valid/],
    [{ links: { linkedin: "localhost" } }, /LinkedIn must be a valid http\(s\) URL/],
  ];
  for (const [body, pattern] of cases) {
    const result = validateProfileUpdate(body, "applicant");
    assert.equal(result.updates, undefined, JSON.stringify(body));
    assert.match(result.error, pattern, JSON.stringify(body));
  }
});

test("values exactly at the limit are accepted", () => {
  const { error } = validateProfileUpdate(
    {
      name: "x".repeat(LIMITS.name),
      headline: "x".repeat(LIMITS.headline),
      bio: "x".repeat(LIMITS.bio),
      skills: Array.from({ length: LIMITS.skillsCount }, (_, i) => `s${i}`),
    },
    "applicant"
  );
  assert.equal(error, undefined);
});

test("missing or non-object body produces no updates", () => {
  assert.deepEqual(validateProfileUpdate(undefined, "applicant"), { updates: {} });
  assert.deepEqual(validateProfileUpdate("nope", "applicant"), { updates: {} });
});

// ---------- validateProfileUpdate: recruiter ----------

test("recruiter update validates company fields and ignores applicant fields", () => {
  const { updates } = validateProfileUpdate(
    { companyName: " ACME ", position: " Lead ", companyWebsite: "acme.com", headline: "x", skills: "a" },
    "recruiter"
  );
  assert.deepEqual(updates, { companyName: "ACME", position: "Lead", companyWebsite: "https://acme.com" });
});

test("recruiter cannot blank out company name or use a bad website", () => {
  assert.match(validateProfileUpdate({ companyName: "  " }, "recruiter").error, /Company name cannot be empty/);
  assert.match(validateProfileUpdate({ companyWebsite: "javascript:void(0)" }, "recruiter").error, /Company website/);
});

// ---------- getProfile ----------

test("getProfile returns the public profile without the password", async () => {
  const res = mockRes();
  await getProfile({ user: fakeUser({ headline: "Dev" }) }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.profile.headline, "Dev");
  assert.equal(res.body.profile.password, undefined);
});

// ---------- updateProfile ----------

test("updateProfile saves valid applicant changes and returns the new profile", async () => {
  const user = fakeUser();
  Applicant.findById = async () => user;
  const res = mockRes();
  await updateProfile({ user: { _id: id, role: "applicant" }, body: { headline: "Dev", skills: "React, Node" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.saved, true);
  assert.equal(res.body.profile.headline, "Dev");
  assert.deepEqual(res.body.profile.skills, ["React", "Node"]);
  assert.equal(res.body.profile.password, undefined);
});

test("legacy users without a role are treated as applicants", async () => {
  let used = null;
  Applicant.findById = async () => ((used = "applicant"), fakeUser({ role: undefined }));
  Recruiter.findById = async () => ((used = "recruiter"), null);
  const res = mockRes();
  await updateProfile({ user: { _id: id }, body: { headline: "Dev" } }, res);
  assert.equal(used, "applicant");
  assert.equal(res.statusCode, 200);
});

test("updateProfile returns 400 and does not save invalid input", async () => {
  const user = fakeUser();
  Applicant.findById = async () => user;
  const res = mockRes();
  await updateProfile({ user: { _id: id, role: "applicant" }, body: { links: { github: "javascript:alert(1)" } } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /GitHub/);
  assert.equal(user.saved, false);
});

test("updateProfile returns 404 when the user no longer exists", async () => {
  Applicant.findById = async () => null;
  const res = mockRes();
  await updateProfile({ user: { _id: id, role: "applicant" }, body: { headline: "x" } }, res);
  assert.equal(res.statusCode, 404);
});

test("Mongoose validation errors become 400, other errors 500", async () => {
  const validationErr = Object.assign(new Error("Path `name` is required."), { name: "ValidationError" });
  Applicant.findById = async () => fakeUser({ async save() { throw validationErr; } });
  let res = mockRes();
  await updateProfile({ user: { _id: id, role: "applicant" }, body: {} }, res);
  assert.equal(res.statusCode, 400);

  Applicant.findById = async () => { throw new Error("db down"); };
  res = mockRes();
  await updateProfile({ user: { _id: id, role: "applicant" }, body: {} }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Could not update profile");
});

test("renaming a recruiter's company updates their job postings", async () => {
  const user = fakeUser({ role: "recruiter", companyName: "Old Co" });
  Recruiter.findById = async () => user;
  let call = null;
  JobPosting.updateMany = async (filter, update) => { call = { filter, update }; };
  const res = mockRes();
  await updateProfile({ user: { _id: id, role: "recruiter" }, body: { companyName: "New Co" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(call, { filter: { recruiter: id }, update: { company: "New Co" } });
});

test("job postings are not touched when the company name is unchanged", async () => {
  Recruiter.findById = async () => fakeUser({ role: "recruiter", companyName: "Same Co" });
  let called = false;
  JobPosting.updateMany = async () => { called = true; };
  const res = mockRes();
  await updateProfile({ user: { _id: id, role: "recruiter" }, body: { position: "Lead", companyName: "Same Co" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(called, false);
});
