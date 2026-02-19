import { useState, useRef, useEffect } from 'react';
import type { AudioFile } from '../hooks/useEvidence';
import { Play, Pause, Volume2, Download, Shield, ShieldCheck, Loader2 } from 'lucide-react';

interface AudioPlayerProps {
    file: AudioFile;
    onComputeHash?: (url: string) => Promise<string>;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ file, onComputeHash }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [hash, setHash] = useState<string | null>(null);
    const [hashLoading, setHashLoading] = useState(false);

    useEffect(() => {
        setIsPlaying(false);
        setProgress(0);
        setHash(null);
    }, [file.id]);

    function togglePlay() {
        if (!audioRef.current || !file.signedUrl) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }

    function handleTimeUpdate() {
        if (!audioRef.current) return;
        setProgress(audioRef.current.currentTime);
    }

    function handleLoadedMetadata() {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    }

    function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
        if (!audioRef.current) return;
        const time = parseFloat(e.target.value);
        audioRef.current.currentTime = time;
        setProgress(time);
    }

    async function verifyIntegrity() {
        if (!file.signedUrl || !onComputeHash) return;
        setHashLoading(true);
        const computed = await onComputeHash(file.signedUrl);
        setHash(computed);
        setHashLoading(false);
    }

    function formatTime(secs: number): string {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    if (!file.signedUrl) {
        return (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 text-slate-500 text-sm">
                Audio file unavailable — storage URL could not be generated.
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <audio
                ref={audioRef}
                src={file.signedUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />

            {/* Player Controls */}
            <div className="flex items-center gap-3">
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg shadow-red-500/20"
                >
                    {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </button>

                <div className="flex-1">
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={progress}
                        onChange={handleSeek}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <Volume2 className="w-4 h-4 text-slate-500" />
            </div>

            {/* File Info + Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                <div className="text-xs text-slate-400">
                    <span className="text-slate-500">Duration:</span> {file.duration || 'Unknown'}
                    <span className="mx-2 text-slate-600">•</span>
                    <span className="text-slate-500">Recorded:</span> {new Date(file.recorded_at).toLocaleString()}
                </div>

                <div className="flex items-center gap-2">
                    {/* Download */}
                    <a
                        href={file.signedUrl}
                        download
                        className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Download Evidence"
                    >
                        <Download className="w-4 h-4" />
                    </a>

                    {/* Verify Integrity */}
                    <button
                        onClick={verifyIntegrity}
                        disabled={hashLoading}
                        className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-green-400 transition-colors"
                        title="Verify SHA-256 Integrity"
                    >
                        {hashLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : hash ? (
                            <ShieldCheck className="w-4 h-4 text-green-400" />
                        ) : (
                            <Shield className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Hash Display */}
            {hash && (
                <div className="mt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-green-400 font-bold">SHA-256 Verified</span>
                    </div>
                    <p className="text-[10px] text-green-300/60 font-mono break-all">{hash}</p>
                </div>
            )}
        </div>
    );
};

export default AudioPlayer;
