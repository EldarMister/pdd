import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-white font-display font-bold">PDD<span className="text-brand-400">Shop</span></span>
            </div>
            <p className="text-sm leading-relaxed">
              Товары из Китая с доставкой по Кыргызстану. Заказ через WhatsApp — быстро и удобно.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Навигация</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/catalog" className="hover:text-white transition-colors">Каталог</Link></li>
              <li><Link to="/delivery" className="hover:text-white transition-colors">Доставка</Link></li>
              <li><Link to="/contacts" className="hover:text-white transition-colors">Контакты</Link></li>
              <li><Link to="/wishlist" className="hover:text-white transition-colors">Избранное</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Контакты</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://wa.me/996220203021" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors">
                  <span className="text-green-400">WhatsApp</span>: +996 220 203 021
                </a>
              </li>
              <li className="text-gray-500">Бишкек, Кыргызстан</li>
              <li className="text-gray-500">Пн–Сб 9:00–20:00</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-xs text-center text-gray-600">
          © {new Date().getFullYear()} PDD Shop. Все права защищены.
        </div>
      </div>
    </footer>
  )
}
