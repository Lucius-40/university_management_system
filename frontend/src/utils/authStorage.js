export const AUTH_STORAGE_KEYS = {
  token: "token",
  user: "user",
};

export const AUTH_EVENTS = {
  updated: "auth:updated",
};

const emitAuthUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENTS.updated));
};

export const readAuthSession = () => {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  const userRaw = localStorage.getItem(AUTH_STORAGE_KEYS.user);

  if (!token || token === "undefined" || token === "null") {
    return { token: null, user: null };
  }

  try {
    const user = JSON.parse(userRaw || "null");
    if (!user) {
      return { token: null, user: null };
    }
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};

export const persistAuthSession = ({ token, user }) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
  emitAuthUpdated();
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  emitAuthUpdated();
};
