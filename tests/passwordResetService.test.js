const jwt = require('jsonwebtoken');

const { createPasswordResetService } = require('../services/passwordResetService');

const USER_ID = '64b7f8f8f8f8f8f8f8f8f8f8';
const RESET_SECRET = 'test-reset-secret-that-is-long-enough';

function createDependencies() {
    const UserModel = {
        findOne: jest.fn(),
        findById: jest.fn()
    };
    const mailer = {
        sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined)
    };
    const logger = {
        error: jest.fn()
    };
    const env = {
        JWT_RESET_SECRET: RESET_SECRET,
        JWT_RESET_EXPIRES_IN: '15m',
        PASSWORD_RESET_URL: 'http://localhost:3000/reset-password'
    };

    return { UserModel, mailer, logger, env };
}

function mockFindOne(UserModel, user) {
    UserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user)
    });
}

function signResetToken(overrides = {}, options = {}) {
    return jwt.sign(
        { type: 'password-reset', ...overrides },
        options.secret || RESET_SECRET,
        {
            algorithm: 'HS256',
            subject: options.subject || USER_ID,
            expiresIn: options.expiresIn || '15m'
        }
    );
}

describe('passwordResetService', () => {
    test('does not reveal or email an unknown account', async () => {
        const dependencies = createDependencies();
        mockFindOne(dependencies.UserModel, null);
        const service = createPasswordResetService(dependencies);

        await service.requestPasswordReset(' UNKNOWN@Example.com ');

        expect(dependencies.UserModel.findOne).toHaveBeenCalledWith({
            email: 'unknown@example.com'
        });
        expect(dependencies.mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    test('sends a 15-minute purpose-limited reset token to a known account', async () => {
        const dependencies = createDependencies();
        mockFindOne(dependencies.UserModel, { _id: USER_ID, email: 'user@example.com' });
        const service = createPasswordResetService(dependencies);

        await service.requestPasswordReset('USER@example.com');

        const message = dependencies.mailer.sendPasswordResetEmail.mock.calls[0][0];
        const url = new URL(message.resetUrl);
        const claims = jwt.verify(url.searchParams.get('token'), RESET_SECRET, {
            algorithms: ['HS256']
        });

        expect(message.to).toBe('user@example.com');
        expect(claims).toMatchObject({ sub: USER_ID, type: 'password-reset' });
        expect(claims.exp - claims.iat).toBe(15 * 60);
    });

    test('sanitizes mail delivery failures', async () => {
        const dependencies = createDependencies();
        mockFindOne(dependencies.UserModel, { _id: USER_ID, email: 'user@example.com' });
        dependencies.mailer.sendPasswordResetEmail.mockRejectedValue(
            new Error('SMTP rejected secret-token-value')
        );
        const service = createPasswordResetService(dependencies);

        await expect(service.requestPasswordReset('user@example.com')).resolves.toBeUndefined();

        expect(dependencies.logger.error).toHaveBeenCalledWith(
            'Password-reset email delivery failed.'
        );
        expect(dependencies.logger.error.mock.calls.flat().join(' ')).not.toContain('secret-token-value');
    });

    test.each([
        ['an expired token', signResetToken({}, { expiresIn: -1 })],
        ['a token signed with another secret', signResetToken({}, { secret: 'another-secret' })],
        ['an access token', signResetToken({ type: 'access' })],
        ['a token with an invalid user id', signResetToken({}, { subject: 'not-a-user-id' })]
    ])('rejects %s', async (_label, token) => {
        const dependencies = createDependencies();
        const service = createPasswordResetService(dependencies);

        await expect(service.resetPassword(token, 'Password1!')).rejects.toMatchObject({
            statusCode: 400,
            code: 'INVALID_OR_EXPIRED_RESET_TOKEN'
        });
        expect(dependencies.UserModel.findById).not.toHaveBeenCalled();
    });

    test('rejects a token whose user no longer exists', async () => {
        const dependencies = createDependencies();
        dependencies.UserModel.findById.mockResolvedValue(null);
        const service = createPasswordResetService(dependencies);

        await expect(service.resetPassword(signResetToken(), 'Password1!')).rejects.toMatchObject({
            code: 'INVALID_OR_EXPIRED_RESET_TOKEN'
        });
    });

    test('changes the password and increments passwordVersion', async () => {
        const dependencies = createDependencies();
        const user = { password: 'old-hash', passwordVersion: 2, save: jest.fn() };
        user.save.mockResolvedValue(user);
        dependencies.UserModel.findById.mockResolvedValue(user);
        const service = createPasswordResetService(dependencies);

        await service.resetPassword(signResetToken(), 'Password1!');

        expect(user.password).toBe('Password1!');
        expect(user.passwordVersion).toBe(3);
        expect(user.save).toHaveBeenCalledTimes(1);
    });

    test('allows the same reset token to be replayed before expiry', async () => {
        const dependencies = createDependencies();
        const user = { password: 'old-hash', passwordVersion: 0, save: jest.fn() };
        user.save.mockResolvedValue(user);
        dependencies.UserModel.findById.mockResolvedValue(user);
        const service = createPasswordResetService(dependencies);
        const token = signResetToken();

        await service.resetPassword(token, 'Password1!');
        await service.resetPassword(token, 'Different2@');

        expect(user.password).toBe('Different2@');
        expect(user.passwordVersion).toBe(2);
        expect(user.save).toHaveBeenCalledTimes(2);
    });
});
