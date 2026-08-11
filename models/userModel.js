const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

if (String(process.env.USE_IN_MEMORY_DB).toLowerCase() === 'true') {
    const store = {
        users: []
    };

    function makeId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    async function create(doc) {
        const _id = makeId();
        const hashed = await bcrypt.hash(doc.password, 12);
        const now = new Date().toISOString();
        const user = {
            _id,
            name: doc.name,
            email: String(doc.email).toLowerCase(),
            password: hashed,
            passwordVersion: 0,
            createdAt: now,
            updatedAt: now
        };
        store.users.push(user);

        // return object similar to mongoose document
        return {
            ...user,
            comparePassword(candidate) {
                return bcrypt.compare(candidate, user.password);
            }
        };
    }

    function findOne(query) {
        const qEmail = query && query.email ? String(query.email).toLowerCase() : undefined;

        return {
            async select() {
                const user = store.users.find(u => qEmail ? u.email === qEmail : false);
                if (!user) return null;
                return {
                    ...user,
                    comparePassword(candidate) {
                        return bcrypt.compare(candidate, user.password);
                    }
                };
            }
        };
    }

    function findById(id) {
        return {
            async select() {
                const user = store.users.find(u => String(u._id) === String(id));
                if (!user) return null;
                return {
                    ...user,
                    comparePassword(candidate) {
                        return bcrypt.compare(candidate, user.password);
                    }
                };
            }
        };
    }

    module.exports = {
        create,
        findOne,
        findById
    };
}

// Default: export mongoose model (existing behavior)
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        passwordVersion: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

userSchema.pre('save', async function hashModifiedPassword() {
    if (!this.isModified('password')) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
