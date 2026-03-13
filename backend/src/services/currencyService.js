const axios = require('axios');
const { query } = require('../config/database');
const logger = require('../config/logger');

// Get current CNY→KGS rate from DB settings
const getRateFromDB = async () => {
  const res = await query(`SELECT value FROM settings WHERE key = 'currency_cny_kgs'`);
  return parseFloat(res.rows[0]?.value || '15.5');
};

// Fetch from National Bank of Kyrgyzstan (NBKR)
const fetchFromNBKR = async () => {
  try {
    const response = await axios.get('https://www.nbkr.kg/XML/daily.xml', {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const xml = response.data;
    // Parse CNY rate from XML: <Currency ISOCode="CNY"><Value>XX.XX</Value></Currency>
    const match = xml.match(/ISOCode="CNY"[^>]*>[\s\S]*?<Value>([\d.]+)<\/Value>/i);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
    return null;
  } catch (err) {
    logger.warn('NBKR fetch failed, trying fallback', { error: err.message });
    return null;
  }
};

// Fallback: exchangerate-api
const fetchFromFallback = async () => {
  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/CNY', {
      timeout: 10000
    });
    const kgsRate = response.data?.rates?.KGS;
    if (kgsRate) return parseFloat(kgsRate);
    return null;
  } catch (err) {
    logger.warn('Fallback currency fetch failed', { error: err.message });
    return null;
  }
};

// Update rate in DB
const updateCurrencyRate = async () => {
  try {
    let rate = await fetchFromNBKR();
    if (!rate) rate = await fetchFromFallback();
    if (!rate) {
      logger.error('Failed to fetch currency rate from all sources');
      return null;
    }

    const roundedRate = Math.round(rate * 100) / 100;

    await query(`
      UPDATE settings SET value = $1, updated_at = NOW()
      WHERE key = 'currency_cny_kgs'
    `, [roundedRate.toString()]);

    await query(`
      UPDATE settings SET value = $1, updated_at = NOW()
      WHERE key = 'currency_updated_at'
    `, [new Date().toISOString()]);

    // Recalculate all product prices
    await recalculateAllPrices();

    logger.info(`Currency rate updated: 1 CNY = ${roundedRate} KGS`);
    return roundedRate;
  } catch (err) {
    logger.error('Error updating currency rate', { error: err.message });
    return null;
  }
};

// Recalculate final prices for all active products
const recalculateAllPrices = async () => {
  try {
    const settings = await getSettings();
    const rate = settings.cnyKgs;
    const markupPercent = settings.markupPercent;
    const markupFixed = settings.markupFixed;
    const cargoKgs = settings.cargoKgs;
    const chinaDelivery = settings.chinaDelivery;
    const minCommission = settings.minCommission;
    const roundTo = settings.roundTo;

    const products = await query(`
      SELECT id, current_price, is_manual_price, manual_price
      FROM products WHERE is_active = TRUE AND current_price IS NOT NULL
    `);

    for (const product of products.rows) {
      if (product.is_manual_price && product.manual_price) {
        await query(`UPDATE products SET final_price = $1 WHERE id = $2`, [
          product.manual_price, product.id
        ]);
        continue;
      }

      const priceKgs = parseFloat(product.current_price) * rate;
      const commission = Math.max(priceKgs * (markupPercent / 100) + markupFixed, minCommission);
      let finalPrice = priceKgs + chinaDelivery + cargoKgs + commission;
      finalPrice = Math.ceil(finalPrice / roundTo) * roundTo;

      await query(`
        UPDATE products SET price_kgs = $1, final_price = $2, updated_at = NOW()
        WHERE id = $3
      `, [Math.round(priceKgs), Math.round(finalPrice), product.id]);
    }

    logger.info(`Recalculated prices for ${products.rows.length} products`);
  } catch (err) {
    logger.error('Error recalculating prices', { error: err.message });
  }
};

// Get settings as object
const getSettings = async () => {
  const res = await query(`SELECT key, value FROM settings WHERE key LIKE 'price_%' OR key = 'currency_cny_kgs'`);
  const s = {};
  res.rows.forEach(r => { s[r.key] = r.value; });

  return {
    cnyKgs: parseFloat(s['currency_cny_kgs'] || '15.5'),
    markupPercent: parseFloat(s['price_markup_percent'] || '20'),
    markupFixed: parseFloat(s['price_markup_fixed'] || '0'),
    cargoKgs: parseFloat(s['price_cargo_kgs'] || '250'),
    chinaDelivery: parseFloat(s['price_china_delivery'] || '100'),
    minCommission: parseFloat(s['price_min_commission'] || '100'),
    roundTo: parseInt(s['price_round_to'] || '10'),
    autoCalculate: s['price_auto_calculate'] !== 'false'
  };
};

// Calculate price for one product
const calculatePrice = async (pricesCny) => {
  const settings = await getSettings();
  const priceKgs = parseFloat(pricesCny) * settings.cnyKgs;
  const commission = Math.max(
    priceKgs * (settings.markupPercent / 100) + settings.markupFixed,
    settings.minCommission
  );
  const finalRaw = priceKgs + settings.chinaDelivery + settings.cargoKgs + commission;
  const finalPrice = Math.ceil(finalRaw / settings.roundTo) * settings.roundTo;

  return {
    priceChina: Math.round(priceKgs),
    chinaDelivery: settings.chinaDelivery,
    cargoKgs: settings.cargoKgs,
    commission: Math.round(commission),
    finalPrice: Math.round(finalPrice),
    rate: settings.cnyKgs
  };
};

module.exports = { getRateFromDB, updateCurrencyRate, recalculateAllPrices, calculatePrice, getSettings };
