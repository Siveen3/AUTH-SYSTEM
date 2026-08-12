const path = require('path');

require('dotenv').config({
    path: path.join(__dirname, 'config.env'),
    quiet: true
});

const app = require('./app');
const connectDatabase = require('./config/dbConfig');
const { initSupabase } = require('./config/supabaseConfig');

const port = Number.parseInt(process.env.PORT, 10) || 3000;

async function startServer() {
    try {
        // Initialize Supabase for user authentication
        if (process.env.USE_SUPABASE === 'true') {
            await initSupabase();
        } else {
            await connectDatabase();
        }

        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Unable to start the server:', error.message);
        process.exitCode = 1;
    }
}

if (require.main === module) {
    startServer();
}

module.exports = startServer;
