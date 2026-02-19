import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface EvidenceIncident {
    id: string;
    user_id: string;
    user_name: string | null;
    user_email: string | null;
    status: string;
    started_at: string;
    resolved_at: string | null;
    latitude: number | null;
    longitude: number | null;
    address_snapshot: string | null;
    battery: number | null;
    speed: number | null;
}

export interface TimelineEvent {
    id: string;
    type: 'response' | 'audio' | 'alert_start' | 'alert_resolve';
    timestamp: string;
    label: string;
    detail?: string | null;
    meta?: Record<string, any>;
}

export interface AudioFile {
    id: string;
    storage_path: string;
    duration: string | null;
    recorded_at: string;
    signedUrl?: string;
}

export function useEvidence() {
    const [incidents, setIncidents] = useState<EvidenceIncident[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all incidents (active + resolved/history)
    const fetchIncidents = useCallback(async () => {
        setLoading(true);

        try {
            // 1. Fetch Active Alerts
            const { data: activeData, error: activeErr } = await supabase
                .from('active_alerts')
                .select('*')
                .order('started_at', { ascending: false });

            if (activeErr) throw activeErr;

            // 2. Fetch Alert History (Recent 50)
            const { data: historyData, error: historyErr } = await supabase
                .from('alert_history')
                .select('*, profiles(full_name, email)') // Join with profiles
                .order('started_at', { ascending: false })
                .limit(50);

            if (historyErr) {
                console.error("Error fetching history:", historyErr);
                // Don't crash if history fetch fails, just show active
            }

            // 3. Normalize History Data to EvidenceIncident shape
            const historyIncidents: EvidenceIncident[] = (historyData || []).map((h: any) => ({
                id: h.id,
                user_id: h.user_id,
                user_name: h.profiles?.full_name || 'Unknown',
                user_email: h.profiles?.email || null,
                status: h.status,
                started_at: h.started_at,
                resolved_at: h.resolved_at,
                latitude: h.latitude,
                longitude: h.longitude,
                address_snapshot: h.address_snapshot,
                battery: null, // History doesn't keep battery currently
                speed: null    // History doesn't keep speed currently
            }));

            // 4. Merge and Sort
            // Filter out any history items that act as duplicates if ID exists in active (unlikely but safe)
            const activeIds = new Set((activeData || []).map(a => a.id));
            const uniqueHistory = historyIncidents.filter(h => !activeIds.has(h.id));

            const allIncidents = [...(activeData as EvidenceIncident[] || []), ...uniqueHistory];

            // Sort by started_at desc
            allIncidents.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

            setIncidents(allIncidents);
            setError(null);

        } catch (err: any) {
            console.error("Error fetching incidents:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    // Build timeline for a specific incident
    const getTimeline = useCallback(async (alertId: string, incident: EvidenceIncident): Promise<TimelineEvent[]> => {
        const events: TimelineEvent[] = [];

        // 1. Alert start
        events.push({
            id: `start-${alertId}`,
            type: 'alert_start',
            timestamp: incident.started_at,
            label: 'SOS Triggered',
            detail: incident.address_snapshot || `${incident.latitude?.toFixed(4)}, ${incident.longitude?.toFixed(4)}`,
        });

        // 2. Police responses
        const { data: responses } = await supabase
            .from('police_responses')
            .select('*')
            .eq('alert_id', alertId)
            .order('created_at', { ascending: true });

        if (responses) {
            for (const r of responses) {
                events.push({
                    id: r.id,
                    type: 'response',
                    timestamp: r.created_at,
                    label: r.action.replace('_', ' '),
                    detail: r.note,
                    meta: { action: r.action, officer_id: r.officer_id },
                });
            }
        }

        // 3. Audio evidence
        const { data: audioFiles } = await supabase
            .from('audio_evidence')
            .select('*')
            .eq('alert_id', alertId)
            .order('recorded_at', { ascending: true });

        if (audioFiles) {
            for (const a of audioFiles) {
                events.push({
                    id: a.id,
                    type: 'audio',
                    timestamp: a.recorded_at,
                    label: 'Audio Recording',
                    detail: a.duration,
                    meta: { storage_path: a.storage_path },
                });
            }
        }

        // 4. Alert resolved
        if (incident.resolved_at) {
            events.push({
                id: `resolve-${alertId}`,
                type: 'alert_resolve',
                timestamp: incident.resolved_at,
                label: 'Incident Resolved',
            });
        }

        // Sort by timestamp
        events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return events;
    }, []);

    // Get audio files for an incident
    const getAudioFiles = useCallback(async (alertId: string): Promise<AudioFile[]> => {
        console.log(`🔍 [DEBUG] Fetching audio for Alert ID: ${alertId}`);

        const { data, error } = await supabase
            .from('audio_evidence')
            .select('*')
            .eq('alert_id', alertId)
            .order('recorded_at', { ascending: true });

        if (error) {
            console.error("❌ [DEBUG] Error fetching audio_evidence:", error);
            return [];
        }

        console.log(`✅ [DEBUG] Found ${data?.length || 0} audio records for ${alertId}`, data);

        if (!data || data.length === 0) return [];

        // Get signed URLs for playback
        const filesWithUrls: AudioFile[] = [];
        for (const file of data) {
            console.log(`🔑 [DEBUG] Signing URL for: ${file.storage_path}`);
            const { data: urlData, error: signError } = await supabase.storage
                .from('audio-evidence')
                .createSignedUrl(file.storage_path, 3600); // 1-hour expiry

            if (signError) {
                console.error("❌ [DEBUG] URL Signing Error:", signError);
            }

            filesWithUrls.push({
                ...file,
                signedUrl: urlData?.signedUrl || undefined,
            });
        }

        return filesWithUrls;
    }, []);

    // Compute SHA-256 hash of a file from URL
    const computeHash = useCallback(async (url: string): Promise<string> => {
        try {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            return 'Hash computation failed';
        }
    }, []);

    // Get ALL audio files (Unfiltered / Safe Mode)
    const getAllAudioFiles = useCallback(async (): Promise<AudioFile[]> => {
        const { data } = await supabase
            .from('audio_evidence')
            .select('*')
            .order('recorded_at', { ascending: false });

        if (!data || data.length === 0) return [];

        const filesWithUrls: AudioFile[] = [];
        for (const file of data) {
            const { data: urlData } = await supabase.storage
                .from('audio-evidence')
                .createSignedUrl(file.storage_path, 3600);

            filesWithUrls.push({
                ...file,
                signedUrl: urlData?.signedUrl || undefined,
            });
        }
        return filesWithUrls;
    }, []);

    return { incidents, loading, error, fetchIncidents, getTimeline, getAudioFiles, getAllAudioFiles, computeHash };
}
