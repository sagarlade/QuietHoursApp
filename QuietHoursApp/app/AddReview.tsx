import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { usePlacesStore } from "@/store/store";
import api from "@/services/api";

export default function AddReview() {
  const router = useRouter();
  const { selectedPlace } = usePlacesStore();
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const handleSubmit = async () => {
    if (!selectedPlace || !isUuid(selectedPlace.id)) {
      Alert.alert("Not available", "Reviews only work for saved places.");
      return;
    }

    const ratingValue = parseInt(rating, 10);
    if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      Alert.alert("Error", "Rating must be between 1 and 5.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.addReview({
        placeId: selectedPlace.id,
        rating: ratingValue,
        comment: comment.trim() || undefined,
      });
      Alert.alert("Success", "Review added.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to add review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Review</Text>
      <Text style={styles.subtitle}>{selectedPlace?.name || "Place"}</Text>

      <TextInput
        style={styles.input}
        value={rating}
        onChangeText={setRating}
        keyboardType="number-pad"
        placeholder="Rating (1-5)"
      />

      <TextInput
        style={[styles.input, styles.commentInput]}
        value={comment}
        onChangeText={setComment}
        placeholder="Comment (optional)"
        multiline
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
        <Text style={styles.primaryButtonText}>{isSubmitting ? "Saving..." : "Submit"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", color: "#1e293b" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 6, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: "#f8fafc",
  },
  commentInput: { minHeight: 100, textAlignVertical: "top" },
  primaryButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: { color: "#334155", fontWeight: "600", fontSize: 14 },
});
