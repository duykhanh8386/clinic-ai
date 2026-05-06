import { createContext, useContext, useEffect, useState } from "react";
import { getMe } from "../services/auth.service";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [me, setMe] = useState(() => {
    const raw = localStorage.getItem("me");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Wrapper: keep localStorage in sync whenever me changes from anywhere
  const updateMe = (newMe) => {
    if (newMe) {
      localStorage.setItem("me", JSON.stringify(newMe));
    } else {
      localStorage.removeItem("me");
    }
    setMe(newMe);
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setMe(null);
      setLoading(false);
      return;
    }

    getMe()
      .then((r) => {
        localStorage.setItem("me", JSON.stringify(r.data));
        setMe(r.data);
      })
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("me");
        setMe(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ me, setMe: updateMe, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useBootAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useBootAuth must be used within an AuthProvider");
  }
  return context;
}