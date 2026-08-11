const User = require('../models/userModel');

describe('User password handling', () => {
    test('normalizes email, hashes a modified password, and compares it safely', async () => {
        jest.spyOn(User.collection, 'insertOne').mockImplementation(async (document) => ({
            acknowledged: true,
            insertedId: document._id
        }));

        const user = new User({
            name: 'Test User',
            email: 'TEST@Example.com',
            password: 'Password1!'
        });

        await user.save();

        expect(user.email).toBe('test@example.com');
        expect(user.password).not.toBe('Password1!');
        await expect(user.comparePassword('Password1!')).resolves.toBe(true);
        await expect(user.comparePassword('WrongPassword1!')).resolves.toBe(false);
    });
});
