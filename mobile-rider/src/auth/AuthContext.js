import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as api from "../api/client";

const TOKEN_KEY = "mrf_rider_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on launch
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          setToken(saved);
          try {
            const me = await api.getMe(saved);
            setUser(me);
          } catch (e) {
            if (e.status === 401) {
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              setToken(null);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signIn(email, password) {
    const data = await api.login(email, password);
    const access = data.access_token;

    // Verify the user is a rider before storing the token
    const me = await api.getMe(access);
    if (me.role !== "rider") {
      throw new Error("This account is not a rider.");
    }

    await SecureStore.setItemAsync(TOKEN_KEY, access);
    setToken(access);
    setUser(me);
  }

  async function signOut() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {}
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}