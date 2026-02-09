// screens/Profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import { useAuthStore } from '@/store/store';

const { width } = Dimensions.get('window');

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);

  const fullName = `${user?.firstName} ${user?.lastName}`;

  useEffect(() => {
    loadActivityCounts();
  }, []);

  const loadActivityCounts = async () => {
    try {
      const [bookingsRes, favoritesRes] = await Promise.all([
        api.getMyBookings(),
        api.getFavorites(),
      ]);

      setBookingsCount((bookingsRes.data.bookings || []).length);
      setFavoritesCount((favoritesRes.data.places || []).length);
    } catch (error) {
      console.error('Failed to load activity counts:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      const response = await api.updateProfile({
        firstName,
        lastName,
        phone,
        bio,
      });

      Alert.alert('Success', 'Profile updated successfully');
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                user?.profileImage ||
                'https://i.pravatar.cc/150?img=12',
            }}
            style={styles.avatarImage}
          />
        </View>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
      </View>

      {/* Edit Profile Button */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => setEditModalVisible(true)}
      >
        <Ionicons name="pencil" size={16} color="#fff" />
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications" size={20} color="#4f46e5" />
          <Text style={styles.menuLabel}>Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="lock-closed" size={20} color="#4f46e5" />
          <Text style={styles.menuLabel}>Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text" size={20} color="#4f46e5" />
          <Text style={styles.menuLabel}>Terms & Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Activity</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{bookingsCount}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{favoritesCount}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{reviewsCount}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>
            Quiet Hours v1.0.0
          </Text>
          <Text style={styles.versionText}>Find your perfect quiet space</Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out" size={18} color="#ef4444" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Bio"
              value={bio}
              onChangeText={setBio}
              multiline
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e2e8f0',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
  },
  phone: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    marginVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
    marginLeft: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  aboutBox: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  aboutText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  versionText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
