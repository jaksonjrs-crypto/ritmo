import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Header, uiStyles } from "@/components/ritmo-ui";
import { RITMO, RADIUS } from "@/constants/ritmo-theme";

export function StorageRecovery({ message, onRetry, onRestore }: { message: string | null; onRetry: () => Promise<void>; onRestore: () => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const run = async (action: "retry" | "restore") => {
    setBusy(true); setFeedback("");
    try {
      if (action === "retry") await onRetry();
      else if (!(await onRestore())) setFeedback("Não encontramos uma cópia segura neste aparelho.");
    } catch { setFeedback("A recuperação não foi concluída. Você pode tentar novamente."); }
    finally { setBusy(false); }
  };
  return <Screen>
    <Header showSettings={false} />
    <View style={styles.card}>
      <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={28} color={RITMO.oliveDark} /></View>
      <Text style={styles.eyebrow}>SEUS DADOS SÃO IMPORTANTES</Text>
      <Text style={styles.title}>Vamos abrir seu espaço com cuidado.</Text>
      <Text style={styles.copy}>{message || "O armazenamento local não respondeu. Seus dados não foram apagados; tente novamente ou recupere a última cópia salva."}</Text>
      {feedback ? <Text accessibilityRole="alert" style={styles.error}>{feedback}</Text> : null}
      <Pressable onPress={() => void run("retry")} disabled={busy} accessibilityRole="button" style={uiStyles.button}>{busy ? <ActivityIndicator color={RITMO.white} /> : <Text style={uiStyles.buttonText}>Tentar novamente</Text>}</Pressable>
      <Pressable onPress={() => void run("restore")} disabled={busy} accessibilityRole="button" style={uiStyles.outlineButton}><Text style={uiStyles.outlineButtonText}>Recuperar cópia segura</Text></Pressable>
      <Text style={styles.footnote}>Não vamos substituir seus dados sem a sua escolha.</Text>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({ card: { flex: 1, justifyContent: "center", gap: 13, backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line, borderRadius: RADIUS.lg, padding: 23 }, icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: RITMO.oliveWash, alignItems: "center", justifyContent: "center", marginBottom: 3 }, eyebrow: { color: RITMO.oliveDark, fontSize: 12, fontWeight: "800", letterSpacing: 1.1 }, title: { color: RITMO.ink, fontSize: 23, lineHeight: 29, fontWeight: "800", letterSpacing: -0.5 }, copy: { color: RITMO.muted, fontSize: 13, lineHeight: 20 }, error: { color: RITMO.danger, fontSize: 12, lineHeight: 17 }, footnote: { color: RITMO.muted, fontSize: 12, lineHeight: 15, textAlign: "center" } }) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
