import { Audio } from 'expo-av';

export async function startRecording(): Promise<Audio.Recording | null> {
    try {
        const perm = await Audio.requestPermissionsAsync();
        if (perm.status !== 'granted') {
            console.log('Audio permission not granted');
            return null;
        }

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        console.log('Starting Recording..');
        return recording;
    } catch (err) {
        console.error('Failed to start recording', err);
        return null;
    }
}

import * as FileSystem from 'expo-file-system';

export async function stopRecording(recording: Audio.Recording | null): Promise<string | null> {
    if (!recording) return null;

    try {
        console.log('🛑 Stopping Recording...');
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('✅ Recording stopped. Temporary URI:', uri);

        if (!uri) return null;

        // SKIP VERIFICATION (getInfoAsync is deprecated/crashing)
        // const info = await FileSystem.getInfoAsync(uri); 
        // if (!info.exists) { ... }

        // ATTEMPT PERMANENT STORAGE (Fail-safe)
        try {
            const docDir = FileSystem.documentDirectory;
            if (docDir) {
                const evidenceDir = docDir + 'evidence/';
                await FileSystem.makeDirectoryAsync(evidenceDir, { intermediates: true });

                const filename = uri.split('/').pop();
                const newUri = evidenceDir + (filename || `evidence_${Date.now()}.m4a`);

                await FileSystem.moveAsync({
                    from: uri,
                    to: newUri
                });
                console.log('📦 Moved recording to permanent storage:', newUri);
                return newUri;
            } else {
                console.warn("⚠️ documentDirectory is null. Using temporary URI.");
            }
        } catch (moveErr) {
            console.warn("⚠️ Failed to move file to permanent storage, using temp file:", moveErr);
        }

        // Fallback: Return original URI if move failed or dir missing
        return uri;

    } catch (error) {
        console.error('❌ Failed to stop recording', error);
        return null;
    }
}
