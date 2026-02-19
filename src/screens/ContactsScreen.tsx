import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { addContact, fetchContacts, EmergencyContact as ContactItem } from '../services/contactsService';
import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';



export default function ContactsScreen() {
    const navigation = useNavigation();
    const [contacts, setContacts] = useState<ContactItem[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<ContactItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const isFocused = useIsFocused();
    const { user } = useAuth(); // Moved to top level
    const [savedContacts, setSavedContacts] = useState<ContactItem[]>([]);

    useEffect(() => {
        loadContacts();
    }, []);

    useEffect(() => {
        if (isFocused) {
            fetchSavedContacts();
        }
    }, [isFocused]);

    const fetchSavedContacts = async () => {
        if (!user) return;
        try {
            const data = await fetchContacts(user.id);
            setSavedContacts(data);
        } catch (err) {
            console.error("Error fetching saved contacts:", err);
        }
    };

    const loadContacts = async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();

            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers],
                    sort: Contacts.SortTypes.FirstName,
                });

                if (data.length > 0) {
                    // Filter valid contacts with phone numbers
                    const validContacts = data
                        .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
                        .map(c => ({
                            id: c.id!,
                            name: c.name || 'Unknown',
                            phone: c.phoneNumbers![0].number || '',

                        }));

                    setContacts(validContacts);
                    setFilteredContacts(validContacts);
                }
            } else {
                Alert.alert('Permission Denied', 'Permission to access contacts was denied.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load contacts.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text) {
            const newData = contacts.filter((item) => {
                const itemData = item.name ? item.name.toUpperCase() : ''.toUpperCase();
                const textData = text.toUpperCase();
                return itemData.indexOf(textData) > -1;
            });
            setFilteredContacts(newData);
        } else {
            setFilteredContacts(contacts);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedContacts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                if (newSet.size + savedContacts.length >= 5) {
                    Alert.alert('Limit Reached', 'You can only have up to 5 emergency contacts (Saved + Selected).');
                    return prev;
                }
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        const selectedList = contacts.filter(c => selectedContacts.has(c.id));
        console.log("Saving contacts, count:", selectedList.length);

        const uid = user?.id;
        if (!uid) {
            Alert.alert("Login Required", "You must be logged in to save emergency contacts.");
            return;
        }

        setSaving(true);

        try {
            const savePromises = selectedList.map(async (item) => {
                const cleanPhone = item.phone.replace(/[\s-]/g, '');
                await addContact(uid, {
                    name: item.name,
                    phone: cleanPhone,
                    is_primary: 0
                });
            });

            await Promise.all(savePromises);

            Alert.alert("Success", "Emergency contacts updated!");
            setSelectedContacts(new Set());
            fetchSavedContacts();
            navigation.goBack();
        } catch (error) {
            console.error("Save Error:", error);
            Alert.alert("Error", "Failed to save contacts.");
        } finally {
            setSaving(false);
        }
    };

    const renderItem = ({ item }: { item: ContactItem }) => {
        const isSelected = selectedContacts.has(item.id);
        const isAlreadySaved = savedContacts.some(c => c.phone === item.phone); // Simple check by phone

        if (isAlreadySaved) return null; // Hide if already saved

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleSelection(item.id)}
                style={[
                    styles.contactCard,
                    isSelected && styles.contactCardSelected
                ]}
            >
                <View style={styles.avatarContainer}>
                    {/* Initials Avatar */}
                    <LinearGradient
                        colors={isSelected ? [COLORS.primary, COLORS.primaryLight] : [COLORS.border, COLORS.border]}
                        style={styles.avatar}
                    >
                        <Text style={[styles.avatarText, isSelected && { color: '#FFF' }]}>
                            {item.name.charAt(0)}
                        </Text>
                    </LinearGradient>
                </View>

                <View style={styles.contactInfo}>
                    <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>

                <View style={styles.checkboxContainer}>
                    {isSelected ? (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    ) : (
                        <Ionicons name="ellipse-outline" size={24} color={COLORS.textTertiary} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenLayout>
            <GuardianHeader
                title="Add Guardian"
                subtitle="Select from device contacts"
                isBack
                onBackPress={() => navigation.goBack()}
            />

            <View style={styles.content}>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search contacts..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>

                {/* Contacts List */}
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredContacts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={15}
                        maxToRenderPerBatch={20}
                        ListHeaderComponent={
                            <Text style={styles.sectionTitle}>ADD FROM CONTACTS</Text>
                        }
                    />
                )}
            </View>

            {/* Floating Save Button */}
            {selectedContacts.size > 0 && (
                <View style={styles.footerContainer}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryLight]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.saveGradient}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Text style={styles.saveText}>Add {selectedContacts.size} to Team</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        marginHorizontal: SPACING.l,
        marginBottom: SPACING.m,
        paddingHorizontal: SPACING.m,
        height: 50,
        borderRadius: RADIUS.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.soft,
    },
    searchIcon: {
        marginRight: SPACING.s,
    },
    searchInput: {
        flex: 1,
        color: COLORS.text,
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: SPACING.l,
        paddingBottom: 100, // Space for footer
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        marginBottom: SPACING.s,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.soft,
    },
    contactCardSelected: {
        backgroundColor: COLORS.primaryPale,
        borderColor: COLORS.primaryLight,
    },
    avatarContainer: {
        marginRight: SPACING.m,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: COLORS.textSecondary,
        fontSize: 18,
        fontWeight: '700',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    contactPhone: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    checkboxContainer: {
        marginLeft: SPACING.s,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 30,
        left: SPACING.l,
        right: SPACING.l,
    },
    saveButton: {
        borderRadius: RADIUS.full,
        ...SHADOWS.glow,
    },
    saveGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        borderRadius: RADIUS.full,
        gap: SPACING.s,
    },
    saveText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    sectionContainer: {
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.m,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textTertiary,
        marginBottom: SPACING.s,
        marginTop: SPACING.m,
        marginLeft: SPACING.l,
    },
    savedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        backgroundColor: '#F0FDF4', // Green-50
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderColor: '#BBF7D0', // Green-200
        marginBottom: SPACING.s,
        ...SHADOWS.soft,
    },
    savedAvatar: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.full,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    savedAvatarText: {
        color: COLORS.success,
        fontSize: 14,
        fontWeight: 'bold',
    },
    savedName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    savedPhone: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    savedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        gap: 4,
    },
    savedBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.success,
    },
});
