import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getProducts, getCategories, getFilters } from '../api'
import ProductCard from '../components/ProductCard'
import { ProductSkeletonGrid, Pagination, EmptyState, ErrorState } from '../components/UI'
import { useDebounce, useTitle } from '../hooks'

const FilterIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
  </svg>
)

const sortOptions = [
  { value: 'newest', label: 'Новинки' },
  { value: 'popular', label: 'Популярные' },
  { value: 'price_asc', label: 'Дешевле' },
  { value: 'price_desc', label: 'Дороже' },
  { value: 'rating', label: 'По рейтингу' },
]

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ priceRange: {}, categories: [] })
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const sort = searchParams.get('sort') || 'newest'
  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const inStock = searchParams.get('in_stock') || ''

  const [localSearch, setLocalSearch] = useState(search)
  const [localMin, setLocalMin] = useState(minPrice)
  const [localMax, setLocalMax] = useState(maxPrice)

  const debouncedSearch = useDebounce(localSearch, 500)

  useTitle(search ? `Поиск: ${search}` : category ? `Каталог` : 'Каталог')

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    setSearchParams(params)
  }

  const setPage = (p) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', p)
    setSearchParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateParam('search', debouncedSearch)
    }
  }, [debouncedSearch])

  useEffect(() => {
    Promise.all([getCategories(), getFilters({ category })]).then(([catRes, fRes]) => {
      setCategories(catRes.data)
      setFilters(fRes.data)
    })
  }, [category])

  useEffect(() => {
    setLoading(true)
    setError(null)
    getProducts({ page, sort, category, search, min_price: minPrice, max_price: maxPrice, in_stock: inStock, limit: 20 })
      .then(res => {
        setProducts(res.data.products)
        setPagination(res.data.pagination)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, sort, category, search, minPrice, maxPrice, inStock])

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams)
    if (localMin) params.set('min_price', localMin)
    else params.delete('min_price')
    if (localMax) params.set('max_price', localMax)
    else params.delete('max_price')
    params.delete('page')
    setSearchParams(params)
  }

  const resetFilters = () => {
    setLocalSearch('')
    setLocalMin('')
    setLocalMax('')
    setSearchParams({})
  }

  const Sidebar = () => (
    <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block w-full lg:w-60 shrink-0 space-y-6`}>
      {/* Categories */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Категории</h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => updateParam('category', '')}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${!category ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Все товары
            </button>
          </li>
          {categories.map(cat => (
            <li key={cat.id}>
              <button
                onClick={() => updateParam('category', cat.slug)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  category === cat.slug ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{cat.name}</span>
                {cat.product_count > 0 && (
                  <span className="text-xs text-gray-400">{cat.product_count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Price */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Цена (сом)</h3>
        {filters.priceRange?.min_price && (
          <p className="text-xs text-gray-400 mb-2">
            {Math.round(filters.priceRange.min_price)} — {Math.round(filters.priceRange.max_price)} сом
          </p>
        )}
        <div className="flex gap-2 mb-3">
          <input type="number" placeholder="От" value={localMin} onChange={e => setLocalMin(e.target.value)}
            className="input text-sm" />
          <input type="number" placeholder="До" value={localMax} onChange={e => setLocalMax(e.target.value)}
            className="input text-sm" />
        </div>
        <button onClick={applyPriceFilter} className="btn-outline w-full text-sm py-2">Применить</button>
      </div>

      {/* In stock */}
      <div className="card p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={inStock === 'true'}
            onChange={e => updateParam('in_stock', e.target.checked ? 'true' : '')}
            className="w-4 h-4 accent-brand-500"
          />
          <span className="text-sm font-medium text-gray-700">Только в наличии</span>
        </label>
      </div>

      {/* Reset */}
      {(category || search || minPrice || maxPrice || inStock) && (
        <button onClick={resetFilters} className="w-full text-sm text-gray-500 hover:text-red-500 transition-colors py-2">
          ✕ Сбросить фильтры
        </button>
      )}
    </aside>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-brand-500">Главная</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Каталог</span>
        {search && <><span>/</span><span className="text-gray-800">«{search}»</span></>}
      </div>

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="font-display font-bold text-2xl text-gray-900">
            {search ? `Результаты: «${search}»` : category ? categories.find(c => c.slug === category)?.name || 'Каталог' : 'Все товары'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Найдено: {pagination.total} товаров</p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <FilterIcon /> Фильтры
          </button>

          <select
            value={sort}
            onChange={e => updateParam('sort', e.target.value)}
            className="input text-sm w-auto"
          >
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <Sidebar />

        <div className="flex-1 min-w-0">
          {error ? (
            <ErrorState message={error} />
          ) : loading ? (
            <ProductSkeletonGrid count={12} />
          ) : products.length === 0 ? (
            <EmptyState
              title="Товары не найдены"
              subtitle="Попробуйте изменить фильтры или поисковый запрос"
              action={<button onClick={resetFilters} className="btn-primary">Сбросить фильтры</button>}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
              <Pagination page={page} pages={pagination.pages} onChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
