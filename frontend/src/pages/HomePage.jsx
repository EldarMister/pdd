import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getFeaturedProducts, getCategories, getCurrencyRate } from '../api'
import ProductCard from '../components/ProductCard'
import { ProductSkeletonGrid } from '../components/UI'
import { useTitle } from '../hooks'

const categoryIcons = {
  'elektronika': '📱', 'odezhda': '👗', 'obuv': '👟',
  'aksessuary': '💍', 'dom': '🏠', 'krasota': '💄',
  'sport': '⚽', 'detskie': '🧸'
}

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [rate, setRate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  useTitle('Главная')

  useEffect(() => {
    Promise.all([
      getFeaturedProducts(),
      getCategories(),
      getCurrencyRate()
    ]).then(([prodRes, catRes, rateRes]) => {
      setProducts(prodRes.data)
      setCategories(catRes.data)
      setRate(rateRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`)
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-500 via-brand-600 to-orange-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-6 backdrop-blur-sm">
            <span>🇨🇳</span> Товары из Китая с доставкой в Кыргызстан
          </div>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-tight mb-4">
            Лучшие товары<br />по выгодным ценам
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Заказ через WhatsApp — просто и удобно. Доставка по всему Кыргызстану.
          </p>
          {rate && (
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 text-sm mb-8">
              💱 Курс: 1 CNY = {rate.rate} KGS
            </div>
          )}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto">
            <input
              type="text"
              placeholder="Найти товар..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button type="submit" className="bg-white text-brand-600 font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors shrink-0">
              Найти
            </button>
          </form>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: '🚀', title: 'Быстрая доставка', desc: '14–21 день' },
              { icon: '💬', title: 'Заказ в WhatsApp', desc: 'Без регистрации' },
              { icon: '💰', title: 'Честная цена', desc: 'Включая карго' },
              { icon: '🛡️', title: 'Гарантия', desc: 'Контроль качества' },
            ].map(f => (
              <div key={f.title} className="flex flex-col items-center gap-2">
                <span className="text-3xl">{f.icon}</span>
                <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-2xl text-gray-900">Категории</h2>
            <Link to="/catalog" className="text-brand-500 font-semibold text-sm hover:underline">Все товары →</Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {categories.slice(0, 8).map(cat => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
              >
                <span className="text-2xl">{categoryIcons[cat.slug] || '📦'}</span>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-brand-500 transition-colors leading-tight">
                  {cat.name}
                </span>
                {cat.product_count > 0 && (
                  <span className="text-xs text-gray-400">{cat.product_count}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-2xl text-gray-900">
            {products.length > 0 ? '🔥 Популярные товары' : 'Каталог товаров'}
          </h2>
          <Link to="/catalog" className="text-brand-500 font-semibold text-sm hover:underline">
            Смотреть все →
          </Link>
        </div>

        {loading ? (
          <ProductSkeletonGrid count={10} />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="font-display font-bold text-xl text-gray-700 mb-2">Товары загружаются</h3>
            <p className="text-gray-500 mb-6">Каталог скоро будет заполнен. Пока вы можете написать нам напрямую.</p>
            <a href="https://wa.me/996220203021" target="_blank" rel="noopener noreferrer"
              className="btn-whatsapp inline-flex">
              💬 Написать в WhatsApp
            </a>
          </div>
        )}
      </section>
    </div>
  )
}
