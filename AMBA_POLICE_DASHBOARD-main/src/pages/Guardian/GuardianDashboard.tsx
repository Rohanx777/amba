import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Battery, Zap, MapPin, Navigation, Signal, LogOut } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

// This would ideally come from env, but for scaffolding we'll put a placeholder or rely on user env
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

export default function GuardianDashboard() {
    const { signOut } = useAuth();
    const [telemetry, setTelemetry] = useState<any>(null);
    const [targetId, setTargetId] = useState<string>(''); // In a real app, this would be selected from a list of children

    // Temporary: Just track the logged-in user if they are also the "child" for testing, 
    // OR we need a way to link Parent -> Child. 
    // For the MVP migration, we will assume the user enters a Target ID manually or selects from a list.

    // Realtime Subscription
    useEffect(() => {
        if (!targetId) return;

        // 1. Initial Fetch
        const fetchInitial = async () => {
            const { data } = await supabase
                .from('active_alerts')
                .select('*')
                .eq('user_id', targetId)
                .eq('status', 'ACTIVE') // Only active alerts? Or also just last known location?
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) setTelemetry(data);
        };

        fetchInitial();

        // 2. Realtime
        const channel = supabase
            .channel(`guardian-${targetId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_alerts', filter: `user_id=eq.${targetId}` }, (payload) => {
                setTelemetry(payload.new);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [targetId]);


    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-500/10 p-2 rounded-lg">
                        <Signal className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="font-bold tracking-tight">GUARDIAN<span className="text-cyan-400">CENTER</span></h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Live Telemetry Uplink</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Enter Target ID"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-cyan-500 outline-none w-48"
                    />
                    <button onClick={signOut} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 relative">
                {/* Map */}
                <div className="absolute inset-0 bg-slate-900 z-0">
                    <APIProvider apiKey={GOOGLE_MAPS_KEY}>
                        <Map
                            mapId={'bf51a910020fa25a'} // Dark Mode Map ID
                            defaultCenter={{ lat: 28.6139, lng: 77.2090 }}
                            defaultZoom={12}
                            gestureHandling={'greedy'}
                            disableDefaultUI={true}
                            styles={[
                                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                                { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                                { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                                { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
                            ]}
                        >
                            {telemetry && (
                                <AdvancedMarker position={{ lat: telemetry.latitude, lng: telemetry.longitude }}>
                                    <div className="relative">
                                        <div className="absolute -inset-4 bg-red-500/30 rounded-full animate-ping"></div>
                                        <div className="relative z-10 bg-red-500 border-2 border-white w-4 h-4 rounded-full shadow-lg"></div>
                                    </div>
                                </AdvancedMarker>
                            )}
                        </Map>
                    </APIProvider>
                </div>

                {/* HUD Overlay */}
                {telemetry && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-10">
                        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                    <span className="text-green-400 font-bold text-xs tracking-widest uppercase">Live Signal Active</span>
                                </div>
                                <span className="text-slate-500 text-xs font-mono">
                                    LAST UPDATED: {new Date(telemetry.last_updated).toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-8">
                                {/* Battery */}
                                <div className="flex flex-col items-center">
                                    <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Battery className="w-3 h-3" /> Power
                                    </div>
                                    <div className="text-2xl font-black text-white">
                                        {Math.round(telemetry.battery * 100)}<span className="text-sm text-slate-500 ml-0.5">%</span>
                                    </div>
                                </div>

                                {/* Speed */}
                                <div className="flex flex-col items-center border-x border-slate-800">
                                    <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Velocity
                                    </div>
                                    <div className="text-2xl font-black text-white">
                                        {Math.round(telemetry.speed * 3.6)}<span className="text-sm text-slate-500 ml-0.5">km/h</span>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="flex flex-col items-center">
                                    <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Coords
                                    </div>
                                    <div className="text-xs font-mono text-slate-300 text-center">
                                        {telemetry.latitude.toFixed(4)}<br />{telemetry.longitude.toFixed(4)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                                <div className="text-sm text-slate-300 truncate max-w-[200px]">
                                    {telemetry.address_snapshot || 'Unknown Location'}
                                </div>
                                <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                                    <Navigation className="w-3 h-3" />
                                    NAVIGATE
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
