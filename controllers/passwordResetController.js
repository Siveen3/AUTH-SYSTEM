const passwordResetService = require('../services/passwordResetService');
const AppError = require('../utils/AppError');
const { isValidEmail, isStrongPassword } = require('../validators/passwordResetValidation');

const GENERIC_FORGOT_PASSWORD_MESSAGE =
    'If an account exists for that email, a password-reset link has been sent.';

function createPasswordResetController(service = passwordResetService) {
    async function forgotPassword(req, res) {
        const { email } = req.body || {};

        if (!isValidEmail(email)) {
            throw new AppError('A valid email address is required.', 400, 'VALIDATION_ERROR');
        }

        await service.requestPasswordReset(email);

        return res.status(202).json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
    }

    async function resetPassword(req, res) {
        const { token, newPassword, confirmPassword } = req.body || {};

        if (typeof token !== 'string' || !token.trim()) {
            throw new AppError('A password-reset token is required.', 400, 'VALIDATION_ERROR');
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

        await service.resetPassword(token.trim(), newPassword);

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
