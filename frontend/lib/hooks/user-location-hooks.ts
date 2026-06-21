import { useEffect, useState } from "react";

export type UserLocation = {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
};

export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude ?? undefined,
            accuracy: position.coords.accuracy,
          });
        },
        () => {
          setLocation({
            latitude: 0,
            longitude: 0,
            altitude: 0,
            accuracy: 0,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, []);

  return location as UserLocation;
}
