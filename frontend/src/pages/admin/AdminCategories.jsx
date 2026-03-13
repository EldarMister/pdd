import { useState, useEffect } from 'react'
import { adminGetCategories, adminCreateCategory, adminUpdateCategory } from '../../api'

const slugify = (text) =>
  text.toLowerCase()
    .replace(/[а-яёА-ЯЁ]/g, c => ({ а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ь:'',ы:'y',ъ:'',э:'e',ю:'yu',я:'ya' }[c.toLowerCase()] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', seo_title: '', seo_description: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => {
    adminGetCategories().then(res => setCategories(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleNameChange = (val) => {
    setForm(f => ({ ...f, name: val, slug: f.slug || slugify(val) }))
  }

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      setMsg('Название и slug обязательны')
      return
    }
    setSaving(true)
    try {
      if (editId) {
        await adminUpdateCategory(editId, form)
      } else {
        await adminCreateCategory(form)
      }
      setMsg('✅ Сохранено')
      setEditId(null)
      setCreating(false)
      setForm({ name: '', slug: '', seo_title: '', seo_description: '', sort_order: 0 })
      load()
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Ошибка'))
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const startEdit = (cat) => {
    setEditId(cat.id)
    setCreating(false)
    setForm({
      name: cat.name,
      slug: cat.slug,
      seo_title: cat.seo_title || '',
      seo_description: cat.seo_description || '',
      sort_order: cat.sort_order || 0,
      is_active: cat.is_active
    })
  }

  const toggleActive = async (cat) => {
    await adminUpdateCategory(cat.id, { is_active: !cat.is_active })
    load()
  }

  const FormPanel = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-4 border-2 border-brand-200">
      <h2 className="font-semibold text-gray-800 mb-4">{editId ? 'Редактировать категорию' : 'Новая категория'}</h2>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Название *</label>
            <input value={form.name} onChange={e => handleNameChange(e.target.value)}
              className="input text-sm" placeholder="Электроника" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL) *</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              className="input text-sm font-mono" placeholder="elektronika" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">SEO заголовок</label>
          <input value={form.seo_title} onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
            className="input text-sm" placeholder="Электроника — купить из Китая" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">SEO описание</label>
          <textarea value={form.seo_description} onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))}
            rows={2} className="input text-sm resize-none" />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-gray-600 mb-1">Порядок</label>
          <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))}
            className="input text-sm" min={0} />
        </div>
        {msg && (
          <p className={`text-sm font-medium ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>
        )}
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2">
            {saving ? 'Сохраняю...' : editId ? 'Сохранить' : 'Создать'}
          </button>
          <button onClick={() => { setEditId(null); setCreating(false); setForm({ name: '', slug: '', seo_title: '', seo_description: '', sort_order: 0 }) }}
            className="btn-outline text-sm py-2">Отмена</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-gray-900">🗂 Категории</h1>
        {!creating && !editId && (
          <button onClick={() => { setCreating(true); setEditId(null) }} className="btn-primary text-sm py-2">
            + Новая категория
          </button>
        )}
      </div>

      {(creating || editId) && <FormPanel />}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">Категория</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-center">Порядок</th>
              <th className="px-4 py-3 text-center">Активна</th>
              <th className="px-4 py-3 text-center">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="skeleton h-4 w-32 rounded" /></td>
                  <td className="px-4 py-3"><div className="skeleton h-4 w-24 rounded" /></td>
                  <td colSpan={3} />
                </tr>
              ))
            ) : categories.map(cat => (
              <tr key={cat.id} className={`hover:bg-gray-50 transition-colors ${!cat.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">/category/{cat.slug}</td>
                <td className="px-4 py-3 text-center text-gray-500">{cat.sort_order}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(cat)}
                    className={`w-8 h-5 rounded-full transition-colors ${cat.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${cat.is_active ? 'translate-x-3' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => startEdit(cat)}
                    className="text-brand-500 hover:text-brand-700 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
