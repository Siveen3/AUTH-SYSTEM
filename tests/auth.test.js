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

describe('auth routes', () => {
    test('returns validation error when login payload is missing', async () => {
        const service = {
            authenticateUser: jest.fn()
        };
        const response = await request(createTestApp(service)).post('/api/auth/login').send({});

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(service.authenticateUser).not.toHaveBeenCalled();
    });

    test.skip('returns unauthorized when login credentials are invalid', async () => {
        const service = {
            authenticateUser: jest.fn().mockRejectedValue(new Error('invalid credentials'))
        };
        const response = await request(createTestApp(service))
            .post('/api/auth/login')
            .send({ email: 'user@example.com', password: 'Password1!' });

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
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

    test('signs up a new user and returns created user id', async () => {
        const service = {
            registerUser: jest.fn().mockResolvedValue({ _id: 'user-id-123' })
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
        expect(response.body).toEqual({ message: 'User created successfully.', userId: 'user-id-123' });
        expect(service.registerUser).toHaveBeenCalled();
    });
});
