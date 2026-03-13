require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS not allowed'));
  },
  credentials: true
}));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 60 * 1000, max: 200,
  message: { error: 'Too many requests' }
}));

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (dev)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
const productsRouter = require('./routes/products');
const adminRouter = require('./routes/admin');
const { categoriesRouter, whatsappRouter, filtersRouter, currencyRouter } = require('./routes/public');

app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/filters', filtersRouter);
app.use('/api/currency', currencyRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Sitemap
app.get('/sitemap.xml', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const products = await query(`SELECT id, updated_at FROM products WHERE is_active = TRUE LIMIT 1000`);
    const cats = await query(`SELECT slug FROM categories WHERE is_active = TRUE`);
    const siteUrl = process.env.SITE_URL || 'https://pdd-shop.up.railway.app';

    const urls = [
      `<url><loc>${siteUrl}</loc><changefreq>daily</changefreq></url>`,
      `<url><loc>${siteUrl}/catalog</loc><changefreq>daily</changefreq></url>`,
      ...cats.rows.map(c => `<url><loc>${siteUrl}/category/${c.slug}</loc><changefreq>daily</changefreq></url>`),
      ...products.rows.map(p => `<url><loc>${siteUrl}/product/${p.id}</loc><lastmod>${new Date(p.updated_at).toISOString().split('T')[0]}</lastmod></url>`)
    ];

    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

app.get('/robots.txt', (_, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /admin
Sitemap: ${process.env.SITE_URL}/sitemap.xml`);
});

// 404
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, path: req.path });
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

module.exports = app;
