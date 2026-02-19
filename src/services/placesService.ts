// Access environment variables directly from process.env
const EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const EXPO_PUBLIC_GOOGLE_GEOCODING_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_API_KEY;

/**
 * This is your Google Cloud API Key.
 * IMPORTANT: Store this in a .env file and do not commit it to version control.
 * Create a file named .env in your project root and add:
 * EXPO_PUBLIC_GOOGLE_PLACES_API_KEY="YOUR_API_KEY_HERE"
 */

const PLACES_API_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';

// Helper function to calculate distance (Haversine formula)
const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export interface Place {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  distance?: number; // Optional: to store calculated distance
}

export interface SearchNearbyResponse {
  places: Place[];
}

/**
 * Searches for nearby places of a specific type (e.g., 'police', 'hospital') using the new Google Places API.
 * @param latitude - The user's current latitude.
 * @param longitude - The user's current longitude.
 * @param type - The type of place to search for ('police', 'hospital', etc.).
 * @param radius - The search radius in meters (e.g., 5000 for 5km).
 * @returns A promise that resolves to an array of places, sorted by distance.
 */
export async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  type: 'police' | 'hospital',
  radius: number = 5000
): Promise<Place[]> {
  if (!EXPO_PUBLIC_GOOGLE_PLACES_API_KEY) {
    console.error('Google Places API Key is not configured.');
    throw new Error('API key is missing.');
  }

  const requestBody = {
    includedTypes: [type],
    maxResultCount: 10,
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius,
      },
    },
    // Rank by distance for more relevant results
    rankPreference: 'DISTANCE',
  };

  const response = await fetch(PLACES_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Google Places API Error:', errorData);
    throw new Error('Failed to fetch nearby places.');
  }

  const data: SearchNearbyResponse = await response.json();
  const places = data.places || [];

  // Calculate and sort by distance
  const placesWithDistance = places.map(place => ({
    ...place,
    distance: getDistance(
      latitude,
      longitude,
      place.location.latitude,
      place.location.longitude
    ),
  }));

  placesWithDistance.sort((a, b) => a.distance - b.distance);



  return placesWithDistance;

}



const GEOCODING_API_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';



/**

 * Converts geographic coordinates into a human-readable address using Google's Geocoding API.

 * @param latitude - The latitude of the location.

 * @param longitude - The longitude of the location.

 * @returns A promise that resolves to the formatted address string.

 */

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {

  if (!EXPO_PUBLIC_GOOGLE_GEOCODING_API_KEY) {

    console.error('Google Geocoding API Key is not configured.');

    throw new Error('API key is missing.');

  }



  const url = `${GEOCODING_API_ENDPOINT}?latlng=${latitude},${longitude}&key=${EXPO_PUBLIC_GOOGLE_GEOCODING_API_KEY}`;



  const response = await fetch(url);



  if (!response.ok) {

    const errorData = await response.json();

    console.error('Google Geocoding API Error:', errorData);

    throw new Error('Failed to reverse geocode.');

  }



  const data = await response.json();



  if (data.results && data.results.length > 0) {

    // Return the best-formatted address from the results

    return data.results[0].formatted_address;

  } else {

    console.warn('Reverse geocoding returned no results for the given coordinates.');

    return 'Address not found';

  }

}

