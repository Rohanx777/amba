import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { fetchContacts, deleteContact as serviceDeleteContact, EmergencyContact as ContactItem } from '../services/contactsService';
import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { MenuContext } from '../context/MenuContext';



export default function MyTeamScreen() {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const { user } = useAuth();
    const { toggleMenu } = React.useContext(MenuContext);

    const [team, setTeam] = useState<ContactItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isFocused && user) {
            fetchTeam();
        }
    }, [isFocused, user]);

    const fetchTeam = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await fetchContacts(user.id);
            setTeam(data);
        } catch (err) {
            console.error("Error fetching team:", err);
            Alert.alert("Error", "Could not load your team.");
        } finally {
            setLoading(false);
        }
    };

    const deleteContact = async (contactId: string, name: string) => {
        Alert.alert(
            "Remove Guardian",
            `Are you sure you want to remove ${name} from your team?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (!user) return;
                            // Optimistic update
                            setTeam(prev => prev.filter(c => c.id !== contactId));

                            // DB Deletes
                            await serviceDeleteContact(contactId, user.id);
                        } catch (err) {
                            Alert.alert("Error", "Failed to remove contact.");
                            fetchTeam(); // Revert on error
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: ContactItem }) => (
        <View style={styles.card}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
                <View style={styles.badge}>
                    <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                    <Text style={styles.badgeText}>Verified Guardian</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteContact(item.id, item.name)}
            >
                <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
        </View>
    );

    return (
        <ScreenLayout>
            <GuardianHeader
                title="My Safety Team"
                subtitle={`${team.length}/5 Guardians Active`}
                isBack
                onBackPress={() => navigation.goBack()}
                onMenuPress={toggleMenu}
                onNotificationPress={() => navigation.navigate('Notifications')}
                hasNotifications
            />

            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={team}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons name="people-outline" size={40} color={COLORS.textTertiary} />
                                </View>
                                <Text style={styles.emptyTitle}>Your Team is Empty</Text>
                                <Text style={styles.emptyText}>
                                    Add trusted contacts who can respond to your SOS alerts and track your location during emergencies.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Floating ADD Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        if (team.length >= 5) {
                            Alert.alert("Team Full", "You can only have 5 guardians. Remove one to add another.");
                        } else {
                            navigation.navigate('Contacts'); // Go to Add Screen
                        }
                    }}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryLight]}
                        style={styles.addGradient}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="person-add" size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.addText}>Add New Guardian</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: SPACING.l,
        paddingBottom: 120,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.soft,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primaryPale,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    phone: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.success,
    },
    deleteBtn: {
        padding: SPACING.s,
        backgroundColor: '#FEF2F2',
        borderRadius: RADIUS.full,
    },
    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xxl,
        paddingHorizontal: SPACING.xl,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.m,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.s,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: SPACING.l,
        right: SPACING.l,
    },
    addButton: {
        borderRadius: RADIUS.full,
        ...SHADOWS.glow,
    },
    addGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.m,
        borderRadius: RADIUS.full,
    },
    addText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
