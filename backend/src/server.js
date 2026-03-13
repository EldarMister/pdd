require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./config/database');
const { startJobs } = require('./jobs/cronJobs');
const { updateCurrencyRate } = require('./services/currencyService');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3001;

const start = async () => {
  try {
    // Init DB
    await initDatabase();
    logger.info('Database ready');

    // Update currency on startup
    await updateCurrencyRate();
    logger.info('Currency rate initialized');

    // Start cron jobs
    startJobs();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};

start();
