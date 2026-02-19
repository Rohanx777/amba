import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Copy, Camera, ChevronRight, User, Shield, Lock, Bell, Activity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { useSOS } from '../context/SOSContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ProfileStackParamList, RootTabParamList } from '../navigation/types';
import { RootStackParamList } from '../../App';
import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<RootStackParamList, 'Profile'>,
  StackNavigationProp<ProfileStackParamList>
>;

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, profile, logout } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const { shakeEnabled, setShakeEnabled } = useSOS();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [ghostMode, setGhostMode] = useState(false);

  // Animations
  const shieldRotation = useSharedValue(0);

  useEffect(() => {
    shieldRotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedShieldStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shieldRotation.value}deg` }],
  }));

  const onManageContacts = () => navigation.navigate('EmergencyContacts');
  const onLogout = async () => { await logout(); };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permission is needed to select photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleCopyID = async () => {
    const uid = user?.id;
    if (uid) {
      await Clipboard.setStringAsync(uid);
      Alert.alert("Safety ID Copied!", "Share this ID with your Guardian so they can track you.");
    }
  };

  const InfoTile = ({ label, value, icon }: any) => (
    <View style={styles.infoTile}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );

  if (!user) {
    return (
      <ScreenLayout>
        <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ alignItems: 'center', marginBottom: SPACING.xxl }}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarInner, { borderColor: COLORS.primary }]}>
                <Lock size={40} color={COLORS.primary} />
              </View>
            </View>
            <Text style={[styles.userName, { textAlign: 'center', color: COLORS.text }]}>Guest Access</Text>
            <Text style={[styles.userHandle, { textAlign: 'center', marginTop: 10, maxWidth: 300 }]}>
              Log in to sync your safety data, manage trusted contacts, and enable ghost mode.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={{ width: '100%', gap: SPACING.m }}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>LOG IN</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>CREATE ACCOUNT</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <GuardianHeader title="Profile" subtitle="Identity & Settings" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {/* Rotating Shield Ring */}
            <Animated.View style={[styles.shieldRing, animatedShieldStyle]} />

            {/* Avatar Image */}
            <View style={styles.avatarInner}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <User size={40} color={COLORS.textTertiary} />
                // <Text style={{ fontSize: 40 }}>👤</Text>
              )}
            </View>

            <View style={styles.editBadge}>
              <Camera size={12} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{profile?.full_name || user?.email || 'Guest User'}</Text>
          <Text style={styles.userHandle}>@{profile?.full_name?.replace(' ', '').toLowerCase() || 'explorer'}</Text>

          {/* Safety ID Pill */}
          {user && (
            <TouchableOpacity style={styles.idPill} onPress={handleCopyID}>
              <Text style={styles.idLabel}>ID:</Text>
              <Text style={styles.idText}>{user?.id?.substring(0, 8)}...</Text>
              <Copy size={12} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Grid */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsRow}>
          <InfoTile label="Safety Score" value="98%" icon="🛡️" />
          <InfoTile label=" Protected" value="24h" icon="⏱️" />
          <InfoTile label="Contacts" value="3" icon="👥" />
        </Animated.View>

        {/* Ghost Mode Toggle */}
        <View style={styles.ghostModeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ghostTitle}>Ghost Mode</Text>
            <Text style={styles.ghostSubtitle}>Go unseen on the map immediately.</Text>
          </View>
          <Switch
            value={ghostMode}
            onValueChange={setGhostMode}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={ghostMode ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        {/* Settings Groups */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Preferences</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={notificationsEnabled ? COLORS.primary : '#f4f3f4'}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Shake to SOS</Text>
            <Switch
              value={shakeEnabled}
              onValueChange={setShakeEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.dangerBg }}
              thumbColor={shakeEnabled ? COLORS.danger : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Account</Text>

          <TouchableOpacity style={styles.actionRow} onPress={onManageContacts}>
            <Text style={styles.actionLabel}>Emergency Contacts</Text>
            <ChevronRight size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('SavedAddresses')}>
            <Text style={styles.actionLabel}>Saved Locations</Text>
            <ChevronRight size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('AudioEvidence')}>
            <Text style={styles.actionLabel}>Audio Evidence</Text>
            <ChevronRight size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Guardian')} style={styles.guardianBtn}>
          <Text style={styles.guardianText}>SWITCH TO GUARDIAN MODE</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>

      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 100 },

  header: { alignItems: 'center', marginBottom: SPACING.xl },
  avatarContainer: {
    width: 120, height: 120,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.m,
  },
  shieldRing: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  avatarInner: {
    width: 100, height: 100, borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  avatarImage: { width: 100, height: 100 },
  editBadge: {
    position: 'absolute', bottom: 0, right: 10,
    backgroundColor: COLORS.primary,
    width: 28, height: 28,
    borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  userName: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  userHandle: { color: COLORS.textSecondary, fontSize: 14, marginBottom: SPACING.s },

  idPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s,
    borderRadius: RADIUS.full,
    marginTop: SPACING.s,
    borderWidth: 1, borderColor: COLORS.primaryLight + '40',
  },
  idLabel: { color: COLORS.textSecondary, fontSize: 12, marginRight: 4, fontWeight: '600' },
  idText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginRight: 8, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.l },
  infoTile: {
    width: (width - 40) / 3 - 8,
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  tileIcon: { fontSize: 20, marginBottom: 5 },
  tileValue: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  tileLabel: { color: COLORS.textSecondary, fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold' },

  ghostModeCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.m, borderRadius: RADIUS.l,
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.l,
    ...SHADOWS.soft,
  },
  ghostTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  ghostSubtitle: { color: COLORS.textSecondary, fontSize: 12 },

  sectionCard: {
    borderRadius: RADIUS.l,
    backgroundColor: COLORS.card,
    marginBottom: SPACING.l,
    overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  sectionHeader: {
    padding: SPACING.m,
    color: COLORS.textTertiary,
    fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase',
    backgroundColor: COLORS.background,
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.m,
  },
  settingLabel: { color: COLORS.text, fontSize: 16 },

  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.m,
  },
  actionLabel: { color: COLORS.text, fontSize: 16 },

  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.m },

  logoutBtn: {
    alignItems: 'center', padding: SPACING.m,
    borderRadius: RADIUS.m, borderWidth: 1, borderColor: COLORS.danger,
    marginTop: SPACING.m,
  },
  logoutText: { color: COLORS.danger, fontWeight: 'bold', letterSpacing: 1 },

  guardianBtn: {
    alignItems: 'center', padding: SPACING.m,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.s,
    ...SHADOWS.glow,
  },
  guardianText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 1 },

  // Auth/Guest styles
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 1 },
  secondaryBtn: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.m,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: 'bold', letterSpacing: 1 },
});
