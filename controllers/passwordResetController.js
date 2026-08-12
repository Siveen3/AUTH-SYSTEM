const passwordResetService = require('../services/passwordResetService');
const AppError = require('../utils/AppError');
const { isValidEmail, isStrongPassword } = require('../validators/passwordResetValidation');

const GENERIC_FORGOT_PASSWORD_MESSAGE =
    'If an account exists for that email, a password-reset code has been sent.';

// ---------------------------------------------------------------------------
// Password-reset controller factory
// ---------------------------------------------------------------------------

function createPasswordResetController(service = passwordResetService) {

    // -----------------------------------------------------------------------
    // POST /api/auth/forgot-password
    // Body: { email }
    // -----------------------------------------------------------------------
    /**
     * Initiates an OTP-based password reset.
     * Always returns the same generic response to prevent user-enumeration.
     */
    async function forgotPassword(req, res) {
        const { email } = req.body || {};

        if (!isValidEmail(email)) {
            throw new AppError('A valid email address is required.', 400, 'VALIDATION_ERROR');
        }

        await service.requestPasswordReset(email);

        return res.status(202).json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
    }

    // -----------------------------------------------------------------------
    // POST /api/auth/reset-password
    // Body: { email, otp, newPassword, confirmPassword }
    // -----------------------------------------------------------------------
    /**
     * Validates the OTP and sets the new password.
     */
    async function resetPassword(req, res) {
        const { email, otp, newPassword, confirmPassword } = req.body || {};

        if (!isValidEmail(email)) {
            throw new AppError('A valid email address is required.', 400, 'VALIDATION_ERROR');
        }

        if (otp === undefined || otp === null || String(otp).trim() === '') {
            throw new AppError('A password-reset code is required.', 400, 'VALIDATION_ERROR');
        }

        if (newPassword !== confirmPassword) {
            throw new AppError('Passwords do not match.', 400, 'VALIDATION_ERROR');
        }

        if (!isStrongPassword(newPassword)) {
            throw new AppError(
                'Password must contain at least eight characters, one uppercase letter, one number, and one special character.',
                400,
                'VALIDATION_ERROR'
            );
        }

        await service.resetPassword(
            String(email).trim().toLowerCase(),
            otp,
            newPassword
        );

        return res.status(200).json({ message: 'Password reset successful.' });
    }

    return {
        forgotPassword,
        resetPassword
    };
}

module.exports = createPasswordResetController();
module.exports.createPasswordResetController = createPasswordResetController;
module.exports.GENERIC_FORGOT_PASSWORD_MESSAGE = GENERIC_FORGOT_PASSWORD_MESSAGE;
