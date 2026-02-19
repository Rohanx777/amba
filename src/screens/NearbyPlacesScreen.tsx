import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useRoute, RouteProp } from '@react-navigation/native';
import { searchNearbyPlaces, Place } from '../services/placesService';
import * as Location from 'expo-location';
import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { MapPin, Navigation, ArrowRight } from 'lucide-react-native';

// Define route params
type NearbyPlacesRouteParams = {
  NearbyPlaces: {
    type: 'hospital' | 'police';
  };
};

type NearbyPlacesRouteProp = RouteProp<NearbyPlacesRouteParams, 'NearbyPlaces'>;

export default function NearbyPlacesScreen({ navigation }: any) {
  const route = useRoute<NearbyPlacesRouteProp>();

  const { type } = route.params;
  const title = type === 'hospital' ? 'Hospitals' : 'Police Stations';
  const subtitle = `Nearest ${type === 'hospital' ? 'Medical Centers' : 'Stations'} within 5km`;

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNearbyPlaces();
  }, []);

  const fetchNearbyPlaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const results = await searchNearbyPlaces(latitude, longitude, type);
      setPlaces(results);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'API key is missing.') {
        setError('API Key Missing');
      } else {
        setError('Could not fetch places.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = (lat: number, lng: number, label: string) => {
    const scheme = Platform.OS === 'ios' ? 'maps://0,0?q=' : 'geo:0,0?q=';
    const location = `${lat},${lng}`;
    const url = `${scheme}${location}(${label})`;
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Could not open maps application.'));
  };

  return (
    <ScreenLayout>
      <GuardianHeader
        title={title}
        subtitle={subtitle}
        isBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Scanning vicinity...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchNearbyPlaces}>
              <Text style={styles.retryText}>Retry Scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <View style={styles.listContainer}>
            {places.length > 0 ? (
              places.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => openInMaps(place.location.latitude, place.location.longitude, place.displayName.text)}
                >
                  <View style={styles.iconBox}>
                    <MapPin size={24} color={type === 'police' ? COLORS.primary : COLORS.danger} />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.placeName}>{place.displayName.text}</Text>
                    <Text style={styles.placeAddress} numberOfLines={2}>
                      {place.formattedAddress}
                    </Text>
                    {place.userRatingCount !== undefined && (
                      <Text style={styles.ratingText}>
                        ⭐ {place.rating || 'N/A'} ({place.userRatingCount})
                      </Text>
                    )}
                  </View>

                  <View style={styles.actionIcon}>
                    <ArrowRight size={20} color={COLORS.textTertiary} />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No locations found nearby.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: SPACING.xl,
  },
  centerContainer: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.m,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  listContainer: {
    gap: SPACING.m,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.m,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  cardContent: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  actionIcon: {
    justifyContent: 'center',
    paddingLeft: SPACING.s,
  },
  errorContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.l,
    marginTop: SPACING.l,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: SPACING.m,
  },
  retryButton: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
    borderRadius: RADIUS.full,
    ...SHADOWS.soft,
  },
  retryText: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  }
});