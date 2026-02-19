import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnonymousReports } from '../hooks/useAnonymousReports';
import type { AnonymousReport } from '../types';
import {
    ArrowLeft, Mail, Clock, MapPin,
    Printer, MessageSquare
} from 'lucide-react';

const STATUS_COLORS = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    REVIEWED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    ACTIONED: 'bg-green-500/10 text-green-500 border-green-500/20',
    DISMISSED: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

const PRIORITY_COLORS = {
    LOW: 'text-slate-400',
    MEDIUM: 'text-yellow-400',
    HIGH: 'text-orange-400',
    CRITICAL: 'text-red-500 font-bold',
};

export default function AnonymousInbox() {
    const { reports, loading, updateStatus } = useAnonymousReports();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PROCESSED'>('ALL');

    const selectedReport = reports.find(r => r.id === selectedId) || null;

    const filteredReports = reports.filter(r => {
        if (filterStatus === 'ALL') return true;
        if (filterStatus === 'PENDING') return r.status === 'PENDING';
        if (filterStatus === 'PROCESSED') return r.status !== 'PENDING';
        return true;
    });

    async function handleStatusChange(status: AnonymousReport['status']) {
        if (!selectedReport) return;
        try {
            await updateStatus(selectedReport.id, status);
        } catch (e) {
            console.error('Failed to update status', e);
        }
    }

    function handlePrint() {
        window.print();
    }

    return (
        <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
            {/* Left Panel — Report List */}
            <div className="w-[380px] h-full bg-slate-900 border-r border-slate-800 flex flex-col no-print">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/95">
                    <div className="flex items-center gap-3 mb-3">
                        <Link to="/" className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-500" />
                            <h1 className="text-lg font-bold tracking-tight">Anonymous Reporting</h1>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
                        {(['ALL', 'PENDING', 'PROCESSED'] as const).map(f => (
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

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500 text-sm">Loading reports...</div>
                    ) : filteredReports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                            <Mail className="w-10 h-10 mb-2 opacity-30" />
                            <p className="text-sm">No reports found</p>
                        </div>
                    ) : (
                        filteredReports.map(report => {
                            const isSelected = selectedId === report.id;
                            return (
                                <div
                                    key={report.id}
                                    onClick={() => setSelectedId(report.id)}
                                    className={`p-4 border-b border-slate-800 cursor-pointer transition-all ${isSelected
                                        ? 'bg-slate-800 border-l-4 border-l-blue-500'
                                        : 'hover:bg-slate-800/50 border-l-4 border-l-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1.5">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${PRIORITY_COLORS[report.priority]}`}>
                                            {report.priority} Priority
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[report.status]}`}>
                                            {report.status}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-semibold text-slate-200 mb-1 line-clamp-1">
                                        {report.incident_type || 'General Report'}
                                    </h3>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                                        {report.content}
                                    </p>

                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                                        {report.location && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                <span className="truncate max-w-[120px]">{report.location}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Panel — Detail View */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-slate-950 p-8 print:p-0 print:bg-white print:text-black">
                {!selectedReport ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 no-print">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select a report</p>
                        <p className="text-sm text-slate-600 mt-1">Review anonymous tips and generate FIRs</p>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto">
                        {/* Action Bar (No Print) */}
                        <div className="flex items-center justify-between mb-8 no-print">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleStatusChange('REVIEWED')}
                                    disabled={selectedReport.status === 'REVIEWED'}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-blue-400 border border-slate-700 transition-colors disabled:opacity-50"
                                >
                                    Mark Reviewed
                                </button>
                                <button
                                    onClick={() => handleStatusChange('ACTIONED')}
                                    disabled={selectedReport.status === 'ACTIONED'}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-green-400 border border-slate-700 transition-colors disabled:opacity-50"
                                >
                                    Take Action
                                </button>
                                <button
                                    onClick={() => handleStatusChange('DISMISSED')}
                                    disabled={selectedReport.status === 'DISMISSED'}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400 border border-slate-700 transition-colors disabled:opacity-50"
                                >
                                    Dismiss
                                </button>
                            </div>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white transition-colors"
                            >
                                <Printer className="w-4 h-4" />
                                Generate FIR / Print
                            </button>
                        </div>

                        {/* Report Content */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 print:border-0 print:bg-white print:p-0">
                            {/* FIR Header format for print */}
                            <div className="hidden print:block mb-8 text-center border-b pb-4">
                                <h1 className="text-2xl font-bold uppercase">First Information Report</h1>
                                <p className="text-sm text-gray-500">AMBA POLICE REPORTING SYSTEM</p>
                            </div>

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border print:border-black print:text-black ${STATUS_COLORS[selectedReport.status]}`}>
                                            {selectedReport.status}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider print:border-black print:text-black ${PRIORITY_COLORS[selectedReport.priority]}`}>
                                            {selectedReport.priority} Priority
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white print:text-black mb-1">
                                        {selectedReport.incident_type}
                                    </h2>
                                    <p className="text-sm text-slate-500 print:text-gray-600">
                                        Report ID: <span className="font-mono">{selectedReport.id}</span>
                                    </p>
                                </div>
                                <div className="text-right text-sm text-slate-400 print:text-gray-600">
                                    <div className="flex items-center justify-end gap-1.5 mb-1">
                                        <Clock className="w-4 h-4" />
                                        {new Date(selectedReport.created_at).toLocaleString()}
                                    </div>
                                    {selectedReport.location && (
                                        <div className="flex items-center justify-end gap-1.5">
                                            <MapPin className="w-4 h-4" />
                                            {selectedReport.location}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="prose prose-invert print:prose-black max-w-none">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap print:text-black">
                                    {selectedReport.content}
                                </p>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-800 print:border-gray-300">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Internal Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500 block mb-1">Source</span>
                                        <span className="font-mono print:text-black">{selectedReport.source}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block mb-1">Last Updated</span>
                                        <span className="print:text-black">{new Date(selectedReport.updated_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Print Footer */}
                            <div className="hidden print:block mt-12 pt-8 border-t border-gray-300">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <p>Generated by AMBA Police Dashboard</p>
                                    <p>Page 1 of 1</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
