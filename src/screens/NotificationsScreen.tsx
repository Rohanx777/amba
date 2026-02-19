import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface NotificationItem {
    id: string;
    type: 'ALERT' | 'INFO' | 'SUCCESS' | 'TIP';
    title: string;
    message: string;
    time: string;
    read: boolean;
    saved?: boolean;
}

const STORAGE_KEY = '@guardian_notifications_v1';

const MOCK_NOTIFICATIONS: NotificationItem[] = [
    {
        id: '1',
        type: 'SUCCESS',
        title: 'Safety Team Updated',
        message: 'You successfully added new contacts to your emergency team. They will now be notified in case of an SOS.',
        time: 'Just now',
        read: false,
    },
    {
        id: '2',
        type: 'TIP',
        title: 'Complete Your Profile',
        message: 'Adding a profile picture helps responders identify you faster during an emergency situation.',
        time: '2 hours ago',
        read: false,
    },
    {
        id: '3',
        type: 'INFO',
        title: 'Welcome to Guardian Angel',
        message: 'Your personal safety companion is now active. Tap to learn more about the features available to you.',
        time: '1 day ago',
        read: true,
    },
    {
        id: '4',
        type: 'ALERT',
        title: 'Unusual Activity Detected',
        message: 'We noticed a login from a new device. Was this you? Please verify your account activity.',
        time: '2 days ago',
        read: true,
    },
];

export default function NotificationsScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Load notifications from storage on mount
    useEffect(() => {
        loadNotifications();
    }, []);





    const loadNotifications = async () => {
        if (!user) {
            console.log('[NotifScreen] No user, skipping load');
            return;
        }

        console.log('[NotifScreen] Loading notifications for:', user.id);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[NotifScreen] DB Load Error:', error);
                throw error;
            }

            if (data) {
                console.log(`[NotifScreen] Loaded ${data.length} notifications`);
                // Map DB fields to UI fields if needed
                const mapped = data.map(n => ({
                    id: n.id,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    time: new Date(n.created_at).toLocaleString(), // Simple formatting
                    read: n.read,
                    saved: false, // Add saved column to DB if needed, or local only
                }));
                setNotifications(mapped);
            }
        } catch (error) {
            console.error('[NotifScreen] Failed to load notifications', error);
        }
    };

    // Subscribe to new notifications
    useEffect(() => {
        if (!user) return;

        console.log('[NotifScreen] Subscribing to realtime...');
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[NotifScreen] 🔴 Realtime Event Received:', payload);
                    const n = payload.new;
                    const newNotif: NotificationItem = {
                        id: n.id,
                        type: n.type as any,
                        title: n.title,
                        message: n.message,
                        time: 'Just now',
                        read: false,
                    };
                    setNotifications(prev => [newNotif, ...prev]);

                    // Simple alert for debugging
                    Alert.alert("New Notification", n.title);
                }
            )
            .subscribe((status) => {
                console.log('[NotifScreen] Subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // We don't need saveNotificationsToStorage anymore as source of truth is DB.
    // But we might want to mark as read in DB.


    const getIcon = (type: string) => {
        switch (type) {
            case 'ALERT': return 'warning';
            case 'SUCCESS': return 'checkmark-circle';
            case 'TIP': return 'bulb';
            default: return 'information-circle';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'ALERT': return COLORS.danger;
            case 'SUCCESS': return COLORS.success;
            case 'TIP': return COLORS.warning;
            default: return COLORS.primary;
        }
    };

    const handlePress = (item: NotificationItem) => {
        if (isSelectionMode) {
            toggleSelection(item.id);
        } else {
            if (!item.read) {
                setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
            }
            setSelectedNotification(item);
        }
    };

    const handleLongPress = (item: NotificationItem) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            toggleSelection(item.id);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            // If we deselected the last item, should we exit selection mode? 
            // Often better to keep partial selection mode active until "Cancel" or "Done" is pressed.
            return next;
        });
    };

    const closeModal = () => {
        setSelectedNotification(null);
    };

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    const deleteSelected = () => {
        Alert.alert(
            "Delete Notifications",
            `Are you sure you want to delete ${selectedIds.size} notification(s)?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
                        exitSelectionMode();
                    }
                }
            ]
        );
    };

    const saveSelected = () => {
        setNotifications(prev => prev.map(n =>
            selectedIds.has(n.id) ? { ...n, saved: true } : n
        ));
        exitSelectionMode();
        // Optional: Show toast or feedback
    };

    const renderItem = ({ item }: { item: NotificationItem }) => {
        const color = getColor(item.type);
        const isSelected = selectedIds.has(item.id);

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    !item.read && !item.saved && styles.unreadCard,
                    item.saved && styles.savedCard,
                    isSelected && styles.selectedCard
                ]}
                activeOpacity={0.9}
                onPress={() => handlePress(item)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={300}
            >
                {isSelectionMode && (
                    <View style={styles.selectionIndicator}>
                        <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={24}
                            color={isSelected ? COLORS.primary : COLORS.textTertiary}
                        />
                    </View>
                )}

                <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                    <Ionicons name={getIcon(item.type) as any} size={24} color={color} />
                </View>
                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {item.saved && (
                                <Ionicons name="bookmark" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                            )}
                            {!item.read && !item.saved && <View style={styles.dot} />}
                        </View>
                    </View>
                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenLayout>
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => isSelectionMode ? exitSelectionMode() : navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name={isSelectionMode ? "close" : "chevron-back"} size={26} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isSelectionMode ? `${selectedIds.size} Selected` : "Notifications"}
                </Text>
                <TouchableOpacity
                    onPress={() => isSelectionMode ? exitSelectionMode() : setIsSelectionMode(true)}
                    style={styles.headerBtn}
                >
                    <Text style={styles.headerActionText}>
                        {isSelectionMode ? "Done" : "Select"}
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={48} color={COLORS.textTertiary} />
                        <Text style={styles.emptyText}>No new notifications</Text>
                    </View>
                }
            />

            {/* Selection Action Bar */}
            {isSelectionMode && (
                <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={saveSelected}>
                        <Ionicons name="bookmark-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.actionText}>Save</Text>
                    </TouchableOpacity>
                    <View style={styles.actionDivider} />
                    <TouchableOpacity style={styles.actionBtn} onPress={deleteSelected}>
                        <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
                        <Text style={[styles.actionText, { color: COLORS.danger }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Detail Popup Modal (Only show if not in selection mode and notification selected) */}
            <Modal
                transparent={true}
                visible={!!selectedNotification && !isSelectionMode}
                animationType="fade"
                onRequestClose={closeModal}
            >
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                {selectedNotification && (
                                    <>
                                        <View style={styles.modalHeader}>
                                            <View style={[styles.modalIcon, { backgroundColor: getColor(selectedNotification.type) + '20' }]}>
                                                <Ionicons name={getIcon(selectedNotification.type) as any} size={32} color={getColor(selectedNotification.type)} />
                                            </View>
                                            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                            </TouchableOpacity>
                                        </View>

                                        <Text style={styles.modalTitle}>{selectedNotification.title}</Text>
                                        <Text style={styles.modalTime}>{selectedNotification.time}</Text>

                                        <View style={styles.divider} />

                                        <Text style={styles.modalMessage}>{selectedNotification.message}</Text>

                                        <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
                                            <Text style={styles.modalButtonText}>Close</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.background,
        zIndex: 10,
    },
    headerBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    headerActionText: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: SPACING.s, // Reduced for "fully wide" feel
        paddingTop: SPACING.m,
        paddingBottom: 100,
    },
    card: {
        flexDirection: 'row',
        padding: SPACING.m,
        marginBottom: SPACING.m,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l, // Rounded
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        overflow: 'hidden',
        ...SHADOWS.card,
        alignItems: 'center',
    },
    unreadCard: {
        backgroundColor: '#F0F9FF',
        borderColor: COLORS.primaryLight,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    savedCard: {
        borderColor: COLORS.primary,
        backgroundColor: '#F8FAFC',
    },
    selectedCard: {
        backgroundColor: COLORS.primary + '10', // Light highlight
        borderColor: COLORS.primary,
        borderWidth: 1.5,
    },
    selectionIndicator: {
        marginRight: SPACING.s,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    content: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginLeft: 8,
    },
    message: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 6,
        lineHeight: 20,
    },
    time: {
        fontSize: 12,
        color: COLORS.textTertiary,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: SPACING.xxl * 2,
        opacity: 0.7,
    },
    emptyText: {
        marginTop: SPACING.m,
        color: COLORS.textTertiary,
        fontSize: 16,
        fontWeight: '600',
    },
    // Action Bar
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        paddingVertical: SPACING.m,
        paddingBottom: Platform.OS === 'ios' ? 30 : SPACING.m,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        ...SHADOWS.card,
    },
    actionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    actionDivider: {
        width: 1,
        backgroundColor: COLORS.border,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.l,
    },
    modalContent: {
        width: '100%',
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.xl,
        padding: SPACING.l,
        ...SHADOWS.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.m,
    },
    modalIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: {
        padding: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    modalTime: {
        fontSize: 12,
        color: COLORS.textTertiary,
        marginBottom: SPACING.m,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: SPACING.m,
    },
    modalMessage: {
        fontSize: 16,
        color: COLORS.textSecondary,
        lineHeight: 24,
        marginBottom: SPACING.xl,
    },
    modalButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.m,
        borderRadius: RADIUS.m,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    }
});
