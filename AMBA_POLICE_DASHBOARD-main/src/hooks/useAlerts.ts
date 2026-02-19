import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Alert } from '../types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAlertSound } from './useAlertSound';

export function useAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [debugLog, setDebugLog] = useState<string[]>(['Initializing...']);
    const [newAlertId, setNewAlertId] = useState<string | null>(null);
    const { playAlertSound } = useAlertSound();
    const initialLoadDone = useRef(false);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const addDebug = useCallback((msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const line = `[${timestamp}] ${msg}`;
        if (import.meta.env.DEV) {
            console.log('[useAlerts]', msg);
        }
        setDebugLog(prev => [...prev.slice(-20), line]);
    }, []);

    // Fetch all alerts
    const fetchAlerts = useCallback(async () => {
        addDebug('🔄 Fetching alerts...');
        setLoading(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('active_alerts')
                .select('*')
                .order('started_at', { ascending: false });

            if (fetchError) {
                addDebug(`❌ FETCH ERROR: ${fetchError.message}`);
                setError(fetchError.message);
            } else {
                addDebug(`✅ Fetched ${data?.length || 0} alerts`);
                if (data && data.length > 0) {
                    data.forEach((a: any) => addDebug(`  📋 ${a.user_name || 'Unknown'} — ${a.status}`));
                }
                setAlerts((data as Alert[]) || []);
                setError(null);
            }
        } catch (e: any) {
            addDebug(`💥 EXCEPTION: ${e.message}`);
            setError(e.message);
        }

        setLoading(false);
        initialLoadDone.current = true;
    }, [addDebug]);

    // Subscribe to realtime changes — only once
    useEffect(() => {
        addDebug('🚀 Starting fetch + subscribe...');
        fetchAlerts();

        // Create channel only if not already created
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        const channel = supabase
            .channel('dashboard-alerts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'active_alerts' },
                (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
                    addDebug(`🔔 REALTIME: ${payload.eventType}`);

                    if (payload.eventType === 'INSERT') {
                        if (initialLoadDone.current) {
                            playAlertSound();
                            setNewAlertId((payload.new as any).id);
                            setTimeout(() => setNewAlertId(null), 5000);
                        }
                        fetchAlerts();
                    } else if (payload.eventType === 'UPDATE') {
                        setAlerts(prev =>
                            prev.map(a =>
                                a.id === (payload.new as any).id
                                    ? { ...a, ...(payload.new as Partial<Alert>) }
                                    : a
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setAlerts(prev => prev.filter(a => a.id !== (payload.old as any).id));
                    }
                }
            )
            .subscribe((status, err) => {
                addDebug(`📡 Realtime: ${status}`);
                if (status === 'CHANNEL_ERROR') {
                    addDebug('⚠️ Realtime channel error — will use polling fallback');
                    // Don't retry endlessly — set up polling instead
                }
                if (err) {
                    addDebug(`❌ WS Error: ${JSON.stringify(err)}`);
                }
            });

        channelRef.current = channel;

        // POLLING FALLBACK: Refresh alerts every 10 seconds regardless
        const pollInterval = setInterval(() => {
            fetchAlerts();
        }, 10000);

        return () => {
            clearInterval(pollInterval);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - run only once on mount

    // Resolve an alert
    const resolveAlert = useCallback(async (alertId: string) => {
        addDebug(`🟢 Resolving alert: ${alertId}`);
        const { error } = await supabase
            .from('active_alerts')
            .update({
                status: 'RESOLVED',
                resolved_at: new Date().toISOString(),
            })
            .eq('id', alertId);

        if (error) {
            addDebug(`❌ Resolve error: ${error.message}`);
            throw error;
        }
    }, [addDebug]);

    return { alerts, loading, error, debugLog, newAlertId, refetch: fetchAlerts, resolveAlert };
}
