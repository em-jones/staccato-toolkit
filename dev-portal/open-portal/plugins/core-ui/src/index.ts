import { atom } from "nanostores";

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  } | null;
}

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
};

export const authStore = atom<AuthState>(defaultAuthState);

export function setAuth(user: AuthState["user"]) {
  authStore.set({
    isAuthenticated: !!user,
    user,
  });
}

export function clearAuth() {
  authStore.set(defaultAuthState);
}

export function fn() {
  return "Hello, tsdown!";
}
