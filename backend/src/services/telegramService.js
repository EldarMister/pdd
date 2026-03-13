const TelegramBot = require('node-telegram-bot-api');
const { query } = require('../config/database');
const logger = require('../config/logger');

let bot = null;

const getBot = async () => {
  if (bot) return bot;

  const res = await query(`SELECT key, value FROM settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')`);
  const settings = {};
  res.rows.forEach(r => { settings[r.key] = r.value; });

  const token = process.env.TELEGRAM_BOT_TOKEN || settings['telegram_bot_token'];
  if (!token || token === 'your_telegram_bot_token' || token === '') {
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: false });
    return bot;
  } catch (err) {
    logger.error('Telegram bot init failed', { error: err.message });
    return null;
  }
};

const getChatId = async () => {
  const res = await query(`SELECT value FROM settings WHERE key = 'telegram_chat_id'`);
  return process.env.TELEGRAM_CHAT_ID || res.rows[0]?.value || '';
};

const sendOrderNotification = async (orderData) => {
  try {
    const tgBot = await getBot();
    if (!tgBot) {
      logger.warn('Telegram bot not configured, skipping notification');
      return;
    }

    const chatId = await getChatId();
    if (!chatId) {
      logger.warn('Telegram chat ID not set');
      return;
    }

    const { product, variant, quantity, finalPrice, productUrl } = orderData;

    const message = `🛍 <b>Новый заказ!</b>

📦 <b>Товар:</b> ${escapeHtml(product)}
🎨 <b>Вариант:</b> ${variant ? escapeHtml(variant) : 'не указан'}
🔢 <b>Количество:</b> ${quantity} шт.
💰 <b>Цена:</b> ${finalPrice} сом
🔗 <a href="${productUrl}">Открыть товар</a>

⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Bishkek' })}`;

    await tgBot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    logger.info('Telegram order notification sent');
  } catch (err) {
    logger.error('Telegram notification failed', { error: err.message });
  }
};

const sendParserNotification = async (stats) => {
  try {
    const tgBot = await getBot();
    if (!tgBot) return;
    const chatId = await getChatId();
    if (!chatId) return;

    const message = `🤖 <b>Парсер завершил работу</b>

✅ Добавлено: ${stats.added}
🔄 Обновлено: ${stats.updated}
⏭ Пропущено: ${stats.skipped}
❌ Ошибок: ${stats.errors}

⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Bishkek' })}`;

    await tgBot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (err) {
    logger.error('Telegram parser notification failed', { error: err.message });
  }
};

const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

module.exports = { sendOrderNotification, sendParserNotification };
