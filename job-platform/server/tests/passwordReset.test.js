import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  hashResetToken,
  requestPasswordReset,
  resetPassword,
} from "../controllers/authController.js";
import { createPasswordResetUrl } from "../services/passwordResetEmail.js";
import { mockRes } from "./helpers.js";

const originalEnv = {
  CLIENT_URL: process.env.CLIENT_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  PASSWORD_RESET_FROM: process.env.PASSWORD_RESET_FROM,
};
const originalMethods = {
  findOne: User.findOne,
  findByIdAndUpdate: User.findByIdAndUpdate,
  updateOne: User.updateOne,
  exists: User.exists,
  findOneAndUpdate: User.findOneAndUpdate,
};
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  Object.assign(User, originalMethods);
  globalThis.fetch = originalFetch;
});

function configureEmail() {
  process.env.CLIENT_URL = "https://careerconnect.example";
  process.env.RESEND_API_KEY = "test-api-key";
  process.env.PASSWORD_RESET_FROM = "CareerConnect <no-reply@example.com>";
}

test("password reset email URL carries the token in the query string", () => {
  process.env.CLIENT_URL = "https://careerconnect.example/";
  const url = new URL(createPasswordResetUrl("a".repeat(64)));
  assert.equal(url.pathname, "/reset-password");
  assert.equal(url.searchParams.get("token"), "a".repeat(64));
});

test("forgot-password stores only a token hash and emails a token link", async () => {
  configureEmail();
  const user = { _id: "user-id", email: "person@example.com" };
  let savedFields;
  let emailPayload;
  User.findOne = async () => user;
  User.findByIdAndUpdate = async (_id, update) => {
    savedFields = update.$set;
  };
  globalThis.fetch = async (_url, options) => {
    emailPayload = JSON.parse(options.body);
    return { ok: true, status: 200 };
  };

  const res = mockRes();
  await requestPasswordReset({ body: { email: " Person@Example.com " } }, res);

  const resetUrl = new URL(emailPayload.text.split("\n\n")[1]);
  const token = resetUrl.searchParams.get("token");
  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /If an account exists/);
  assert.equal(emailPayload.to[0], user.email);
  assert.equal(resetUrl.pathname, "/reset-password");
  assert.equal(savedFields.resetPasswordToken, hashResetToken(token));
  assert.equal(savedFields.resetPasswordToken.includes(token), false);
  assert.ok(savedFields.resetPasswordExpires > new Date());
});

test("forgot-password returns the same response for an unknown email", async () => {
  configureEmail();
  User.findOne = async () => null;
  globalThis.fetch = async () => {
    throw new Error("Email should not be sent");
  };

  const res = mockRes();
  await requestPasswordReset({ body: { email: "unknown@example.com" } }, res);

  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /If an account exists/);
});

test("forgot-password rejects non-string email values", async () => {
  const res = mockRes();
  await requestPasswordReset({ body: { email: 123 } }, res);

  assert.equal(res.statusCode, 400);
});

test("reset-password atomically replaces the password and consumes the token", async () => {
  const token = "b".repeat(64);
  let query;
  let update;
  User.findOneAndUpdate = async (filter, changes) => {
    query = filter;
    update = changes;
    return { _id: "user-id" };
  };
  User.exists = async () => true;

  const res = mockRes();
  await resetPassword({ body: { token, password: "new-password" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(query.resetPasswordToken, hashResetToken(token));
  assert.ok(query.resetPasswordExpires.$gt instanceof Date);
  assert.equal(await bcrypt.compare("new-password", update.$set.password), true);
  assert.deepEqual(update.$unset, {
    resetPasswordToken: "",
    resetPasswordExpires: "",
  });
});

test("reset-password rejects missing and expired tokens", async () => {
  let lookupCount = 0;
  User.exists = async () => {
    lookupCount += 1;
    return false;
  };
  User.findOneAndUpdate = async () => {
    lookupCount += 1;
    return null;
  };

  const missingTokenRes = mockRes();
  await resetPassword(
    { body: { password: "new-password" } },
    missingTokenRes
  );
  assert.equal(missingTokenRes.statusCode, 400);
  assert.equal(lookupCount, 0);

  const expiredTokenRes = mockRes();
  await resetPassword(
    { body: { token: "c".repeat(64), password: "new-password" } },
    expiredTokenRes
  );
  assert.equal(expiredTokenRes.statusCode, 400);
  assert.equal(lookupCount, 1);
});
