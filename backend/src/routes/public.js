const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { generateWhatsAppLink } = require('../services/whatsappService');
const { sendOrderNotification } = require('../services/telegramService');

// ─── CATEGORIES ───────────────────────────────────────────────
const categoriesRouter = express.Router();

categoriesRouter.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

categoriesRouter.get('/:slug', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM categories WHERE slug = $1 AND is_active = TRUE',
      [req.params.slug]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── WHATSAPP ─────────────────────────────────────────────────
const whatsappRouter = express.Router();

// POST /api/whatsapp/order — log order + return WA link
whatsappRouter.post('/order', async (req, res) => {
  try {
    const { productId, productTitle, variant, quantity = 1, finalPrice, productUrl } = req.body;

    if (!productTitle) {
      return res.status(400).json({ error: 'productTitle is required' });
    }

    const { url, text, number } = await generateWhatsAppLink({
      productTitle, variant, quantity, finalPrice, productUrl, productId
    });

    // Log order
    await query(`
      INSERT INTO order_logs (product_id, product_title, variant_info, quantity, final_price, whatsapp_number, message_text)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [productId || null, productTitle, variant || null, quantity, finalPrice || null, number, text]);

    // Send Telegram notification
    await sendOrderNotification({ product: productTitle, variant, quantity, finalPrice, productUrl });

    res.json({ url, text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/whatsapp/settings — get WA number for display
whatsappRouter.get('/settings', async (req, res) => {
  try {
    const result = await query(
      `SELECT value FROM settings WHERE key = 'whatsapp_number'`
    );
    res.json({ number: result.rows[0]?.value || '996220203021' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── FILTERS ─────────────────────────────────────────────────
const filtersRouter = express.Router();

filtersRouter.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    const cond = category
      ? `AND (c.slug = '${category.replace(/'/g, '')}' OR c.id::text = '${category.replace(/'/g, '')}')`
      : '';

    const priceRange = await query(`
      SELECT MIN(final_price) AS min_price, MAX(final_price) AS max_price
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = TRUE ${cond}
    `);

    const categories = await query(`
      SELECT c.id, c.name, c.slug, COUNT(p.id) AS count
      FROM categories c
      JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
      GROUP BY c.id ORDER BY c.sort_order
    `);

    res.json({
      priceRange: priceRange.rows[0],
      categories: categories.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CURRENCY ─────────────────────────────────────────────────
const currencyRouter = express.Router();

currencyRouter.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT key, value FROM settings
      WHERE key IN ('currency_cny_kgs', 'currency_updated_at')
    `);
    const data = {};
    result.rows.forEach(r => { data[r.key] = r.value; });
    res.json({ rate: parseFloat(data['currency_cny_kgs'] || '15.5'), updatedAt: data['currency_updated_at'] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { categoriesRouter, whatsappRouter, filtersRouter, currencyRouter };
