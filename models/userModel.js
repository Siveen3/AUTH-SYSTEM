const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
const Role = Object.freeze({ USER: 'user', ADMIN: 'admin' });
const Gender = Object.freeze({ MALE: 'male', FEMALE: 'female' });
const StatusAccount = Object.freeze({
    ACTIVE: 'active',
    BLOCKED: 'blocked',
    PENDING: 'pending'
});

// ---------------------------------------------------------------------------
// In-memory adapter (for tests / quick local demo)
// ---------------------------------------------------------------------------
if (String(process.env.USE_IN_MEMORY_DB).toLowerCase() === 'true') {
    const store = { users: [] };

    function makeId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    async function create(doc) {
        const _id = makeId();
        const hashed = await bcrypt.hash(doc.password, 12);
        const now = new Date().toISOString();
        const user = {
            _id,
            // Core fields
            name: doc.name,
            email: String(doc.email).toLowerCase(),
            password: hashed,
            passwordVersion: 0,
            // Extended fields (may be absent)
            firstName: doc.firstName,
            lastName: doc.lastName,
            phoneNumber: doc.phoneNumber,
            age: doc.age,
            address: doc.address || 'No data provided',
            gender: doc.gender || Gender.MALE,
            role: doc.role || Role.USER,
            statusAccount: doc.statusAccount || StatusAccount.ACTIVE,
            confirmEmail: doc.confirmEmail || false,
            profileImage: doc.profileImage || 'No data provided',
            createdAt: now,
            updatedAt: now
        };
        store.users.push(user);

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
                const user = store.users.find((u) => (qEmail ? u.email === qEmail : false));
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
                const user = store.users.find((u) => String(u._id) === String(id));
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

    async function findByIdAndUpdate(id, update) {
        const idx = store.users.findIndex((u) => String(u._id) === String(id));
        if (idx === -1) return null;
        Object.assign(store.users[idx], update.$set || update);
        return store.users[idx];
    }

    module.exports = { create, findOne, findById, findByIdAndUpdate };
    // Expose enums so other modules can import them from the model if needed
    module.exports.Role = Role;
    module.exports.Gender = Gender;
    module.exports.StatusAccount = StatusAccount;
} else {
    // ---------------------------------------------------------------------------
    // Mongoose schema
    // ---------------------------------------------------------------------------
    const NO_DATA = 'No data provided';

    const userSchema = new mongoose.Schema(
        {
            // Basic identity
            name: {
                type: String,
                trim: true,
                minlength: 2
            },
            // Extended identity (from demo-sarah-app)
            firstName: {
                type: String,
                trim: true,
                minlength: 3,
                maxlength: 80
            },
            lastName: {
                type: String,
                trim: true,
                minlength: 3,
                maxlength: 80
            },
            // Credentials
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
            // Email verification
            confirmEmail: {
                type: Boolean,
                default: false
            },
            // Contact / personal info
            phoneNumber: {
                type: String,
                trim: true,
                minlength: 11,
                maxlength: 11
            },
            age: {
                type: Number,
                min: 16,
                max: 120,
                default: 16
            },
            address: {
                type: String,
                trim: true,
                default: NO_DATA
            },
            profileImage: {
                type: String,
                default: NO_DATA
            },
            // Categorization
            gender: {
                type: String,
                enum: Object.values(Gender),
                default: Gender.MALE
            },
            role: {
                type: String,
                enum: Object.values(Role),
                default: Role.USER
            },
            statusAccount: {
                type: String,
                enum: Object.values(StatusAccount),
                default: StatusAccount.ACTIVE
            },
            // JWT version tracking – invalidates old tokens on password change
            passwordVersion: {
                type: Number,
                default: 0,
                min: 0,
                select: false
            }
        },
        {
            timestamps: true,
            versionKey: 'version',
            toJSON: { virtuals: true },
            toObject: { virtuals: true }
        }
    );

    // ---------------------------------------------------------------------------
    // Virtual: full name
    // ---------------------------------------------------------------------------
    userSchema.virtual('fullName').get(function () {
        if (this.firstName && this.lastName) {
            return `${this.firstName} ${this.lastName}`;
        }
        return this.name || '';
    });

    // ---------------------------------------------------------------------------
    // Pre-save hook: hash password on create or change
    // ---------------------------------------------------------------------------
    userSchema.pre('save', async function hashModifiedPassword() {
        if (!this.isModified('password')) return;
        this.password = await bcrypt.hash(this.password, 12);
    });

    // ---------------------------------------------------------------------------
    // Instance method: compare a candidate password against the stored hash
    // ---------------------------------------------------------------------------
    userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
    };

    const User = mongoose.model('User', userSchema);

    module.exports = User;
    module.exports.Role = Role;
    module.exports.Gender = Gender;
    module.exports.StatusAccount = StatusAccount;
}

