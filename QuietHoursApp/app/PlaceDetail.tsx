// app/(tabs)/PlaceDetail.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePlacesStore, useAuthStore } from "@/store/store";
import api from "@/services/api";

const { width } = Dimensions.get("window");

// Define Place type
type Place = {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  distance?: string;
  image?: string;
  hourlyRate?: number;
  amenities?: string;
  description?: string;
};

export default function PlaceDetail() {
  const router = useRouter();
  const { selectedPlace, setSelectedPlace } = usePlacesStore();
  const { user } = useAuthStore();
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [isSavingPlace, setIsSavingPlace] = useState(false);

  const place: Place | null = selectedPlace;

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  useEffect(() => {
    if (!place) return;
    if (isUuid(place.id)) {
      loadPlaceDetails();
      checkIfFavorite();
      return;
    }
    setReviews([]);
    setIsFavorite(false);
    savePlaceToDatabase();
  }, [place]);

  const savePlaceToDatabase = async () => {
    if (!place || isUuid(place.id) || isSavingPlace) return;
    setIsSavingPlace(true);
    try {
      const response = await api.addPlace({
        name: place.name,
        description: place.description,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        placeType: place.amenities ? place.amenities.split(",")[0] : undefined,
        amenities: place.amenities,
        image: place.image,
        googlePlaceId: place.id ? `osm:${place.id}` : undefined,
      });
      if (response?.data?.place?.id) {
        setSelectedPlace(response.data.place);
      }
    } catch (error) {
      console.error("Failed to save place:", error);
    } finally {
      setIsSavingPlace(false);
    }
  };

  const loadPlaceDetails = async () => {
    try {
      const response = await api.getPlaceDetail(place.id);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error("Failed to load place details:", error);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const response = await api.isFavorite(place.id);
      setIsFavorite(response.data.isFavorite);
    } catch (error) {
      console.error("Failed to check favorite:", error);
    }
  };

  const handleAddFavorite = async () => {
    if (!place || !isUuid(place.id)) {
      Alert.alert("Not ready", "Please wait while we save this place.");
      return;
    }
    try {
      if (isFavorite) {
        await api.removeFavorite(place.id);
      } else {
        await api.addFavorite(place.id);
      }
      setIsFavorite(!isFavorite);
      Alert.alert("Success", isFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      Alert.alert("Error", "Failed to update favorite");
    }
  };

  const handleBooking = async () => {
    if (!place || !isUuid(place.id)) {
      Alert.alert("Not ready", "Please wait while we save this place.");
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select start and end dates");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.createBooking({
        placeId: place.id,
        startTime: startDate,
        endTime: endDate,
        notes,
      });

      Alert.alert("Success", "Booking created! Booking ID: " + response.data.booking.id);
      setBookingModalVisible(false);
      setStartDate("");
      setEndDate("");
      setNotes("");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Booking failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!place || !isUuid(place.id)) {
      Alert.alert("Not ready", "Please wait while we save this place.");
      return;
    }
    router.push({ pathname: "/AddReview" });
  };

  if (!place) {
    return (
      <View style={styles.container}>
        <Text>No place data found.</Text>
      </View>
    );
  }

  const amenitiesList = place.amenities ? place.amenities.split(",") : [];
  const defaultPhoto =
    place.image || "https://via.placeholder.com/400x200?text=Quiet+Hours+Place";
  const safeText = (value?: string | number | null) => (value === null || value === undefined ? "" : String(value));

  return (
    <>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Photo carousel */}
            <View style={styles.photoContainer}>
              <Image source={{ uri: defaultPhoto }} style={styles.photo} />
              <TouchableOpacity style={styles.favoriteButton} onPress={handleAddFavorite}>
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={28}
                  color={isFavorite ? "#ff4757" : "white"}
                />
              </TouchableOpacity>
            </View>

            {/* Place Info */}
            <View style={styles.infoContainer}>
              <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                <Text style={styles.name}>{safeText(place.name)}</Text>
                <Text style={styles.address}>{safeText(place.address)}</Text>
                </View>
              </View>

            {place.rating !== undefined && place.rating !== null && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={20} color="#fbbf24" />
                  <Text style={styles.ratingText}>{safeText(place.rating)}</Text>
              </View>
            )}

            {place.description ? (
              <Text style={styles.description}>{safeText(place.description)}</Text>
            ) : null}

            {place.hourlyRate !== undefined && place.hourlyRate !== null && (
                <Text style={styles.priceText}>${safeText(place.hourlyRate)} per hour</Text>
            )}
            </View>

            {/* Amenities */}
            {amenitiesList.length > 0 && (
              <View style={styles.amenitiesContainer}>
                <Text style={styles.amenitiesHeader}>Amenities</Text>
                <View style={styles.amenitiesList}>
                  {amenitiesList.map((amenity, index) => (
                    <View key={index} style={styles.amenityTag}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.amenityText}>{amenity.trim()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Booking Button */}
            <TouchableOpacity
              style={styles.bookingButton}
              onPress={() => setBookingModalVisible(true)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                Book Now
              </Text>
            </TouchableOpacity>

            <Text style={styles.reviewHeader}>Reviews</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader2}>
            <Text style={{ fontWeight: "bold", fontSize: 14 }}>
              {safeText(item.firstName)} {safeText(item.lastName)}
            </Text>
              <View style={styles.ratingStars}>
                {Array(item.rating)
                  .fill(0)
                  .map((_, i) => (
                    <Ionicons key={i} name="star" size={14} color="#fbbf24" />
                  ))}
              </View>
            </View>
            <Text style={styles.reviewComment}>{safeText(item.comment)}</Text>
          </View>
        )}
        ListFooterComponent={
          <View>
            <TouchableOpacity style={styles.addReviewButton} onPress={handleAddReview}>
              <Ionicons name="add" size={24} color="#4f46e5" />
              <Text style={styles.addReviewText}>Add your review</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <BookingModal
        visible={bookingModalVisible}
        place={place}
        startDate={startDate}
        endDate={endDate}
        notes={notes}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        setNotes={setNotes}
        onBook={handleBooking}
        onClose={() => setBookingModalVisible(false)}
        isLoading={isLoading}
      />
    </>
  );
};
const BookingModal = ({
  visible,
  place,
  startDate,
  endDate,
  notes,
  setStartDate,
  setEndDate,
  setNotes,
  onBook,
  onClose,
  isLoading,
}) => {

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Book {place?.name}</Text>

          <TextInput
            style={styles.input}
            placeholder="Start Date (YYYY-MM-DD HH:MM)"
            value={startDate}
            onChangeText={setStartDate}
          />
          <TextInput
            style={styles.input}
            placeholder="End Date (YYYY-MM-DD HH:MM)"
            value={endDate}
            onChangeText={setEndDate}
          />
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Additional notes"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => onBook(startDate, endDate, notes)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  photoContainer: { position: "relative", width: width, height: 250 },
  photo: { width: "100%", height: 250 },
  favoriteButton: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: { padding: 16, backgroundColor: "#fff" },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  name: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  address: { fontSize: 14, color: "#64748b", marginTop: 6 },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginLeft: 6,
  },
  description: { fontSize: 14, color: "#475569", marginVertical: 8, lineHeight: 20 },
  priceText: { fontSize: 18, fontWeight: "bold", color: "#10b981", marginTop: 8 },
  amenitiesContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#f8fafc" },
  amenitiesHeader: { fontSize: 16, fontWeight: "bold", color: "#1e293b", marginBottom: 12 },
  amenitiesList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  amenityText: { fontSize: 13, color: "#047857", marginLeft: 6 },
  bookingButton: {
    backgroundColor: "#4f46e5",
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  reviewHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 12, marginHorizontal: 16, marginTop: 12, color: "#1e293b" },
  reviewHeader2: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  ratingStars: { flexDirection: "row" },
  reviewCard: {
    backgroundColor: "#fff",
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  reviewComment: { fontSize: 13, color: "#475569", lineHeight: 18 },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#4f46e5",
    borderRadius: 8,
  },
  addReviewText: { fontSize: 14, fontWeight: "600", color: "#4f46e5", marginLeft: 8 },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1e293b",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: "#f8fafc",
  },
  notesInput: { minHeight: 100, textAlignVertical: "top" },
  confirmButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  confirmButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: { color: "#334155", fontWeight: "600", fontSize: 14 },
});
