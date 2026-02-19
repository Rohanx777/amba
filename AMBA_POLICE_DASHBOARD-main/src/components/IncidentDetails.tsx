import { useState, useEffect } from 'react';
import type { Alert, PoliceResponse } from '../types';
import { usePoliceActions } from '../hooks/usePoliceActions';
import { useEvidence } from '../hooks/useEvidence';
import type { AudioFile } from '../hooks/useEvidence';
import {
    X, Battery, Phone, MapPin, AlertTriangle,
    CheckCircle, Loader2, Navigation, Wifi,
    Send, Truck, MapPinned, Shield, Clock,
    Mic
} from 'lucide-react';

interface IncidentDetailsProps {
    alert: Alert;
    onClose: () => void;
    onResolve: (alertId: string) => Promise<void>;
}

const ACTION_CONFIG = {
    DISPATCHED: { label: 'Dispatch Team', icon: Truck, color: 'bg-orange-600 hover:bg-orange-700', shadow: 'shadow-[0_0_15px_rgba(234,88,12,0.5)]' },
    EN_ROUTE: { label: 'Mark En Route', icon: Send, color: 'bg-blue-600 hover:bg-blue-700', shadow: 'shadow-[0_0_15px_rgba(37,99,235,0.5)]' },
    ON_SCENE: { label: 'Mark On Scene', icon: MapPinned, color: 'bg-purple-600 hover:bg-purple-700', shadow: 'shadow-[0_0_15px_rgba(147,51,234,0.5)]' },
    RESOLVED: { label: 'Mark Resolved', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700', shadow: 'shadow-[0_0_15px_rgba(22,163,74,0.5)]' },
} as const;

const TIMELINE_COLORS: Record<string, string> = {
    DISPATCHED: 'text-orange-400 border-orange-400',
    EN_ROUTE: 'text-blue-400 border-blue-400',
    ON_SCENE: 'text-purple-400 border-purple-400',
    RESOLVED: 'text-green-400 border-green-400',
};

const IncidentDetails: React.FC<IncidentDetailsProps> = ({ alert, onClose, onResolve }) => {
    const { respondToAlert, getResponses } = usePoliceActions();
    const { getAudioFiles } = useEvidence();

    const [responses, setResponses] = useState<PoliceResponse[]>([]);
    const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const displayName = alert.profiles?.full_name || alert.user_name || 'Unknown';
    const displayPhone = alert.profiles?.phone_number || alert.user_email || 'N/A';
    const avatarUrl = alert.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1e293b&color=f8fafc&bold=true`;
    const displayBattery = alert.battery != null && alert.battery >= 0 ? Math.round(alert.battery * 100) : null;
    const isActive = alert.status === 'ACTIVE';

    // Fetch data
    useEffect(() => {
        getResponses(alert.id).then(setResponses).catch(console.error);
        getAudioFiles(alert.id).then(setAudioFiles).catch(console.error);
    }, [alert.id, getResponses, getAudioFiles]);

    async function handleAction(action: 'DISPATCHED' | 'EN_ROUTE' | 'ON_SCENE' | 'RESOLVED') {
        setActionLoading(action);
        try {
            await respondToAlert(alert.id, action);
            if (action === 'RESOLVED') {
                await onResolve(alert.id);
            }
            // Refresh timeline
            const updated = await getResponses(alert.id);
            setResponses(updated);
        } catch (e) {
            console.error(`Failed to ${action}:`, e);
        }
        setActionLoading(null);
    }

    // Determine which actions are still available
    const lastAction = responses.length > 0 ? responses[responses.length - 1].action : null;
    const availableActions = isActive
        ? (['DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED'] as const).filter(a => {
            const order = ['DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED'];
            const lastIdx = lastAction ? order.indexOf(lastAction) : -1;
            return order.indexOf(a) > lastIdx;
        })
        : [];

    return (
        <div className="w-[420px] h-full bg-slate-900 border-l border-slate-800 text-white flex flex-col z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/95">
                <h2 className="text-lg font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Incident Details
                </h2>
                <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isActive
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-green-500/10 border-green-500/20 text-green-400'
                    }`}>
                    {isActive ? (
                        <>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                            </span>
                            <span className="font-bold text-sm uppercase">Active SOS</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-bold text-sm uppercase">Resolved</span>
                        </>
                    )}
                </div>

                {/* Victim Profile */}
                <div className="flex items-center gap-4">
                    <img src={avatarUrl} alt={displayName} className="w-14 h-14 rounded-full border-2 border-slate-700 object-cover" />
                    <div>
                        <h3 className="text-lg font-bold">{displayName}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3.5 h-3.5" /> {displayPhone}
                        </p>
                    </div>
                </div>

                {/* Live Status Grid */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 flex flex-col items-center gap-1">
                        <Battery className={`w-5 h-5 ${displayBattery != null && displayBattery < 20 ? 'text-red-500' : 'text-green-500'}`} />
                        <span className="text-lg font-bold">{displayBattery != null ? `${displayBattery}%` : '—'}</span>
                        <span className="text-[10px] text-slate-500 uppercase">Battery</span>
                    </div>
                    <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 flex flex-col items-center gap-1">
                        <Navigation className="w-5 h-5 text-blue-500" />
                        <span className="text-lg font-bold">{alert.speed != null ? `${alert.speed.toFixed(0)}` : '—'}</span>
                        <span className="text-[10px] text-slate-500 uppercase">Speed m/s</span>
                    </div>
                    <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 flex flex-col items-center gap-1">
                        <Wifi className="w-5 h-5 text-blue-500" />
                        <span className="text-lg font-bold">Live</span>
                        <span className="text-[10px] text-slate-500 uppercase">Tracking</span>
                    </div>
                </div>

                {/* Location */}
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> Location
                    </h4>
                    <p className="text-sm font-medium">{alert.address_snapshot || 'Address not available'}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                        {alert.latitude?.toFixed(6)}, {alert.longitude?.toFixed(6)}
                    </p>
                </div>

                {/* AUDIO EVIDENCE SECTION */}
                {audioFiles.length > 0 && (
                    <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                        <h4 className="text-[10px] text-red-400 uppercase font-bold mb-3 flex items-center gap-1.5">
                            <Mic className="w-3 h-3" /> Audio Evidence
                        </h4>
                        <div className="space-y-2">
                            {audioFiles.map((file) => (
                                <div key={file.id} className="flex items-center justify-between bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                                            <Mic className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">
                                                {file.duration || 'Unknown Duration'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(file.recorded_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    {file.signedUrl ? (
                                        <audio controls src={file.signedUrl} className="h-8 w-24" />
                                    ) : (
                                        <span className="text-xs text-red-500">Link Expired</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Response Timeline */}
                {responses.length > 0 && (
                    <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                        <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center gap-1.5">
                            <Shield className="w-3 h-3" /> Response Timeline
                        </h4>
                        <div className="space-y-3">
                            {responses.map((r, i) => (
                                <div key={r.id} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-3 h-3 rounded-full border-2 ${TIMELINE_COLORS[r.action] || 'text-slate-400 border-slate-400'}`} />
                                        {i < responses.length - 1 && <div className="w-0.5 flex-1 bg-slate-700 mt-1" />}
                                    </div>
                                    <div className="pb-2">
                                        <p className={`text-sm font-semibold ${TIMELINE_COLORS[r.action]?.split(' ')[0] || 'text-slate-300'}`}>
                                            {r.action.replace('_', ' ')}
                                        </p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </p>
                                        {r.note && <p className="text-xs text-slate-400 mt-1">{r.note}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {availableActions.length > 0 && (
                    <div className="space-y-2 pt-2">
                        {availableActions.map(action => {
                            const config = ACTION_CONFIG[action];
                            const Icon = config.icon;
                            const isLoading = actionLoading === action;
                            return (
                                <button
                                    key={action}
                                    onClick={() => handleAction(action)}
                                    disabled={!!actionLoading}
                                    className={`w-full py-2.5 ${config.color} ${config.shadow} disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg uppercase tracking-wide transition-all text-sm flex items-center justify-center gap-2`}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Icon className="w-4 h-4" />
                                    )}
                                    {isLoading ? 'Processing...' : config.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Resolved State */}
                {!isActive && alert.resolved_at && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm text-green-400 font-semibold">Resolved</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(alert.resolved_at).toLocaleString()}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IncidentDetails;
