// src/hooks/useGeolocation.ts
// GPS location capture hook

import { useState, useCallback } from 'react';
import type { GPSLocation } from '../types';

interface GeolocationState {
  location: GPSLocation | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: false,
  });

  const getLocation = useCallback((): Promise<GPSLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser.';
        setState(prev => ({ ...prev, error: err }));
        reject(new Error(err));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
          };
          setState({ location: loc, error: null, isLoading: false });
          resolve(loc);
        },
        (error) => {
          let message: string;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied. Please allow location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location unavailable. Please try again.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out. Please try again.';
              break;
            default:
              message = 'An unknown error occurred.';
          }
          setState({ location: null, error: message, isLoading: false });
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, []);

  return { ...state, getLocation };
}

/**
 * Reverse geocode coordinates to a human-readable address using Nominatim.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'AttendanceSystem/1.0' } }
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
}
