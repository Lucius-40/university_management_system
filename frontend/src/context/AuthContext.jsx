import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_EVENTS,
  clearAuthSession,
  persistAuthSession,
  readAuthSession,
} from "../utils/authStorage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => readAuthSession());

  useEffect(() => {
    const syncAuthFromStorage = () => {
      setSession(readAuthSession());
    };

    window.addEventListener(AUTH_EVENTS.updated, syncAuthFromStorage);
    return () => {
      window.removeEventListener(AUTH_EVENTS.updated, syncAuthFromStorage);
    };
  }, []);

  const login = ({ token, user }) => {
    persistAuthSession({ token, user });
    setSession({ token, user });
  };

  const logout = () => {
    clearAuthSession();
    setSession({ token: null, user: null });
  };

  const value = useMemo(
    () => ({
      token: session.token,
      user: session.user,
      isAuthenticated: Boolean(session.token && session.user),
      login,
      logout,
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
};
