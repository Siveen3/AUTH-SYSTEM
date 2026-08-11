const fs = require('fs');
const path = require('path');

const sharedAuthTest = path.join(__dirname, 'tests', 'auth.test.js');
const sharedAuthTestIsEmpty =
    fs.existsSync(sharedAuthTest) && fs.readFileSync(sharedAuthTest, 'utf8').trim() === '';

module.exports = {
    testEnvironment: 'node',
    clearMocks: true,
    restoreMocks: true,
    testMatch: ['**/tests/**/*.test.js'],
    testPathIgnorePatterns: sharedAuthTestIsEmpty ? ['<rootDir>/tests/auth.test.js'] : []
};
