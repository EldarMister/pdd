# PDD Shop — Каталог товаров из Pinduoduo

Сайт-каталог товаров из Pinduoduo с автопарсингом, расчётом цен в сомах и заказом через WhatsApp.

---

## 🛠 Стек технологий

| Часть | Технологии |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Router |
| Backend | Node.js, Express, node-cron |
| База данных | PostgreSQL (Railway) |
| Уведомления | Telegram Bot API |
| Парсинг | Axios + Cheerio (mobile.yangkeduo.com) |
| Хостинг | Railway |

---

## 🚀 Деплой на Railway (пошагово)

### 1. Создайте PostgreSQL базу данных

1. Зайдите на [railway.app](https://railway.app)
2. Создайте новый проект
3. Нажмите **New** → **Database** → **PostgreSQL**
4. Скопируйте `DATABASE_URL` из вкладки Connect

### 2. Деплой Backend

1. В том же проекте нажмите **New** → **GitHub Repo**
2. Выберите папку `backend` (или весь репозиторий с `Root Directory: backend`)
3. Добавьте переменные окружения:

```env
DATABASE_URL=postgresql://...   (из шага 1)
JWT_SECRET=придумайте-длинный-секрет-минимум-32-символа
NODE_ENV=production
FRONTEND_URL=https://ваш-фронтенд.up.railway.app
TELEGRAM_BOT_TOKEN=токен-вашего-бота    (опционально)
TELEGRAM_CHAT_ID=ваш-chat-id           (опционально)
SITE_URL=https://ваш-сайт.up.railway.app
WHATSAPP_NUMBER=996220203021
```

4. Railway автоматически запустит `npm start`
5. База данных создастся автоматически при первом запуске

### 3. Деплой Frontend

1. Нажмите **New** → **GitHub Repo** → папка `frontend`
2. Добавьте переменную:

```env
VITE_API_URL=https://ваш-backend.up.railway.app/api
```

3. Railway запустит `npm run build` и `npx serve dist`

---

## 🔑 Первый вход в админку

По умолчанию:
- **Логин:** `admin`
- **Пароль:** `admin123`

⚠️ **Сразу смените пароль!** Запустите:

```bash
cd backend
node reset-admin-password.js ВашНовыйПароль
```

Или зайдите в PostgreSQL и выполните:
```sql
-- Хэш генерируется через bcrypt с salt=10
UPDATE admins SET password_hash = '$2b$10$...' WHERE login = 'admin';
```

---

## ⚙️ Настройка после деплоя

### 1. Откройте админку
Перейдите на `https://ваш-сайт.up.railway.app/admin`

### 2. Настройте Telegram (для уведомлений о заказах)
- Зайдите в **Настройки** → **Telegram**
- Создайте бота у [@BotFather](https://t.me/BotFather)
- Напишите боту `/start`
- Откройте `api.telegram.org/bot<TOKEN>/getUpdates`
- Скопируйте `chat.id`

### 3. Запустите парсер
- Зайдите в **Парсер**
- Введите ключевые слова (через запятую)
- Нажмите **Запустить**

### 4. Проверьте курс валюты
- В **Дэшборде** → **Обновить курс** (загружается с НБКР)
- Курс автообновляется каждые 4 часа

---

## 🤖 Парсер — важная информация

Парсер работает через мобильную версию Pinduoduo:
- **Источник:** `mobile.yangkeduo.com`
- **Метод:** HTTP + Cheerio (без браузера)
- **Лимит запросов:** задержки 1.5–2.5 сек между товарами

### Как улучшить результаты парсинга

Используйте **китайские ключевые слова** для лучших результатов:

| Русский | Китайский |
|---------|-----------|
| Телефон | 手机 |
| Наушники | 耳机 |
| Ноутбук | 笔记本 |
| Одежда | 女装 |
| Обувь | 鞋子 |
| Часы | 手表 |

### Когда парсер не находит товары

Pinduoduo периодически меняет структуру страниц. Если товары не парсятся:
1. Попробуйте добавить товар вручную через **Парсер → Добавить по ссылке**
2. Вставьте прямую ссылку: `https://mobile.yangkeduo.com/goods.html?goods_id=XXXXXXX`

---

## 💰 Формула расчёта цены

```
Итоговая цена = (Цена в CNY × Курс) + Доставка по Китаю + Карго до КР + Комиссия
```

Все параметры настраиваются в **Настройки → Расчёт цены**.

---

## 📁 Структура проекта

```
pdd-shop/
├── backend/
│   ├── src/
│   │   ├── config/         # БД, логгер
│   │   ├── routes/         # API маршруты
│   │   ├── services/       # Парсер, валюта, WA, Telegram
│   │   ├── middleware/     # JWT авторизация
│   │   ├── jobs/           # Cron задачи
│   │   └── db/             # Схема БД
│   ├── railway.json
│   └── reset-admin-password.js
│
└── frontend/
    ├── src/
    │   ├── api/            # Axios клиент
    │   ├── components/     # Header, Footer, ProductCard
    │   ├── pages/          # Страницы сайта
    │   │   └── admin/      # Страницы админки
    │   ├── store/          # Zustand state
    │   └── hooks/          # Кастомные хуки
    └── railway.json
```

---

## 🌐 URL структура

| URL | Страница |
|-----|---------|
| `/` | Главная |
| `/catalog` | Все товары |
| `/category/elektronika` | Категория |
| `/product/123` | Карточка товара |
| `/delivery` | Условия доставки |
| `/contacts` | Контакты |
| `/wishlist` | Избранное |
| `/admin` | Дэшборд (авт.) |
| `/admin/products` | Товары (авт.) |
| `/admin/parser` | Парсер (авт.) |
| `/admin/settings` | Настройки (авт.) |
| `/sitemap.xml` | Sitemap |
| `/robots.txt` | Robots |

---

## 🔒 Безопасность

- JWT токены (срок: 7 дней)
- Rate limiting на вход (10 попыток / 15 мин)
- Rate limiting на API (200 req / мин)
- Helmet.js заголовки
- CORS whitelist
- SQL инъекции: защита через параметризованные запросы
- XSS: sanitization через express-validator
- Пароли: bcrypt с salt=10

---

## 📞 Поддержка

WhatsApp: +996 220 203 021
