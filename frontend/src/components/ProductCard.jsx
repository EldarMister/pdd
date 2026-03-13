import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { createOrder } from '../api'

const StarIcon = ({ filled }) => (
  <svg className={`w-3.5 h-3.5 ${filled ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
)

const HeartIcon = ({ filled }) => (
  <svg className="w-5 h-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

const WAIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.52 5.847L0 24l6.335-1.502A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-5.001-1.374l-.358-.213-3.762.892.952-3.665-.234-.376A9.793 9.793 0 012.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z"/>
  </svg>
)

export default function ProductCard({ product }) {
  const [ordering, setOrdering] = useState(false)
  const { addToWishlist, removeFromWishlist, isInWishlist } = useStore()
  const inWishlist = isInWishlist(product.id)
  const siteUrl = window.location.origin

  const thumb = product.images?.[0] || product.thumb || null
  const title = product.translated_title || product.original_title || 'Товар'
  const price = product.final_price ? `${Math.round(product.final_price)} сом` : '—'
  const oldPrice = product.price_kgs && product.old_price
    ? `${Math.round(product.old_price * 15.5)} сом`
    : null

  const handleWishlist = (e) => {
    e.preventDefault()
    inWishlist ? removeFromWishlist(product.id) : addToWishlist(product)
  }

  const handleOrder = async (e) => {
    e.preventDefault()
    setOrdering(true)
    try {
      const res = await createOrder({
        productId: product.id,
        productTitle: title,
        finalPrice: product.final_price ? Math.round(product.final_price) : null,
        productUrl: `${siteUrl}/product/${product.id}`,
        quantity: 1
      })
      window.open(res.data.url, '_blank')
    } catch {
      window.open(`https://wa.me/996220203021`, '_blank')
    } finally {
      setOrdering(false)
    }
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon key={i} filled={i < Math.round(rating)} />
    ))
  }

  return (
    <div className="card group flex flex-col overflow-hidden">
      {/* Image */}
      <Link to={`/product/${product.id}`} className="relative block overflow-hidden bg-gray-100 aspect-square">
        {thumb ? (
          <img
            src={thumb}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={e => { e.target.src = 'https://placehold.co/400x400/f3f4f6/9ca3af?text=Фото' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_featured && (
            <span className="badge bg-brand-500 text-white">Хит</span>
          )}
          {product.stock_status === 'out_of_stock' && (
            <span className="badge bg-gray-500 text-white">Нет в наличии</span>
          )}
        </div>

        {/* Wishlist btn */}
        <button
          onClick={handleWishlist}
          className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-all duration-200 ${
            inWishlist ? 'bg-brand-500 text-white' : 'bg-white text-gray-400 hover:text-brand-500'
          }`}
        >
          <HeartIcon filled={inWishlist} />
        </button>
      </Link>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 hover:text-brand-600 transition-colors leading-snug">
            {title}
          </h3>
        </Link>

        {/* Rating */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex">{renderStars(product.rating)}</div>
            <span className="text-xs text-gray-500">({product.reviews_count || 0})</span>
          </div>
        )}

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="price-tag text-lg">{price}</span>
            {oldPrice && (
              <span className="text-xs text-gray-400 line-through">{oldPrice}</span>
            )}
          </div>
          {product.current_price && (
            <p className="text-xs text-gray-400 mt-0.5">
              Цена в Китае: ¥{product.current_price}
            </p>
          )}
        </div>

        {/* Order button */}
        <button
          onClick={handleOrder}
          disabled={ordering || product.stock_status === 'out_of_stock'}
          className="btn-whatsapp w-full text-sm py-2.5 mt-1"
        >
          <WAIcon />
          {ordering ? 'Открываю...' : 'Заказать'}
        </button>
      </div>
    </div>
  )
}
