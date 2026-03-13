import { useState, useEffect, useCallback } from 'react'
import { adminGetProducts, adminUpdateProduct, adminGetCategories, adminUpdateCurrency } from '../../api'
import { useDebounce } from '../../hooks'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 400)

  const load = useCallback(() => {
    setLoading(true)
    adminGetProducts({ page, limit: 20, search: debouncedSearch, is_active: filterActive || undefined })
      .then(res => {
        setProducts(res.data.products)
        setPagination(res.data.pagination)
      })
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, filterActive])

  useEffect(() => { load() }, [load])
  useEffect(() => { adminGetCategories().then(r => setCategories(r.data)) }, [])

  const startEdit = (product) => {
    setEditId(product.id)
    setEditData({
      translated_title: product.translated_title || '',
      category_id: product.category_id || '',
      is_active: product.is_active,
      is_featured: product.is_featured,
      stock_status: product.stock_status,
      is_manual_price: product.is_manual_price || false,
      manual_price: product.manual_price || '',
    })
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const payload = { ...editData }
      if (payload.manual_price) payload.manual_price = parseFloat(payload.manual_price)
      if (!payload.is_manual_price) { delete payload.manual_price }
      await adminUpdateProduct(editId, payload)
      setEditId(null)
      load()
    } catch (err) {
      alert('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const quickToggle = async (id, field, currentValue) => {
    await adminUpdateProduct(id, { [field]: !currentValue })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-gray-900">Товары</h1>
        <span className="text-sm text-gray-500">Всего: {pagination.total}</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 flex flex-wrap gap-3">
        <input
          type="text" placeholder="Поиск по названию или ID"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="input flex-1 min-w-48 text-sm"
        />
        <select value={filterActive} onChange={e => { setFilterActive(e.target.value); setPage(1) }}
          className="input w-auto text-sm">
          <option value="">Все товары</option>
          <option value="true">Активные</option>
          <option value="false">Скрытые</option>
        </select>
      </div>

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="font-bold text-lg mb-4">Редактировать товар #{editId}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название (рус)</label>
                <input value={editData.translated_title}
                  onChange={e => setEditData(d => ({ ...d, translated_title: e.target.value }))}
                  className="input text-sm" placeholder="Название товара на русском" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                <select value={editData.category_id}
                  onChange={e => setEditData(d => ({ ...d, category_id: e.target.value }))}
                  className="input text-sm">
                  <option value="">Без категории</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Наличие</label>
                <select value={editData.stock_status}
                  onChange={e => setEditData(d => ({ ...d, stock_status: e.target.value }))}
                  className="input text-sm">
                  <option value="in_stock">В наличии</option>
                  <option value="out_of_stock">Нет в наличии</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editData.is_manual_price}
                    onChange={e => setEditData(d => ({ ...d, is_manual_price: e.target.checked }))}
                    className="w-4 h-4 accent-brand-500"
                  />
                  <span className="text-sm text-gray-700">Ручная цена</span>
                </label>
                {editData.is_manual_price && (
                  <input type="number" value={editData.manual_price}
                    onChange={e => setEditData(d => ({ ...d, manual_price: e.target.value }))}
                    className="input text-sm w-32" placeholder="Цена (сом)" />
                )}
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editData.is_active}
                    onChange={e => setEditData(d => ({ ...d, is_active: e.target.checked }))}
                    className="w-4 h-4 accent-brand-500"
                  />
                  <span className="text-sm text-gray-700">Активен</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editData.is_featured}
                    onChange={e => setEditData(d => ({ ...d, is_featured: e.target.checked }))}
                    className="w-4 h-4 accent-brand-500"
                  />
                  <span className="text-sm text-gray-700">Хит продаж</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={() => setEditId(null)} className="btn-outline flex-1">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Товар</th>
                <th className="px-4 py-3 text-left">Цена (сом)</th>
                <th className="px-4 py-3 text-left">Категория</th>
                <th className="px-4 py-3 text-center">Активен</th>
                <th className="px-4 py-3 text-center">Хит</th>
                <th className="px-4 py-3 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="skeleton h-4 w-48 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-20 rounded" /></td>
                    <td className="px-4 py-3"><div className="skeleton h-4 w-24 rounded" /></td>
                    <td className="px-4 py-3" colSpan={3} />
                  </tr>
                ))
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.thumb && (
                        <img src={p.thumb} alt="" className="w-10 h-10 object-cover rounded-lg"
                          onError={e => e.target.style.display = 'none'} />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate max-w-xs">
                          {p.translated_title || p.original_title || '—'}
                        </p>
                        <p className="text-xs text-gray-400">ID: {p.id} | EXT: {p.external_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-brand-600">
                      {p.final_price ? `${Math.round(p.final_price)} сом` : '—'}
                    </span>
                    {p.is_manual_price && <span className="text-xs text-orange-500 ml-1">(ручн)</span>}
                    {p.current_price && <p className="text-xs text-gray-400">¥{p.current_price}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category_name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => quickToggle(p.id, 'is_active', p.is_active)}
                      className={`w-8 h-5 rounded-full transition-colors ${p.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${p.is_active ? 'translate-x-3' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => quickToggle(p.id, 'is_featured', p.is_featured)}
                      className={`text-lg transition-opacity ${p.is_featured ? 'opacity-100' : 'opacity-20'}`}>
                      ⭐
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => startEdit(p)}
                      className="text-brand-500 hover:text-brand-700 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                      Изменить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} из {pagination.total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">←</button>
              <span className="px-3 py-1.5 text-sm text-gray-600">стр. {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * pagination.limit >= pagination.total}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
