import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { useAuthStore } from "@/store/store";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotateX = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["40deg", "0deg"],
  });

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.signup({
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
      });
      const { user, token } = response.data;
      
      await login(user, token);
      Alert.alert("Success", "Account created successfully!");
      router.replace("./(tabs)");
    } catch (error: any) {
      const message = error.response?.data?.message || "Signup failed";
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#312e81",
        justifyContent: "center",
      }}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Animated.View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 25,
            padding: 20,
            opacity: fadeAnim,
            transform: [{ perspective: 800 }, { rotateX }],
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 15,
            elevation: 10,
          }}
        >
          <Text
            style={{
              fontSize: 26,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            Create Account
          </Text>

          <TextInput
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            style={inputStyle}
          />

          <TextInput
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            style={inputStyle}
          />

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={inputStyle}
          />

          <TextInput
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={inputStyle}
          />

          <TextInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={inputStyle}
          />

          <TextInput
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={inputStyle}
          />

          <TouchableOpacity
            onPress={handleSignup}
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? "#9333ea80" : "#4f46e5",
              padding: 15,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 10,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
                Sign Up
              </Text>
            )}
          </TouchableOpacity>

          <Text
            onPress={() => router.push("/login")}
            style={{
              textAlign: "center",
              marginTop: 15,
              color: "#4f46e5",
            }}
          >
            Already have an account? Login
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: "#e5e7eb",
  padding: 12,
  borderRadius: 12,
  marginBottom: 12,
  backgroundColor: "#f9fafb",
};
