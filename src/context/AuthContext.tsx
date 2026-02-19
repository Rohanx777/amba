import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  User as SqliteUser,
  createUser as createLocalUser,
  authenticateUser as authenticateLocalUser,
  getUserByEmail,
  createSession
} from '../services/sqlite';
import { Profile, getProfile, upsertProfile } from '../services/profileService';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();
const redirectTo = 'exp://10.199.130.222:8081';

// Defining a unified User type for the app to use
export type AppUser = {
  id: string;
  email: string | null;
  fullName?: string;
};

export type AuthContextType = {
  user: AppUser | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  completeOnboarding: (data?: { medicalCondition?: string; guardianName?: string; guardianPhone?: string }) => Promise<void>;
  didJustSignup: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [didJustSignup, setDidJustSignup] = useState(false);

  const completeOnboarding = async (data?: { medicalCondition?: string; guardianName?: string; guardianPhone?: string }) => {
    if (user && data) {
      // 1. Save to Supabase (Profiles table)
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            medical_condition: data.medicalCondition,
            guardian_name: data.guardianName,
            guardian_phone: data.guardianPhone,
            is_onboarding_complete: true, // Mark as complete
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) console.error("Supabase onboarding save error:", error);
      } catch (e) {
        console.error("Supabase onboarding exception:", e);
      }

      // 2. Save locally
      try {
        await upsertProfile(user.id, {
          medical_condition: data.medicalCondition,
          guardian_name: data.guardianName,
          guardian_phone: data.guardianPhone,
          is_onboarding_complete: true, // Mark as complete
        });
      } catch (e) {
        console.error("Local onboarding save error:", e);
      }
    }
    setDidJustSignup(false);
  };

  // Detect Supabase Auth State
  useEffect(() => {
    // Check initial session
    // Check initial session with timeout
    const initSession = async () => {
      try {
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]) as any;

        if (session?.user) {
          const appUser: AppUser = {
            id: session.user.id,
            email: session.user.email ?? null,
            fullName: session.user.user_metadata?.full_name,
          };
          setUser(appUser);
          loadUserProfile(appUser.id);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.warn('Auth check timed out or failed, falling back to false', e);
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const appUser: AppUser = {
            id: session.user.id,
            email: session.user.email ?? null,
            fullName: session.user.user_metadata?.full_name,
          };
          setUser(appUser);
          await loadUserProfile(appUser.id);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      let loadedProfile: Profile | null = null;

      // Try Supabase first
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        loadedProfile = data as Profile;
      } else {
        // Fallback to local profileService
        loadedProfile = await getProfile(userId);
      }

      setProfile(loadedProfile);

      // Check for incomplete onboarding
      // If profile exists but onboarding is NOT complete, trigger the flow
      if (loadedProfile && !loadedProfile.is_onboarding_complete) {
        setDidJustSignup(true);
      }

    } catch (e) {
      console.log("Error loading profile", e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // 1. Try Supabase Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('Supabase Login Success');
      // onAuthStateChange will handle the rest
    } catch (supabaseError: any) {
      console.log('Supabase Login Failed', supabaseError.message);

      // 2. Offline Fallback: Try SQLite
      try {
        console.log('Attempting Local Login...');
        const localUser = await authenticateLocalUser(email, password);
        if (localUser) {
          const appUser: AppUser = {
            id: localUser.id,
            email: localUser.email,
            fullName: localUser.full_name
          };
          setUser(appUser);
          await loadUserProfile(localUser.id);
        } else {
          throw new Error("Invalid credentials (Offline & Online)");
        }
      } catch (localError) {
        throw localError; // Propagate error if both fail
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, fullName: string = '') => {
    setLoading(true);
    try {
      // 1. Supabase Signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) throw error;

      const supabaseUserId = data.user?.id;

      if (supabaseUserId) {
        // 2. Update profile with full_name
        await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone_number: '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', supabaseUserId);

        // 3. SQLite Backup (Create user but don't log in)
        const existing = await getUserByEmail(email);
        if (!existing) {
          await createLocalUser(email, password, fullName);
        }

        // CRITICAL: We do NOT set user or didJustSignup here anymore.
        // We want the user to explicitly log in.
        // Ensure we are signed out just in case Supabase auto-signed in
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      console.log("Supabase Signup Failed:", error.message);

      // Fallback: Create Local User (Offline support)
      try {
        console.log('Attempting Local Signup...');
        const existing = await getUserByEmail(email);
        if (existing) {
          throw new Error("User already exists (Local)");
        }

        await createLocalUser(email, password, fullName);
        console.log("Local Signup Success");

        // No auto-login for local either
      } catch (localError: any) {
        console.error("Local Signup Error:", localError);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (e) {
      console.error("Logout Error", e);
    }
  };

  const refreshProfile = async () => {
    if (user) await loadUserProfile(user.id);
  };

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!user) return;

    // Update Supabase if online
    try {
      await supabase
        .from('profiles')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (e) {
      console.warn("Could not sync profile to cloud");
    }

    // Refresh local view
    setProfile(prev => prev ? ({ ...prev, ...patch }) : null);
  };

  // ─── Helper: parse tokens from redirect URL ───────────
  const createSessionFromUrl = async (url: string) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);
    const { access_token, refresh_token } = params;
    if (!access_token) return;

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    return data.session;
  };

  // ─── Shared OAuth helper ──────────────────────────────
  const performOAuth = async (provider: 'google' | 'facebook') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      throw new Error(error?.message || `Could not get ${provider} OAuth URL`);
    }

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo,
      { showInRecents: true }
    );

    if (result.type === 'success') {
      const { url } = result;
      await createSessionFromUrl(url);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await performOAuth('google');
    } finally {
      setLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    setLoading(true);
    try {
      await performOAuth('facebook');
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({ user, profile, loading, login, signup, loginWithGoogle, loginWithFacebook, logout, refreshProfile, updateProfile, completeOnboarding, didJustSignup }),
    [user, profile, loading, didJustSignup]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
