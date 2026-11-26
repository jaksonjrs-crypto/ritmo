import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { RITMO } from "@/constants/ritmo-theme";
import { useAppState } from "@/providers/app-state-provider";
import { uiStyles } from "@/components/ritmo-ui";

export default function OnboardingScreen() {
  const { completeOnboarding } = useAppState();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const toggleReminders = async (enabled: boolean) => {
    setError("");
    if (!enabled) { setRemindersEnabled(false); return; }
    if (Platform.OS === "web") { setError("Lembretes do dispositivo estão disponíveis no app instalado. Você pode ativá-los depois."); return; }
    try {
      if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("ritmo-reminders", { name: "Lembretes do Ritmo", importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 220, 120, 220], lightColor: RITMO.olive });
      const current = await Notifications.getPermissionsAsync();
      const result = current.granted ? current : await Notifications.requestPermissionsAsync();
      if (result.granted) setRemindersEnabled(true);
      else setError("A permissão não foi concedida. Você pode seguir sem lembretes ou ativá-los depois nas configurações.");
    } catch { setError("Não foi possível consultar a permissão. Você pode continuar sem lembretes e tentar novamente depois."); }
  };
  const begin = async () => {
    setBusy(true); setError("");
    try { await completeOnboarding(name, remindersEnabled); router.replace("/(tabs)"); }
    catch { setError("Não foi possível salvar esta preferência. Tente novamente."); }
    finally { setBusy(false); }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}><View style={styles.brand}><View style={styles.brandMark}><View style={styles.brandArc} /><View style={styles.brandDot} /></View><Text style={styles.brandName}>ritmo</Text></View><Text style={styles.step}>SEU DIA, NO SEU RITMO</Text></View>
        <View style={styles.hero}>
          <View style={styles.orbit}><View style={styles.orbitInner}><Ionicons name="leaf-outline" size={38} color={RITMO.oliveDark} /></View><View style={styles.orbitDot} /><View style={styles.orbitDotTwo} /></View>
          <Text style={styles.kicker}>MENOS CORRERIA. MAIS CLAREZA.</Text>
          <Text style={styles.headline}>Um próximo passo{ "\n" }de cada vez.</Text>
          <Text style={styles.copy}>Tarefas, tempo e metas em um só lugar — para você começar pelo que importa, sem precisar organizar tudo primeiro.</Text>
        </View>
        <View style={styles.benefits}>
          <Benefit icon="sunny-outline" title="Enxergue seu dia" text="Uma visão simples do que vem agora." />
          <Benefit icon="time-outline" title="Dê espaço ao foco" text="Planeje seu tempo com mais intenção." />
          <Benefit icon="trending-up-outline" title="Perceba o progresso" text="Pequenos passos também contam." />
        </View>
        <View style={styles.bottom}>
          <Text style={styles.fieldLabel}>Como podemos chamar você? <Text style={{ color: RITMO.muted, fontWeight: "400" }}>· opcional</Text></Text>
          <TextInput value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor="#A3A59C" style={styles.input} accessibilityLabel="Seu nome, opcional" returnKeyType="done" />
          <View style={styles.reminderRow}><View style={styles.reminderIcon}><Ionicons name="notifications-outline" size={17} color={RITMO.oliveDark} /></View><View style={styles.reminderCopy}><Text style={styles.reminderTitle}>Lembrar meus horários</Text><Text style={styles.reminderHint}>{Platform.OS === "web" ? "Disponível no app instalado" : "Só com sua permissão · opcional"}</Text></View><Switch value={remindersEnabled} disabled={busy || Platform.OS === "web"} onValueChange={(value) => void toggleReminders(value)} trackColor={{ false: "#D7D8D1", true: "#A8B77A" }} thumbColor={remindersEnabled ? RITMO.olive : "#FFFFFF"} accessibilityLabel="Ativar lembretes de tarefas" />
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable onPress={() => void begin()} disabled={busy} accessibilityRole="button" style={[uiStyles.button, styles.startButton]}><Text style={uiStyles.buttonText}>{busy ? "Preparando seu espaço…" : "Organizar meu dia"}</Text><Ionicons name="arrow-forward" size={18} color={RITMO.white} /></Pressable>
          <Text style={styles.privacy}>Seus dados ficam salvos neste aparelho. Lembretes podem ser ativados depois.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Benefit({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return <View style={styles.benefit}><View style={styles.benefitIcon}><Ionicons name={icon} size={18} color={RITMO.oliveDark} /></View><View style={{ flex: 1 }}><Text style={styles.benefitTitle}>{title}</Text><Text style={styles.benefitCopy}>{text}</Text></View><Ionicons name="checkmark-circle" size={18} color={RITMO.olive} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: RITMO.bg },
  content: { flexGrow: 1, width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20, justifyContent: "space-between" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 27, height: 27, alignItems: "center", justifyContent: "center", position: "relative" },
  brandArc: { width: 21, height: 21, borderWidth: 3, borderColor: RITMO.olive, borderTopColor: "transparent", borderRadius: 12, transform: [{ rotate: "-42deg" }] },
  brandDot: { position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: RITMO.peach, top: 0, right: 1 },
  brandName: { color: RITMO.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  step: { color: RITMO.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  hero: { alignItems: "flex-start", gap: 10, paddingTop: 10 },
  orbit: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: "#DCE2C7", alignItems: "center", justifyContent: "center", marginBottom: 8, position: "relative" },
  orbitInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: RITMO.oliveWash, alignItems: "center", justifyContent: "center" },
  orbitDot: { position: "absolute", width: 11, height: 11, borderRadius: 6, backgroundColor: RITMO.peach, right: 8, top: 11 },
  orbitDotTwo: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: RITMO.olive, left: 2, bottom: 23 },
  kicker: { color: RITMO.oliveDark, fontSize: 12, fontWeight: "800", letterSpacing: 1.4 },
  headline: { color: RITMO.ink, fontSize: 35, lineHeight: 40, fontWeight: "800", letterSpacing: -1.1 },
  copy: { color: RITMO.muted, fontSize: 15, lineHeight: 22, maxWidth: 380, marginTop: 1 },
  benefits: { gap: 11 },
  benefit: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 58, padding: 10, borderRadius: 16, backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line },
  benefitIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: RITMO.oliveWash, alignItems: "center", justifyContent: "center" },
  benefitTitle: { color: RITMO.ink, fontSize: 12, fontWeight: "700" },
  benefitCopy: { color: RITMO.muted, fontSize: 12, marginTop: 3 },
  bottom: { gap: 9, paddingTop: 8 },
  fieldLabel: { color: RITMO.ink, fontSize: 12, fontWeight: "700" },
  input: { minHeight: 49, borderRadius: 14, borderWidth: 1, borderColor: RITMO.line, backgroundColor: RITMO.white, paddingHorizontal: 14, color: RITMO.ink, fontSize: 14 },
  reminderRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: RITMO.line, backgroundColor: RITMO.white, borderRadius: 15, paddingHorizontal: 12 },
  reminderIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: RITMO.oliveWash, alignItems: "center", justifyContent: "center" },
  reminderCopy: { flex: 1, gap: 3 }, reminderTitle: { color: RITMO.ink, fontSize: 12, fontWeight: "700" }, reminderHint: { color: RITMO.muted, fontSize: 12, lineHeight: 15 },
  startButton: { flexDirection: "row", gap: 9, marginTop: 2 },
  privacy: { color: RITMO.muted, fontSize: 12, lineHeight: 14, textAlign: "center", marginTop: 1 },
  error: { color: RITMO.danger, fontSize: 12, fontWeight: "600" },
}) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
