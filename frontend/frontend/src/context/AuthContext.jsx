import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearAuth,
  fetchMe,
  getStoredAuth,
  login as loginRequest,
  storeAuth,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const stored = getStoredAuth();
  const [token, setToken] = useState(stored.token);
  const [merchant, setMerchant] = useState(stored.merchant);
  const [bootstrapping, setBootstrapping] = useState(Boolean(stored.token));

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    storeAuth(data.token, data.merchant);
    setToken(data.token);
    setMerchant(data.merchant);
    return data;
  }, []);

  const setAuth = useCallback((newToken, newMerchant) => {
    storeAuth(newToken, newMerchant);
    setToken(newToken);
    setMerchant(newMerchant);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setMerchant(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function validate() {
      if (!token) {
        setBootstrapping(false);
        return;
      }
      try {
        const data = await fetchMe();
        if (!cancelled) {
          setMerchant(data.merchant);
          storeAuth(token, data.merchant);
        }
      } catch {
        if (!cancelled) {
          clearAuth();
          setToken(null);
          setMerchant(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      merchant,
      merchantId: merchant?.id || 1,
      isAuthenticated: Boolean(token && merchant),
      bootstrapping,
      login,
      setAuth,
      logout,
    }),
    [token, merchant, bootstrapping, login, logout, setAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
