import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticTab } from "@/components/haptic-tab";
import { RITMO } from "@/constants/ritmo-theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 9 : Math.max(insets.bottom, 9);
  const height = 62 + bottomPadding;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarActiveTintColor: RITMO.oliveDark,
      tabBarInactiveTintColor: RITMO.muted,
      tabBarStyle: { height, paddingTop: 7, paddingBottom: bottomPadding, backgroundColor: RITMO.white, borderTopColor: RITMO.line, borderTopWidth: 1, elevation: 0 },
      tabBarLabelStyle: { fontSize: 12, fontWeight: "700", marginTop: 1 },
      sceneStyle: { backgroundColor: RITMO.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: "Hoje", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "sunny" : "sunny-outline"} size={20} color={typeof color === "string" ? color : focused ? RITMO.oliveDark : RITMO.muted} /> }} />
      <Tabs.Screen name="tasks" options={{ title: "Tarefas", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "checkmark-circle" : "checkmark-circle-outline"} size={20} color={typeof color === "string" ? color : focused ? RITMO.oliveDark : RITMO.muted} /> }} />
      <Tabs.Screen name="plan" options={{ title: "Planejar", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={20} color={typeof color === "string" ? color : focused ? RITMO.oliveDark : RITMO.muted} /> }} />
      <Tabs.Screen name="goals" options={{ title: "Metas", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={20} color={typeof color === "string" ? color : focused ? RITMO.oliveDark : RITMO.muted} /> }} />
    </Tabs>
  );
}
