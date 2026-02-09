import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  bio?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  login: async (user: User, token: string) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ user, token, error: null });
    } catch (error) {
      set({ error: 'Failed to save session' });
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      set({ user: null, token: null, error: null });
    } catch (error) {
      set({ error: 'Failed to logout' });
    }
  },

  restoreSession: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userStr = await AsyncStorage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token });
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  },
}));

interface PlacesStore {
  places: any[];
  nearbyPlaces: any[];
  selectedPlace: any | null;
  isLoading: boolean;
  error: string | null;

  setPlaces: (places: any[]) => void;
  setNearbyPlaces: (places: any[]) => void;
  setSelectedPlace: (place: any | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlacesStore = create<PlacesStore>((set) => ({
  places: [],
  nearbyPlaces: [],
  selectedPlace: null,
  isLoading: false,
  error: null,

  setPlaces: (places) => set({ places }),
  setNearbyPlaces: (nearbyPlaces) => set({ nearbyPlaces }),
  setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

interface BookingStore {
  bookings: any[];
  selectedBooking: any | null;
  isLoading: boolean;
  error: string | null;

  setBookings: (bookings: any[]) => void;
  setSelectedBooking: (booking: any | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  bookings: [],
  selectedBooking: null,
  isLoading: false,
  error: null,

  setBookings: (bookings) => set({ bookings }),
  setSelectedBooking: (selectedBooking) => set({ selectedBooking }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
