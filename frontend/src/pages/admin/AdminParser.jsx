import { useState, useEffect, useRef } from 'react'
import { adminRunParser, adminParserStatus, adminParserLogs, adminGetSettings, adminUpdateSettings } from '../../api'

// ─── helpers ─────────────────────────────────────────────────

// Convert "every N hours" → cron expression
const hoursToCron = (h) => {
  h = parseInt(h)
  if (h === 1)  return '0 * * * *'
  if (h <= 23)  return `0 */${h} * * *`
  if (h === 24) return '0 2 * * *'
  return `0 */${h} * * *`
}

// Human-readable cron description
const describeCron = (expr) => {
  const presets = {
    '0 * * * *':    'каждый час',
    '0 */2 * * *':  'каждые 2 часа',
    '0 */4 * * *':  'каждые 4 часа',
    '0 */6 * * *':  'каждые 6 часов',
    '0 */8 * * *':  'каждые 8 часов',
    '0 */12 * * *': 'каждые 12 часов',
    '0 2 * * *':    'раз в сутки (в 2:00)',
  }
  return presets[expr] || expr
}

// Calculate approximate products/hour based on delay
const calcSpeed = (delayMin, delayMax) => {
  const avgDelay = (parseInt(delayMin) + parseInt(delayMax)) / 2
  const perHour = Math.round(3600000 / avgDelay)
  return perHour
}

// Speed presets
const SPEED_PRESETS = [
  { label: '🐢 Медленно',    delayMin: 25000, delayMax: 40000, desc: '~90–140/час' },
  { label: '🚶 Умеренно',    delayMin: 12000, delayMax: 22000, desc: '~160–300/час' },
  { label: '🚴 Нормально',   delayMin: 8000,  delayMax: 15000, desc: '~240–450/час' },
  { label: '🏃 Быстро',      delayMin: 5000,  delayMax: 10000, desc: '~360–720/час' },
]

const SCHEDULE_PRESETS = [
  { label: 'Каждые 2 часа',  cron: '0 */2 * * *' },
  { label: 'Каждые 4 часа',  cron: '0 */4 * * *' },
  { label: 'Каждые 6 часов', cron: '0 */6 * * *' },
  { label: 'Каждые 8 часов', cron: '0 */8 * * *' },
  { label: 'Каждые 12 часов',cron: '0 */12 * * *' },
  { label: 'Раз в сутки',    cron: '0 2 * * *' },
]

// ─── component ───────────────────────────────────────────────

export default function AdminParser() {
  const [status, setStatus]         = useState(null)
  const [logs, setLogs]             = useState([])
  const [running, setRunning]       = useState(false)
  const [msg, setMsg]               = useState('')
  const [msgType, setMsgType]       = useState('success')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [customUrl, setCustomUrl]   = useState('')
  const pollRef = useRef(null)

  // ── form state (manual run) ──
  const [keywords, setKeywords]     = useState('')
  const [maxProducts, setMaxProducts] = useState('100')
  const [delayMin, setDelayMin]     = useState('8000')
  const [delayMax, setDelayMax]     = useState('20000')
  const [fetchDetails, setFetchDetails] = useState(true)

  // ── schedule state ──
  const [schedEnabled, setSchedEnabled]   = useState(true)
  const [schedCron, setSchedCron]         = useState('0 */8 * * *')
  const [schedKeywords, setSchedKeywords] = useState('')
  const [schedMax, setSchedMax]           = useState('100')
  const [schedDelayMin, setSchedDelayMin] = useState('8000')
  const [schedDelayMax, setSchedDelayMax] = useState('20000')
  const [schedDetails, setSchedDetails]   = useState(true)

  // ─────────────────────────────────────────────────────────

  const load = async () => {
    const [statusRes, logsRes, settingsRes] = await Promise.all([
      adminParserStatus(),
      adminParserLogs(),
      adminGetSettings(),
    ])
    setStatus(statusRes.data)
    setLogs(logsRes.data)
    setRunning(statusRes.data.running)

    const s = settingsRes.data
    setKeywords(s.parser_keywords || '')
    setMaxProducts(s.parser_max_products || '100')
    setDelayMin(s.parser_delay_min || '8000')
    setDelayMax(s.parser_delay_max || '20000')
    setFetchDetails(s.parser_fetch_details !== 'false')

    setSchedEnabled(s.parser_schedule_enabled !== 'false')
    setSchedCron(s.parser_schedule_cron || '0 */8 * * *')
    setSchedKeywords(s.parser_keywords || '')
    setSchedMax(s.parser_max_products || '100')
    setSchedDelayMin(s.parser_delay_min || '8000')
    setSchedDelayMax(s.parser_delay_max || '20000')
    setSchedDetails(s.parser_fetch_details !== 'false')
  }

  useEffect(() => {
    load()
    return () => clearInterval(pollRef.current)
  }, [])

  useEffect(() => {
    if (running) {
      pollRef.current = setInterval(async () => {
        const res = await adminParserStatus()
        setRunning(res.data.running)
        if (!res.data.running) { clearInterval(pollRef.current); load() }
      }, 5000)
    }
    return () => clearInterval(pollRef.current)
  }, [running])

  const showMsg = (text, type = 'success') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 5000)
  }

  // ─── Handlers ───────────────────────────────────────────

  const handleRunNow = async () => {
    try {
      await adminRunParser({
        keywords,
        max_products: parseInt(maxProducts),
        delay_min: parseInt(delayMin),
        delay_max: parseInt(delayMax),
        fetch_details: fetchDetails,
      })
      setRunning(true)
      showMsg(`▶ Парсер запущен! ~${calcSpeed(delayMin, delayMax)} товаров/час`)
    } catch (err) {
      showMsg(err.response?.data?.error || 'Ошибка запуска', 'error')
    }
  }

  const handleSaveSchedule = async () => {
    setSavingSchedule(true)
    try {
      await adminUpdateSettings({
        parser_schedule_enabled: schedEnabled ? 'true' : 'false',
        parser_schedule_cron:    schedCron,
        parser_keywords:         schedKeywords,
        parser_max_products:     schedMax,
        parser_delay_min:        String(schedDelayMin),
        parser_delay_max:        String(schedDelayMax),
        parser_fetch_details:    schedDetails ? 'true' : 'false',
      })
      showMsg('✅ Расписание сохранено — применяется без перезапуска сервера')
    } catch {
      showMsg('Ошибка сохранения расписания', 'error')
    } finally {
      setSavingSchedule(false)
    }
  }

  const handleAddByUrl = async () => {
    if (!customUrl.trim()) return
    try {
      const { adminUpdateProduct2 } = await import('../../api')
      await adminUpdateProduct2(customUrl.trim())
      showMsg('✅ Товар успешно добавлен!')
      setCustomUrl('')
    } catch (err) {
      showMsg(err.response?.data?.error || 'Ошибка добавления товара', 'error')
    }
  }

  const applySpeedPreset = (preset, target) => {
    if (target === 'run') { setDelayMin(preset.delayMin); setDelayMax(preset.delayMax) }
    else { setSchedDelayMin(preset.delayMin); setSchedDelayMax(preset.delayMax) }
  }

  // ─── Status colors ──────────────────────────────────────
  const statusColors = { success: 'bg-green-50 text-green-600', error: 'bg-red-50 text-red-600', running: 'bg-blue-50 text-blue-600' }

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="font-display font-bold text-2xl text-gray-900">🤖 Парсер TaoBao</h1>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${msgType === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'}`}>
          {msg}
        </div>
      )}

      {/* ── Status ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full ${running ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <h2 className="font-semibold text-gray-800">Статус</h2>
          <span className={`badge ${running ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {running ? '⚙️ Работает...' : '⏸ Ожидает'}
          </span>
          {schedEnabled && !running && (
            <span className="text-xs text-gray-400">Расписание: {describeCron(schedCron)}</span>
          )}
        </div>

        {status?.lastRun && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Статус', value: status.lastRun.status, cls: status.lastRun.status === 'success' ? 'text-green-600' : 'text-red-500' },
              { label: 'Добавлено', value: status.lastRun.products_added || 0, cls: 'text-brand-600' },
              { label: 'Обновлено', value: status.lastRun.products_updated || 0, cls: 'text-blue-600' },
              { label: 'Пропущено', value: status.lastRun.products_skipped || 0, cls: 'text-gray-500' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className={`font-bold text-lg ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}
        {status?.lastRun?.created_at && (
          <p className="text-xs text-gray-400 mt-3">
            Последний запуск: {new Date(status.lastRun.created_at).toLocaleString('ru-RU')}
          </p>
        )}
      </div>

      {/* ── Manual run ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">▶️ Запустить вручную</h2>

        <div className="space-y-4">
          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ключевые слова
              <span className="text-gray-400 font-normal ml-1">(через запятую)</span>
            </label>
            <textarea value={keywords} onChange={e => setKeywords(e.target.value)}
              rows={2} className="input text-sm resize-none"
              placeholder="электроника, одежда, аксессуары, 手机, 耳机" />
            <p className="text-xs text-gray-400 mt-1">Совет: китайские слова дают лучшие результаты: 手机 (телефон), 耳机 (наушники), 女装 (женская одежда)</p>
          </div>

          {/* Max products */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Максимум товаров</label>
              <input type="number" value={maxProducts} onChange={e => setMaxProducts(e.target.value)}
                className="input text-sm" min={1} max={1000} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={fetchDetails} onChange={e => setFetchDetails(e.target.checked)}
                  className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-gray-700">Загружать страницу товара</span>
              </label>
            </div>
          </div>

          {/* Speed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Скорость парсинга
              <span className="text-brand-500 ml-2 font-semibold">
                ~{calcSpeed(delayMin, delayMax)} товаров/час
              </span>
            </label>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {SPEED_PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => applySpeedPreset(p, 'run')}
                  className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                    parseInt(delayMin) === p.delayMin
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-brand-300'
                  }`}>
                  {p.label} <span className="text-gray-400 ml-1">{p.desc}</span>
                </button>
              ))}
            </div>

            {/* Custom delay */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Мин. задержка (мс)</label>
                <input type="number" value={delayMin} onChange={e => setDelayMin(e.target.value)}
                  className="input text-sm" min={2000} step={1000} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Макс. задержка (мс)</label>
                <input type="number" value={delayMax} onChange={e => setDelayMax(e.target.value)}
                  className="input text-sm" min={3000} step={1000} />
              </div>
            </div>

            {/* Speed visualization */}
            <div className="mt-2 bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
              <div className="flex justify-between mb-1">
                <span>Задержка между запросами: {(parseInt(delayMin)/1000).toFixed(0)}–{(parseInt(delayMax)/1000).toFixed(0)} сек</span>
                <span className="font-semibold text-brand-600">~{calcSpeed(delayMin, delayMax)} тов/час</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-brand-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (calcSpeed(delayMin, delayMax) / 800) * 100)}%` }} />
              </div>
              <div className="flex justify-between text-gray-400 mt-1">
                <span>0</span><span>400/ч</span><span>800/ч</span>
              </div>
            </div>
          </div>

          <button onClick={handleRunNow} disabled={running}
            className="btn-primary flex items-center gap-2">
            {running ? <><span className="animate-spin inline-block">⚙</span> Работает...</> : '▶️ Запустить сейчас'}
          </button>
        </div>
      </div>

      {/* ── Schedule ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">📅 Расписание (автозапуск)</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={schedEnabled} onChange={e => setSchedEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand-500" />
            <span className="text-sm font-medium text-gray-700">Включено</span>
          </label>
        </div>

        <div className={`space-y-4 ${!schedEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Schedule presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Интервал запуска</label>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_PRESETS.map(p => (
                <button key={p.cron}
                  onClick={() => setSchedCron(p.cron)}
                  className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                    schedCron === p.cron
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-brand-300'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs text-gray-500">Cron вручную:</label>
              <input type="text" value={schedCron} onChange={e => setSchedCron(e.target.value)}
                className="input text-xs w-44 font-mono py-1.5" placeholder="0 */8 * * *" />
              <span className="text-xs text-gray-400">{describeCron(schedCron)}</span>
            </div>
          </div>

          {/* Schedule keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ключевые слова</label>
            <textarea value={schedKeywords} onChange={e => setSchedKeywords(e.target.value)}
              rows={2} className="input text-sm resize-none"
              placeholder="электроника, одежда, аксессуары" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Макс. товаров</label>
              <input type="number" value={schedMax} onChange={e => setSchedMax(e.target.value)}
                className="input text-sm" min={1} max={1000} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={schedDetails} onChange={e => setSchedDetails(e.target.checked)}
                  className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-gray-700">Загружать детали товара</span>
              </label>
            </div>
          </div>

          {/* Schedule speed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Скорость
              <span className="text-brand-500 ml-2 font-semibold">~{calcSpeed(schedDelayMin, schedDelayMax)} товаров/час</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {SPEED_PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => applySpeedPreset(p, 'schedule')}
                  className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                    parseInt(schedDelayMin) === p.delayMin
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-brand-300'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Мин. задержка (мс)</label>
                <input type="number" value={schedDelayMin} onChange={e => setSchedDelayMin(e.target.value)}
                  className="input text-sm" min={2000} step={1000} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Макс. задержка (мс)</label>
                <input type="number" value={schedDelayMax} onChange={e => setSchedDelayMax(e.target.value)}
                  className="input text-sm" min={3000} step={1000} />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSaveSchedule} disabled={savingSchedule}
          className="btn-primary mt-4 text-sm py-2">
          {savingSchedule ? 'Сохраняю...' : '💾 Сохранить расписание'}
        </button>
        <p className="text-xs text-gray-400 mt-2">Изменения применяются автоматически без перезапуска</p>
      </div>

      {/* ── Add by URL ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-2">🔗 Добавить товар по ссылке</h2>
        <p className="text-sm text-gray-500 mb-3">Вставьте ссылку с TaoBao или item ID</p>
        <div className="flex gap-2">
          <input type="text" value={customUrl} onChange={e => setCustomUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddByUrl()}
            className="input flex-1 text-sm"
            placeholder="https://item.taobao.com/item.htm?id=... или просто ID" />
          <button onClick={handleAddByUrl} className="btn-primary whitespace-nowrap text-sm">
            Добавить
          </button>
        </div>
      </div>

      {/* ── Tips ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="font-semibold text-amber-800 mb-2">💡 Советы по парсингу TaoBao</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-amber-700">
          <div>
            <p className="font-medium mb-1">Лучшие ключевые слова (китайские):</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              {[['手机','смартфон'],['耳机','наушники'],['女装','женская одежда'],['运动鞋','кроссовки'],
                ['手表','часы'],['背包','рюкзак'],['玩具','игрушки'],['护肤','уход за кожей']].map(([cn, ru]) => (
                <span key={cn}><b>{cn}</b> — {ru}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Рекомендации:</p>
            <ul className="text-xs space-y-1">
              <li>• 100–200 тов/час — безопасно, как обычный пользователь</li>
              <li>• Скорость "Умеренно" — хороший баланс данных и скорости</li>
              <li>• Расписание 8–12 часов — оптимально для каталога</li>
              <li>• Если TaoBao блокирует — увеличьте задержки</li>
              <li>• Страница товара даёт фото, варианты, описание</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Logs ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">📋 История запусков</h2>
          <button onClick={load} className="text-xs text-brand-500 hover:underline">Обновить</button>
        </div>
        <div className="divide-y divide-gray-50">
          {logs.length === 0 ? (
            <p className="p-5 text-sm text-gray-400 text-center">Логов пока нет</p>
          ) : logs.map(log => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-3 text-sm">
              <span className={`badge mt-0.5 shrink-0 ${statusColors[log.status] || 'bg-gray-100 text-gray-600'}`}>
                {log.status}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-700 truncate">{log.message}</p>
                {(log.products_added > 0 || log.products_updated > 0) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    +{log.products_added} новых · ~{log.products_updated} обновлено · ⏭{log.products_skipped} пропущено
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(log.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
