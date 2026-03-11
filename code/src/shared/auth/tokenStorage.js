// VULN: access token in sessionStorage (cleared on tab close), refresh token in HttpOnly cookie

const ACCESS_TOKEN_KEY = 'access_token';
const USER_KEY = 'auth_user';

export const tokenStorage = {
  setToken: (token) => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  getToken: () => {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setUser: (user) => {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser: () => {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  clear: () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
  isLoggedIn: () => {
    return !!sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },
};
