import { createContext, useContext, useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';
import { setApiToken } from '@/lib/api';

type User = {
  id: string;
  email: string;
} | any | null;

interface AuthContextType {
  user: User;
  accessToken: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  exchangeResetPasswordToken: (email: string, code: string) => Promise<string>;
  confirmPasswordReset: (newPassword: string, resetToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  resetPassword: async () => {},
  exchangeResetPasswordToken: async () => "",
  confirmPasswordReset: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('jazz_access_token');
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to load token from localStorage first
    const storedToken = localStorage.getItem('jazz_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
      setApiToken(storedToken);
    }

    // Check active session on mount by attempting a token refresh
    const checkUser = async () => {
      try {
        // getCurrentUser automatically waits for OAuth callbacks to be processed
        // and it tries to refresh the session if needed.
        const { data } = await insforge.auth.getCurrentUser();
        
        // At this point, if the user is logged in (either via refresh cookie or OAuth callback),
        // the SDK's internal tokenManager will have the token.
        const internalTokenManager = (insforge.auth as any).tokenManager;
        const currentToken = internalTokenManager?.getAccessToken();
        
        if (data?.user && currentToken) {
          setAccessToken(currentToken);
          setApiToken(currentToken);
          localStorage.setItem('jazz_access_token', currentToken);
          setUser(data.user);
        } else {
          // If no user could be fetched, clear the stored token
          localStorage.removeItem('jazz_access_token');
          setAccessToken(null);
          setApiToken(null);
        }
      } catch (err) {
        console.error('Error restoring session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    if (data?.user) {
      setUser(data.user);
      const token = data.accessToken || null;
      setAccessToken(token);
      setApiToken(token);
      if (token) {
        localStorage.setItem('jazz_access_token', token);
      } else {
        localStorage.removeItem('jazz_access_token');
      }
    }
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signUp({ email, password });
    if (error) {
      throw error;
    }
    if (data?.user) {
      setUser(data.user);
      const token = data.accessToken || null;
      setAccessToken(token);
      setApiToken(token);
      if (token) {
        localStorage.setItem('jazz_access_token', token);
      } else {
        localStorage.removeItem('jazz_access_token');
      }
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await insforge.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: `${window.location.origin}/dashboard`
    });
    if (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await insforge.auth.sendResetPasswordEmail({ email });
    if (error) throw error;
  };

  const exchangeResetPasswordToken = async (email: string, code: string) => {
    const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email, code });
    if (error) throw error;
    if (!data?.token) throw new Error("Invalid code provided");
    return data.token;
  };

  const confirmPasswordReset = async (newPassword: string, resetToken: string) => {
    const { error } = await insforge.auth.resetPassword({ newPassword, otp: resetToken });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await insforge.auth.signOut();
    if (error) throw error;
    setUser(null);
    setAccessToken(null);
    setApiToken(null);
    localStorage.removeItem('jazz_access_token');
  };

  return (
    <AuthContext.Provider value={{ 
      user, accessToken, isLoading, signIn, signUp, signInWithGoogle, 
      resetPassword, exchangeResetPasswordToken, confirmPasswordReset, signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
