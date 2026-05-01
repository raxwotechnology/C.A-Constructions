import { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

const initialState = {
  user: JSON.parse(localStorage.getItem('raxwo_user') || 'null'),
  token: localStorage.getItem('raxwo_token') || null,
  loading: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':  return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      localStorage.setItem('raxwo_token', action.payload.token);
      localStorage.setItem('raxwo_user', JSON.stringify(action.payload.user));
      return { ...state, loading: false, user: action.payload.user, token: action.payload.token, error: null };
    case 'LOGIN_ERROR':  return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      localStorage.removeItem('raxwo_token');
      localStorage.removeItem('raxwo_user');
      return { ...initialState, user: null, token: null };
    case 'UPDATE_USER':
      localStorage.setItem('raxwo_user', JSON.stringify(action.payload));
      return { ...state, user: action.payload };
    default: return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (phone, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const res = await authAPI.login({ phone, password });
      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      dispatch({ type: 'LOGIN_ERROR', payload: msg });
      throw new Error(msg);
    }
  };

  const logout = () => dispatch({ type: 'LOGOUT' });

  const updateUser = (user) => dispatch({ type: 'UPDATE_USER', payload: user });

  const isAdmin = state.user?.userType === 'admin';
  const isEmployee = ['developer', 'manager', 'marketing_designer'].includes(state.user?.userType);
  const isCustomer = state.user?.userType === 'customer';

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, isAdmin, isEmployee, isCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
