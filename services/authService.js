const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const AppError = require('../utils/AppError');

const JWT_ERROR_MESSAGE = 'Invalid email or password.';

function createAuthService({ UserModel = User, jwtLibrary = jwt, env = process.env } = {}) {
    async function registerUser({ name, email, password }) {
        const existingUser = await UserModel.findOne({ email });

        if (existingUser) {
            throw new AppError('A user with that email already exists.', 409, 'EMAIL_EXISTS');
        }

        const user = await UserModel.create({ name, email, password });
        return user;
    }

    async function authenticateUser(email, password) {
        const user = await UserModel.findOne({ email }).select('+password +passwordVersion');

        if (!user || !(await user.comparePassword(password))) {
            throw new AppError(JWT_ERROR_MESSAGE, 401, 'AUTHENTICATION_FAILED');
        }

        if (!env.JWT_ACCESS_SECRET) {
            throw new AppError('JWT access-token configuration is missing.', 500, 'AUTH_CONFIGURATION_ERROR');
        }

        const token = jwtLibrary.sign(
            { type: 'access', ver: user.passwordVersion },
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
        authenticateUser
    };
}

module.exports = createAuthService();
module.exports.createAuthService = createAuthService;
