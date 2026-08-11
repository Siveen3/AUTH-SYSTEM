const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function connectDatabase() {
    if (process.env.USE_IN_MEMORY_DB === 'true') {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        await mongoose.connect(mongoUri);
        console.log('In-memory MongoDB connected');
        return;
    }

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error('MONGODB_URI is required');
    }

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
}

module.exports = connectDatabase;