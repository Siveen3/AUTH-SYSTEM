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

describe('password-reset routes', () => {
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

    test.each([
        [
            'mismatched passwords',
            { token: 'token', newPassword: 'Password1!', confirmPassword: 'Different2@' }
        ],
        [
            'a weak password',
            { token: 'token', newPassword: 'password', confirmPassword: 'password' }
        ],
        [
            'a missing token',
            { newPassword: 'Password1!', confirmPassword: 'Password1!' }
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

    test('resets a valid password', async () => {
        const service = createService();
        const response = await request(createTestApp(service))
            .post('/api/auth/reset-password')
            .send({
                token: 'reset-token',
                newPassword: 'Password1!',
                confirmPassword: 'Password1!'
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Password reset successful.' });
        expect(service.resetPassword).toHaveBeenCalledWith('reset-token', 'Password1!');
    });

    test('limits forgot-password requests to five per IP in 15 minutes', async () => {
        const service = createService();
        const app = createTestApp(
            service,
            require('../middleware/passwordResetRateLimit')
        );

        for (let requestNumber = 1; requestNumber <= 5; requestNumber += 1) {
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
