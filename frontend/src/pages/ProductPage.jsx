import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProduct, createOrder } from '../api'
import { useStore } from '../store'
import { useTitle } from '../hooks'
import { ErrorState } from '../components/UI'

const StarIcon = ({ filled }) => (
  <svg className={`w-4 h-4 ${filled ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
)

const WAIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.52 5.847L0 24l6.335-1.502A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-5.001-1.374l-.358-.213-3.762.892.952-3.665-.234-.376A9.793 9.793 0 012.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z"/>
  </svg>
)

export default function ProductPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariants, setSelectedVariants] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [ordering, setOrdering] = useState(false)
  const [variantError, setVariantError] = useState(false)
  const { addToWishlist, removeFromWishlist, isInWishlist } = useStore()

  useTitle(product?.translated_title || 'Товар')

  useEffect(() => {
    setLoading(true)
    setError(null)
    getProduct(id)
      .then(res => setProduct(res.data))
      .catch(() => setError('Товар не найден'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 animate-pulse">
        <div className="skeleton aspect-square rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-8 w-3/4 rounded" />
          <div className="skeleton h-5 w-1/2 rounded" />
          <div className="skeleton h-12 w-1/3 rounded" />
          <div className="skeleton h-16 w-full rounded-xl" />
          <div className="skeleton h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )

  if (error || !product) return <div className="py-16"><ErrorState message={error || 'Товар не найден'} /></div>

  const title = product.translated_title || product.original_title || 'Товар'
  const images = product.images || []
  const variants = product.variants || []
  const variantTypes = [...new Set(variants.map(v => v.type))].filter(Boolean)
  const inWishlist = isInWishlist(product.id)

  // Group variants by type
  const variantGroups = variantTypes.reduce((acc, type) => {
    acc[type] = variants.filter(v => v.type === type)
    return acc
  }, {})

  const hasRequiredVariants = variantTypes.length > 0
  const allVariantsSelected = variantTypes.every(t => selectedVariants[t])

  const buildVariantString = () => {
    return Object.entries(selectedVariants)
      .map(([type, val]) => {
        const v = variantGroups[type]?.find(x => x.value === val)
        return `${v?.name || type}: ${val}`
      })
      .join(', ')
  }

  const handleOrder = async () => {
    if (hasRequiredVariants && !allVariantsSelected) {
      setVariantError(true)
      setTimeout(() => setVariantError(false), 3000)
      return
    }

    setOrdering(true)
    const siteUrl = window.location.origin
    const variantStr = buildVariantString()

    try {
      const res = await createOrder({
        productId: product.id,
        productTitle: title,
        variant: variantStr || null,
        quantity,
        finalPrice: product.final_price ? Math.round(product.final_price) : null,
        productUrl: `${siteUrl}/product/${product.id}`
      })
      window.open(res.data.url, '_blank')
    } catch {
      const msg = buildWhatsAppMessage(title, variantStr, quantity, product)
      window.open(`https://wa.me/996220203021?text=${encodeURIComponent(msg)}`, '_blank')
    } finally {
      setOrdering(false)
    }
  }

  const buildWhatsAppMessage = (title, variant, qty, product) => {
    const lines = [
      'Здравствуйте! Хочу заказать товар.',
      '',
      `Название: ${title}`,
    ]
    if (variant) lines.push(`Вариант: ${variant}`)
    lines.push(`Количество: ${qty} шт.`)
    if (product.final_price) lines.push(`Цена: ${Math.round(product.final_price)} сом`)
    lines.push(`Ссылка: ${window.location.href}`)
    return lines.join('\n')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <Link to="/" className="hover:text-brand-500">Главная</Link>
        <span>/</span>
        <Link to="/catalog" className="hover:text-brand-500">Каталог</Link>
        {product.category_name && (
          <><span>/</span><Link to={`/category/${product.category_slug}`} className="hover:text-brand-500">{product.category_name}</Link></>
        )}
        <span>/</span>
        <span className="text-gray-700 line-clamp-1">{title}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
            <img
              src={images[selectedImage] || 'https://placehold.co/600x600/f3f4f6/9ca3af?text=Фото'}
              alt={title}
              className="w-full h-full object-cover"
              onError={e => { e.target.src = 'https://placehold.co/600x600/f3f4f6/9ca3af?text=Фото' }}
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                    i === selectedImage ? 'border-brand-500' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover"
                    onError={e => { e.target.src = 'https://placehold.co/64x64' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900 leading-snug mb-2">{title}</h1>
            {product.original_title && product.original_title !== title && (
              <p className="text-sm text-gray-400">{product.original_title}</p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {product.rating > 0 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => <StarIcon key={i} filled={i < Math.round(product.rating)} />)}
                  <span className="text-sm text-gray-500 ml-1">{product.rating} ({product.reviews_count} отзывов)</span>
                </div>
              )}
              {product.seller_name && (
                <span className="text-sm text-gray-500">Продавец: {product.seller_name}</span>
              )}
            </div>
          </div>

          {/* Stock */}
          <div>
            {product.stock_status === 'in_stock' ? (
              <span className="badge bg-green-100 text-green-700">✓ В наличии</span>
            ) : (
              <span className="badge bg-gray-100 text-gray-600">Нет в наличии</span>
            )}
          </div>

          {/* Price breakdown */}
          {product.final_price && (
            <div className="bg-gradient-to-br from-brand-50 to-orange-50 border border-brand-100 rounded-2xl p-4 space-y-2">
              <h3 className="font-semibold text-gray-800 text-sm">Расчёт цены</h3>
              <div className="space-y-1.5 text-sm">
                {product.price_kgs && (
                  <div className="flex justify-between text-gray-600">
                    <span>Цена в Китае (¥{product.current_price})</span>
                    <span>≈ {Math.round(product.price_kgs)} сом</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Доставка по Китаю</span>
                  <span>100 сом</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Карго до КР</span>
                  <span>250 сом</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Комиссия сервиса</span>
                  <span>~{Math.round(product.final_price - (product.price_kgs || 0) - 350)} сом</span>
                </div>
                <div className="border-t border-brand-200 pt-2 flex justify-between font-bold">
                  <span className="text-gray-800">Итого</span>
                  <span className="text-brand-600 text-xl price-tag">{Math.round(product.final_price)} сом</span>
                </div>
              </div>
            </div>
          )}

          {/* Variants */}
          {variantTypes.map(type => (
            <div key={type}>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">
                {variantGroups[type][0]?.name || type}
                {variantError && !selectedVariants[type] && (
                  <span className="text-red-500 ml-2 font-normal text-xs">* Выберите вариант</span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                {variantGroups[type].map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVariants(prev => ({ ...prev, [type]: v.value }))}
                    className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-all ${
                      selectedVariants[type] === v.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                        : 'border-gray-200 hover:border-brand-300 text-gray-700'
                    } ${v.stock === 'out_of_stock' ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={v.stock === 'out_of_stock'}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-2">Количество</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl border border-gray-200 text-lg font-bold hover:bg-gray-50 transition-colors flex items-center justify-center">−</button>
              <span className="w-8 text-center font-semibold text-lg">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 rounded-xl border border-gray-200 text-lg font-bold hover:bg-gray-50 transition-colors flex items-center justify-center">+</button>
            </div>
          </div>

          {/* Order + Wishlist */}
          <div className="flex gap-3">
            <button
              onClick={handleOrder}
              disabled={ordering || product.stock_status === 'out_of_stock'}
              className="btn-whatsapp flex-1 text-base py-4"
            >
              <WAIcon />
              {ordering ? 'Открываю WhatsApp...' : 'Заказать через WhatsApp'}
            </button>
            <button
              onClick={() => inWishlist ? removeFromWishlist(product.id) : addToWishlist(product)}
              className={`p-4 rounded-xl border-2 transition-all ${inWishlist ? 'border-brand-500 text-brand-500 bg-brand-50' : 'border-gray-200 text-gray-400 hover:border-brand-300'}`}
            >
              <svg className="w-5 h-5" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </button>
          </div>

          {variantError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium animate-fade-in">
              ⚠️ Пожалуйста, выберите все варианты товара перед заказом
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {(product.translated_description || product.original_description) && (
        <div className="mt-10 card p-6">
          <h2 className="font-display font-bold text-xl text-gray-900 mb-4">Описание</h2>
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
            {product.translated_description || product.original_description}
          </div>
        </div>
      )}

      {/* Source link */}
      {product.original_url && (
        <div className="mt-4 text-center">
          <a href={product.original_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
            Посмотреть на Pinduoduo ↗
          </a>
        </div>
      )}
    </div>
  )
}
