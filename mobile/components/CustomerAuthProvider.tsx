import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { customerRequest } from './customerApi';

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
  address?: string | null;
}

interface AuthContextValue {
  customer: Customer | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const TOKEN_KEY = 'awash-customer-token';
const AuthContext = createContext<AuthContextValue | null>(null);

async function readToken() {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function CustomerAuthProvider({ children }: PropsWithChildren) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    readToken()
      .then(async (savedToken) => {
        if (!savedToken) return;
        const profile = await customerRequest<Customer>('/auth/profile', savedToken);
        if (profile.role !== 'CUSTOMER') throw new Error('This mobile app is for customer accounts.');
        if (active) {
          setToken(savedToken);
          setCustomer(profile);
        }
      })
      .catch(async () => {
        await storeToken(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const result = await customerRequest<{ user: Customer; token: string }>('/auth/login', '', {
      method: 'POST',
      headers: {},
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (result.user.role !== 'CUSTOMER') {
      throw new Error('This mobile app is for customer accounts. Please use the staff portal.');
    }
    await storeToken(result.token);
    setToken(result.token);
    setCustomer(result.user);
  };

  const logout = async () => {
    await storeToken(null);
    setToken(null);
    setCustomer(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ customer, token, loading, error, login, logout, clearError: () => setError(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return value;
}