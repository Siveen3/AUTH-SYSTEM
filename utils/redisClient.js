const { createClient } = require('redis');

// ---------------------------------------------------------------------------
// Redis client singleton
// ---------------------------------------------------------------------------
// The client is created lazily (on first use) so that modules that require
// this file at startup do not fail when Redis is unavailable in unit tests.
// ---------------------------------------------------------------------------

let _client = null;

/**
 * Returns the shared Redis client, creating and connecting it on first call.
 * @returns {Promise<import('redis').RedisClientType>}
 */
async function getClient() {
    if (_client) return _client;

    _client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    _client.on('error', (err) => {
        console.error('[Redis] Client error:', err.message);
    });

    await _client.connect();
    console.log('[Redis] Connected.');
    return _client;
}

// ---------------------------------------------------------------------------
// OTP key template
// ---------------------------------------------------------------------------
/**
 * Builds the Redis key for an OTP associated with an email address.
 * @param {string} email
 * @returns {string}
 */
function templateOtpWithEmail(email) {
    return `OTP:${email}`;
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Stores a value in Redis with an optional TTL.
 * @param {string}  key     - Redis key.
 * @param {*}       value   - Value to serialize as JSON.
 * @param {number}  [ttl]   - Time-to-live in seconds (omit for no expiry).
 * @returns {Promise<string>} Redis response ('OK').
 */
async function setRecord(key, value, ttl) {
    const client = await getClient();
    const options = ttl ? { EX: ttl } : {};
    return client.set(key, JSON.stringify(value), options);
}

/**
 * Retrieves and JSON-parses a value from Redis.
 * @param {string} key
 * @returns {Promise<*>} Parsed value, or null if the key does not exist.
 */
async function getRecord(key) {
    const client = await getClient();
    const raw = await client.get(key);
    return raw !== null ? JSON.parse(raw) : null;
}

/**
 * Deletes a key from Redis.
 * @param {string} key
 * @returns {Promise<number>} Number of keys deleted.
 */
async function deleteRecord(key) {
    const client = await getClient();
    return client.del(key);
}

module.exports = {
    getClient,
    templateOtpWithEmail,
    setRecord,
    getRecord,
    deleteRecord
};
