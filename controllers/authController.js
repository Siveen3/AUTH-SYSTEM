const authService = require('../services/authService');
const AppError = require('../utils/AppError');
const { isValidEmail, isStrongPassword } = require('../validators/passwordResetValidation');

// ---------------------------------------------------------------------------
// Auth controller factory
// ---------------------------------------------------------------------------

function createAuthController(service = authService) {

    // -----------------------------------------------------------------------
    // POST /api/auth/signup
    // -----------------------------------------------------------------------
    /**
     * Registers a new user account.
     * On success, an OTP is emailed and the client should call /verify-otp.
     */
    async function signup(req, res) {
        const {
            name,
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            phoneNumber,
            age,
            address,
            gender,
            role
        } = req.body || {};

        // A display name is required (either name or firstName+lastName)
        const displayName = (firstName && lastName)
            ? `${firstName.trim()} ${lastName.trim()}`
            : (name ? name.trim() : null);

        if (!displayName || displayName.trim().length < 2) {
            throw new AppError(
                'A full name is required (at least 2 characters).',
                400,
                'VALIDATION_ERROR'
            );
        }

        if (!isValidEmail(email)) {
            throw new AppError('A valid email address is required.', 400, 'VALIDATION_ERROR');
        }

        if (password !== confirmPassword) {
            throw new AppError('Passwords do not match.', 400, 'VALIDATION_ERROR');
        }

        if (!isStrongPassword(password)) {
            throw new AppError(
                'Password must contain at least eight characters, one uppercase letter, one number, and one special character.',
                400,
                'VALIDATION_ERROR'
            );
        }

        const result = await service.registerUser({
            name: displayName,
            firstName: firstName ? firstName.trim() : undefined,
            lastName: lastName ? lastName.trim() : undefined,
            email: String(email).trim().toLowerCase(),
            password,
            phoneNumber,
            age,
            address,
            gender,
            role
        });

        return res.status(201).json({
            message: 'Account created. Please check your email for the verification code.',
            userId: result.userId
        });
    }

    // -----------------------------------------------------------------------
    // POST /api/auth/verify-otp
    // -----------------------------------------------------------------------
    /**
     * Verifies the registration OTP and activates the user account.
     */
    async function verifyOtp(req, res) {
        const { email, otp } = req.body || {};

        if (!isValidEmail(email)) {
            throw new AppError('A valid email address is required.', 400, 'VALIDATION_ERROR');
        }

        if (otp === undefined || otp === null || String(otp).trim() === '') {
            throw new AppError('A verification code is required.', 400, 'VALIDATION_ERROR');
        }

        await service.verifyRegistrationOtp(email.trim().toLowerCase(), otp);

        return res.status(200).json({
            message: 'Email verified successfully. You can now sign in.'
        });
    }

    // -----------------------------------------------------------------------
    // POST /api/auth/login
    // -----------------------------------------------------------------------
    /**
     * Authenticates a verified user and returns a JWT access token.
     */
    async function login(req, res) {
        const { email, password } = req.body || {};

        if (!isValidEmail(email)) {
            throw new AppError('A valid email address is required.', 400, 'VALIDATION_ERROR');
        }

        if (typeof password !== 'string' || !password.trim()) {
            throw new AppError('Password is required.', 400, 'VALIDATION_ERROR');
        }

        let token;

        try {
            token = await service.authenticateUser(email.trim().toLowerCase(), password);
        } catch (err) {
            // Re-throw operational errors (EMAIL_NOT_VERIFIED, ACCOUNT_BLOCKED, etc.)
            if (err instanceof AppError) throw err;
            // Generic failure to avoid leaking internals
            throw new AppError('Invalid email or password.', 401, 'AUTHENTICATION_FAILED');
        }

        return res.status(200).json({ accessToken: token });
    }

    return {
        signup,
        verifyOtp,
        login
    };
}

module.exports = createAuthController();
module.exports.createAuthController = createAuthController;
