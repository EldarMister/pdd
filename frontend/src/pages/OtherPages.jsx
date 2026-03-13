import { useParams, Link } from 'react-router-dom'
import { useStore } from '../store'
import ProductCard from '../components/ProductCard'
import { EmptyState } from '../components/UI'
import { useTitle } from '../hooks'
import CatalogPage from './CatalogPage'

// Category page — just reuses catalog with category filter
export function CategoryPage() {
  const { slug } = useParams()
  return <CatalogPage />
}

// Wishlist page
export function WishlistPage() {
  const { wishlist, removeFromWishlist } = useStore()
  useTitle('Избранное')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-gray-900">
          ❤️ Избранное <span className="text-gray-400 font-normal text-lg">({wishlist.length})</span>
        </h1>
        {wishlist.length > 0 && (
          <button onClick={() => {
            wishlist.forEach(p => removeFromWishlist(p.id))
          }} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
            Очистить всё
          </button>
        )}
      </div>

      {wishlist.length === 0 ? (
        <EmptyState
          title="Избранное пусто"
          subtitle="Добавляйте понравившиеся товары, нажимая на ❤️"
          action={<Link to="/catalog" className="btn-primary">Перейти в каталог</Link>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {wishlist.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}

// Delivery page
export function DeliveryPage() {
  useTitle('Доставка и условия')
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display font-bold text-3xl text-gray-900 mb-8">Доставка и условия заказа</h1>

      <div className="space-y-6">
        {[
          {
            icon: '📦', title: 'Как сделать заказ',
            content: [
              'Найдите нужный товар в каталоге',
              'Выберите вариант (цвет, размер, модель)',
              'Нажмите кнопку «Заказать через WhatsApp»',
              'Отправьте автоматически сформированное сообщение',
              'Мы свяжемся с вами для подтверждения',
            ]
          },
          {
            icon: '🚚', title: 'Сроки доставки',
            content: [
              'Доставка из Китая: 14–21 рабочий день',
              'Карго до Бишкека включено в цену',
              'Самовывоз или доставка по городу — уточняйте',
            ]
          },
          {
            icon: '💰', title: 'Оплата',
            content: [
              'Предоплата 30–50% при оформлении заказа',
              'Остаток при получении товара',
              'Наличные, перевод на Mbank, Оптима',
            ]
          },
          {
            icon: '🛡️', title: 'Гарантии',
            content: [
              'Фото и видео распаковки при получении',
              'Возврат при несоответствии описанию',
              'Помощь при гарантийных случаях',
            ]
          }
        ].map(section => (
          <div key={section.title} className="card p-6">
            <h2 className="font-display font-bold text-xl mb-4 flex items-center gap-3">
              <span className="text-3xl">{section.icon}</span>
              {section.title}
            </h2>
            <ul className="space-y-2">
              {section.content.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <span className="text-brand-500 font-bold mt-0.5">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <a href="https://wa.me/996220203021" target="_blank" rel="noopener noreferrer"
          className="btn-whatsapp inline-flex px-8">
          💬 Есть вопрос? Напишите нам
        </a>
      </div>
    </div>
  )
}

// Contacts page
export function ContactsPage() {
  useTitle('Контакты')
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-display font-bold text-3xl text-gray-900 mb-8">Контакты</h1>

      <div className="card p-8 space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.52 5.847L0 24l6.335-1.502A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-5.001-1.374l-.358-.213-3.762.892.952-3.665-.234-.376A9.793 9.793 0 012.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z"/>
            </svg>
          </div>
          <h2 className="font-bold text-2xl text-gray-800 mb-1">WhatsApp</h2>
          <p className="text-gray-500 mb-4">Основной способ связи</p>
          <a
            href="https://wa.me/996220203021"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp inline-flex text-lg px-8 py-4"
          >
            +996 220 203 021
          </a>
        </div>

        <div className="border-t pt-6 grid grid-cols-2 gap-4 text-sm text-center text-gray-600">
          <div>
            <p className="font-semibold text-gray-800 mb-1">📍 Адрес</p>
            <p>Бишкек, Кыргызстан</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">🕐 Режим работы</p>
            <p>Пн–Сб: 9:00–20:00</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// 404 page
export function NotFoundPage() {
  useTitle('Страница не найдена')
  return (
    <div className="text-center py-24 px-4">
      <div className="text-8xl font-display font-black text-brand-500 mb-4">404</div>
      <h1 className="font-display font-bold text-2xl text-gray-800 mb-3">Страница не найдена</h1>
      <p className="text-gray-500 mb-8">Возможно, товар был удалён или ссылка устарела</p>
      <Link to="/" className="btn-primary">← На главную</Link>
    </div>
  )
}
