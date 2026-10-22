// One-off: users created before roles existed have no `role` field.
// Run once with:  node scripts/migrateRoles.js
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const res = await mongoose.connection
  .collection("users")
  .updateMany({ role: { $exists: false } }, { $set: { role: "applicant" } });
console.log(`Updated ${res.modifiedCount} legacy user(s) -> applicant`);
await mongoose.disconnect();
