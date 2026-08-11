const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function isValidEmail(email) {
    return typeof email === 'string' && EMAIL_PATTERN.test(email.trim());
}

function isStrongPassword(password) {
    return typeof password === 'string' && PASSWORD_PATTERN.test(password);
}

module.exports = {
    isValidEmail,
    isStrongPassword
};
