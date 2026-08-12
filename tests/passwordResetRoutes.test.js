const express = require('express');
const request = require('supertest');

const {
    createPasswordResetController,
    GENERIC_FORGOT_PASSWORD_MESSAGE
} = require('../controllers/passwordResetController');
const { createPasswordResetRouter } = require('../routes/passwordResetRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

function createTestApp(service, limiter = (_req, _res, next) => next()) {
    const app = express();
    const controller = createPasswordResetController(service);
    app.use(express.json());
    app.use(
        '/api/auth',
        createPasswordResetRouter({ controller, forgotPasswordLimiter: limiter })
    );
    app.use(errorHandler);
    return app;
}

function createService() {
    return {
        requestPasswordReset: jest.fn().mockResolvedValue(undefined),
        resetPassword: jest.fn().mockResolvedValue(undefined)
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/forgot-password', () => {
    test('treats a missing request body as a validation error', async () => {
        const service = createService();
        const response = await request(createTestApp(service)).post('/api/auth/forgot-password');

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('rejects a malformed email', async () => {
        const service = createService();
        const response = await request(createTestApp(service))
            .post('/api/auth/forgot-password')
            .send({ email: 'not-an-email' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.requestPasswordReset).not.toHaveBeenCalled();
    });

    test('returns the generic forgot-password response', async () => {
        const service = createService();
        const response = await request(createTestApp(service))
            .post('/api/auth/forgot-password')
            .send({ email: 'user@example.com' });

        expect(response.status).toBe(202);
        expect(response.body).toEqual({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
        expect(service.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
    });

    test('limits forgot-password requests to five per IP in 15 minutes', async () => {
        const service = createService();
        const app = createTestApp(service, require('../middleware/passwordResetRateLimit'));

        for (let i = 1; i <= 5; i += 1) {
            const response = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'user@example.com' });
            expect(response.status).toBe(202);
        }

        const limitedResponse = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'user@example.com' });

        expect(limitedResponse.status).toBe(429);
        expect(limitedResponse.body.error.code).toBe('TOO_MANY_REQUESTS');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Body: { email, otp, newPassword, confirmPassword }
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/reset-password', () => {
    test.each([
        [
            'mismatched passwords',
            { email: 'user@example.com', otp: 1234, newPassword: 'Password1!', confirmPassword: 'Different2@' }
        ],
        [
            'a weak password',
            { email: 'user@example.com', otp: 1234, newPassword: 'password', confirmPassword: 'password' }
        ],
        [
            'a missing OTP',
            { email: 'user@example.com', newPassword: 'Password1!', confirmPassword: 'Password1!' }
        ],
        [
            'a missing email',
            { otp: 1234, newPassword: 'Password1!', confirmPassword: 'Password1!' }
        ],
        [
            'a malformed email',
            { email: 'bad-email', otp: 1234, newPassword: 'Password1!', confirmPassword: 'Password1!' }
        ]
    ])('rejects %s', async (_label, body) => {
        const service = createService();
        const response = await request(createTestApp(service))
            .post('/api/auth/reset-password')
            .send(body);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.resetPassword).not.toHaveBeenCalled();
    });

    test('resets a valid password with a correct OTP', async () => {
        const service = createService();
        const response = await request(createTestApp(service))
            .post('/api/auth/reset-password')
            .send({
                email: 'user@example.com',
                otp: 5678,
                newPassword: 'Password1!',
                confirmPassword: 'Password1!'
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Password reset successful.' });
        expect(service.resetPassword).toHaveBeenCalledWith('user@example.com', 5678, 'Password1!');
    });

    test('propagates service errors (invalid/expired OTP)', async () => {
        const AppError = require('../utils/AppError');
        const service = {
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn().mockRejectedValue(
                new AppError(
                    'The password-reset code is invalid or has expired.',
                    400,
                    'INVALID_OR_EXPIRED_RESET_OTP'
                )
            )
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/reset-password')
            .send({
                email: 'user@example.com',
                otp: 9999,
                newPassword: 'Password1!',
                confirmPassword: 'Password1!'
            });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_OR_EXPIRED_RESET_OTP');
    });
});
