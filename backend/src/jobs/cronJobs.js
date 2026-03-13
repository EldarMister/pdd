const cron = require('node-cron');
const { updateCurrencyRate } = require('../services/currencyService');
const { runParser } = require('../services/parserService');
const { sendParserNotification } = require('../services/telegramService');
const { query } = require('../config/database');
const logger = require('../config/logger');

// ─────────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────────

let parserCronTask = null;   // active cron task handle
let currentCronExpr = null;  // so we can detect changes

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

const getParserSettings = async () => {
  const res = await query(`
    SELECT key, value FROM settings
    WHERE key IN (
      'parser_keywords', 'parser_max_products',
      'parser_delay_min', 'parser_delay_max',
      'parser_fetch_details', 'parser_schedule_enabled',
      'parser_schedule_cron', 'price_auto_calculate'
    )
  `);
  const s = {};
  res.rows.forEach(r => { s[r.key] = r.value; });
  return {
    keywords:         s['parser_keywords']         || 'электроника',
    maxProducts:      parseInt(s['parser_max_products']  || '100'),
    delayMin:         parseInt(s['parser_delay_min']     || '8000'),
    delayMax:         parseInt(s['parser_delay_max']     || '20000'),
    fetchDetails:     s['parser_fetch_details']     !== 'false',
    scheduleEnabled:  s['parser_schedule_enabled']  !== 'false',
    scheduleCron:     s['parser_schedule_cron']     || '0 */8 * * *',
    autoCalculate:    s['price_auto_calculate']     !== 'false',
  };
};

// Convert a "every N hours" value to a cron expression
const hoursToCron = (hours) => {
  const h = parseInt(hours);
  if (h <= 0) return null;
  if (h === 1)  return '0 * * * *';
  if (h <= 23)  return `0 */${h} * * *`;
  return '0 2 * * *'; // daily at 2am as fallback
};

// ─────────────────────────────────────────────────────────────
//  Parser cron — restartable when settings change
// ─────────────────────────────────────────────────────────────

const startParserCron = async () => {
  const settings = await getParserSettings();

  if (!settings.scheduleEnabled || !settings.autoCalculate) {
    if (parserCronTask) {
      parserCronTask.stop();
      parserCronTask = null;
      currentCronExpr = null;
      logger.info('[CRON] Parser schedule DISABLED');
    }
    return;
  }

  const expr = settings.scheduleCron;

  // Don't restart if same expression is already running
  if (parserCronTask && currentCronExpr === expr) return;

  // Stop old task
  if (parserCronTask) {
    parserCronTask.stop();
    parserCronTask = null;
  }

  if (!cron.validate(expr)) {
    logger.error(`[CRON] Invalid cron expression: "${expr}"`);
    return;
  }

  parserCronTask = cron.schedule(expr, async () => {
    logger.info(`[CRON] Scheduled parser starting (expr: ${expr})`);
    try {
      const s = await getParserSettings();
      if (!s.scheduleEnabled) return;

      const stats = await runParser({
        keywords:    s.keywords,
        maxProducts: s.maxProducts,
        delayMin:    s.delayMin,
        delayMax:    s.delayMax,
        fetchDetails: s.fetchDetails,
      });
      await sendParserNotification(stats);
    } catch (err) {
      logger.error('[CRON] Scheduled parser failed', err);
    }
  });

  currentCronExpr = expr;
  logger.info(`[CRON] Parser scheduled: "${expr}"`);
};

// ─────────────────────────────────────────────────────────────
//  Re-apply schedule when admin saves settings
// ─────────────────────────────────────────────────────────────

const reloadParserSchedule = async () => {
  logger.info('[CRON] Reloading parser schedule...');
  await startParserCron();
};

// ─────────────────────────────────────────────────────────────
//  Start all jobs
// ─────────────────────────────────────────────────────────────

const startJobs = async () => {
  // 1. Currency — every 4 hours, fixed
  cron.schedule('0 */4 * * *', async () => {
    logger.info('[CRON] Updating currency rate...');
    await updateCurrencyRate();
  });
  logger.info('[CRON] Currency job started (every 4h)');

  // 2. Parser — configurable, read from DB
  await startParserCron();

  // 3. Settings watcher — every 5 min re-check if schedule changed
  cron.schedule('*/5 * * * *', async () => {
    try {
      const settings = await getParserSettings();
      if (settings.scheduleCron !== currentCronExpr ||
          (!settings.scheduleEnabled && parserCronTask)) {
        logger.info('[CRON] Schedule settings changed, reloading...');
        await startParserCron();
      }
    } catch (_) {}
  });
};

// ─────────────────────────────────────────────────────────────
//  Exports
// ─────────────────────────────────────────────────────────────

module.exports = { startJobs, reloadParserSchedule, getParserSettings };
