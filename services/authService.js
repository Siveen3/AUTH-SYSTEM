const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const emailService = require('./emailService');
const AppError = require('../utils/AppError');
const generateOTP = require('../utils/generateOtp');
const { setRecord, getRecord, deleteRecord, templateOtpWithEmail } = require('../utils/redisClient');

// OTP TTL: 5 minutes
const OTP_TTL_SECONDS = 5 * 60;

// ---------------------------------------------------------------------------
// Auth service factory
// ---------------------------------------------------------------------------

function createAuthService({
    UserModel = User,
    jwtLibrary = jwt,
    mailer = emailService,
    env = process.env,
    otpStore = { setRecord, getRecord, deleteRecord, templateOtpWithEmail }
} = {}) {

    // -----------------------------------------------------------------------
    // Register a new user and send an OTP for email verification
    // -----------------------------------------------------------------------
    /**
     * Creates a new user account (unverified) and dispatches a registration OTP.
     *
     * @param {object} data
     * @param {string} data.name
     * @param {string} data.email
     * @param {string} data.password
     * @param {string} [data.firstName]
     * @param {string} [data.lastName]
     * @param {string} [data.phoneNumber]
     * @param {number} [data.age]
     * @param {string} [data.address]
     * @param {string} [data.gender]
     * @param {string} [data.role]
     * @returns {Promise<{userId: string}>}
     */
    async function registerUser(data) {
        const email = String(data.email).trim().toLowerCase();

        // Ensure the address is not already taken
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            throw new AppError('A user with that email already exists.', 409, 'EMAIL_EXISTS');
        }

        // Persist the user with confirmEmail: false
        const user = await UserModel.create({
            ...data,
            email,
            confirmEmail: false
        });

        // Generate and store OTP
        const otp = generateOTP();
        const otpKey = otpStore.templateOtpWithEmail(email);
        await otpStore.setRecord(otpKey, otp, OTP_TTL_SECONDS);

        // Send OTP via email (non-blocking – errors are caught so registration
        // still succeeds even when the mailer is misconfigured)
        try {
            await mailer.sendOtpEmail({
                to: email,
                subject: 'Verify your email – AUTH-SYSTEM',
                otp
            });
        } catch (_err) {
            console.error('[authService] OTP email delivery failed.');
        }

        return { userId: String(user._id) };
    }

    // -----------------------------------------------------------------------
    // Verify OTP sent during registration
    // -----------------------------------------------------------------------
    /**
     * Activates a user account by matching the submitted OTP against Redis.
     *
     * @param {string} email
     * @param {string|number} otp
     * @returns {Promise<void>}
     */
    async function verifyRegistrationOtp(email, otp) {
        const normalizedEmail = String(email).trim().toLowerCase();

        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) {
            throw new AppError('No account found for that email address.', 404, 'USER_NOT_FOUND');
        }

        if (user.confirmEmail) {
            throw new AppError('This account is already verified.', 400, 'ALREADY_VERIFIED');
        }

        const otpKey = otpStore.templateOtpWithEmail(normalizedEmail);
        const storedOtp = await otpStore.getRecord(otpKey);

        if (storedOtp === null || String(storedOtp) !== String(otp)) {
            throw new AppError('The verification code is invalid or has expired.', 400, 'INVALID_OR_EXPIRED_OTP');
        }

        // Mark the account as verified and remove the OTP
        user.confirmEmail = true;
        await user.save();
        await otpStore.deleteRecord(otpKey);
    }

    // -----------------------------------------------------------------------
    // Authenticate a verified user and issue a JWT
    // -----------------------------------------------------------------------
    /**
     * Validates credentials and returns a signed access token.
     *
     * @param {string} email
     * @param {string} password
     * @returns {Promise<string>} Signed JWT access token.
     */
    async function authenticateUser(email, password) {
        const normalizedEmail = String(email).trim().toLowerCase();

        const user = await UserModel.findOne({ email: normalizedEmail }).select('+password +passwordVersion');

        if (!user || !(await user.comparePassword(password))) {
            throw new AppError('Invalid email or password.', 401, 'AUTHENTICATION_FAILED');
        }

        // Block login for unverified accounts
        if (!user.confirmEmail) {
            throw new AppError(
                'Please verify your email address before signing in.',
                403,
                'EMAIL_NOT_VERIFIED'
            );
        }

        // Block login for blocked accounts
        if (user.statusAccount && user.statusAccount === 'blocked') {
            throw new AppError('Your account has been suspended.', 403, 'ACCOUNT_BLOCKED');
        }

        if (!env.JWT_ACCESS_SECRET) {
            throw new AppError(
                'JWT access-token configuration is missing.',
                500,
                'AUTH_CONFIGURATION_ERROR'
            );
        }

        const token = jwtLibrary.sign(
            { type: 'access', ver: user.passwordVersion || 0 },
            env.JWT_ACCESS_SECRET,
            {
                algorithm: 'HS256',
                subject: String(user._id),
                expiresIn: env.JWT_ACCESS_EXPIRES_IN || '1h'
            }
        );

        return token;
    }

    return {
        registerUser,
        verifyRegistrationOtp,
        authenticateUser
    };
}

module.exports = createAuthService();
module.exports.createAuthService = createAuthService;
