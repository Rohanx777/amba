import { Circle, Marker, Tooltip } from 'react-leaflet';
import * as L from 'leaflet';
import type { Volunteer } from '../types';

// Custom Icons
const volunteerIcon = L.divIcon({
    className: 'volunteer-icon',
    html: `<div class="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-md"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
});

const busyVolunteerIcon = L.divIcon({
    className: 'volunteer-busy-icon',
    html: `<div class="w-3 h-3 bg-yellow-500 rounded-full border-2 border-white shadow-md"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
});

interface MapLayersProps {
    volunteers: Volunteer[];
    showVolunteers: boolean;
    showHeatmap: boolean;
}

export default function MapLayers({ volunteers, showVolunteers, showHeatmap }: MapLayersProps) {
    return (
        <>
            {/* VOLUNTEER LAYER */}
            {showVolunteers && volunteers.map(vol => (
                <Marker
                    key={vol.id}
                    position={[vol.latitude, vol.longitude]}
                    icon={vol.status === 'AVAILABLE' ? volunteerIcon : busyVolunteerIcon}
                >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                        <div className="text-xs font-bold">{vol.full_name}</div>
                        <div className="text-[10px] text-slate-500">{vol.status}</div>
                    </Tooltip>
                </Marker>
            ))}

            {/* HEATMAP LAYER (Simulated clusters) */}
            {showHeatmap && (
                <>
                    {/* Delhi High Risk Zones */}
                    <Circle
                        center={[28.6139, 77.2090] as [number, number]}
                        radius={1200}
                        pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2, weight: 0 }}
                    />
                    <Circle
                        center={[28.6500, 77.2300] as [number, number]}
                        radius={800}
                        pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.3, weight: 0 }}
                    />
                    <Circle
                        center={[28.5500, 77.2500] as [number, number]}
                        radius={1500}
                        pathOptions={{ color: 'red', fillColor: '#ef4444', fillOpacity: 0.15, weight: 0 }}
                    />
                </>
            )}
        </>
    );
}
