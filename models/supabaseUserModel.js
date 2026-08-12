const bcrypt = require('bcryptjs');
const { getSupabaseClient } = require('../config/supabaseConfig');

const TABLE_NAME = 'users';

class SupabaseUserModel {
    static async create(doc) {
        const supabase = getSupabaseClient();
        
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from(TABLE_NAME)
            .select('id')
            .eq('email', String(doc.email).toLowerCase())
            .single();

        if (existingUser) {
            throw new Error('A user with that email already exists.');
        }

        // Hash password
        const hashed = await bcrypt.hash(doc.password, 12);
        const now = new Date().toISOString();

        // Insert user
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([
                {
                    name: doc.name,
                    email: String(doc.email).toLowerCase(),
                    password: hashed,
                    password_version: 0,
                    created_at: now,
                    updated_at: now
                }
            ])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return this._formatUser(data);
    }

    static findOne(query) {
        return {
            select: async (fields) => {
                const supabase = getSupabaseClient();
                const qEmail = query && query.email ? String(query.email).toLowerCase() : undefined;

                if (!qEmail) {
                    return null;
                }

                let selectString = '*';
                if (fields) {
                    // Handle +password flag to include password field
                    if (fields.includes('+password')) {
                        selectString = '*';
                    } else {
                        selectString = fields.replace(/\+/g, '').split(' ').join(',');
                    }
                }

                const { data, error } = await supabase
                    .from(TABLE_NAME)
                    .select(selectString)
                    .eq('email', qEmail)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                    throw error;
                }

                if (!data) {
                    return null;
                }

                return SupabaseUserModel._formatUser(data);
            }
        };
    }

    static findById(id) {
        return {
            select: async (fields) => {
                const supabase = getSupabaseClient();

                let selectString = '*';
                if (fields) {
                    selectString = fields.replace(/\+/g, '').split(' ').join(',');
                }

                const { data, error } = await supabase
                    .from(TABLE_NAME)
                    .select(selectString)
                    .eq('id', id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                if (!data) {
                    return null;
                }

                return SupabaseUserModel._formatUser(data);
            }
        };
    }

    static _formatUser(data) {
        return {
            _id: data.id,
            id: data.id,
            name: data.name,
            email: data.email,
            password: data.password,
            passwordVersion: data.password_version,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            comparePassword(candidate) {
                return bcrypt.compare(candidate, data.password);
            }
        };
    }
}

module.exports = SupabaseUserModel;
