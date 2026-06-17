import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  fetchMe,
  login as apiLogin,
  register as apiRegister,
  type AuthOrganization,
  type AuthUser,
} from "@/api/auth";
import { ApiError } from "@/api/client";
import { setUnauthorizedHandler } from "@/api/client";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  restoreError: string | null;
  refreshMe: () => Promise<void>;
  retryRestore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    organizationName: string;
    email: string;
    password: string;
    name?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setOrganization(null);
    setRestoreError(null);
    void navigate({ to: "/login" });
  }, [navigate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiLogin(email, password);
      setAuthToken(result.token);
      setUser(result.user);
      setOrganization(result.organization);
      setRestoreError(null);
      await navigate({ to: "/" });
    },
    [navigate],
  );

  const register = useCallback(
    async (input: {
      organizationName: string;
      email: string;
      password: string;
      name?: string;
    }) => {
      const result = await apiRegister(input);
      setAuthToken(result.token);
      setUser(result.user);
      setOrganization(result.organization);
      setRestoreError(null);
      await navigate({ to: "/" });
    },
    [navigate],
  );

  const refreshMe = useCallback(async () => {
    const me = await fetchMe();
    setUser(me.user);
    setOrganization(me.organization);
    setRestoreError(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setOrganization(null);
      setRestoreError(null);
      void navigate({ to: "/login" });
    });
  }, [navigate]);

  const restoreSession = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setOrganization(null);
      setRestoreError(null);
      return;
    }

    setRestoreError(null);
    try {
      const me = await fetchMe();
      setUser(me.user);
      setOrganization(me.organization);
    } catch (err) {
      // Only clear the token when the server definitively rejects it (401).
      // Keep the token for network errors, 5xx, and response-shape mismatches
      // so a refresh doesn't log the user out due to transient failures.
      if (err instanceof ApiError && err.status === 401) {
        clearAuthToken();
        setUser(null);
        setOrganization(null);
        setRestoreError(null);
        return;
      }

      setUser(null);
      setOrganization(null);
      setRestoreError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to restore session. Please try again.",
      );
    }
  }, []);

  const retryRestore = useCallback(async () => {
    setIsLoading(true);
    await restoreSession();
    setIsLoading(false);
  }, [restoreSession]);

  useEffect(() => {
    if (!getAuthToken()) {
      setIsLoading(false);
      return;
    }

    void restoreSession().finally(() => setIsLoading(false));
  }, [restoreSession]);

  const value = useMemo(
    () => ({
      user,
      organization,
      isLoading,
      isAuthenticated: Boolean(user && organization),
      restoreError,
      refreshMe,
      retryRestore,
      login,
      register,
      logout,
    }),
    [
      user,
      organization,
      isLoading,
      restoreError,
      refreshMe,
      retryRestore,
      login,
      register,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
