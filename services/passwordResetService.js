const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const emailService = require('./emailService');
const AppError = require('../utils/AppError');

const INVALID_RESET_TOKEN_MESSAGE = 'The password-reset token is invalid or has expired.';
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function invalidResetTokenError() {
    return new AppError(INVALID_RESET_TOKEN_MESSAGE, 400, 'INVALID_OR_EXPIRED_RESET_TOKEN');
}

function createPasswordResetService({
    UserModel = User,
    jwtLibrary = jwt,
    mailer = emailService,
    env = process.env,
    logger = console
} = {}) {
    async function requestPasswordReset(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await UserModel.findOne({ email: normalizedEmail }).select('_id email');

        if (!user) {
            return;
        }

        try {
            if (!env.JWT_RESET_SECRET || !env.PASSWORD_RESET_URL) {
                throw new Error('Password-reset configuration is missing');
            }

            const token = jwtLibrary.sign(
                { type: 'password-reset' },
                env.JWT_RESET_SECRET,
                {
                    algorithm: 'HS256',
                    subject: String(user._id),
                    expiresIn: env.JWT_RESET_EXPIRES_IN || '15m'
                }
            );

            const resetUrl = new URL(env.PASSWORD_RESET_URL);
            resetUrl.searchParams.set('token', token);

            await mailer.sendPasswordResetEmail({
                to: user.email,
                resetUrl: resetUrl.toString()
            });
        } catch (_error) {
            logger.error('Password-reset email delivery failed.');
        }
    }

    async function resetPassword(token, newPassword) {
        if (!env.JWT_RESET_SECRET) {
            throw new AppError(
                'JWT reset-token configuration is missing.',
                500,
                'AUTH_CONFIGURATION_ERROR'
            );
        }

        let claims;

        try {
            claims = jwtLibrary.verify(token, env.JWT_RESET_SECRET, {
                algorithms: ['HS256']
            });
        } catch (_error) {
            throw invalidResetTokenError();
        }

        if (
            !claims ||
            typeof claims !== 'object' ||
            typeof claims.sub !== 'string' ||
            !OBJECT_ID_PATTERN.test(claims.sub) ||
            claims.type !== 'password-reset'
        ) {
            throw invalidResetTokenError();
        }

        const user = await UserModel.findById(claims.sub);

        if (!user) {
            throw invalidResetTokenError();
        }

        user.password = newPassword;
        user.passwordVersion = (user.passwordVersion || 0) + 1;
        await user.save();
    }

    return {
        requestPasswordReset,
        resetPassword
    };
}

module.exports = createPasswordResetService();
module.exports.createPasswordResetService = createPasswordResetService;
