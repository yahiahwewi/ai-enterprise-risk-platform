jest.mock('jsonwebtoken');
jest.mock('../models/User');

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Helpers to build fake Express req/res/next
const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});
const makeNext = () => jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test_secret';
});

describe('authorize (RBAC)', () => {
  it('calls next() when the user role is allowed', () => {
    const req = { user: { role: 'owner' } };
    const res = makeRes();
    const next = makeNext();

    authorize('owner', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when the user role is not allowed', () => {
    const req = { user: { role: 'comptable' } };
    const res = makeRes();
    const next = makeNext();

    authorize('owner', 'admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/forbidden/i) })
    );
  });

  it('enforces a single-role restriction', () => {
    const req = { user: { role: 'auditeur' } };
    const res = makeRes();
    const next = makeNext();

    authorize('owner')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('protect (JWT auth)', () => {
  it('rejects with 401 when no token is present', async () => {
    const req = { headers: {}, query: {} };
    const res = makeRes();
    const next = makeNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid Bearer token for an approved user', async () => {
    jwt.verify.mockReturnValue({ id: 'user123' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user123', role: 'owner', status: 'approved' }),
    });

    const req = { headers: { authorization: 'Bearer good.token.here' }, query: {} };
    const res = makeRes();
    const next = makeNext();

    await protect(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ _id: 'user123', role: 'owner' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts a token passed via query param (file downloads)', async () => {
    jwt.verify.mockReturnValue({ id: 'user123' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user123', role: 'finance', status: 'approved' }),
    });

    const req = { headers: {}, query: { token: 'good.token.here' } };
    const res = makeRes();
    const next = makeNext();

    await protect(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when the user no longer exists', async () => {
    jwt.verify.mockReturnValue({ id: 'ghost' });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const req = { headers: { authorization: 'Bearer good.token' }, query: {} };
    const res = makeRes();
    const next = makeNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the account is not approved', async () => {
    jwt.verify.mockReturnValue({ id: 'pending1' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'pending1', role: 'owner', status: 'pending' }),
    });

    const req = { headers: { authorization: 'Bearer good.token' }, query: {} };
    const res = makeRes();
    const next = makeNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification throws', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const req = { headers: { authorization: 'Bearer bad.token' }, query: {} };
    const res = makeRes();
    const next = makeNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
