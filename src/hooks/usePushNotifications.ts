import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
// Do not import expo-notifications statically because it crashes Expo Go on Android (SDK 53+)
// import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function usePushNotifications() {
    const { user } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
    const [notification, setNotification] = useState<any | undefined>(undefined);
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

    useEffect(() => {
        // SDK 53+ removed support for expo-notifications in Expo Go on Android
        const isExpoGo = Constants.appOwnership === 'expo';
        if (Platform.OS === 'android' && isExpoGo) {
            if (__DEV__) console.warn("Push Notifications not supported in Expo Go on Android. Use Development Build.");
            return;
        }

        // Safe to require now
        const Notifications = require('expo-notifications');

        // Configure handler
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        const register = async () => {
            let token;

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== 'granted') {
                    console.log('Failed to get push token for push notification!');
                    return;
                }

                try {
                    token = (await Notifications.getExpoPushTokenAsync({
                        projectId: Constants.expoConfig?.extra?.eas?.projectId,
                    })).data;
                    if (__DEV__) console.log('Expo Push Token:', token);
                } catch (e) {
                    console.error("Error fetching push token:", e);
                }
            } else {
                if (__DEV__) console.log('Must use physical device for Push Notifications');
            }

            return token;
        };

        register().then(token => {
            setExpoPushToken(token);
            if (token && user) {
                saveTokenToBackend(token, user.id);
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
            if (__DEV__) console.log(response);
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [user]);

    const saveTokenToBackend = async (token: string, userId: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ expo_push_token: token })
                .eq('id', userId);

            if (error) {
                console.error('Error saving push token:', error);
            } else {
                if (__DEV__) console.log('Push token saved to backend!');
            }
        } catch (err) {
            console.error('Failed to save push token:', err);
        }
    };

    return {
        expoPushToken,
        notification,
    };
}
