/**
 * Generates a 4-digit OTP code.
 * @returns {number} A random 4-digit number between 1000 and 9999.
 */
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000);
}

module.exports = generateOTP;
