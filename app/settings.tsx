import { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { Screen, Header } from "@/components/ritmo-ui";
import { RITMO, RADIUS } from "@/constants/ritmo-theme";
import { useAppState } from "@/providers/app-state-provider";
import type { Preferences } from "@/providers/app-state-provider";

export default function SettingsScreen() {
  const { data, updatePreferences, resetData } = useAppState();
  const [permissionHint, setPermissionHint] = useState("");
  const [savedHint, setSavedHint] = useState("");
  const savePreference = (patch: Partial<Preferences>) => { void updatePreferences(patch).catch(() => undefined); };

  const toggleReminders = async (enabled: boolean) => {
    setPermissionHint(""); setSavedHint("");
    if (!enabled) { try { await updatePreferences({ remindersEnabled: false }); setSavedHint("Lembretes pausados."); } catch { /* O aviso global informa a falha de armazenamento. */ } return; }
    if (Platform.OS === "web") { setPermissionHint("Lembretes do dispositivo ficam disponíveis no app instalado. Suas tarefas continuam salvas aqui."); return; }
    try {
      if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("ritmo-reminders", { name: "Lembretes do Ritmo", importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 220, 120, 220], lightColor: RITMO.olive });
      const current = await Notifications.getPermissionsAsync();
      const result = current.granted ? current : await Notifications.requestPermissionsAsync();
      if (result.granted) { await updatePreferences({ remindersEnabled: true }); setSavedHint("Lembretes ativados para suas tarefas com horário."); }
      else setPermissionHint("A permissão está desligada. Você pode autorizá-la nas configurações do dispositivo.");
    } catch { setPermissionHint("Não foi possível atualizar os lembretes. Verifique o aviso do aplicativo e tente novamente."); }
  };

  const clear = () => {
    const action = async () => { try { await resetData(); setSavedHint("Dados locais limpos. Você pode começar uma lista nova."); } catch { /* O aviso global informa a falha de armazenamento. */ } };
    if (Platform.OS === "web") { if (typeof window !== "undefined" && window.confirm("Apagar tarefas, metas e preferências deste aparelho? Esta ação não pode ser desfeita.")) void action(); }
    else Alert.alert("Apagar dados locais?", "Tarefas, metas e preferências serão removidas deste aparelho.", [{ text: "Cancelar", style: "cancel" }, { text: "Apagar dados", style: "destructive", onPress: () => void action() }]);
  };

  return (
    <Screen>
      <Header showSettings={false} date="Seu espaço, do seu jeito." />
      <View style={styles.pageTitle}><Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Voltar"><Ionicons name="arrow-back" size={20} color={RITMO.ink} /></Pressable><Text style={styles.title}>Configurações</Text></View>
      <View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{(data.preferences.displayName || "R").slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.profileName}>{data.preferences.displayName || "Seu espaço pessoal"}</Text><Text style={styles.profileNote}>Seus dados vivem neste aparelho</Text></View><Ionicons name="lock-closed-outline" size={17} color={RITMO.oliveDark} /></View>
      <View><Text style={styles.groupTitle}>SEU RITMO</Text><View style={styles.group}>
        <View style={styles.settingRow}><View style={[styles.settingIcon, { backgroundColor: RITMO.oliveWash }]}><Ionicons name="notifications-outline" size={18} color={RITMO.oliveDark} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>Lembretes de tarefas</Text><Text style={styles.settingSubtitle}>{data.preferences.remindersEnabled ? "Ativos para tarefas com horário" : "Só notificamos com sua permissão"}</Text></View><Switch value={data.preferences.remindersEnabled} onValueChange={(value) => void toggleReminders(value)} trackColor={{ false: "#D7D8D1", true: "#A8B77A" }} thumbColor={data.preferences.remindersEnabled ? RITMO.olive : "#FFFFFF"} accessibilityLabel="Ativar lembretes de tarefas" /></View>
        <View style={styles.divider} />
        <View style={styles.settingRow}><View style={[styles.settingIcon, { backgroundColor: RITMO.peachWash }]}><Ionicons name="hourglass-outline" size={18} color={RITMO.peach} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>Duração do foco</Text><Text style={styles.settingSubtitle}>Minutos por sessão</Text></View><View style={styles.stepper}><Pressable onPress={() => savePreference({ focusMinutes: Math.max(10, data.preferences.focusMinutes - 5) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Diminuir tempo de foco"><Ionicons name="remove" size={17} color={RITMO.ink} /></Pressable><Text style={styles.stepValue}>{data.preferences.focusMinutes}</Text><Pressable onPress={() => savePreference({ focusMinutes: Math.min(60, data.preferences.focusMinutes + 5) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Aumentar tempo de foco"><Ionicons name="add" size={17} color={RITMO.ink} /></Pressable></View></View>
        <View style={styles.divider} />
        <View style={styles.settingRow}><View style={[styles.settingIcon, { backgroundColor: RITMO.blueWash }]}><Ionicons name="phone-portrait-outline" size={18} color={RITMO.blue} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>Retorno tátil</Text><Text style={styles.settingSubtitle}>Toques leves ao interagir</Text></View><Switch value={data.preferences.hapticsEnabled} onValueChange={(value) => savePreference({ hapticsEnabled: value })} trackColor={{ false: "#D7D8D1", true: "#A8B77A" }} thumbColor={data.preferences.hapticsEnabled ? RITMO.olive : "#FFFFFF"} accessibilityLabel="Ativar retorno tátil" /></View>
      </View></View>
      {permissionHint ? <View style={styles.notice}><Ionicons name="information-circle-outline" size={18} color={RITMO.blue} /><Text style={styles.noticeText}>{permissionHint}</Text>{Platform.OS !== "web" ? <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button"><Text style={styles.noticeAction}>Abrir ajustes</Text></Pressable> : null}</View> : null}
      {savedHint ? <View accessibilityLiveRegion="polite" style={styles.success}><Ionicons name="checkmark-circle-outline" size={18} color={RITMO.oliveDark} /><Text style={styles.successText}>{savedHint}</Text></View> : null}
      <View><Text style={styles.groupTitle}>SEUS DADOS</Text><View style={styles.group}><Pressable onPress={clear} style={styles.dangerRow} accessibilityRole="button"><View style={styles.settingIcon}><Ionicons name="trash-outline" size={18} color={RITMO.danger} /></View><View style={styles.settingCopy}><Text style={styles.dangerTitle}>Apagar dados locais</Text><Text style={styles.settingSubtitle}>Tarefas, metas e preferências</Text></View><Ionicons name="chevron-forward" size={17} color={RITMO.muted} /></Pressable></View><Text style={styles.footnote}>Ritmo versão 1.0 · Seus dados não são enviados para um servidor.</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: -8 }, back: { width: 44, height: 44, borderRadius: 14, backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line, alignItems: "center", justifyContent: "center" }, title: { color: RITMO.ink, fontSize: 27, fontWeight: "800", letterSpacing: -0.7 },
  profile: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: RADIUS.lg, backgroundColor: RITMO.oliveWash }, avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: RITMO.olive }, avatarText: { color: RITMO.white, fontSize: 17, fontWeight: "800" }, profileName: { color: RITMO.ink, fontSize: 13, fontWeight: "700" }, profileNote: { color: RITMO.muted, fontSize: 12, marginTop: 3 },
  groupTitle: { color: RITMO.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.1, marginBottom: 9, marginLeft: 2 }, group: { paddingHorizontal: 14, backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line, borderRadius: RADIUS.lg }, settingRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 11 }, settingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: RITMO.dangerWash, alignItems: "center", justifyContent: "center" }, settingCopy: { flex: 1, gap: 3 }, settingTitle: { color: RITMO.ink, fontSize: 12, fontWeight: "700" }, settingSubtitle: { color: RITMO.muted, fontSize: 12, lineHeight: 14 }, divider: { height: 1, backgroundColor: RITMO.line, marginLeft: 47 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: RITMO.bg, borderRadius: 11 }, stepValue: { minWidth: 22, textAlign: "center", color: RITMO.ink, fontSize: 12, fontWeight: "800" },
  notice: { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", gap: 8, backgroundColor: RITMO.blueWash, borderRadius: 14, padding: 12 }, noticeText: { flex: 1, minWidth: 150, color: RITMO.blue, fontSize: 12, lineHeight: 16 }, noticeAction: { color: RITMO.blue, fontSize: 12, fontWeight: "800" }, success: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 13, backgroundColor: RITMO.oliveWash }, successText: { flex: 1, color: RITMO.oliveDark, fontSize: 12, fontWeight: "700", lineHeight: 16 },
  dangerRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 11 }, dangerTitle: { color: RITMO.danger, fontSize: 12, fontWeight: "700" }, footnote: { color: RITMO.muted, fontSize: 12, lineHeight: 15, marginTop: 10, paddingHorizontal: 2 },
}) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
