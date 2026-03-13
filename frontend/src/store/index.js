import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Cart / wishlist
  wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]'),
  addToWishlist: (product) => {
    const list = [...get().wishlist]
    if (!list.find(p => p.id === product.id)) {
      const updated = [...list, product]
      localStorage.setItem('wishlist', JSON.stringify(updated))
      set({ wishlist: updated })
    }
  },
  removeFromWishlist: (id) => {
    const updated = get().wishlist.filter(p => p.id !== id)
    localStorage.setItem('wishlist', JSON.stringify(updated))
    set({ wishlist: updated })
  },
  isInWishlist: (id) => get().wishlist.some(p => p.id === id),

  // Currency
  rate: 15.5,
  setRate: (rate) => set({ rate }),

  // Admin
  adminToken: localStorage.getItem('admin_token') || null,
  adminUser: null,
  setAdmin: (token, user) => {
    localStorage.setItem('admin_token', token)
    set({ adminToken: token, adminUser: user })
  },
  logout: () => {
    localStorage.removeItem('admin_token')
    set({ adminToken: null, adminUser: null })
  },
}))
