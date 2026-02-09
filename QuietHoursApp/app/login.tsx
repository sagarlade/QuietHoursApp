import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { useAuthStore } from "@/store/store";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuthStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const rotateX = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["35deg", "0deg"],
  });

  const floatMove = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      const { user, token } = response.data;
      
      await login(user, token);
      Alert.alert("Success", "Login successful!");
      router.replace("./(tabs)");
    } catch (error: any) {
      const message = error.response?.data?.message || "Login failed";
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#1e293b",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* floating background shape */}
      <Animated.View
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: 120,
          backgroundColor: "#3b82f633",
          top: 120,
          transform: [{ translateY: floatMove }],
        }}
      />

      <Animated.View
        style={{
          width: "85%",
          backgroundColor: "#ffffff",
          padding: 25,
          borderRadius: 20,
          opacity: fadeAnim,
          transform: [{ perspective: 800 }, { rotateX }],
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 15,
          elevation: 10,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Quiet Hours
        </Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={inputStyle}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={inputStyle}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? "#9333ea80" : "#4f46e5",
            padding: 15,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
              Login
            </Text>
          )}
        </TouchableOpacity>

        <Text
          style={{
            marginTop: 18,
            textAlign: "center",
            color: "#4f46e5",
          }}
          onPress={() => router.push("/signup")}
        >
          Create account
        </Text>
      </Animated.View>
    </View>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: "#e5e7eb",
  padding: 12,
  borderRadius: 12,
  marginBottom: 12,
  backgroundColor: "#f8fafc",
};
