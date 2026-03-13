import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminStats, adminParserStatus, adminUpdateCurrency } from '../../api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [parserStatus, setParserStatus] = useState(null)
  const [updatingCurrency, setUpdatingCurrency] = useState(false)
  const [currencyMsg, setCurrencyMsg] = useState('')

  useEffect(() => {
    Promise.all([adminStats(), adminParserStatus()]).then(([s, p]) => {
      setStats(s.data)
      setParserStatus(p.data)
    })
  }, [])

  const handleUpdateCurrency = async () => {
    setUpdatingCurrency(true)
    setCurrencyMsg('')
    try {
      const res = await adminUpdateCurrency()
      setCurrencyMsg(res.data.message)
      const s = await adminStats()
      setStats(s.data)
    } catch {
      setCurrencyMsg('Ошибка обновления курса')
    } finally {
      setUpdatingCurrency(false)
    }
  }

  const StatCard = ({ title, value, sub, color = 'brand', link }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className={`text-3xl font-display font-bold text-${color}-500 mt-1`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {link && <Link to={link} className="text-xs text-brand-500 hover:underline mt-2 block">Управление →</Link>}
    </div>
  )

  return (
    <div className="p-6">
      <h1 className="font-display font-bold text-2xl text-gray-900 mb-6">Дэшборд</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Всего товаров" value={stats?.products?.total} link="/admin/products" />
        <StatCard title="Активных" value={stats?.products?.active} color="green" link="/admin/products" />
        <StatCard title="Хитов" value={stats?.products?.featured} color="yellow" />
        <StatCard title="Заказов за 7 дней" value={stats?.orders?.total} color="blue" />
      </div>

      {/* Currency & Parser */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Currency */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">💱 Курс валюты</h2>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-brand-600">
              1 CNY = {stats?.currency?.rate || '—'} KGS
            </div>
          </div>
          <button
            onClick={handleUpdateCurrency}
            disabled={updatingCurrency}
            className="mt-3 btn-outline text-sm py-2"
          >
            {updatingCurrency ? 'Обновляю...' : '🔄 Обновить курс'}
          </button>
          {currencyMsg && (
            <p className="text-sm text-green-600 mt-2">{currencyMsg}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">Автообновление каждые 4 часа (НБКР)</p>
        </div>

        {/* Parser status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">🤖 Парсер</h2>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${parserStatus?.running ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-600">
              {parserStatus?.running ? 'Работает сейчас...' : 'Ожидает'}
            </span>
          </div>
          {parserStatus?.lastRun && (
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>Статус: <span className={parserStatus.lastRun.status === 'success' ? 'text-green-600' : 'text-red-500'}>{parserStatus.lastRun.status}</span></p>
              <p>Добавлено: {parserStatus.lastRun.products_added} | Обновлено: {parserStatus.lastRun.products_updated}</p>
              <p>{new Date(parserStatus.lastRun.created_at).toLocaleString('ru-RU')}</p>
            </div>
          )}
          <Link to="/admin/parser" className="text-xs text-brand-500 hover:underline mt-3 block">Управление парсером →</Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-3">Быстрые действия</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/products" className="btn-outline text-sm py-2">📦 Управление товарами</Link>
          <Link to="/admin/parser" className="btn-outline text-sm py-2">▶️ Запустить парсер</Link>
          <Link to="/admin/settings" className="btn-outline text-sm py-2">⚙️ Настройки цен</Link>
          <a href="/" target="_blank" className="btn-outline text-sm py-2">🌐 Открыть сайт</a>
        </div>
      </div>
    </div>
  )
}
