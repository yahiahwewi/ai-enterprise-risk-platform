/**
 * Integration tests for the auth flow — real Express routes + controllers +
 * Mongoose models against an in-memory MongoDB (mongodb-memory-server).
 * Only the side-effecting edges are mocked: the SMTP mailer (so no real email
 * is sent, and so we can capture the OTP that would have been emailed) and the
 * event dispatcher.
 */
jest.mock('../services/mailer', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/eventDispatcher', () => ({
  dispatchEvent: jest.fn().mockResolvedValue(undefined),
}));

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { sendOtpEmail } = require('../services/mailer');
const User = require('../models/User');

jest.setTimeout(120000); // first run downloads the mongod binary

let mongod;
let app;

const REG = {
  name: 'Test Analyst',
  email: 'analyst1@tactic.tn',
  password: 'secret123',
  role: 'analyst',
};

// The OTP the controller generated is whatever it passed to sendOtpEmail.
const lastOtp = () => {
  const calls = sendOtpEmail.mock.calls;
  return calls.length ? calls[calls.length - 1][0].code : null;
};

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_secret_integration';
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/authRoutes'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('creates a pending unverified user and issues a 6-digit OTP', async () => {
    const res = await request(app).post('/api/auth/register').send(REG);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ needsVerification: true, email: REG.email });

    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(lastOtp()).toMatch(/^\d{6}$/);

    const user = await User.findOne({ email: REG.email });
    expect(user.status).toBe('pending');
    expect(user.emailVerified).toBe(false);
  });

  it('rejects invalid input via the validator (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation/i);
  });
});

describe('POST /api/auth/verify-email', () => {
  it('verifies the account with the correct OTP', async () => {
    await request(app).post('/api/auth/register').send(REG);
    const code = lastOtp();

    const res = await request(app).post('/api/auth/verify-email').send({ email: REG.email, code });
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);

    const user = await User.findOne({ email: REG.email });
    expect(user.emailVerified).toBe(true);
  });

  it('rejects an incorrect OTP and counts the attempt', async () => {
    await request(app).post('/api/auth/register').send(REG);

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: REG.email, code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/incorrect/i);

    const user = await User.findOne({ email: REG.email }).select('+emailOtpAttempts');
    expect(user.emailOtpAttempts).toBe(1);
  });
});

describe('POST /api/auth/login', () => {
  it('blocks login while the account is still pending (403)', async () => {
    await request(app).post('/api/auth/register').send(REG);
    await request(app).post('/api/auth/verify-email').send({ email: REG.email, code: lastOtp() });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: REG.email, password: REG.password });
    expect(res.status).toBe(403);
    expect(res.body.status).toBe('pending');
  });

  it('issues a JWT once the account is approved', async () => {
    await request(app).post('/api/auth/register').send(REG);
    await request(app).post('/api/auth/verify-email').send({ email: REG.email, code: lastOtp() });
    await User.updateOne({ email: REG.email }, { status: 'approved' }); // admin approval

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: REG.email, password: REG.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(REG.email);
    expect(res.body.user.password).toBeUndefined(); // never leak the hash
  });

  it('rejects a wrong password (401)', async () => {
    await request(app).post('/api/auth/register').send(REG);
    await User.updateOne({ email: REG.email }, { status: 'approved' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: REG.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me (protected)', () => {
  it('returns the current user with a valid token', async () => {
    await request(app).post('/api/auth/register').send(REG);
    await User.updateOne({ email: REG.email }, { status: 'approved' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: REG.email, password: REG.password });
    const token = login.body.token;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(REG.email);
  });

  it('rejects access without a token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
