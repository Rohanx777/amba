import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { PoliceResponse, ResponseAction } from '../types';
import { sendPushNotification } from '../utils/sendPushNotification';

export function usePoliceActions() {
    const { officer } = useAuth();

    // Dispatch / respond to an alert
    const respondToAlert = useCallback(async (alertId: string, action: ResponseAction, note?: string) => {
        if (!officer) throw new Error('Not authenticated as officer');

        const { error } = await supabase
            .from('police_responses')
            .insert({
                alert_id: alertId,
                officer_id: officer.id,
                action,
                note: note || null,
            });

        if (error) throw error;

        // Fetch user token to send push notification
        try {
            // 1. Get user_id from alert
            const { data: alertData } = await supabase
                .from('active_alerts')
                .select('user_id')
                .eq('id', alertId)
                .single();

            if (alertData?.user_id) {
                // 2. Define content
                let title = 'Police Update';
                let body = `Status Update: ${action}`;

                if (action === 'DISPATCHED') {
                    title = '🚔 Help is on the way!';
                    body = `Officer ${officer.full_name} has been dispatched to your location.`;
                } else if (action === 'RESOLVED') {
                    title = '✅ Incident Resolved';
                    body = 'Police have marked your incident as resolved.';
                } else if (action === 'ON_SCENE') {
                    title = '📍 Officer On Scene';
                    body = 'An officer has arrived at your location.';
                }

                console.log(`[DEBUG] Preparing to send notification to User ${alertData.user_id}`);
                console.log(`[DEBUG] Content: ${title} - ${body}`);

                // 3. Insert into DB
                try {
                    const { error: insertError } = await supabase.from('notifications').insert({
                        user_id: alertData.user_id,
                        type: 'ALERT',
                        title: title,
                        message: body,
                        read: false,
                    });

                    if (insertError) {
                        console.error('[DEBUG] ❌ DB Insert Error:', insertError);
                    } else {
                        console.log('[DEBUG] ✅ Notification inserted into DB');
                    }
                } catch (dbErr) {
                    console.error('[DEBUG] ❌ DB Exception:', dbErr);
                }

                // 4. Send Push (if token exists)
                // Get push token from profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('expo_push_token')
                    .eq('id', alertData.user_id)
                    .single();

                if (profile?.expo_push_token) {
                    console.log('[DEBUG] 📲 Sending Push to token:', profile.expo_push_token);
                    await sendPushNotification(profile.expo_push_token, title, body);
                } else {
                    console.log('[DEBUG] ⚠️ No push token found for user.');
                }
            }
        } catch (pushErr) {
            console.error('Failed to send push notification:', pushErr);
            // Don't block flow
        }

        // If resolving, also update the alert status
        if (action === 'RESOLVED') {
            const { error: updateErr } = await supabase
                .from('active_alerts')
                .update({
                    status: 'RESOLVED',
                    resolved_at: new Date().toISOString(),
                })
                .eq('id', alertId);

            if (updateErr) throw updateErr;
        }
    }, [officer]);

    // Fetch response history for an alert
    const getResponses = useCallback(async (alertId: string): Promise<PoliceResponse[]> => {
        const { data, error } = await supabase
            .from('police_responses')
            .select('*')
            .eq('alert_id', alertId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return (data as PoliceResponse[]) || [];
    }, []);

    return { respondToAlert, getResponses };
}
