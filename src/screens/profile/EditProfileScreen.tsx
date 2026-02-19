import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getProfile, upsertProfile } from '../../services/profileService';
import { ScreenLayout } from '../../components/ScreenLayout';
import { GuardianHeader } from '../../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme/guardianTheme';
import { User, Save } from 'lucide-react-native';

export default function EditProfileScreen({ navigation }: any) {
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile?.full_name]);

  const onSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile({ full_name: fullName });
      Alert.alert('Saved', 'Profile updated successfully');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <GuardianHeader
        title="Edit Profile"
        isBack
        onBackPress={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <User size={20} color={COLORS.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textTertiary}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={onSave}
            style={[styles.saveBtn, isLoading && { opacity: 0.7 }]}
            disabled={isLoading}
          >
            <Save size={20} color="white" />
            <Text style={styles.saveBtnText}>{isLoading ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.l,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: RADIUS.l,
    padding: SPACING.l,
    marginTop: SPACING.m,
    ...SHADOWS.card,
  },
  inputGroup: {
    marginBottom: SPACING.l,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
    marginLeft: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.m,
  },
  inputIcon: {
    marginRight: SPACING.s,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.text,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: RADIUS.m,
    gap: SPACING.s,
    ...SHADOWS.glow,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
