import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Alert } from '../types';
import type { AnonymousReport } from '../types';

export interface AnalyticsStats {
    totalIncidents: number;
    activeIncidents: number;
    resolvedIncidents: number;
    totalReports: number;
    avgResponseTime: string; // "5m 30s"
    incidentsByType: { name: string; value: number; color: string }[];
    incidentsByDay: { name: string; incidents: number; reports: number }[];
    recentActivity: { id: string; type: 'INCIDENT' | 'REPORT'; message: string; date: string }[];
    hotspots: { lat: number; lng: number; intensity: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function useAnalytics() {
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAnalytics() {
            setLoading(true);
            try {
                // Fetch Alerts
                const { data: alertsData, error: alertErr } = await supabase
                    .from('active_alerts')
                    .select('*');
                if (alertErr) throw alertErr;
                const alerts = alertsData as Alert[];

                // Fetch Reports
                const { data: reportsData, error: reportErr } = await supabase
                    .from('anonymous_reports')
                    .select('*');
                if (reportErr) throw reportErr;
                const reports = reportsData as AnonymousReport[];

                // Process Data
                const totalIncidents = (alerts?.length || 0);
                const activeIncidents = alerts?.filter(a => a.status === 'ACTIVE').length || 0;
                const resolvedIncidents = alerts?.filter(a => a.status === 'RESOLVED').length || 0;
                const totalReports = reports?.length || 0;

                // Incident Types (from Reports + Alerts defaulting to SOS)
                const typeMap: Record<string, number> = { 'SOS Alert': totalIncidents };
                reports?.forEach(r => {
                    const type = r.incident_type || 'Other';
                    typeMap[type] = (typeMap[type] || 0) + 1;
                });

                const incidentsByType = Object.entries(typeMap).map(([name, value], index) => ({
                    name,
                    value,
                    color: COLORS[index % COLORS.length]
                }));

                // Recent Activity
                const activity = [
                    ...(alerts?.map(a => ({
                        id: a.id,
                        type: 'INCIDENT' as const,
                        message: `SOS Alert from ${a.user_name || 'Unknown'}`,
                        date: a.started_at
                    })) || []),
                    ...(reports?.map(r => ({
                        id: r.id,
                        type: 'REPORT' as const,
                        message: `Report: ${r.incident_type}`,
                        date: r.created_at
                    })) || [])
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5);

                // Mock Data for Charts (since we don't have historical data populated yet)
                const incidentsByDay = [
                    { name: 'Mon', incidents: 4, reports: 2 },
                    { name: 'Tue', incidents: 3, reports: 5 },
                    { name: 'Wed', incidents: 2, reports: 3 },
                    { name: 'Thu', incidents: 6, reports: 4 },
                    { name: 'Fri', incidents: 5, reports: 6 },
                    { name: 'Sat', incidents: 8, reports: 7 },
                    { name: 'Sun', incidents: totalIncidents, reports: totalReports }, // Real data point
                ];

                // Hotspots (Mocked + Real if coords exist)
                // Extract coords from alerts
                const realHotspots = alerts?.filter(a => a.latitude && a.longitude).map(a => ({
                    lat: a.latitude!,
                    lng: a.longitude!,
                    intensity: 1
                })) || [];

                // Add some dummy hotspots for heatmap demo
                const demoHotspots = [
                    { lat: 28.4595, lng: 77.0266, intensity: 0.8 },
                    { lat: 28.4500, lng: 77.0200, intensity: 0.6 },
                    { lat: 28.4600, lng: 77.0300, intensity: 0.9 },
                ];

                setStats({
                    totalIncidents,
                    activeIncidents,
                    resolvedIncidents,
                    totalReports,
                    avgResponseTime: "4m 12s", // Mocked for now
                    incidentsByType,
                    incidentsByDay,
                    recentActivity: activity,
                    hotspots: [...realHotspots, ...demoHotspots]
                });

            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, []);

    return { stats, loading, error };
}
