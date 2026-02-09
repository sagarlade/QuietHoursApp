// screens/Favorites.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import { usePlacesStore } from '@/store/store';

const { width } = Dimensions.get('window');

// Type for Place
type Place = {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  image?: string;
  hourlyRate?: number;
};

export default function Favorites() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { setSelectedPlace } = usePlacesStore();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const response = await api.getFavorites();
      setFavorites(response.data.places || []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      Alert.alert('Error', 'Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleRemoveFavorite = async (placeId: string) => {
    try {
      await api.removeFavorite(placeId);
      Alert.alert('Success', 'Removed from favorites');
      loadFavorites();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to remove favorite');
    }
  };

  const handlePlacePress = (place: Place) => {
    setSelectedPlace(place);
    router.push('/PlaceDetail');
  };

  const renderFavoriteCard = ({ item }: { item: Place }) => (
    <View style={styles.card}>
      {item.image && <Image source={{ uri: item.image }} style={styles.cardImage} />}
      <View style={styles.cardContent}>
        <Text style={styles.placeName}>{item.name}</Text>
        <Text style={styles.address}>{item.address}</Text>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#fbbf24" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        )}
        {item.hourlyRate && (
          <Text style={styles.priceText}>${item.hourlyRate}/hour</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handlePlacePress(item)}>
          <Ionicons name="eye" size={20} color="#4f46e5" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFavorite(item.id)}
        >
          <Ionicons name="heart" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <Text style={styles.headerSubtitle}>{favorites.length} places saved</Text>
      </View>

      {/* Favorites List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderFavoriteCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No favorites yet</Text>
              <Text style={styles.emptySubtext}>
                Add quiet places to your favorites for quick access
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  cardImage: {
    width: 120,
    height: 120,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  address: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 4,
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  removeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
  },
});
