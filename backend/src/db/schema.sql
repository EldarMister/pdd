-- ============================================================
-- PDD Shop — Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  seo_title VARCHAR(255),
  seo_description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(50) DEFAULT 'pinduoduo',
  original_url TEXT,
  original_title TEXT,
  translated_title VARCHAR(500),
  original_description TEXT,
  translated_description TEXT,
  current_price NUMERIC(12,2),
  old_price NUMERIC(12,2),
  currency VARCHAR(10) DEFAULT 'CNY',
  price_kgs NUMERIC(12,2),
  final_price NUMERIC(12,2),
  rating NUMERIC(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  seller_name VARCHAR(255),
  stock_status VARCHAR(50) DEFAULT 'in_stock',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_manual_price BOOLEAN DEFAULT FALSE,
  manual_price NUMERIC(12,2),
  parse_failures_count INTEGER DEFAULT 0,
  last_parsed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Product Images
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_type VARCHAR(100),
  variant_name VARCHAR(255),
  original_value TEXT,
  variant_value TEXT,
  price_modifier NUMERIC(10,2) DEFAULT 0,
  stock_status VARCHAR(50) DEFAULT 'in_stock',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parser Logs
CREATE TABLE IF NOT EXISTS parser_logs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50),
  status VARCHAR(50),
  message TEXT,
  products_added INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_skipped INTEGER DEFAULT 0,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order Logs (WhatsApp clicks)
CREATE TABLE IF NOT EXISTS order_logs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_title TEXT,
  variant_info TEXT,
  quantity INTEGER DEFAULT 1,
  final_price NUMERIC(12,2),
  whatsapp_number VARCHAR(50),
  message_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  login VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id);
CREATE INDEX IF NOT EXISTS idx_products_final_price ON products(final_price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_parser_logs_created ON parser_logs(created_at);

-- Full-text search
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);

-- Auto-update search_vector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('russian', COALESCE(NEW.translated_title, '')) ||
    to_tsvector('simple', COALESCE(NEW.original_title, '')) ||
    to_tsvector('simple', COALESCE(NEW.external_id, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector_update ON products;
CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Default settings
INSERT INTO settings (key, value, description) VALUES
  ('whatsapp_number', '996220203021', 'Номер WhatsApp для заказов'),
  ('whatsapp_template', 'Здравствуйте! Хочу заказать товар.', 'Шаблон начала сообщения WhatsApp'),
  ('currency_cny_kgs', '15.5', 'Курс CNY к сому (обновляется автоматически)'),
  ('currency_updated_at', '', 'Дата обновления курса'),
  ('price_markup_percent', '20', 'Наценка в процентах'),
  ('price_markup_fixed', '0', 'Фиксированная наценка в сомах'),
  ('price_cargo_kgs', '250', 'Стоимость карго до КР в сомах'),
  ('price_china_delivery', '100', 'Доставка по Китаю в сомах'),
  ('price_min_commission', '100', 'Минимальная комиссия в сомах'),
  ('price_round_to', '10', 'Округление цены до'),
  ('price_auto_calculate', 'true', 'Авторасчёт цены включён'),
  ('telegram_bot_token', '', 'Токен Telegram бота'),
  ('telegram_chat_id', '', 'ID чата для уведомлений'),
  ('site_name', 'PDD Shop', 'Название сайта'),
  ('site_url', 'https://pdd-shop.up.railway.app', 'URL сайта'),
  ('parser_keywords', 'электроника,одежда,аксессуары', 'Ключевые слова для парсинга'),
  ('parser_max_products', '100', 'Макс. товаров за один запуск'),
  ('parser_delay_min', '8000', 'Мин. задержка между запросами (мс)'),
  ('parser_delay_max', '20000', 'Макс. задержка между запросами (мс)'),
  ('parser_fetch_details', 'true', 'Загружать страницу товара (больше данных, медленнее)'),
  ('parser_schedule_enabled', 'true', 'Автозапуск парсера по расписанию'),
  ('parser_schedule_cron', '0 */8 * * *', 'Cron-расписание парсера'),
  ('parser_interval_hours', '8', 'Интервал обновления в часах')
ON CONFLICT (key) DO NOTHING;

-- Default admin (password: admin123 — change in production!)
-- bcrypt hash of 'admin123'
INSERT INTO admins (login, password_hash) VALUES
  ('admin', '$2b$10$rOzJqGSQXbEgKr8Ff8n8A.3VZz8M4wKJZJ8Z0j8P7Zq0v3Y6lJy4a')
ON CONFLICT (login) DO NOTHING;

-- Default categories
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Электроника', 'elektronika', 1),
  ('Одежда', 'odezhda', 2),
  ('Обувь', 'obuv', 3),
  ('Аксессуары', 'aksessuary', 4),
  ('Товары для дома', 'dom', 5),
  ('Красота и здоровье', 'krasota', 6),
  ('Спорт', 'sport', 7),
  ('Детские товары', 'detskie', 8)
ON CONFLICT (slug) DO NOTHING;
