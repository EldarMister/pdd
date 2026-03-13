const { query } = require('../config/database');

const generateWhatsAppLink = async (orderData) => {
  const { productTitle, variant, quantity, finalPrice, productUrl, productId } = orderData;

  const numRes = await query(`SELECT value FROM settings WHERE key = 'whatsapp_number'`);
  const tplRes = await query(`SELECT value FROM settings WHERE key = 'whatsapp_template'`);

  const number = numRes.rows[0]?.value || process.env.WHATSAPP_NUMBER || '996220203021';
  const template = tplRes.rows[0]?.value || 'Здравствуйте! Хочу заказать товар.';

  const lines = [
    template,
    '',
    `Название: ${productTitle}`,
  ];

  if (variant) lines.push(`Вариант: ${variant}`);
  lines.push(`Количество: ${quantity} шт.`);
  lines.push(`Цена: ${finalPrice} сом`);
  if (productUrl) lines.push(`Ссылка: ${productUrl}`);
  if (productId) lines.push(`ID товара: ${productId}`);

  const text = lines.join('\n');
  const encoded = encodeURIComponent(text);

  return {
    url: `https://wa.me/${number}?text=${encoded}`,
    text,
    number
  };
};

module.exports = { generateWhatsAppLink };
