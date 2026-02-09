// screens/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import api from '@/services/api';
import { usePlacesStore, useAuthStore } from '@/store/store';

const { width, height } = Dimensions.get('window');

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

let MapView: React.ComponentType<any>;
let Marker: React.ComponentType<any>;

if (Platform.OS === 'web') {
  MapView = ({ style, children }: { style?: any; children?: React.ReactNode }) => (
    <View
      style={[
        style,
        {
          backgroundColor: '#e2e8f0',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Text style={{ color: '#475569' }}>Map is available on mobile only</Text>
      {children}
    </View>
  );
  Marker = () => null;
} else {
  // Load native map only on native platforms to avoid web bundle errors
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}

// Place type
type Place = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  distance?: string;
  hourlyRate?: number;
  amenities?: string;
  image?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const { nearbyPlaces, setNearbyPlaces, setSelectedPlace } = usePlacesStore();
  const { user } = useAuthStore();

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyPlaces();
    }
  }, [userLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setLocationDenied(false);
      } else {
        setLocationDenied(true);
        await fetchAllPlaces();
      }
    } catch (error) {
      console.error('Location error:', error);
      setLocationDenied(true);
      await fetchAllPlaces();
    }
  };

  const fetchNearbyPlaces = async () => {
    if (!userLocation) return;

    setIsLoading(true);
    try {
      const response = await api.getNearbyPlaces(
        userLocation.latitude,
        userLocation.longitude,
        5000
      );
      const places = response.data.places || [];
      setNearbyPlaces(places);
      if (places.length === 0) {
        await fetchAllPlaces();
      }
    } catch (error) {
      console.error('Failed to fetch nearby places:', error);
      await fetchAllPlaces();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllPlaces = async () => {
    setIsLoading(true);
    try {
      const response = await api.getAllPlaces();
      const places = response.data.places || [];
      setNearbyPlaces(places);
      if (!mapRegion && places.length > 0) {
        setMapRegion({
          latitude: places[0].latitude,
          longitude: places[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } catch (error) {
      console.error('Failed to fetch places:', error);
      Alert.alert('Error', 'Failed to load places');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (userLocation) {
      await fetchNearbyPlaces();
    } else {
      await fetchAllPlaces();
    }
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      if (userLocation) {
        fetchNearbyPlaces();
      } else {
        fetchAllPlaces();
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.searchPlaces(
        search,
        userLocation?.latitude,
        userLocation?.longitude
      );
      setNearbyPlaces(response.data.places || []);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate helper
  const goToPlaceDetail = (place: Place) => {
    setSelectedPlace(place);
    router.push(`/PlaceDetail`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", paddingTop:25 }}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topIcon} onPress={() => router.push("/(tabs)/profile")}>
          <Image
            source={{
              uri:
                user?.profileImage ||
                "https://i.pravatar.cc/100?img=12",
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Quiet Hours</Text>
        <TouchableOpacity
          style={styles.topIcon}
          onPress={() => Alert.alert("AI Bot", "Coming soon")}
        >
          <Ionicons name="sparkles" size={26} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Find nearby quiet place"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.filterButton}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      {mapRegion ? (
        <MapView style={styles.map} region={mapRegion} onRegionChange={setMapRegion}>
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="Your Location"
              pinColor="#3b82f6"
            />
          )}
          {nearbyPlaces.map((place) => (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              title={place.name}
              description={place.address}
              onPress={() => goToPlaceDetail(place)}
            />
          ))}
        </MapView>
      ) : (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#4A90E2" />
          {locationDenied && (
            <Text style={{ marginTop: 10, color: '#64748b' }}>
              Location permission denied. Showing all places.
            </Text>
          )}
        </View>
      )}

      {/* Top Picks List */}
      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>Nearby Places ({nearbyPlaces.length})</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#4A90E2" />
        ) : (
          <FlatList
            data={nearbyPlaces}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.placeCard}
                onPress={() => goToPlaceDetail(item)}
              >
                <Image
                  source={{ uri: item.image || 'https://via.placeholder.com/120x90' }}
                  style={styles.placeImage}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.placeName}>{item.name ?? ""}</Text>
                  <Text style={styles.placeRating}>{item.address ?? ""}</Text>
                  {item.rating !== undefined && item.rating !== null && (
                    <Text style={styles.placeDistance}>Rating: {item.rating} ⭐</Text>
                  )}
                  {item.hourlyRate !== undefined && item.hourlyRate !== null && (
                    <Text style={styles.priceText}>${item.hourlyRate}/hour</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.checkInButton} onPress={() => goToPlaceDetail(item)}>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No places found. Try adjusting your search.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  topIcon: {
    width: 43,
    alignItems: 'center',
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  searchContainer: {
    flexDirection: 'row',
    margin: 10,
    alignItems: 'center',
    paddingTop: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  filterButton: {
    marginLeft: 10,
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
  },
  map: {
    width: width,
    height: height * 0.35,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 10,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e293b',
  },
  placeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  placeImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  placeRating: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  placeDistance: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 4,
  },
  checkInButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginTop: 20,
  },
});
