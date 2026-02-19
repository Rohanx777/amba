import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEvidence, type TimelineEvent, type AudioFile } from '../hooks/useEvidence';
import AudioPlayer from '../components/AudioPlayer';
import {
    ArrowLeft, Shield, Clock, MapPin, User,
    AlertTriangle, CheckCircle, Truck, Send, MapPinned,
    Mic, Radio, Loader2, FileText
} from 'lucide-react';

// Timeline icon + color config
const TIMELINE_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
    alert_start: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
    DISPATCHED: { icon: Truck, color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
    EN_ROUTE: { icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
    ON_SCENE: { icon: MapPinned, color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
    RESOLVED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
    audio: { icon: Mic, color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
    alert_resolve: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
};

function getTimelineConfig(event: TimelineEvent) {
    if (event.type === 'response' && event.meta?.action) {
        return TIMELINE_CONFIG[event.meta.action] || TIMELINE_CONFIG.alert_start;
    }
    return TIMELINE_CONFIG[event.type] || TIMELINE_CONFIG.alert_start;
}

export default function EvidenceVault() {
    const { incidents, loading, getTimeline, getAudioFiles, computeHash } = useEvidence();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

    const selectedIncident = incidents.find(i => i.id === selectedId) || null;

    const filteredIncidents = filterStatus === 'ALL'
        ? incidents
        : incidents.filter(i => i.status === filterStatus);

    // Select first incident on load
    useEffect(() => {
        if (incidents.length > 0 && !selectedId) {
            setSelectedId(incidents[0].id);
        }
    }, [incidents, selectedId]);

    // Fetch Timeline AND Audio Evidence when an incident is selected
    useEffect(() => {
        if (selectedId) {
            const incident = incidents.find(i => i.id === selectedId);
            if (incident) {
                setTimelineLoading(true);
                // Fetch Timeline
                getTimeline(selectedId, incident).then(tl => {
                    setTimeline(tl);
                    setTimelineLoading(false);
                });

                // Fetch Audio Evidence
                getAudioFiles(selectedId).then(files => {
                    console.log("Audio files fetched for evidence vault:", files);
                    setAudioFiles(files);
                });
            }
        }
    }, [selectedId, incidents, getTimeline, getAudioFiles]);

    function formatDuration(start: string, end: string | null): string {
        if (!end) return 'Ongoing';
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    }

    return (
        <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
            {/* Left Panel — Incident List */}
            <div className="w-[380px] h-full bg-slate-900 border-r border-slate-800 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/95">
                    <div className="flex items-center gap-3 mb-3">
                        <Link to="/" className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-red-500" />
                            <h1 className="text-lg font-bold tracking-tight">Evidence Vault</h1>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
                        {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterStatus(f)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${filterStatus === f
                                    ? 'bg-slate-700 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Incident List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                        </div>
                    ) : filteredIncidents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                            <FileText className="w-10 h-10 mb-2 opacity-30" />
                            <p className="text-sm">No incidents found</p>
                        </div>
                    ) : (
                        filteredIncidents.map(inc => {
                            const isSelected = selectedId === inc.id;
                            return (
                                <div
                                    key={inc.id}
                                    onClick={() => setSelectedId(inc.id)}
                                    className={`p-4 border-b border-slate-800 cursor-pointer transition-all ${isSelected
                                        ? 'bg-slate-800 border-l-4 border-l-red-500'
                                        : 'hover:bg-slate-800/50 border-l-4 border-l-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="font-semibold text-sm">{inc.user_name || 'Unknown'}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${inc.status === 'ACTIVE'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                            : 'bg-green-500/10 text-green-400 border-green-500/20'
                                            }`}>
                                            {inc.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(inc.started_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Radio className="w-3 h-3" />
                                            <span>{formatDuration(inc.started_at, inc.resolved_at)}</span>
                                        </div>
                                    </div>

                                    {inc.address_snapshot && (
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 truncate">
                                            <MapPin className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{inc.address_snapshot}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3 border-t border-slate-800 text-xs text-center text-slate-600">
                    {incidents.length} total incidents
                </div>
            </div>

            {/* Right Panel — Timeline + Evidence */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-slate-950">
                {!selectedIncident ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <Shield className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select an incident</p>
                        <p className="text-sm text-slate-600 mt-1">View timeline, evidence, and recordings</p>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto p-6">
                        {/* Incident Header */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-3 h-3 rounded-full ${selectedIncident.status === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                                    }`}></div>
                                <h2 className="text-2xl font-bold">{selectedIncident.user_name || 'Unknown'}</h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedIncident.status === 'ACTIVE'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-green-500/10 text-green-400 border-green-500/20'
                                    }`}>
                                    {selectedIncident.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-4">
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Started</div>
                                    <div className="text-sm font-medium">{new Date(selectedIncident.started_at).toLocaleString()}</div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Duration</div>
                                    <div className="text-sm font-medium">{formatDuration(selectedIncident.started_at, selectedIncident.resolved_at)}</div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Location</div>
                                    <div className="text-sm font-medium truncate">{selectedIncident.address_snapshot || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Incident Timeline
                            </h3>

                            {timelineLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                                </div>
                            ) : (
                                <div className="space-y-0">
                                    {timeline.map((event, i) => {
                                        const config = getTimelineConfig(event);
                                        const Icon = config.icon;
                                        const isLast = i === timeline.length - 1;

                                        return (
                                            <div key={event.id} className="flex gap-4">
                                                {/* Timeline line + dot */}
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full border-2 ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                                        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                                    </div>
                                                    {!isLast && <div className="w-0.5 flex-1 bg-slate-700 min-h-[24px]" />}
                                                </div>

                                                {/* Content */}
                                                <div className={`pb-4 ${isLast ? '' : 'mb-0'}`}>
                                                    <p className={`text-sm font-semibold ${config.color}`}>{event.label}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </p>
                                                    {event.detail && (
                                                        <p className="text-xs text-slate-400 mt-1">{event.detail}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Audio Evidence */}
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Mic className="w-4 h-4" />
                            Audio Evidence ({audioFiles.length})
                        </h3>

                        {audioFiles.length === 0 ? (
                            <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700/50 text-center">
                                <Mic className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">No audio evidence for this incident</p>
                                <p className="text-xs text-slate-600 mt-1">Audio recordings from the mobile app will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {audioFiles.map(file => (
                                    <div key={file.id} className="space-y-2">
                                        <AudioPlayer file={file} onComputeHash={computeHash} />
                                        <BlockchainVerificationBadge fileId={file.id} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Evidence ID / Polygon Status */}
                        <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between items-center">
                            <p className="text-[10px] text-slate-600 font-mono">
                                Evidence ID: {selectedIncident.id}
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                <span className="text-[10px] font-bold text-purple-400">Polygon Network Secured</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sub-component for individual file verification
import { usePolygon } from '../hooks/usePolygon';
import { Database, Check } from 'lucide-react';

function BlockchainVerificationBadge({ fileId }: { fileId: string }) {
    const { verifyHashOnChain, verifying, result } = usePolygon();

    if (result?.verified) {
        return (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-500 p-1.5 rounded-md">
                        <Database className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-purple-200">Verified on Polygon PoS</div>
                        <div className="text-[10px] text-purple-400 font-mono">Tx: {result.txHash?.substring(0, 16)}...</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-purple-400">Block #{result.blockNumber}</div>
                    <Check className="w-4 h-4 text-purple-400 ml-auto" />
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => verifyHashOnChain(fileId)}
            disabled={verifying}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
            {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
            {verifying ? 'Verifying on Chain...' : 'Verify Authenticity on Polygon'}
        </button>
    );
}
