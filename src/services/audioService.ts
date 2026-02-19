import * as FileSystem from 'expo-file-system';
import { supabase } from './supabaseClient';
import * as Crypto from 'expo-crypto';

// @ts-ignore
// import { decode } from 'base64-arraybuffer'; // No longer needed for FormData

export async function uploadAudioEvidence(userId: string, alertId: string | null, localUri: string, duration: string) {
    try {
        console.log("Preparing upload with FormData...", localUri);

        // 1. Compute Cryptographic Hash (SHA-256) for "Blockchain Ready" Integrity
        let fileHash = null;
        try {
            console.log("🔐 Computing SHA-256 Fingerprint...");
            const fileContent = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
            fileHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, fileContent);
            console.log("✅ Generated Hash:", fileHash);
        } catch (hashError) {
            console.warn("⚠️ Hash computation failed (continuing upload without hash):", hashError);
        }

        const formData = new FormData();
        formData.append('file', {
            uri: localUri,
            name: `${Date.now()}.m4a`,
            type: 'audio/mp4'
        } as any);

        const fileName = `${userId}/${alertId || 'unlinked'}/${Date.now()}.m4a`;

        const { data, error: uploadError } = await supabase.storage
            .from('audio-evidence')
            .upload(fileName, formData, {
                contentType: 'audio/mp4',
                upsert: false
            });

        if (uploadError) {
            console.error('❌ Storage Upload Error Details:', JSON.stringify(uploadError, null, 2));
            throw uploadError;
        }

        console.log('✅ File uploaded to Storage:', data?.path);

        // Save metadata to audio_evidence table
        const { error: dbError } = await supabase.from('audio_evidence').insert({
            user_id: userId,
            alert_id: alertId,
            storage_path: fileName,
            duration,
            recorded_at: new Date().toISOString(),
            file_hash: fileHash // Store the hash
        });

        if (dbError) {
            console.error('❌ Database Insert Error Details:', JSON.stringify(dbError, null, 2));
            throw dbError;
        }

        console.log('🎙️ Audio evidence metadata saved successfully:', fileName);
        return true;
    } catch (e) {
        console.log('uploadAudioEvidence failed:', e);
        throw e;
    }
}
