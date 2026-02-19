import { Link } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import {
    ArrowLeft, BarChart2, TrendingUp, AlertTriangle, MessageSquare, Clock, Shield
} from 'lucide-react';

export default function AnalyticsDashboard() {
    const { stats, loading, error } = useAnalytics();

    if (loading) return <div className="flex h-screen w-screen bg-slate-950 items-center justify-center text-slate-500">Loading Analytics...</div>;
    if (error) return <div className="flex h-screen w-screen bg-slate-950 items-center justify-center text-red-500">Error: {error}</div>;
    if (!stats) return null;

    return (
        <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
            {/* Sidebar / Nav */}
            <div className="w-[80px] bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6">
                <Link to="/" className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                    <BarChart2 className="w-6 h-6" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Command Analytics</h1>
                    <p className="text-slate-400">Real-time insights and predictive analysis for AMBA response units.</p>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Incidents"
                        value={stats.totalIncidents}
                        icon={AlertTriangle}
                        color="text-red-500"
                        bg="bg-red-500/10"
                        trend="+12% this week"
                    />
                    <StatCard
                        title="Avg Response Time"
                        value={stats.avgResponseTime}
                        icon={Clock}
                        color="text-blue-400"
                        bg="bg-blue-500/10"
                        trend="-30s improvement"
                    />
                    <StatCard
                        title="Anonymous Reports"
                        value={stats.totalReports}
                        icon={MessageSquare}
                        color="text-yellow-400"
                        bg="bg-yellow-500/10"
                        trend="5 new today"
                    />
                    <StatCard
                        title="Clearance Rate"
                        value={`${Math.round((stats.resolvedIncidents / (stats.totalIncidents || 1)) * 100)}%`}
                        icon={Shield}
                        color="text-green-400"
                        bg="bg-green-500/10"
                        trend="+5% vs last month"
                    />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Main Trend Chart */}
                    <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            Incident Volume Trends
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.incidentsByDay}>
                                    <defs>
                                        <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorRep" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                        labelStyle={{ color: '#94a3b8' }}
                                    />
                                    <Area type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" name="SOS Incidents" />
                                    <Area type="monotone" dataKey="reports" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRep)" name="Reports" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Breakdown Chart */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-6">Incident Mix</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.incidentsByType}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.incidentsByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                                    <Legend iconType="circle" wrapperStyle={{ bottom: 0, fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Heatmap Section */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4">Crime Density Heatmap</h3>
                    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-800 relative z-0">
                        <MapContainer
                            center={[28.4595, 77.0266]} // Gurgaon center
                            zoom={12}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                            {stats.hotspots.map((point, index) => (
                                <CircleMarker
                                    key={index}
                                    center={[point.lat, point.lng]}
                                    radius={20 * point.intensity}
                                    fillColor={point.intensity > 0.8 ? '#ef4444' : '#eab308'} // Red for high intensity, yellow for lower
                                    color="transparent"
                                    fillOpacity={0.6}
                                >
                                    <Popup className="custom-popup">
                                        <div className="p-2">
                                            <p className="font-bold text-slate-800">High Activity Zone</p>
                                            <div className="text-xs text-slate-600">Intensity: {(point.intensity * 100).toFixed(0)}%</div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg, trend }: any) {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
                    <h2 className="text-3xl font-bold tracking-tight">{value}</h2>
                </div>
                <div className={`p-3 rounded-xl ${bg}`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
                <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">{trend}</span>
                <span className="text-slate-500">vs previous period</span>
            </div>
        </div>
    );
}
