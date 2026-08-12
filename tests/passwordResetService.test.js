const { createPasswordResetService } = require('../services/passwordResetService');
const AppError = require('../utils/AppError');

const USER_ID = '64b7f8f8f8f8f8f8f8f8f8f8';
const USER_EMAIL = 'user@example.com';
const VALID_OTP = 5678;

// ---------------------------------------------------------------------------
// Dependency factory
// ---------------------------------------------------------------------------
function createDependencies() {
    const UserModel = {
        findOne: jest.fn(),
        findById: jest.fn()
    };

    const mailer = {
        sendOtpEmail: jest.fn().mockResolvedValue(undefined)
    };

    const logger = {
        error: jest.fn()
    };

    // In-memory OTP store (replaces Redis in tests)
    const otpMap = new Map();
    const otpStore = {
        templateOtpWithEmail: (email) => `OTP:${email}`,
        setRecord: jest.fn(async (key, value) => { otpMap.set(key, value); }),
        getRecord: jest.fn(async (key) => otpMap.has(key) ? otpMap.get(key) : null),
        deleteRecord: jest.fn(async (key) => { otpMap.delete(key); return 1; })
    };

    return { UserModel, mailer, logger, otpStore, otpMap };
}

function mockFindOne(UserModel, user) {
    UserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user)
    });
}

// ---------------------------------------------------------------------------
// requestPasswordReset
// ---------------------------------------------------------------------------
describe('passwordResetService.requestPasswordReset', () => {
    test('does not reveal or email an unknown account', async () => {
        const deps = createDependencies();
        mockFindOne(deps.UserModel, null);
        const service = createPasswordResetService(deps);

        await service.requestPasswordReset(' UNKNOWN@Example.com ');

        expect(deps.UserModel.findOne).toHaveBeenCalledWith({ email: 'unknown@example.com' });
        expect(deps.mailer.sendOtpEmail).not.toHaveBeenCalled();
    });

    test('sends an OTP email to a known account', async () => {
        const deps = createDependencies();
        mockFindOne(deps.UserModel, { _id: USER_ID, email: USER_EMAIL });
        const service = createPasswordResetService(deps);

        await service.requestPasswordReset('USER@example.com');

        expect(deps.mailer.sendOtpEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: USER_EMAIL })
        );

        // OTP should be stored in the in-memory store
        const key = deps.otpStore.templateOtpWithEmail(USER_EMAIL);
        expect(deps.otpStore.setRecord).toHaveBeenCalledWith(key, expect.any(Number), 300);
    });

    test('sanitizes mail delivery failures without leaking internals', async () => {
        const deps = createDependencies();
        mockFindOne(deps.UserModel, { _id: USER_ID, email: USER_EMAIL });
        deps.mailer.sendOtpEmail.mockRejectedValue(
            new Error('SMTP rejected secret-otp-value')
        );
        const service = createPasswordResetService(deps);

        await expect(service.requestPasswordReset(USER_EMAIL)).resolves.toBeUndefined();

        expect(deps.logger.error).toHaveBeenCalledWith('Password-reset OTP delivery failed.');
        // Ensure the OTP itself is NOT logged
        expect(deps.logger.error.mock.calls.flat().join(' ')).not.toContain('secret-otp-value');
    });
});

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------
describe('passwordResetService.resetPassword', () => {
    test('rejects when the user is not found', async () => {
        const deps = createDependencies();
        deps.UserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });
        const service = createPasswordResetService(deps);

        await expect(
            service.resetPassword(USER_EMAIL, VALID_OTP, 'Password1!')
        ).rejects.toMatchObject({
            statusCode: 400,
            code: 'INVALID_OR_EXPIRED_RESET_OTP'
        });
    });

    test('rejects an incorrect OTP', async () => {
        const deps = createDependencies();
        const user = { _id: USER_ID, email: USER_EMAIL, password: 'old', passwordVersion: 0, save: jest.fn() };
        deps.UserModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
        // Store a different OTP
        const key = deps.otpStore.templateOtpWithEmail(USER_EMAIL);
        deps.otpMap.set(key, 1111);
        const service = createPasswordResetService(deps);

        await expect(
            service.resetPassword(USER_EMAIL, 9999, 'Password1!')
        ).rejects.toMatchObject({
            code: 'INVALID_OR_EXPIRED_RESET_OTP'
        });
        expect(user.save).not.toHaveBeenCalled();
    });

    test('rejects when OTP has expired (not in store)', async () => {
        const deps = createDependencies();
        const user = { _id: USER_ID, email: USER_EMAIL, password: 'old', passwordVersion: 0, save: jest.fn() };
        deps.UserModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
        // OTP map is empty → getRecord returns null
        const service = createPasswordResetService(deps);

        await expect(
            service.resetPassword(USER_EMAIL, VALID_OTP, 'Password1!')
        ).rejects.toMatchObject({
            code: 'INVALID_OR_EXPIRED_RESET_OTP'
        });
    });

    test('changes the password and increments passwordVersion on valid OTP', async () => {
        const deps = createDependencies();
        const user = { _id: USER_ID, email: USER_EMAIL, password: 'old-hash', passwordVersion: 2, save: jest.fn() };
        user.save.mockResolvedValue(user);
        deps.UserModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

        // Pre-seed the OTP
        const key = deps.otpStore.templateOtpWithEmail(USER_EMAIL);
        deps.otpMap.set(key, VALID_OTP);

        const service = createPasswordResetService(deps);
        await service.resetPassword(USER_EMAIL, VALID_OTP, 'Password1!');

        expect(user.password).toBe('Password1!');
        expect(user.passwordVersion).toBe(3);
        expect(user.save).toHaveBeenCalledTimes(1);
    });

    test('deletes the OTP from the store after a successful reset', async () => {
        const deps = createDependencies();
        const user = { _id: USER_ID, email: USER_EMAIL, password: 'old', passwordVersion: 0, save: jest.fn() };
        user.save.mockResolvedValue(user);
        deps.UserModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

        const key = deps.otpStore.templateOtpWithEmail(USER_EMAIL);
        deps.otpMap.set(key, VALID_OTP);

        const service = createPasswordResetService(deps);
        await service.resetPassword(USER_EMAIL, VALID_OTP, 'Password1!');

        expect(deps.otpStore.deleteRecord).toHaveBeenCalledWith(key);
        expect(deps.otpMap.has(key)).toBe(false);
    });

    test('OTP is single-use – a second reset with the same OTP fails', async () => {
        const deps = createDependencies();
        const user = { _id: USER_ID, email: USER_EMAIL, password: 'old', passwordVersion: 0, save: jest.fn() };
        user.save.mockResolvedValue(user);
        deps.UserModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

        const key = deps.otpStore.templateOtpWithEmail(USER_EMAIL);
        deps.otpMap.set(key, VALID_OTP);

        const service = createPasswordResetService(deps);

        // First reset – succeeds
        await service.resetPassword(USER_EMAIL, VALID_OTP, 'Password1!');
        expect(deps.otpMap.has(key)).toBe(false);

        // Second attempt – OTP is gone, must fail
        await expect(
            service.resetPassword(USER_EMAIL, VALID_OTP, 'Different2@')
        ).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_RESET_OTP' });
    });
});
