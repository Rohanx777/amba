import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { Alert, Volunteer } from '../types';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { supabase } from '../lib/supabase';
import MapLayers from './MapLayers';
import { Users, Zap } from 'lucide-react';

// Fix for default marker icon in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Pulsing red beacon for ACTIVE SOS
const pulsingIcon = L.divIcon({
    className: 'pulse-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Green resolved marker
const resolvedIcon = L.divIcon({
    className: 'resolved-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
    alerts: Alert[];
    selectedAlert: Alert | null;
}

// Auto-fly to selected alert
const MapController: React.FC<{ selectedAlert: Alert | null; alerts: Alert[] }> = ({ selectedAlert, alerts }) => {
    const map = useMap();
    const prevAlertCount = useRef(alerts.length);

    // Fly to selected alert
    useEffect(() => {
        if (selectedAlert?.latitude && selectedAlert?.longitude) {
            map.flyTo([selectedAlert.latitude, selectedAlert.longitude], 16, {
                duration: 1.5
            });
        }
    }, [selectedAlert, map]);

    // Auto-fly to latest new alert when count increases
    useEffect(() => {
        if (alerts.length > prevAlertCount.current) {
            const newest = alerts.find(a => a.status === 'ACTIVE');
            if (newest?.latitude && newest?.longitude) {
                map.flyTo([newest.latitude, newest.longitude], 15, {
                    duration: 2
                });
            }
        }
        prevAlertCount.current = alerts.length;
    }, [alerts, map]);

    return null;
};

const Map: React.FC<MapProps> = ({ alerts, selectedAlert }) => {
    const defaultCenter: [number, number] = [28.6139, 77.2090]; // Delhi
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [showVolunteers, setShowVolunteers] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);

    // Fetch volunteers on mount
    useEffect(() => {
        supabase.from('volunteers').select('*').then(({ data }) => {
            if (data) setVolunteers(data as Volunteer[]);
        });
    }, []);

    return (
        <div className="flex-1 h-full bg-slate-900 relative z-0">
            {/* Live indicator */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-slate-400 font-medium">LIVE</span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-500">
                        {alerts.filter(a => a.status === 'ACTIVE').length} active
                    </span>
                </div>

                {/* Layer Toggles */}
                <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-1 flex flex-col gap-1">
                    <button
                        onClick={() => setShowVolunteers(!showVolunteers)}
                        className={`p-2 rounded hover:bg-slate-800 transition-colors flex items-center gap-2 ${showVolunteers ? 'text-green-400 bg-slate-800' : 'text-slate-400'}`}
                        title="Toggle Volunteers"
                    >
                        <Users size={16} />
                    </button>
                    <button
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`p-2 rounded hover:bg-slate-800 transition-colors flex items-center gap-2 ${showHeatmap ? 'text-orange-400 bg-slate-800' : 'text-slate-400'}`}
                        title="Toggle Heatmap"
                    >
                        <Zap size={16} />
                    </button>
                </div>
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapLayers
                    volunteers={volunteers}
                    showVolunteers={showVolunteers}
                    showHeatmap={showHeatmap}
                />

                {alerts
                    .filter(a => a.latitude != null && a.longitude != null)
                    .map(alert => (
                        <Marker
                            key={alert.id}
                            position={[alert.latitude!, alert.longitude!]}
                            icon={alert.status === 'ACTIVE' ? pulsingIcon : resolvedIcon}
                        >
                            <Popup>
                                <div className="min-w-[180px]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`inline-block w-2 h-2 rounded-full ${alert.status === 'ACTIVE' ? 'bg-red-500' : 'bg-green-500'
                                            }`}></span>
                                        <span className="font-bold text-sm">
                                            {alert.profiles?.full_name || alert.user_name || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="text-slate-400 text-xs mb-1">
                                        {alert.status === 'ACTIVE' ? '🚨 SOS ACTIVE' : '✅ Resolved'}
                                    </div>
                                    {alert.address_snapshot && (
                                        <div className="text-slate-500 text-xs">
                                            📍 {alert.address_snapshot}
                                        </div>
                                    )}
                                    {alert.battery != null && alert.battery >= 0 && (
                                        <div className="text-slate-500 text-xs mt-1">
                                            🔋 {Math.round(alert.battery * 100)}%
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                <MapController selectedAlert={selectedAlert} alerts={alerts} />
            </MapContainer>
        </div>
    );
};

export default Map;
