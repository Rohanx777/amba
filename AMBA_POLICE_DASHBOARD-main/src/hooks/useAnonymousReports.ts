import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AnonymousReport } from '../types';

export function useAnonymousReports() {
    const [reports, setReports] = useState<AnonymousReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
            .from('anonymous_reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (fetchErr) {
            setError(fetchErr.message);
        } else {
            setReports((data as AnonymousReport[]) || []);
            setError(null);
        }
        setLoading(false);
    }, []);

    const updateStatus = useCallback(async (id: string, status: AnonymousReport['status']) => {
        const { error: updateErr } = await supabase
            .from('anonymous_reports')
            .update({ status })
            .eq('id', id);

        if (updateErr) throw updateErr;

        // Optimistic update
        setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }, []);

    // Subscribe to realtime updates
    useEffect(() => {
        fetchReports();

        const channel = supabase
            .channel('anonymous-reports-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'anonymous_reports' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setReports(prev => [payload.new as AnonymousReport, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setReports(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchReports]);

    return { reports, loading, error, fetchReports, updateStatus };
}
