const jwt = require('jsonwebtoken');

jest.mock('../models/userModel', () => ({
    findById: jest.fn()
}));

const User = require('../models/userModel');
const { authenticateAccessToken } = require('../middleware/jwtMiddleware');

const USER_ID = '64b7f8f8f8f8f8f8f8f8f8f8';
const ACCESS_SECRET = 'test-access-secret-that-is-long-enough';

function createResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function createRequest(token) {
    return {
        get: jest.fn().mockReturnValue(token ? `Bearer ${token}` : undefined)
    };
}

function mockUserLookup(result) {
    const select = jest.fn().mockResolvedValue(result);
    User.findById.mockReturnValue({ select });
    return select;
}

function signAccessToken(overrides = {}, options = {}) {
    return jwt.sign(
        { type: 'access', ver: 0, ...overrides },
        options.secret || ACCESS_SECRET,
        {
            algorithm: 'HS256',
            subject: options.subject || USER_ID,
            expiresIn: options.expiresIn || '15m'
        }
    );
}

describe('authenticateAccessToken', () => {
    beforeEach(() => {
        process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
    });

    afterEach(() => {
        delete process.env.JWT_ACCESS_SECRET;
    });

    test('accepts a valid access token and exposes req.auth', async () => {
        const token = signAccessToken();
        const req = createRequest(token);
        const res = createResponse();
        const next = jest.fn();
        mockUserLookup({ _id: USER_ID, passwordVersion: 0 });

        await authenticateAccessToken(req, res, next);

        expect(req.auth.userId).toBe(USER_ID);
        expect(req.auth.claims).toMatchObject({ sub: USER_ID, type: 'access', ver: 0 });
        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
    });

    test.each([
        ['a missing header', undefined],
        ['a malformed header', 'Basic abc.def.ghi'],
        ['an empty bearer token', 'Bearer']
    ])('rejects %s', async (_label, authorization) => {
        const req = { get: jest.fn().mockReturnValue(authorization) };
        const res = createResponse();
        const next = jest.fn();

        await authenticateAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
        });
        expect(next).not.toHaveBeenCalled();
    });

    test.each([
        ['an invalid signature', () => signAccessToken({}, { secret: 'different-secret' })],
        ['an expired token', () => signAccessToken({}, { expiresIn: -1 })],
        ['a reset-purpose token', () => signAccessToken({ type: 'password-reset' })],
        ['a token without a version', () => signAccessToken({ ver: undefined })]
    ])('rejects %s', async (_label, makeToken) => {
        const req = createRequest(makeToken());
        const res = createResponse();
        const next = jest.fn();

        await authenticateAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(User.findById).not.toHaveBeenCalled();
    });

    test.each([
        ['a deleted user', null],
        ['a changed password version', { _id: USER_ID, passwordVersion: 1 }]
    ])('rejects %s', async (_label, user) => {
        const req = createRequest(signAccessToken());
        const res = createResponse();
        const next = jest.fn();
        mockUserLookup(user);

        await authenticateAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('passes database failures to the error handler', async () => {
        const databaseError = new Error('database unavailable');
        const req = createRequest(signAccessToken());
        const res = createResponse();
        const next = jest.fn();
        User.findById.mockReturnValue({
            select: jest.fn().mockRejectedValue(databaseError)
        });

        await authenticateAccessToken(req, res, next);

        expect(next).toHaveBeenCalledWith(databaseError);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('passes missing server configuration to the error handler', async () => {
        delete process.env.JWT_ACCESS_SECRET;
        const req = createRequest('token');
        const res = createResponse();
        const next = jest.fn();

        await authenticateAccessToken(req, res, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 500, code: 'AUTH_CONFIGURATION_ERROR' })
        );
    });
});
