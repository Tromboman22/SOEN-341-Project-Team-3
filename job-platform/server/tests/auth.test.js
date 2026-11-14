import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Applicant from '../models/Applicant.js';
import Recruiter from '../models/Recruiter.js';
import { register, login, me } from '../controllers/authController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { mockRes } from './helpers.js';

process.env.JWT_SECRET='unit-test-secret';
const originals={findOne:User.findOne,findById:User.findById,aCreate:Applicant.create,rCreate:Recruiter.create};
const restore=()=>{User.findOne=originals.findOne;User.findById=originals.findById;Applicant.create=originals.aCreate;Recruiter.create=originals.rCreate;};
test.afterEach(restore);

function publicUser(extra={}) { return {_id:'507f1f77bcf86cd799439011',name:'Max',email:'m@x.com',role:'applicant',password:'hash',toPublic(){const {password,...x}=this; return x;},...extra}; }

test('register rejects missing fields, invalid role, recruiter without company', async()=>{
  let res=mockRes(); await register({body:{email:'a@b.com',password:'123456'}},res); assert.equal(res.statusCode,400);
  res=mockRes(); await register({body:{name:'A',email:'a@b.com',password:'123456',role:'admin'}},res); assert.equal(res.statusCode,400);
  res=mockRes(); await register({body:{name:'A',email:'a@b.com',password:'123456',role:'recruiter',companyName:'   '}},res); assert.equal(res.statusCode,400);
});

test('register normalizes email lookup and rejects duplicate', async()=>{
  let looked; User.findOne=async q=>(looked=q,publicUser());
  const res=mockRes(); await register({body:{name:'A',email:'UP@EXAMPLE.COM',password:'123456'}},res);
  assert.deepEqual(looked,{email:'up@example.com'}); assert.equal(res.statusCode,409);
});

test('register applicant hashes password and returns token/public user', async()=>{
  User.findOne=async()=>null; let created;
  Applicant.create=async d=>(created=d,publicUser({email:d.email,password:d.password}));
  const res=mockRes(); await register({body:{name:'Max',email:'m@x.com',password:'secret1'}},res);
  assert.equal(res.statusCode,201); assert.ok(await bcrypt.compare('secret1',created.password));
  assert.ok(res.body.token); assert.equal(res.body.user.password,undefined);
});

test('register recruiter creates recruiter with company', async()=>{
  User.findOne=async()=>null; let created;
  Recruiter.create=async d=>(created=d,publicUser({role:'recruiter',companyName:d.companyName,password:d.password}));
  const res=mockRes(); await register({body:{name:'R',email:'r@x.com',password:'secret1',role:'recruiter',companyName:'ACME'}},res);
  assert.equal(res.statusCode,201); assert.equal(created.companyName,'ACME');
});

test('login rejects unknown email and wrong password', async()=>{
  User.findOne=async()=>null; let res=mockRes(); await login({body:{email:'none@x.com',password:'x'}},res); assert.equal(res.statusCode,401);
  const hash=await bcrypt.hash('rightpass',4); User.findOne=async()=>publicUser({password:hash});
  res=mockRes(); await login({body:{email:'m@x.com',password:'wrong'}},res); assert.equal(res.statusCode,401);
});

test('login succeeds with correct password and does not expose password', async()=>{
  const hash=await bcrypt.hash('rightpass',4); User.findOne=async()=>publicUser({password:hash});
  const res=mockRes(); await login({body:{email:'M@X.COM',password:'rightpass'}},res);
  assert.equal(res.statusCode,200); assert.ok(res.body.token); assert.equal(res.body.user.password,undefined);
});

test('login handles missing email as invalid credentials', async()=>{
  User.findOne=async()=>null; const res=mockRes(); await login({body:{password:'x'}},res); assert.equal(res.statusCode,401);
});

test('protect rejects absent/malformed/invalid token', async()=>{
  for (const h of [undefined,'Basic abc','Bearer bad-token']) { const res=mockRes(); let next=false; await protect({headers:{authorization:h}},res,()=>next=true); assert.equal(res.statusCode,401); assert.equal(next,false); }
});

test('protect loads user and calls next for valid token', async()=>{
  const token=jwt.sign({id:'507f1f77bcf86cd799439011'},process.env.JWT_SECRET);
  const user=publicUser(); User.findById=()=>({select:async()=>user});
  const req={headers:{authorization:`Bearer ${token}`}}; const res=mockRes(); let next=false;
  await protect(req,res,()=>next=true); assert.equal(next,true); assert.equal(req.user,user);
});

test('protect rejects valid token whose user no longer exists', async()=>{
  const token=jwt.sign({id:'507f1f77bcf86cd799439011'},process.env.JWT_SECRET); User.findById=()=>({select:async()=>null});
  const res=mockRes(); await protect({headers:{authorization:`Bearer ${token}`}},res,()=>{}); assert.equal(res.statusCode,401); assert.equal(res.body.message,'User not found');
});

test('requireRole permits correct role, rejects wrong role, legacy defaults applicant',()=>{
  let next=false; let res=mockRes(); requireRole('recruiter')({user:{role:'recruiter'}},res,()=>next=true); assert.equal(next,true);
  next=false; res=mockRes(); requireRole('recruiter')({user:{role:'applicant'}},res,()=>next=true); assert.equal(res.statusCode,403); assert.equal(next,false);
  next=false; res=mockRes(); requireRole('applicant')({user:{}},res,()=>next=true); assert.equal(next,true);
});

test('me returns public user', async()=>{const res=mockRes(); await me({user:publicUser()},res); assert.equal(res.body.user.password,undefined);});
