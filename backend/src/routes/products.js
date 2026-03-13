const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

const productFields = `
  p.id, p.external_id, p.original_title, p.translated_title,
  p.current_price, p.old_price, p.price_kgs, p.final_price, p.currency,
  p.rating, p.reviews_count, p.seller_name, p.stock_status,
  p.category_id, p.is_featured, p.original_url,
  p.translated_description, p.original_description,
  p.created_at, p.updated_at,
  c.name AS category_name, c.slug AS category_slug,
  (SELECT json_agg(pi2.image_url ORDER BY pi2.sort_order)
   FROM product_images pi2 WHERE pi2.product_id = p.id) AS images,
  (SELECT json_agg(json_build_object(
    'id', pv.id, 'type', pv.variant_type, 'name', pv.variant_name,
    'value', pv.variant_value, 'original', pv.original_value,
    'price_modifier', pv.price_modifier, 'stock', pv.stock_status
  )) FROM product_variants pv WHERE pv.product_id = p.id) AS variants
`;

// GET /api/products — catalog with filters, sort, pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 20, category, search,
      min_price, max_price, in_stock,
      sort = 'created_at', order = 'desc',
      featured
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['p.is_active = TRUE'];
    const params = [];
    let paramIdx = 1;

    if (category) {
      conditions.push(`(c.slug = $${paramIdx} OR c.id = $${paramIdx}::integer)`);
      params.push(category); paramIdx++;
    }
    if (search) {
      conditions.push(`(
        p.search_vector @@ plainto_tsquery('russian', $${paramIdx}) OR
        p.search_vector @@ plainto_tsquery('simple', $${paramIdx}) OR
        p.translated_title ILIKE $${paramIdx + 1} OR
        p.original_title ILIKE $${paramIdx + 1} OR
        p.external_id = $${paramIdx}
      )`);
      params.push(search, `%${search}%`); paramIdx += 2;
    }
    if (min_price) {
      conditions.push(`p.final_price >= $${paramIdx}`);
      params.push(parseFloat(min_price)); paramIdx++;
    }
    if (max_price) {
      conditions.push(`p.final_price <= $${paramIdx}`);
      params.push(parseFloat(max_price)); paramIdx++;
    }
    if (in_stock === 'true') {
      conditions.push(`p.stock_status = 'in_stock'`);
    }
    if (featured === 'true') {
      conditions.push(`p.is_featured = TRUE`);
    }

    const allowedSorts = {
      'price_asc': 'p.final_price ASC NULLS LAST',
      'price_desc': 'p.final_price DESC NULLS LAST',
      'rating': 'p.rating DESC',
      'newest': 'p.created_at DESC',
      'popular': 'p.reviews_count DESC',
      'created_at': 'p.created_at DESC',
    };
    const orderClause = allowedSorts[sort] || allowedSorts['newest'];

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(`
      SELECT COUNT(*) FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].count);

    const result = await query(`
      SELECT ${productFields}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limitNum, offset]);

    res.json({
      products: result.rows,
      pagination: {
        total, page: pageNum, limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/featured
router.get('/featured', async (req, res) => {
  try {
    const result = await query(`
      SELECT ${productFields}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = TRUE AND p.is_featured = TRUE
      ORDER BY p.updated_at DESC
      LIMIT 12
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);

    const result = await query(`
      SELECT ${productFields}
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = TRUE AND (
        ${isNumeric ? `p.id = $1 OR p.external_id = $1` : `p.external_id = $1`}
      )
      LIMIT 1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
