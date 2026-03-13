import { useState, useEffect } from 'react'
import { adminGetSettings, adminUpdateSettings, adminUpdateCurrency } from '../../api'

const Section = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm">
    <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2 text-lg">
      <span>{icon}</span> {title}
    </h2>
    <div className="space-y-4">{children}</div>
  </div>
)

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
)

export default function AdminSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [updatingRate, setUpdatingRate] = useState(false)

  useEffect(() => {
    adminGetSettings().then(res => {
      setSettings(res.data)
    }).finally(() => setLoading(false))
  }, [])

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }))

  const handleSave = async (keys) => {
    setSaving(true)
    setMsg('')
    try {
      const payload = {}
      keys.forEach(k => { payload[k] = settings[k] })
      await adminUpdateSettings(payload)
      setMsg('✅ Настройки сохранены')
      setMsgType('success')
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Ошибка сохранения'))
      setMsgType('error')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  const handleUpdateRate = async () => {
    setUpdatingRate(true)
    try {
      const res = await adminUpdateCurrency()
      set('currency_cny_kgs', res.data.rate)
      setMsg(`✅ ${res.data.message}`)
      setMsgType('success')
    } catch {
      setMsg('❌ Не удалось получить курс')
      setMsgType('error')
    } finally {
      setUpdatingRate(false)
      setTimeout(() => setMsg(''), 5000)
    }
  }

  if (loading) return <div className="p-6"><div className="skeleton h-8 w-48 rounded" /></div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="font-display font-bold text-2xl text-gray-900">⚙️ Настройки</h1>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          msgType === 'error'
            ? 'bg-red-50 text-red-600 border-red-200'
            : 'bg-green-50 text-green-600 border-green-200'
        }`}>
          {msg}
        </div>
      )}

      {/* Currency */}
      <Section title="Курс валюты" icon="💱">
        <Field label="Текущий курс CNY → KGS (сом)" hint="Обновляется автоматически с сайта НБКР каждые 4 часа">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={settings.currency_cny_kgs || ''}
              onChange={e => set('currency_cny_kgs', e.target.value)}
              className="input w-32 text-sm"
            />
            <button onClick={handleUpdateRate} disabled={updatingRate}
              className="btn-outline text-sm py-2">
              {updatingRate ? 'Загружаю...' : '🔄 Обновить с НБКР'}
            </button>
          </div>
        </Field>
        {settings.currency_updated_at && (
          <p className="text-xs text-gray-400">
            Последнее обновление: {new Date(settings.currency_updated_at).toLocaleString('ru-RU')}
          </p>
        )}
        <button onClick={() => handleSave(['currency_cny_kgs'])} disabled={saving}
          className="btn-primary text-sm py-2">Сохранить курс</button>
      </Section>

      {/* Price calculation */}
      <Section title="Расчёт цены" icon="💰">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Наценка %" hint="Процент от цены товара">
            <input type="number" value={settings.price_markup_percent || ''}
              onChange={e => set('price_markup_percent', e.target.value)}
              className="input text-sm" min={0} max={500} />
          </Field>
          <Field label="Фиксированная наценка (сом)">
            <input type="number" value={settings.price_markup_fixed || ''}
              onChange={e => set('price_markup_fixed', e.target.value)}
              className="input text-sm" min={0} />
          </Field>
          <Field label="Карго до КР (сом)" hint="Стоимость карго-доставки">
            <input type="number" value={settings.price_cargo_kgs || ''}
              onChange={e => set('price_cargo_kgs', e.target.value)}
              className="input text-sm" min={0} />
          </Field>
          <Field label="Доставка по Китаю (сом)">
            <input type="number" value={settings.price_china_delivery || ''}
              onChange={e => set('price_china_delivery', e.target.value)}
              className="input text-sm" min={0} />
          </Field>
          <Field label="Мин. комиссия (сом)">
            <input type="number" value={settings.price_min_commission || ''}
              onChange={e => set('price_min_commission', e.target.value)}
              className="input text-sm" min={0} />
          </Field>
          <Field label="Округление до (сом)" hint="Например: 10 → цены кратны 10">
            <input type="number" value={settings.price_round_to || ''}
              onChange={e => set('price_round_to', e.target.value)}
              className="input text-sm" min={1} />
          </Field>
        </div>

        {/* Price example */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
          <p className="font-semibold text-gray-700 mb-2">Пример расчёта (¥100 CNY):</p>
          {(() => {
            const rate = parseFloat(settings.currency_cny_kgs || 15.5)
            const priceKgs = 100 * rate
            const markupPct = parseFloat(settings.price_markup_percent || 20) / 100
            const markupFixed = parseFloat(settings.price_markup_fixed || 0)
            const cargo = parseFloat(settings.price_cargo_kgs || 250)
            const china = parseFloat(settings.price_china_delivery || 100)
            const minComm = parseFloat(settings.price_min_commission || 100)
            const roundTo = parseInt(settings.price_round_to || 10)
            const commission = Math.max(priceKgs * markupPct + markupFixed, minComm)
            const total = Math.ceil((priceKgs + china + cargo + commission) / roundTo) * roundTo
            return <>
              <div className="flex justify-between text-gray-600"><span>Цена в Китае</span><span>¥100 × {rate} = {Math.round(priceKgs)} сом</span></div>
              <div className="flex justify-between text-gray-600"><span>Доставка по Китаю</span><span>{china} сом</span></div>
              <div className="flex justify-between text-gray-600"><span>Карго до КР</span><span>{cargo} сом</span></div>
              <div className="flex justify-between text-gray-600"><span>Комиссия</span><span>{Math.round(commission)} сом</span></div>
              <div className="flex justify-between font-bold text-brand-600 border-t pt-1 mt-1"><span>Итого</span><span>{total} сом</span></div>
            </>
          })()}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={settings.price_auto_calculate !== 'false'}
              onChange={e => set('price_auto_calculate', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm text-gray-700">Авторасчёт цен при обновлении курса</span>
          </label>
        </div>

        <button
          onClick={() => handleSave([
            'price_markup_percent', 'price_markup_fixed', 'price_cargo_kgs',
            'price_china_delivery', 'price_min_commission', 'price_round_to', 'price_auto_calculate'
          ])}
          disabled={saving}
          className="btn-primary text-sm py-2"
        >
          {saving ? 'Сохраняю...' : '💾 Сохранить и пересчитать цены'}
        </button>
      </Section>

      {/* WhatsApp */}
      <Section title="WhatsApp" icon="💬">
        <Field label="Номер WhatsApp" hint="Только цифры, без +, без пробелов. Пример: 996220203021">
          <input type="text" value={settings.whatsapp_number || ''}
            onChange={e => set('whatsapp_number', e.target.value)}
            className="input text-sm" placeholder="996220203021" />
        </Field>
        <Field label="Шаблон начала сообщения">
          <textarea value={settings.whatsapp_template || ''}
            onChange={e => set('whatsapp_template', e.target.value)}
            rows={3} className="input text-sm resize-none"
            placeholder="Здравствуйте! Хочу заказать товар." />
        </Field>

        {/* Preview */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-green-800 mb-2">Пример сообщения:</p>
          <pre className="text-green-700 whitespace-pre-wrap text-xs font-sans">
{settings.whatsapp_template || 'Здравствуйте! Хочу заказать товар.'}

Название: Xiaomi Power Bank 20000
Вариант: черный, 20000 mAh
Количество: 1 шт.
Цена: 1800 сом
Ссылка: {settings.site_url || 'https://pdd-shop.up.railway.app'}/product/123
          </pre>
        </div>

        <button onClick={() => handleSave(['whatsapp_number', 'whatsapp_template'])} disabled={saving}
          className="btn-primary text-sm py-2">Сохранить WhatsApp</button>
      </Section>

      {/* Telegram */}
      <Section title="Telegram уведомления" icon="📱">
        <Field
          label="Bot Token"
          hint="Получите у @BotFather в Telegram. Отправьте /newbot"
        >
          <input type="text" value={settings.telegram_bot_token || ''}
            onChange={e => set('telegram_bot_token', e.target.value)}
            className="input text-sm font-mono"
            placeholder="1234567890:AAF..." />
        </Field>
        <Field
          label="Chat ID"
          hint="Напишите боту /start, потом откройте: api.telegram.org/bot<TOKEN>/getUpdates"
        >
          <input type="text" value={settings.telegram_chat_id || ''}
            onChange={e => set('telegram_chat_id', e.target.value)}
            className="input text-sm font-mono"
            placeholder="-1001234567890" />
        </Field>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
          <p className="font-semibold mb-1">Как настроить:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Создайте бота у @BotFather → получите токен</li>
            <li>Напишите боту любое сообщение (например /start)</li>
            <li>Откройте: api.telegram.org/bot<b>ВАШ_ТОКЕН</b>/getUpdates</li>
            <li>Найдите поле "chat": "id" — это ваш Chat ID</li>
          </ol>
        </div>

        <button onClick={() => handleSave(['telegram_bot_token', 'telegram_chat_id'])} disabled={saving}
          className="btn-primary text-sm py-2">Сохранить Telegram</button>
      </Section>

      {/* Site */}
      <Section title="Настройки сайта" icon="🌐">
        <Field label="Название сайта">
          <input type="text" value={settings.site_name || ''}
            onChange={e => set('site_name', e.target.value)}
            className="input text-sm" />
        </Field>
        <Field label="URL сайта" hint="Используется в WhatsApp сообщениях и sitemap">
          <input type="text" value={settings.site_url || ''}
            onChange={e => set('site_url', e.target.value)}
            className="input text-sm" placeholder="https://pdd-shop.up.railway.app" />
        </Field>
        <button onClick={() => handleSave(['site_name', 'site_url'])} disabled={saving}
          className="btn-primary text-sm py-2">Сохранить</button>
      </Section>
    </div>
  )
}
