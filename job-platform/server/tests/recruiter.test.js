import test from 'node:test';
import assert from 'node:assert/strict';
import User, { ROLES } from '../models/User.js';
import Recruiter from '../models/Recruiter.js';
import Applicant from '../models/Applicant.js';
import JobPosting from '../models/JobPosting.js';
import Application, { APPLICATION_STATUSES } from '../models/Application.js';

const validId = '507f1f77bcf86cd799439011';

test('User trims/lowercases email and toPublic never exposes password', async () => {
  const u = new User({ name:' Max ', email:' MAX@EXAMPLE.COM ', password:'abcdef' });
  await u.validate();
  assert.equal(u.name, 'Max'); assert.equal(u.email, 'max@example.com');
  assert.equal(u.toPublic().password, undefined);
});

test('User rejects missing required fields and password shorter than 6', async () => {
  await assert.rejects(new User({email:'a@b.com', password:'123456'}).validate());
  await assert.rejects(new User({name:'A', email:'a@b.com', password:'12345'}).validate());
});

test('Applicant defaults headline and exposes resume only when present', () => {
  const a = new Applicant({name:'A',email:'a@b.com',password:'123456'});
  assert.equal(a.headline, ''); assert.equal(a.toPublic().resume, null);
});

test('Recruiter requires company name and defaults position', async () => {
  const r = new Recruiter({name:'R',email:'r@b.com',password:'123456',companyName:' ACME '});
  await r.validate(); assert.equal(r.companyName,'ACME'); assert.equal(r.position,'Recruiter');
  await assert.rejects(new Recruiter({name:'R',email:'x@b.com',password:'123456'}).validate());
});

test('JobPosting accepts boundary salary 0 and equal min/max', async () => {
  const j = new JobPosting({recruiter:validId,title:'Dev',company:'ACME',description:'x',salaryMin:0,salaryMax:0});
  await j.validate(); assert.equal(j.status,'open'); assert.equal(j.type,'full-time');
});

test('JobPosting rejects negative salary, invalid enums, and min > max', async () => {
  const base={recruiter:validId,title:'Dev',company:'ACME',description:'x'};
  await assert.rejects(new JobPosting({...base,salaryMin:-1}).validate());
  await assert.rejects(new JobPosting({...base,type:'gig'}).validate());
  await assert.rejects(new JobPosting({...base,status:'deleted'}).validate());
  await assert.rejects(new JobPosting({...base,salaryMin:100,salaryMax:99}).validate(), /salaryMin/);
});

test('JobPosting rejects blank required title/description after trimming', async () => {
  const base={recruiter:validId,company:'ACME'};
  await assert.rejects(new JobPosting({...base,title:'   ',description:'x'}).validate());
  await assert.rejects(new JobPosting({...base,title:'Dev',description:'   '}).validate());
});

test('Application defaults to submitted and rejects invalid status', async () => {
  const a = new Application({job:validId, applicant:validId});
  await a.validate(); assert.equal(a.status,'submitted');
  assert.ok(APPLICATION_STATUSES.includes('hired'));
  await assert.rejects(new Application({job:validId,applicant:validId,status:'maybe'}).validate());
});

test('role constants contain only applicant/recruiter', () => {
  assert.deepEqual(Object.values(ROLES), ['applicant','recruiter']);
});
