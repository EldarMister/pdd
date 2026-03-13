import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)
const HeartIcon = ({ filled }) => (
  <svg className="w-5 h-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)
const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const WAIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.52 5.847L0 24l6.335-1.502A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-5.001-1.374l-.358-.213-3.762.892.952-3.665-.234-.376A9.793 9.793 0 012.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z"/>
  </svg>
)

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const wishlist = useStore(s => s.wishlist)

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`)
      setMenuOpen(false)
    }
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center gap-3 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">P</span>
            </div>
            <span className="font-display font-bold text-gray-900 text-lg hidden sm:block">
              PDD<span className="text-brand-500">Shop</span>
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input pr-10 bg-gray-50 border-gray-100"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors">
                <SearchIcon />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/wishlist" className="relative p-2 text-gray-600 hover:text-brand-500 transition-colors">
              <HeartIcon />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <a
              href="https://wa.me/996220203021"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <WAIcon />
              <span>WhatsApp</span>
            </a>
            <button className="p-2 text-gray-600 md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6 pb-3 text-sm font-semibold border-t border-gray-50 pt-2">
          <Link to="/" className="text-gray-600 hover:text-brand-500 transition-colors">Главная</Link>
          <Link to="/catalog" className="text-gray-600 hover:text-brand-500 transition-colors">Каталог</Link>
          <Link to="/delivery" className="text-gray-600 hover:text-brand-500 transition-colors">Доставка</Link>
          <Link to="/contacts" className="text-gray-600 hover:text-brand-500 transition-colors">Контакты</Link>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 animate-fade-in">
            <nav className="flex flex-col gap-3 text-sm font-semibold">
              <Link to="/" className="py-2 text-gray-700 hover:text-brand-500" onClick={() => setMenuOpen(false)}>Главная</Link>
              <Link to="/catalog" className="py-2 text-gray-700 hover:text-brand-500" onClick={() => setMenuOpen(false)}>Каталог</Link>
              <Link to="/delivery" className="py-2 text-gray-700 hover:text-brand-500" onClick={() => setMenuOpen(false)}>Доставка</Link>
              <Link to="/contacts" className="py-2 text-gray-700 hover:text-brand-500" onClick={() => setMenuOpen(false)}>Контакты</Link>
              <a href="https://wa.me/996220203021" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 py-2 text-green-600 hover:text-green-700">
                <WAIcon /> WhatsApp
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
