const axios = require('axios');
const cheerio = require('cheerio');
const { query } = require('../config/database');
const { calculatePrice } = require('./currencyService');
const logger = require('../config/logger');

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const randomDelay = async (minMs, maxMs) => {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await sleep(ms);
  return ms;
};

const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; Samsung SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 11; Redmi Note 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
];
const getUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const getHeaders = (referer = 'https://s.taobao.com/') => ({
  'User-Agent': getUA(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': referer,
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
});

const axiosClient = axios.create({ timeout: 20000, maxRedirects: 5 });

// Default categories + keywords (used when keywords = "all"/"auto" or default russian list)
const DEFAULT_CATEGORIES = [
  { slug: 'elektronika', name: 'Электроника', sort: 1, keywords: ['手机','耳机','电脑','平板','智能手表','相机','键盘','鼠标','充电器'] },
  { slug: 'odezhda', name: 'Одежда', sort: 2, keywords: ['女装','男装','童装','外套','衬衫','裤子','T恤','连衣裙'] },
  { slug: 'obuv', name: 'Обувь', sort: 3, keywords: ['鞋子','运动鞋','靴子','拖鞋','凉鞋'] },
  { slug: 'aksessuary', name: 'Аксессуары', sort: 4, keywords: ['包包','手表','眼镜','皮带','帽子','首饰'] },
  { slug: 'dom', name: 'Товары для дома', sort: 5, keywords: ['家居','厨房','家电','床上用品','收纳','灯具'] },
  { slug: 'krasota', name: 'Красота и здоровье', sort: 6, keywords: ['美妆','护肤','彩妆','洗发','香水','口红'] },
  { slug: 'sport', name: 'Спорт', sort: 7, keywords: ['运动','健身','瑜伽','跑步','自行车'] },
  { slug: 'detskie', name: 'Детские товары', sort: 8, keywords: ['玩具','婴儿','儿童','童鞋','童装'] },
];

const shouldUseDefaultCategories = (keywords) => {
  const k = (keywords || '').toLowerCase().replace(/\s+/g, '');
  return !k || k === 'all' || k === 'auto' || k === 'электроника,одежда,аксессуары';
};

const ensureCategories = async () => {
  const map = {};
  for (const c of DEFAULT_CATEGORIES) {
    const res = await query(
      `INSERT INTO categories (name, slug, sort_order, is_active)
       VALUES ($1,$2,$3,TRUE)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
       RETURNING id`,
      [c.name, c.slug, c.sort]
    );
    map[c.slug] = res.rows[0]?.id;
  }
  return map;
};

// ─────────────────────────────────────────────────────────────
//  TaoBao Search
// ─────────────────────────────────────────────────────────────

const searchTaoBao = async (keyword, page = 1) => {
  const results = [];
  try {
    const url = `https://s.taobao.com/search?q=${encodeURIComponent(keyword)}&s=${(page - 1) * 44}&style=grid&ie=utf8`;
    const resp = await axiosClient.get(url, { headers: getHeaders('https://www.taobao.com/') });
    const $ = cheerio.load(resp.data);

    for (const el of $('script').toArray()) {
      const src = $(el).html() || '';

      // Pattern 1: g_page_config
      const m1 = src.match(/g_page_config\s*=\s*(\{[\s\S]+?\});\s*(?:window|g_srp)/);
      if (m1) {
        try {
          const cfg = JSON.parse(m1[1]);
          const items = cfg?.mods?.itemlist?.data?.auctions || cfg?.mods?.itemlist?.data?.items || [];
          items.forEach(item => { const p = normalizeSearchItem(item); if (p) results.push(p); });
          if (results.length > 0) return results;
        } catch (_) {}
      }

      // Pattern 2: __INIT_DATA__
      const m2 = src.match(/window\.__INIT_DATA__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
      if (m2) {
        try {
          const data = JSON.parse(m2[1]);
          const items = data?.data?.itemsArray || data?.itemsArray || [];
          items.forEach(item => { const p = normalizeSearchItem(item); if (p) results.push(p); });
          if (results.length > 0) return results;
        } catch (_) {}
      }
    }

    // Fallback: HTML scraping
    $('.items .item, .m-itemlist .items-wrapper .item').each((_, el) => {
      const $el = $(el);
      const itemId = $el.attr('data-nid') || $el.find('[data-nid]').attr('data-nid');
      if (!itemId) return;
      const title = $el.find('.title strong, .title a').text().trim();
      const price = parseFloat(($el.find('.price strong, .c-price').first().text() || '0').replace(/[^\d.]/g, '')) || 0;
      const pic = extractImgSrc($el.find('img').first().attr('data-src') || $el.find('img').first().attr('src') || '');
      if (itemId && price > 0) results.push({ itemId, title, price, pic, salesCount: 0, shopName: '' });
    });

    logger.info(`TaoBao search "${keyword}" page ${page}: ${results.length} items`);
    return results;
  } catch (err) {
    logger.warn(`TaoBao search failed "${keyword}" p${page}`, { error: err.message });
    return [];
  }
};

// ─────────────────────────────────────────────────────────────
//  TaoBao Item Detail
// ─────────────────────────────────────────────────────────────

const getItemDetail = async (itemId) => {
  try {
    const url = `https://item.taobao.com/item.htm?id=${itemId}`;
    const resp = await axiosClient.get(url, { headers: getHeaders('https://s.taobao.com/') });
    const $ = cheerio.load(resp.data);
    let data = null;

    const patterns = [
      /var\s+__GLOBAL_DATA__\s*=\s*(\{[\s\S]+?\});\s*(?:window|<\/script>)/,
      /TBC\.pagePropOnce\s*=\s*(\{[\s\S]+?\});\s*(?:window|TBC|<\/script>)/,
      /window\.__INIT_DATA__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/,
      /var\s+GDetailPage\s*=\s*(\{[\s\S]+?\});\s*(?:window|<\/script>)/,
    ];

    for (const el of $('script').toArray()) {
      const src = $(el).html() || '';
      for (const pattern of patterns) {
        const m = src.match(pattern);
        if (m) {
          try {
            const parsed = JSON.parse(m[1]);
            const item = parsed?.item || parsed?.data?.item || parsed?.itemDO || parsed;
            if (item?.itemId || item?.item_id || item?.nid) {
              data = { raw: parsed, item };
              break;
            }
          } catch (_) {}
        }
        if (data) break;
      }
      if (data) break;
    }

    return buildProductFromDetail(itemId, data, $);
  } catch (err) {
    logger.warn(`TaoBao detail failed ${itemId}`, { error: err.message });
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
//  Normalize
// ─────────────────────────────────────────────────────────────

const normalizeSearchItem = (item) => {
  if (!item) return null;
  const itemId = String(item.nid || item.itemId || item.item_id || item.id || '');
  if (!itemId) return null;
  const price = parseFloat(String(item.view_price || item.price || item.unifiedPrice || '0').replace(/[^\d.]/g, '')) || 0;
  if (price <= 0) return null;
  return {
    itemId,
    title: item.raw_title || item.title || item.name || '',
    price,
    pic: extractImgSrc(item.pic_url || item.pic || ''),
    salesCount: parseInt(item.view_sales || item.sales || 0),
    shopName: item.nick || item.shopName || '',
  };
};

const buildProductFromDetail = (itemId, data, $) => {
  const images = new Set();
  if (data?.raw) {
    [data.raw?.item?.images, data.raw?.item?.item_img, data.raw?.descContent?.images, data.raw?.itemDO?.itemImgs]
      .filter(Array.isArray)
      .forEach(arr => arr.forEach(img => {
        const url = extractImgSrc(typeof img === 'string' ? img : img?.url || img?.imageURL || '');
        if (url) images.add(url);
      }));
  }
  $('meta[property="og:image"]').each((_, el) => {
    const url = extractImgSrc($(el).attr('content') || '');
    if (url) images.add(url);
  });

  let price = 0;
  if (data?.item) price = parseFloat(String(data.item.price || data.item.unifiedPrice || '0').replace(/[^\d.]/g, '')) || 0;
  if (!price) price = parseFloat(($('[class*="Price"], .tb-rmb-num').first().text() || '0').replace(/[^\d.]/g, '')) || 0;

  const title = data?.item?.title
    || $('meta[property="og:title"]').attr('content')
    || $('title').text().replace(/- 淘宝.*$/, '').trim()
    || '';

  const variants = [];
  const skuProps = data?.raw?.skuBase?.props || data?.raw?.skuCore?.skuMap || [];
  if (Array.isArray(skuProps)) {
    skuProps.forEach(prop => {
      const typeName = prop.name || prop.propName || '';
      (prop.values || prop.propValues || []).forEach(val => {
        const valueName = typeof val === 'string' ? val : val.name || val.valueName || '';
        if (valueName) variants.push({
          variant_type: typeName === '颜色分类' ? 'color' : typeName === '尺码' ? 'size' : 'option',
          variant_name: typeName, original_value: valueName, variant_value: valueName,
          price_modifier: 0, stock_status: 'in_stock',
        });
      });
    });
  }

  return {
    external_id: String(itemId),
    original_url: `https://item.taobao.com/item.htm?id=${itemId}`,
    original_title: title,
    translated_title: translateTitle(title),
    original_description: data?.item?.desc || $('meta[property="og:description"]').attr('content') || '',
    translated_description: '',
    current_price: price,
    old_price: null,
    currency: 'CNY',
    rating: Math.min(5, parseFloat(data?.raw?.seller?.userRateScore || 0)),
    reviews_count: parseInt(String(data?.item?.soldQuantity || data?.raw?.item?.sellCount || 0).replace(/\D/g, '')) || 0,
    seller_name: data?.raw?.seller?.nick || data?.item?.nick || '',
    stock_status: 'in_stock',
    images: [...images].filter(Boolean).slice(0, 10),
    variants,
  };
};

const extractImgSrc = (url) => {
  if (!url) return '';
  url = url.trim().split('?')[0];
  if (url.startsWith('//')) url = 'https:' + url;
  if (!url.startsWith('http')) return '';
  if (!url.match(/\.(jpg|jpeg|png|webp)/i)) url += '.jpg';
  return url;
};

// ─────────────────────────────────────────────────────────────
//  Translation dictionary
// ─────────────────────────────────────────────────────────────

const CN_RU_DICT = {
  '手机':'смартфон','电话':'телефон','苹果':'Apple','华为':'Huawei','小米':'Xiaomi',
  '三星':'Samsung','耳机':'наушники','蓝牙':'Bluetooth','充电器':'зарядное устройство',
  '数据线':'кабель','手表':'часы','智能手表':'смарт-часы','电脑':'компьютер',
  '笔记本':'ноутбук','平板':'планшет','键盘':'клавиатура','鼠标':'мышь',
  '音响':'колонка','女装':'женская одежда','男装':'мужская одежда','童装':'детская одежда',
  '裙子':'платье','裤子':'брюки','上衣':'верх','外套':'куртка','羽绒服':'пуховик',
  '毛衣':'свитер','T恤':'футболка','衬衫':'рубашка','运动':'спортивный',
  '休闲':'повседневный','时尚':'модный','鞋':'обувь','运动鞋':'кроссовки',
  '高跟鞋':'туфли на каблуке','靴子':'ботинки','拖鞋':'тапочки','凉鞋':'сандалии',
  '包':'сумка','手提包':'ручная сумка','背包':'рюкзак','钱包':'кошелёк',
  '项链':'ожерелье','戒指':'кольцо','手链':'браслет','耳环':'серьги',
  '护肤':'уход за кожей','面膜':'маска для лица','口红':'помада',
  '洗面奶':'гель для умывания','防晒':'солнцезащитный','玩具':'игрушка',
  '积木':'конструктор','毛绒':'плюшевый','儿童':'детский','婴儿':'для малышей',
  '家居':'для дома','床上用品':'постельное бельё','枕头':'подушка',
  '被子':'одеяло','毛巾':'полотенце','厨房':'кухонный','零食':'снеки',
  '饼干':'печенье','茶':'чай','咖啡':'кофе','瑜伽':'йога','健身':'фитнес',
  '户外':'для активного отдыха','自行车':'велосипед','跑步':'беговой',
  '正品':'оригинал','新款':'новый','春夏':'весна-лето','秋冬':'осень-зима',
  '纯棉':'хлопок','真皮':'натуральная кожа','包邮':'бесплатная доставка',
};

const translateTitle = (title) => {
  if (!title) return '';
  let result = title;
  for (const [cn, ru] of Object.entries(CN_RU_DICT)) {
    result = result.replace(new RegExp(cn, 'g'), ru);
  }
  if (/[\u4e00-\u9fff]/.test(result)) {
    return /[а-яёА-ЯЁa-zA-Z]/.test(result) ? result : `[Перевести] ${title.substring(0, 60)}`;
  }
  return result;
};

// ─────────────────────────────────────────────────────────────
//  Save to DB
// ─────────────────────────────────────────────────────────────

const saveProduct = async (productData) => {
  try {
    const priceCalc = productData.current_price ? await calculatePrice(productData.current_price) : null;

    const result = await query(`
      INSERT INTO products (
        external_id, source, original_url, original_title, translated_title,
        original_description, translated_description, current_price, old_price,
        currency, price_kgs, final_price, rating, reviews_count, seller_name,
        stock_status, is_active, parse_failures_count, last_parsed_at, updated_at, category_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,0,NOW(),NOW(),$17)
      ON CONFLICT (external_id) DO UPDATE SET
        original_title       = EXCLUDED.original_title,
        translated_title     = CASE
          WHEN products.translated_title IS NULL OR products.translated_title = ''
            OR products.translated_title LIKE '[Перевести]%'
          THEN EXCLUDED.translated_title ELSE products.translated_title END,
        current_price        = EXCLUDED.current_price,
        price_kgs            = EXCLUDED.price_kgs,
        final_price          = CASE WHEN products.is_manual_price THEN products.final_price ELSE EXCLUDED.final_price END,
        rating               = EXCLUDED.rating,
        reviews_count        = EXCLUDED.reviews_count,
        stock_status         = EXCLUDED.stock_status,
        parse_failures_count = 0,
        last_parsed_at       = NOW(),
        updated_at           = NOW(),
        category_id          = CASE
          WHEN products.category_id IS NULL AND EXCLUDED.category_id IS NOT NULL THEN EXCLUDED.category_id
          ELSE products.category_id
        END
      RETURNING id, (xmax = 0) AS is_new
    `, [
      productData.external_id, 'taobao', productData.original_url,
      productData.original_title, productData.translated_title,
      productData.original_description, '',
      productData.current_price, productData.old_price, 'CNY',
      priceCalc?.priceChina || null, priceCalc?.finalPrice || null,
      productData.rating, productData.reviews_count, productData.seller_name, productData.stock_status,
      productData.category_id || null,
    ]);

    const { id, is_new } = result.rows[0];

    if (productData.images?.length > 0) {
      const ex = await query('SELECT COUNT(*) FROM product_images WHERE product_id = $1', [id]);
      if (parseInt(ex.rows[0].count) === 0) {
        for (let i = 0; i < productData.images.length; i++) {
          await query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [id, productData.images[i], i]);
        }
      }
    }

    if (is_new && productData.variants?.length > 0) {
      const seen = new Set();
      for (const v of productData.variants) {
        const key = `${v.variant_type}:${v.original_value}`;
        if (!seen.has(key)) {
          seen.add(key);
          await query(
            'INSERT INTO product_variants (product_id, variant_type, variant_name, original_value, variant_value, price_modifier, stock_status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [id, v.variant_type, v.variant_name, v.original_value, v.variant_value, v.price_modifier, v.stock_status]
          );
        }
      }
    }

    return { id, is_new };
  } catch (err) {
    logger.error('Error saving product', { external_id: productData.external_id, error: err.message });
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────
//  Main run
// ─────────────────────────────────────────────────────────────

const runParser = async ({
  keywords     = '??????????????????????',
  maxProducts  = 100,
  delayMin     = 8000,
  delayMax     = 20000,
  fetchDetails = true,
} = {}) => {
  const stats = { added: 0, updated: 0, skipped: 0, errors: 0 };
  const logId = await createParserLog('manual', 'running', '???????????? TaoBao ??????????????');

  try {
    const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
    const reachedTarget = () => stats.added >= maxProducts;
    const useDefaultCategories = shouldUseDefaultCategories(keywords);

    const categoryRuns = useDefaultCategories
      ? DEFAULT_CATEGORIES.map(c => ({ categoryId: null, slug: c.slug, keywords: c.keywords, name: c.name }))
      : [{ categoryId: null, slug: null, keywords: keywordList }];

    if (useDefaultCategories) {
      const ids = await ensureCategories();
      categoryRuns.forEach(c => { c.categoryId = ids[c.slug] || null; });
    }

    let cycle = 0;

    while (!reachedTarget()) {
      let addedThisCycle = 0;

      for (const run of categoryRuns) {
        for (const keyword of run.keywords) {
          let page = 1;
          while (true) {
            if (reachedTarget()) break;

            logger.info(`TaoBao: "${keyword}"${run.slug ? ` [${run.slug}]` : ''} ???.${page}`);
            const searchItems = await searchTaoBao(keyword, page);
            if (searchItems.length === 0) break;

            for (const item of searchItems) {
              if (reachedTarget()) break;

              try {
                const ex = await query('SELECT id, last_parsed_at FROM products WHERE external_id = $1', [item.itemId]);
                if (ex.rows.length > 0) {
                  const h = ex.rows[0].last_parsed_at ? (Date.now() - new Date(ex.rows[0].last_parsed_at).getTime()) / 3600000 : 999;
                  if (h < 6) { stats.skipped++; continue; }
                }

                const waited = await randomDelay(delayMin, delayMax);
                logger.debug(`??? ${waited}ms ??? item ${item.itemId}`);

                let product = fetchDetails ? await getItemDetail(item.itemId) : null;
                if (!product) {
                  product = {
                    external_id: item.itemId,
                    original_url: `https://item.taobao.com/item.htm?id=${item.itemId}`,
                    original_title: item.title,
                    translated_title: translateTitle(item.title),
                    original_description: '', translated_description: '',
                    current_price: item.price, old_price: null, currency: 'CNY',
                    rating: 0, reviews_count: item.salesCount || 0,
                    seller_name: item.shopName || '', stock_status: 'in_stock',
                    images: item.pic ? [item.pic] : [], variants: [],
                  };
                }

                product.category_id = run.categoryId || product.category_id || null;

                const { is_new } = await saveProduct(product);
                if (is_new) {
                  stats.added++;
                  addedThisCycle++;
                  logger.info(`??? +${product.external_id} ${product.translated_title || product.original_title}`);
                } else {
                  stats.updated++;
                }

              } catch (err) {
                logger.error(`??? item ${item.itemId}`, { error: err.message });
                stats.errors++;
                await incrementFailures(item.itemId);
              }
            }

            page++;
            await randomDelay(delayMin * 2, delayMax * 2);
          }
        }

        await randomDelay(5000, 10000);
      }

      if (reachedTarget()) break;

      cycle++;
      logger.info(`Cycle ${cycle} complete. Added: ${addedThisCycle}. Waiting before next cycle...`);
      await randomDelay(10 * 60 * 1000, 15 * 60 * 1000);
    }

    await updateParserLog(logId, 'success', `+${stats.added} ??????????, ~${stats.updated} ??????????????????, ???${stats.skipped} ??????????????????`, stats);
    return stats;

  } catch (err) {
    logger.error('Parser crashed', err);
    await updateParserLog(logId, 'error', err.message, stats);
    throw err;
  }
};

const parseProduct = async (urlOrId) => {
  let itemId = urlOrId.trim();
  if (urlOrId.includes('id=')) { const m = urlOrId.match(/[?&]id=(\d+)/); if (m) itemId = m[1]; }
  else if (!/^\d+$/.test(itemId)) { const m = urlOrId.match(/\/(\d{10,})(?:\?|$)/); if (m) itemId = m[1]; }
  if (!/^\d+$/.test(itemId)) throw new Error('Не удалось извлечь ID товара');
  const product = await getItemDetail(itemId);
  if (!product) throw new Error('Не удалось получить данные о товаре');
  const result = await saveProduct(product);
  return { itemId, ...result };
};

const incrementFailures = async (externalId) => {
  await query(`UPDATE products SET parse_failures_count = parse_failures_count + 1,
    is_active = CASE WHEN parse_failures_count >= 4 THEN FALSE ELSE is_active END WHERE external_id = $1`, [externalId]);
};
const createParserLog = async (type, status, message) => {
  const res = await query('INSERT INTO parser_logs (type, status, message) VALUES ($1,$2,$3) RETURNING id', [type, status, message]);
  return res.rows[0].id;
};
const updateParserLog = async (id, status, message, stats) => {
  await query(`UPDATE parser_logs SET status=$1, message=$2, products_added=$3, products_updated=$4, products_skipped=$5 WHERE id=$6`,
    [status, message, stats.added, stats.updated, stats.skipped, id]);
};

module.exports = { runParser, parseProduct };
