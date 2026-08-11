const express = require('express');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const pageRoutes = require('./routes/pageRoutes');
const logoutRoutes = require('./routes/logoutRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use('/', pageRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/', logoutRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
