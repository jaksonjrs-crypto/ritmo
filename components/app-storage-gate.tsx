import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StorageRecovery } from "@/components/storage-recovery";
import { RITMO } from "@/constants/ritmo-theme";
import { useAppState } from "@/providers/app-state-provider";

export function AppStorageGate({ children }: { children: ReactNode }) {
  const { storageStatus, saveError, dismissSaveError, retryStorage, restoreBackup } = useAppState();
  const insets = useSafeAreaInsets();

  if (storageStatus === "loading") {
    return <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Carregando seus dados locais">
      <ActivityIndicator size="large" color={RITMO.olive} />
      <Text style={styles.loadingText}>Preparando seu espaço…</Text>
    </View>;
  }
  if (storageStatus === "error") {
    return <StorageRecovery message={saveError} onRetry={retryStorage} onRestore={restoreBackup} />;
  }

  return <View style={styles.container}>
    {children}
    {saveError ? <View style={[styles.errorBanner, { top: Math.max(insets.top, 8) }]} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={19} color={RITMO.danger} />
      <Text style={styles.errorText} accessibilityLiveRegion="polite">{saveError}</Text>
      <Pressable onPress={dismissSaveError} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar aviso de armazenamento" style={styles.close}>
        <Ionicons name="close" size={18} color={RITMO.danger} />
      </Pressable>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: RITMO.bg },
  loadingText: { color: RITMO.muted, fontSize: 14, fontWeight: "600" },
  errorBanner: { position: "absolute", left: 12, right: 12, zIndex: 1000, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: "#E9C2B7", borderRadius: 14, backgroundColor: "#FFF6F2", shadowColor: "#242620", shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  errorText: { flex: 1, color: RITMO.danger, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
