const express = require('express');
const request = require('supertest');

const { createAuthController } = require('../controllers/authController');
const { createAuthRouter } = require('../routes/authRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

function createTestApp(service) {
    const app = express();
    const controller = createAuthController(service);

    app.use(express.json());
    app.use('/api/auth', createAuthRouter({ controller }));
    app.use(errorHandler);

    return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign-up tests
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/signup', () => {
    test('returns validation error when body is missing', async () => {
        const service = { registerUser: jest.fn() };
        const response = await request(createTestApp(service))
            .post('/api/auth/signup')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.registerUser).not.toHaveBeenCalled();
    });

    test('returns validation error for invalid email', async () => {
        const service = { registerUser: jest.fn() };
        const response = await request(createTestApp(service))
            .post('/api/auth/signup')
            .send({
                name: 'Test User',
                email: 'not-an-email',
                password: 'Password1!',
                confirmPassword: 'Password1!'
            });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.registerUser).not.toHaveBeenCalled();
    });

    test('returns validation error when passwords do not match', async () => {
        const service = { registerUser: jest.fn() };
        const response = await request(createTestApp(service))
            .post('/api/auth/signup')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'Password1!',
                confirmPassword: 'Different2@'
            });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.registerUser).not.toHaveBeenCalled();
    });

    test('returns validation error for a weak password', async () => {
        const service = { registerUser: jest.fn() };
        const response = await request(createTestApp(service))
            .post('/api/auth/signup')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'weakpass',
                confirmPassword: 'weakpass'
            });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.registerUser).not.toHaveBeenCalled();
    });

    test('registers a new user and returns 201 with OTP notice', async () => {
        const service = {
            registerUser: jest.fn().mockResolvedValue({ userId: 'user-id-123' })
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/signup')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'Password1!',
                confirmPassword: 'Password1!'
            });

        expect(response.status).toBe(201);
        expect(response.body.userId).toBe('user-id-123');
        expect(response.body.message).toMatch(/verification code/i);
        expect(service.registerUser).toHaveBeenCalled();
    });

    test('accepts firstName + lastName as an alternative to name', async () => {
        const service = {
            registerUser: jest.fn().mockResolvedValue({ userId: 'user-id-456' })
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/signup')
            .send({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'Password1!',
                confirmPassword: 'Password1!'
            });

        expect(response.status).toBe(201);
        expect(service.registerUser).toHaveBeenCalledWith(
            expect.objectContaining({ firstName: 'John', lastName: 'Doe' })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// OTP verification tests
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/verify-otp', () => {
    test('returns validation error when email is missing', async () => {
        const service = { verifyRegistrationOtp: jest.fn() };
        const response = await request(createTestApp(service))
            .post('/api/auth/verify-otp')
            .send({ otp: 1234 });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.verifyRegistrationOtp).not.toHaveBeenCalled();
    });

    test('returns validation error when otp is missing', async () => {
        const service = { verifyRegistrationOtp: jest.fn() };
        const response = await request(createTestApp(service))
            .post('/api/auth/verify-otp')
            .send({ email: 'test@example.com' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.verifyRegistrationOtp).not.toHaveBeenCalled();
    });

    test('verifies a valid OTP and returns 200', async () => {
        const service = {
            verifyRegistrationOtp: jest.fn().mockResolvedValue(undefined)
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/verify-otp')
            .send({ email: 'test@example.com', otp: 1234 });

        expect(response.status).toBe(200);
        expect(response.body.message).toMatch(/verified/i);
        expect(service.verifyRegistrationOtp).toHaveBeenCalledWith(
            'test@example.com',
            1234
        );
    });

    test('propagates service errors (invalid/expired OTP)', async () => {
        const AppError = require('../utils/AppError');
        const service = {
            verifyRegistrationOtp: jest
                .fn()
                .mockRejectedValue(
                    new AppError('The verification code is invalid or has expired.', 400, 'INVALID_OR_EXPIRED_OTP')
                )
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/verify-otp')
            .send({ email: 'test@example.com', otp: 9999 });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_OR_EXPIRED_OTP');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Login tests
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
    test('returns validation error when payload is missing', async () => {
        const service = { authenticateUser: jest.fn() };
        const response = await request(createTestApp(service))
            .post('/api/auth/login')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.authenticateUser).not.toHaveBeenCalled();
    });

    test('logs in a valid user and returns an access token', async () => {
        const service = {
            authenticateUser: jest.fn().mockResolvedValue('access-token-value')
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/login')
            .send({ email: 'user@example.com', password: 'Password1!' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ accessToken: 'access-token-value' });
        expect(service.authenticateUser).toHaveBeenCalledWith('user@example.com', 'Password1!');
    });

    test('returns 403 when email is not verified', async () => {
        const AppError = require('../utils/AppError');
        const service = {
            authenticateUser: jest
                .fn()
                .mockRejectedValue(
                    new AppError(
                        'Please verify your email address before signing in.',
                        403,
                        'EMAIL_NOT_VERIFIED'
                    )
                )
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/login')
            .send({ email: 'user@example.com', password: 'Password1!' });

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    test('returns 403 when account is blocked', async () => {
        const AppError = require('../utils/AppError');
        const service = {
            authenticateUser: jest
                .fn()
                .mockRejectedValue(
                    new AppError('Your account has been suspended.', 403, 'ACCOUNT_BLOCKED')
                )
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/login')
            .send({ email: 'user@example.com', password: 'Password1!' });

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('ACCOUNT_BLOCKED');
    });

    test('returns 401 for invalid credentials', async () => {
        const service = {
            authenticateUser: jest.fn().mockRejectedValue(new Error('invalid credentials'))
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/login')
            .send({ email: 'user@example.com', password: 'Password1!' });

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
});
