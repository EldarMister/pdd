import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../../api'
import { useStore } from '../../store'

export default function AdminLoginPage() {
  const [form, setForm] = useState({ login: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAdmin = useStore(s => s.setAdmin)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await adminLogin(form)
      setAdmin(res.data.token, res.data.admin)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.error || 'Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-display font-bold text-xl">P</span>
          </div>
          <h1 className="font-display font-bold text-2xl">Вход в админку</h1>
          <p className="text-gray-500 text-sm mt-1">PDD Shop</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
            <input
              type="text"
              value={form.login}
              onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
              className="input"
              placeholder="admin"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
