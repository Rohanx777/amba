import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { PoliceOfficer } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    officer: PoliceOfficer | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// DEMO MODE: Create a static mock session & officer for development
const DEMO_OFFICER: PoliceOfficer = {
    id: 'demo-officer-id',
    full_name: 'Demo Officer',
    badge_number: 'AMBA-001',
    rank: 'Senior Inspector',
    station: 'Central Station',
    phone: '+91-9876543210',
    is_active: true,
    created_at: new Date().toISOString()
};

const DEMO_SESSION = {
    user: { id: 'demo-officer-id', email: 'officer@amba.ai' },
    access_token: 'demo-mode'
} as Session;

export function AuthProvider({ children }: { children: ReactNode }) {
    // Start with demo session immediately — no waiting, no flicker
    const [session, setSession] = useState<Session | null>(DEMO_SESSION);
    const [officer, setOfficer] = useState<PoliceOfficer | null>(DEMO_OFFICER);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Try to upgrade to a real session if one exists
        async function tryRealAuth() {
            try {
                const { data: { session: realSession } } = await supabase.auth.getSession();
                if (realSession?.user) {
                    if (import.meta.env.DEV) console.log('[Auth] Found real session, upgrading from demo mode');
                    setSession(realSession);
                    // Try to fetch real officer profile
                    const { data } = await supabase
                        .from('police_officers')
                        .select('*')
                        .eq('id', realSession.user.id)
                        .single();
                    if (data) {
                        setOfficer(data as PoliceOfficer);
                    }
                } else {
                    if (import.meta.env.DEV) console.log('[Auth] No real session, staying in DEMO MODE');
                }
            } catch (e) {
                if (import.meta.env.DEV) console.log('[Auth] Auth check failed, staying in DEMO MODE');
            }
        }
        tryRealAuth();
    }, []);

    async function signIn(email: string, password: string) {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setLoading(false);
            throw error;
        }
        // Session will be updated naturally
    }

    function signOut() {
        // Just go back to demo mode
        setSession(DEMO_SESSION);
        setOfficer(DEMO_OFFICER);
        supabase.auth.signOut().catch(() => { });
    }

    return (
        <AuthContext.Provider value={{ session, officer, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
