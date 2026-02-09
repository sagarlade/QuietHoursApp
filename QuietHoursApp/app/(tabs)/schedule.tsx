// screens/Bookings.tsx
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
import api from '@/services/api';
import { useAuthStore } from '@/store/store';

const { width } = Dimensions.get('window');

// Booking type
type Booking = {
  id: string;
  placeName: string;
  address: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice?: number;
  image?: string;
};

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  
  const { user } = useAuthStore();

  useEffect(() => {
    loadBookings();
  }, [activeTab]);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const response = await api.getMyBookings(status);
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const handleCancelBooking = async (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', onPress: () => {} },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await api.cancelBooking(bookingId);
            Alert.alert('Success', 'Booking cancelled');
            loadBookings();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to cancel booking');
          }
        },
      },
    ]);
  };

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await api.updateBooking(bookingId, { status: "confirmed" });
      Alert.alert("Success", "Booking confirmed");
      loadBookings();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to confirm booking");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'confirmed':
        return '#10b981';
      case 'completed':
        return '#6366f1';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const safeText = (value?: string | number | null) =>
    value === null || value === undefined ? "" : String(value);

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <View style={styles.card}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.cardImage} />
      ) : (
        <Image source={{ uri: "https://picsum.photos/seed/quiet-fallback/800/600" }} style={styles.cardImage} />
      )}
      <View style={styles.cardContent}>
        <Text style={styles.placeName}>{safeText(item.placeName)}</Text>
        <Text style={styles.address}>{safeText(item.address)}</Text>
        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar" size={14} color="#64748b" />
          <Text style={styles.dateTime}>{formatDate(item.startTime)}</Text>
        </View>
        <View style={styles.dateTimeRow}>
          <Ionicons name="time" size={14} color="#64748b" />
          <Text style={styles.dateTime}>
            to {formatDate(item.endTime)}
          </Text>
        </View>

        {item.totalPrice !== undefined && item.totalPrice !== null && (
          <Text style={styles.price}>${Number(item.totalPrice).toFixed(2)}</Text>
        )}

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {safeText(item.status).charAt(0).toUpperCase() + safeText(item.status).slice(1)}
            </Text>
          </View>

          <View style={styles.cardActions}>
            {item.status === "pending" && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleConfirmBooking(item.id)}
              >
                <Ionicons name="checkmark" size={16} color="#10b981" />
              </TouchableOpacity>
            )}
            {(item.status === "pending" || item.status === "confirmed") && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelBooking(item.id)}
              >
                <Ionicons name="trash" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const filteredBookings = bookings;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['all', 'pending', 'confirmed', 'completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bookings List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No bookings yet</Text>
              <Text style={styles.emptySubtext}>
                Find and book your favorite quiet place
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4f46e5',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#4f46e5',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardContent: {
    padding: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  address: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dateTime: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#ecfdf5',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 8,
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
