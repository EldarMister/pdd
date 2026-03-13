const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { runParser, parseProduct } = require('../services/parserService');
const { updateCurrencyRate, recalculateAllPrices } = require('../services/currencyService');
const { sendParserNotification } = require('../services/telegramService');
const logger = require('../config/logger');

// Rate limit for login
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many login attempts' }
});

// POST /api/admin/login
router.post('/login', loginLimit, async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password required' });
    }

    const result = await query('SELECT * FROM admins WHERE login = $1', [login]);
    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, login: admin.login },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({ token, admin: { id: admin.id, login: admin.login } });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// All routes below require auth
router.use(authenticate);

// ─── PRODUCTS ──────────────────────────────────────────────────

router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, is_active } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(p.translated_title ILIKE $${idx} OR p.original_title ILIKE $${idx} OR p.external_id = $${idx + 1})`);
      params.push(`%${search}%`, search); idx += 2;
    }
    if (category) {
      conditions.push(`p.category_id = $${idx}`);
      params.push(parseInt(category)); idx++;
    }
    if (is_active !== undefined) {
      conditions.push(`p.is_active = $${idx}`);
      params.push(is_active === 'true'); idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const count = await query(`SELECT COUNT(*) FROM products p ${where}`, params);
    const result = await query(`
      SELECT p.id, p.external_id, p.translated_title, p.original_title,
        p.current_price, p.final_price, p.currency, p.is_active, p.is_featured,
        p.stock_status, p.rating, p.reviews_count, p.parse_failures_count,
        p.last_parsed_at, p.updated_at, p.is_manual_price, p.manual_price,
        p.category_id, c.name AS category_name,
        (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS thumb
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY p.updated_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, parseInt(limit), offset]);

    res.json({
      products: result.rows,
      pagination: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (err) {
    logger.error('Admin products error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      translated_title, translated_description, category_id,
      is_active, is_featured, stock_status, manual_price, is_manual_price
    } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (translated_title !== undefined) { updates.push(`translated_title = $${idx++}`); params.push(translated_title); }
    if (translated_description !== undefined) { updates.push(`translated_description = $${idx++}`); params.push(translated_description); }
    if (category_id !== undefined) { updates.push(`category_id = $${idx++}`); params.push(category_id); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }
    if (is_featured !== undefined) { updates.push(`is_featured = $${idx++}`); params.push(is_featured); }
    if (stock_status !== undefined) { updates.push(`stock_status = $${idx++}`); params.push(stock_status); }
    if (is_manual_price !== undefined) { updates.push(`is_manual_price = $${idx++}`); params.push(is_manual_price); }
    if (manual_price !== undefined) {
      updates.push(`manual_price = $${idx++}`);
      updates.push(`final_price = $${idx++}`);
      params.push(parseFloat(manual_price), parseFloat(manual_price));
    }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = NOW()`);

    params.push(id);
    const result = await query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id`,
      params
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    logger.error('Admin update product error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CATEGORIES ────────────────────────────────────────────────

router.get('/categories', async (req, res) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY sort_order, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, slug, parent_id, seo_title, seo_description, sort_order = 0 } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });

    const result = await query(
      `INSERT INTO categories (name, slug, parent_id, seo_title, seo_description, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, slug, parent_id || null, seo_title, seo_description, sort_order]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/categories/:id', async (req, res) => {
  try {
    const { name, slug, seo_title, seo_description, sort_order, is_active } = req.body;
    const updates = []; const params = []; let idx = 1;

    if (name) { updates.push(`name = $${idx++}`); params.push(name); }
    if (slug) { updates.push(`slug = $${idx++}`); params.push(slug); }
    if (seo_title !== undefined) { updates.push(`seo_title = $${idx++}`); params.push(seo_title); }
    if (seo_description !== undefined) { updates.push(`seo_description = $${idx++}`); params.push(seo_description); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); params.push(sort_order); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }

    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    params.push(req.params.id);
    await query(`UPDATE categories SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── SETTINGS ──────────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  try {
    const result = await query('SELECT key, value, description FROM settings ORDER BY key');
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await query(
        `UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2`,
        [String(value), key]
      );
    }

    // If price settings changed, recalculate
    const priceKeys = ['price_markup_percent', 'price_markup_fixed', 'price_cargo_kgs',
      'price_china_delivery', 'price_min_commission', 'price_round_to'];
    if (Object.keys(updates).some(k => priceKeys.includes(k))) {
      await recalculateAllPrices();
    }

    // If schedule settings changed, reload cron
    const scheduleKeys = ['parser_schedule_cron', 'parser_schedule_enabled', 'price_auto_calculate'];
    if (Object.keys(updates).some(k => scheduleKeys.includes(k))) {
      const { reloadParserSchedule } = require('../jobs/cronJobs');
      await reloadParserSchedule();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PARSER ────────────────────────────────────────────────────

let parserRunning = false;

router.post('/parser/run', async (req, res) => {
  if (parserRunning) {
    return res.status(409).json({ error: 'Parser already running' });
  }

  try {
    const settingsRes = await query(
      `SELECT key, value FROM settings WHERE key IN ('parser_keywords', 'parser_max_products')`
    );
    const s = {};
    settingsRes.rows.forEach(r => { s[r.key] = r.value; });

    const keywords = req.body.keywords || s['parser_keywords'] || 'электроника';
    const maxProducts = parseInt(req.body.max_products || s['parser_max_products'] || '100');
    const delayMin = parseInt(req.body.delay_min || s['parser_delay_min'] || '8000');
    const delayMax = parseInt(req.body.delay_max || s['parser_delay_max'] || '20000');
    const fetchDetails = req.body.fetch_details !== false && s['parser_fetch_details'] !== 'false';

    res.json({ message: 'Parser started', keywords, maxProducts, delayMin, delayMax });

    // Run async
    parserRunning = true;
    runParser({ keywords, maxProducts, delayMin, delayMax, fetchDetails })
      .then(async (stats) => {
        await sendParserNotification(stats);
        parserRunning = false;
      })
      .catch(() => { parserRunning = false; });

  } catch (err) {
    parserRunning = false;
    res.status(500).json({ error: err.message });
  }
});

router.post('/parser/update-product/:id', async (req, res) => {
  try {
    const result = await parseProduct(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/parser/status', async (req, res) => {
  try {
    const lastLog = await query(
      'SELECT * FROM parser_logs ORDER BY created_at DESC LIMIT 1'
    );
    res.json({ running: parserRunning, lastRun: lastLog.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/parser/logs', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM parser_logs ORDER BY created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CURRENCY ──────────────────────────────────────────────────

router.post('/currency/update', async (req, res) => {
  try {
    const rate = await updateCurrencyRate();
    if (!rate) return res.status(500).json({ error: 'Failed to fetch rate' });
    res.json({ rate, message: `Курс обновлён: 1 CNY = ${rate} KGS` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DASHBOARD STATS ───────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [products, orders, categories, rate] = await Promise.all([
      query(`SELECT COUNT(*) total, COUNT(*) FILTER (WHERE is_active) active,
              COUNT(*) FILTER (WHERE is_featured) featured FROM products`),
      query(`SELECT COUNT(*) total FROM order_logs WHERE created_at > NOW() - INTERVAL '7 days'`),
      query(`SELECT COUNT(*) total FROM categories WHERE is_active = TRUE`),
      query(`SELECT value FROM settings WHERE key = 'currency_cny_kgs'`)
    ]);

    res.json({
      products: products.rows[0],
      orders: orders.rows[0],
      categories: categories.rows[0],
      currency: { rate: rate.rows[0]?.value }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
