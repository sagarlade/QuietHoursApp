import dotenv from 'dotenv';

dotenv.config();

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  profileImage?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Place {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  placeType?: string;
  amenities?: string;
  rating?: number;
  image?: string;
  hourlyRate?: number;
  googlePlaceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  userId: string;
  placeId: string;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Favorite {
  id: string;
  userId: string;
  placeId: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  placeId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}
