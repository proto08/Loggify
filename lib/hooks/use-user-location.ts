import { useEffect, useState } from "react";

type UserLocation = {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy: number;
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude ?? null,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          // TODO: handle error
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, []);

  return location;
}
