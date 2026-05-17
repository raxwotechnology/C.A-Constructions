import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        set({ user: data.user, token: data.token, isAuthenticated: true })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        return data.user
      },

      register: async (userData) => {
        const { data } = await api.post('/auth/register', userData)
        set({ user: data.user, token: data.token, isAuthenticated: true })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        return data.user
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        delete api.defaults.headers.common['Authorization']
      },

      updateUser: (user) => set({ user }),

      initAuth: () => {
        const { token } = get()
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      },

      /** Reload profile (avatar, name) from API after refresh or server restart */
      refreshSession: async () => {
        const { token } = get()
        if (!token) return null
        try {
          const { data } = await api.get('/auth/me')
          if (data?.user) {
            set({ user: data.user, isAuthenticated: true })
            return data.user
          }
        } catch {
          set({ user: null, token: null, isAuthenticated: false })
          delete api.defaults.headers.common['Authorization']
          localStorage.removeItem('raxwo-auth')
        }
        return null
      },
    }),
    {
      name: 'raxwo-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)

export default useAuthStore
