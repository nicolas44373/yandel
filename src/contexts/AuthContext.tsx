import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Role = 'admin' | 'operador' | 'solo_lectura';

interface Profile {
  id: string;
  nombre: string;
  rol: Role;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock profile for development without Supabase
const MOCK_PROFILE: Profile = {
  id: 'mock-user-id',
  nombre: 'Usuario Demo',
  rol: 'admin'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we are using mock Supabase setup or if user explicitly chose mock mode
    const isMockEnv = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
    const mockUser = localStorage.getItem('mock_user');
    
    if (isMockEnv || mockUser === 'true') {
      // Simulate logged in user for dev
      if (mockUser === 'true') {
        setUser({ id: 'mock-user-id', email: 'demo@ejemplo.com' } as User);
        
        // Retrieve role from local storage or default to admin
        const mockRole = localStorage.getItem('mock_role') as Role || 'admin';
        setProfile({ ...MOCK_PROFILE, rol: mockRole });
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
      return;
    }

    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          // Fallback if profile not found
          setProfile({ id: userId, nombre: 'Usuario', rol: 'operador' });
        } else if (data) {
          setProfile(data as Profile);
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const isMockEnv = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
    const mockUser = localStorage.getItem('mock_user');
    
    if (isMockEnv || mockUser === 'true') {
      localStorage.removeItem('mock_user');
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
