const authService = require('../services/authService');
const AppError = require('../utils/AppError');
const { isValidEmail, isStrongPassword } = require('../validators/passwordResetValidation');

function createAuthController(service = authService) {
    async function signup(req, res) {
        const { name, email, password, confirmPassword } = req.body || {};

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            throw new AppError('Name is required and must be at least 2 characters.', 400, 'VALIDATION_ERROR');
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

        const user = await service.registerUser({ name: name.trim(), email: email.trim().toLowerCase(), password });

        return res.status(201).json({ message: 'User created successfully.', userId: user._id });
    }

    async function login(req, res) {
        const { email, password } = req.body || {};

        if (!isValidEmail(email)) {
            throw new AppError('A valid email address is required.', 400, 'VALIDATION_ERROR');
        }

        if (typeof password !== 'string' || !password.trim()) {
            throw new AppError('Password is required.', 400, 'VALIDATION_ERROR');
        }

        const token = await service.authenticateUser(email.trim().toLowerCase(), password);

        return res.status(200).json({ accessToken: token });
    }

    return {
        signup,
        login
    };
}

module.exports = createAuthController();
module.exports.createAuthController = createAuthController;
