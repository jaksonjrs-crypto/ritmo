import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Network from "expo-network";

export function useConnectivity() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let active = true;
    const update = (connected: boolean | null | undefined) => {
      if (active && typeof connected === "boolean") setIsOffline(!connected);
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const onOnline = () => update(true);
      const onOffline = () => update(false);
      update(window.navigator.onLine);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        active = false;
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }

    let subscription: { remove: () => void } | undefined;
    void Network.getNetworkStateAsync().then((state) => update(state.isConnected)).catch(() => undefined);
    const result = Network.addNetworkStateListener((state) => update(state.isConnected));
    subscription = result;
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return isOffline;
}
