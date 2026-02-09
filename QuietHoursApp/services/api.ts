import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEFAULT_BASE_URL = Platform.select({
  web: 'https://quiethoursapp.onrender.com/api',
  default: 'https://quiethoursapp.onrender.com/api',
});

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add interceptor to include token in requests
    this.client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle responses
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
          // Redirect to login
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  signup = (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
  }) => this.client.post('/auth/signup', data);

  login = (email: string, password: string) =>
    this.client.post('/auth/login', { email, password });

  getProfile = () => this.client.get('/auth/profile');

  updateProfile = (data: any) =>
    this.client.put('/auth/profile', data);

  // Places endpoints
  getNearbyPlaces = (latitude: number, longitude: number, radius?: number) =>
    this.client.get('/places/nearby', {
      params: { latitude, longitude, radius },
    });

  getAllPlaces = (skip?: number, limit?: number) =>
    this.client.get('/places', { params: { skip, limit } });

  getPlaceDetail = (id: string) =>
    this.client.get(`/places/${id}`);

  searchPlaces = (query: string, latitude?: number, longitude?: number) =>
    this.client.post('/places/search', { query, latitude, longitude });

  addPlace = (placeData: any) =>
    this.client.post('/places', placeData);

  // Bookings endpoints
  createBooking = (bookingData: {
    placeId: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }) => this.client.post('/bookings', bookingData);

  getMyBookings = (status?: string, skip?: number, limit?: number) =>
    this.client.get('/bookings', { params: { status, skip, limit } });

  getBookingDetail = (id: string) =>
    this.client.get(`/bookings/${id}`);

  updateBooking = (id: string, data: any) =>
    this.client.put(`/bookings/${id}`, data);

  cancelBooking = (id: string) =>
    this.client.delete(`/bookings/${id}`);

  // Favorites endpoints
  addFavorite = (placeId: string) =>
    this.client.post('/favorites', { placeId });

  removeFavorite = (placeId: string) =>
    this.client.delete(`/favorites/${placeId}`);

  getFavorites = (skip?: number, limit?: number) =>
    this.client.get('/favorites', { params: { skip, limit } });

  isFavorite = (placeId: string) =>
    this.client.get(`/favorites/${placeId}/check`);

  addReview = (reviewData: {
    placeId: string;
    rating: number;
    comment?: string;
  }) => this.client.post('/favorites/review', reviewData);

  // Health check
  healthCheck = () => this.client.get('/health');
}

export default new APIClient();
