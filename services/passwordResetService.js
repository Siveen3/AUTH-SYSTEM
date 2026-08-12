const User = require('../models/userModel');
const emailService = require('./emailService');
const AppError = require('../utils/AppError');
const generateOTP = require('../utils/generateOtp');
const { setRecord, getRecord, deleteRecord, templateOtpWithEmail } = require('../utils/redisClient');

// OTP TTL: 5 minutes
const OTP_TTL_SECONDS = 5 * 60;

// ---------------------------------------------------------------------------
// Password-reset service factory
// ---------------------------------------------------------------------------

function createPasswordResetService({
    UserModel = User,
    mailer = emailService,
    logger = console,
    otpStore = { setRecord, getRecord, deleteRecord, templateOtpWithEmail }
} = {}) {

    // -----------------------------------------------------------------------
    // Step 1: request a password reset → send OTP to email
    // -----------------------------------------------------------------------
    /**
     * Generates an OTP and emails it to the account holder.
     * Returns silently for unknown addresses to avoid user-enumeration.
     *
     * @param {string} email
     * @returns {Promise<void>}
     */
    async function requestPasswordReset(email) {
        const normalizedEmail = String(email).trim().toLowerCase();

        const user = await UserModel.findOne({ email: normalizedEmail }).select('_id email');

        // Do not reveal whether the address exists
        if (!user) return;

        try {
            const otp = generateOTP();
            const otpKey = otpStore.templateOtpWithEmail(normalizedEmail);
            await otpStore.setRecord(otpKey, otp, OTP_TTL_SECONDS);

            await mailer.sendOtpEmail({
                to: user.email,
                subject: 'Reset your password – AUTH-SYSTEM',
                otp
            });
        } catch (_error) {
            logger.error('Password-reset OTP delivery failed.');
        }
    }

    // -----------------------------------------------------------------------
    // Step 2: verify OTP + set new password
    // -----------------------------------------------------------------------
    /**
     * Validates the submitted OTP against Redis, then updates the user's password.
     *
     * @param {string}        email       - The account email address.
     * @param {string|number} otp         - The OTP received by the user.
     * @param {string}        newPassword - The desired new password (already validated by controller).
     * @returns {Promise<void>}
     */
    async function resetPassword(email, otp, newPassword) {
        const normalizedEmail = String(email).trim().toLowerCase();

        const user = await UserModel.findOne({ email: normalizedEmail }).select('+password +passwordVersion');

        if (!user) {
            throw new AppError(
                'The password-reset code is invalid or has expired.',
                400,
                'INVALID_OR_EXPIRED_RESET_OTP'
            );
        }

        const otpKey = otpStore.templateOtpWithEmail(normalizedEmail);
        const storedOtp = await otpStore.getRecord(otpKey);

        if (storedOtp === null || String(storedOtp) !== String(otp)) {
            throw new AppError(
                'The password-reset code is invalid or has expired.',
                400,
                'INVALID_OR_EXPIRED_RESET_OTP'
            );
        }

        // Update password and invalidate existing tokens by bumping the version
        user.password = newPassword;
        user.passwordVersion = (user.passwordVersion || 0) + 1;
        await user.save();

        // OTP is single-use – delete it from Redis after a successful reset
        await otpStore.deleteRecord(otpKey);
    }

    return {
        requestPasswordReset,
        resetPassword
    };
}

module.exports = createPasswordResetService();
module.exports.createPasswordResetService = createPasswordResetService;
