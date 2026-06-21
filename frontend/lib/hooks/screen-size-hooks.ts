import { useEffect, useState } from "react";

export type ScreenSize = {
  width: number;
  height: number;
};

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize | null>(null);
  useEffect(() => {
    setScreenSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);
  return screenSize as ScreenSize;
}
