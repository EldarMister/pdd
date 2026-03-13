import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '../../store'

const navItems = [
  { to: '/admin', label: '📊 Дэшборд', end: true },
  { to: '/admin/products', label: '📦 Товары' },
  { to: '/admin/categories', label: '🗂 Категории' },
  { to: '/admin/parser', label: '🤖 Парсер' },
  { to: '/admin/settings', label: '⚙️ Настройки' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { adminUser, logout } = useStore()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="font-bold text-sm">P</span>
            </div>
            <div>
              <p className="font-semibold text-sm">PDD Shop</p>
              <p className="text-gray-400 text-xs">Админ-панель</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-500 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="px-3 py-2 text-xs text-gray-400 mb-2">{adminUser?.login || 'admin'}</div>
          <button onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
            🚪 Выйти
          </button>
          <a href="/" target="_blank"
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-1 mt-1">
            🌐 Перейти на сайт
          </a>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
