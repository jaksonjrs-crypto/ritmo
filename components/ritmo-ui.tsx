import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { router } from "expo-router";
import { RITMO, RADIUS } from "@/constants/ritmo-theme";
import { timeLabel } from "@/lib/date";
import type { Task } from "@/providers/app-state-provider";

export function Screen({ children, scroll = true, contentStyle }: { children: React.ReactNode; scroll?: boolean; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      {scroll ? <ScrollView contentContainerStyle={[styles.content, contentStyle]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[styles.content, contentStyle]}>{children}</View>}
    </SafeAreaView>
  );
}

export function Header({ date, showSettings = true }: { date?: string; showSettings?: boolean }) {
  return (
    <View style={styles.header}>
      <View>
        <View style={styles.wordmarkRow}>
          <View style={styles.wordmarkMark}><View style={styles.markArc} /><View style={styles.markDot} /></View>
          <Text style={styles.wordmark}>ritmo</Text>
        </View>
        {date ? <Text style={styles.headerDate}>{date}</Text> : null}
      </View>
      {showSettings ? <Pressable onPress={() => router.push("/settings")} accessibilityRole="button" accessibilityLabel="Abrir configurações" style={styles.iconButton}><Ionicons name="settings-outline" size={21} color={RITMO.ink} /></Pressable> : null}
    </View>
  );
}

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View accessibilityRole="alert" style={styles.offlineBanner}>
      <Ionicons name="cloud-offline-outline" size={17} color={RITMO.blue} />
      <Text style={styles.offlineText}>Sem conexão. Seu dia segue salvo neste aparelho.</Text>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{title}</Text>{action && onAction ? <Pressable onPress={onAction} accessibilityRole="button"><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}</View>;
}

export function EmptyState({ icon, title, message, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={25} color={RITMO.olive} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action && onAction ? <Pressable style={styles.emptyAction} onPress={onAction} accessibilityRole="button"><Text style={styles.emptyActionText}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function ProgressRing({ value, total, size = 72, color = RITMO.olive }: { value: number; total: number; size?: number; color?: string }) {
  const percentage = total ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percentage }} accessibilityLabel={`${value} de ${total} tarefas concluídas`} style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: percentage === 100 ? color : RITMO.line }]}>
      <View style={[styles.ringAccent, { borderColor: `${color}55`, borderTopColor: color, borderRightColor: percentage > 30 ? color : `${color}55`, transform: [{ rotate: `${percentage * 3.6}deg` }] }]} />
      <Text style={[styles.ringNumber, { fontSize: size * 0.22 }]}>{percentage}%</Text>
    </View>
  );
}

export function TaskCard({ task, onToggle, onEdit }: { task: Task; onToggle: () => void; onEdit: () => void }) {
  const priorityColor = task.priority === "alta" ? RITMO.peach : task.priority === "média" ? RITMO.gold : RITMO.blue;
  const priorityWash = task.priority === "alta" ? RITMO.peachWash : task.priority === "média" ? RITMO.goldWash : RITMO.blueWash;
  return (
    <View style={[styles.taskCard, task.completed && styles.taskDone]}>
      <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} accessibilityLabel={`${task.completed ? "Reabrir" : "Concluir"}: ${task.title}`} style={[styles.checkButton, task.completed && styles.checkButtonDone]}>
        {task.completed ? <Ionicons name="checkmark" size={16} color={RITMO.white} /> : null}
      </Pressable>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Editar tarefa ${task.title}`} style={styles.taskBody}>
        <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>{task.title}</Text>
        <View style={styles.taskMetaRow}>
          {task.scheduledAt ? <Text style={styles.taskMeta}><Ionicons name="time-outline" size={13} color={RITMO.muted} /> {timeLabel(task.scheduledAt)}</Text> : null}
          <Text style={styles.taskMeta}>{task.estimateMin} min</Text>
          <View style={[styles.priorityTag, { backgroundColor: priorityWash }]}><Text style={[styles.priorityText, { color: priorityColor }]}>{task.priority}</Text></View>
        </View>
      </Pressable>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Mais opções para ${task.title}`} hitSlop={10} style={styles.moreButton}><Ionicons name="ellipsis-horizontal" size={18} color={RITMO.muted} /></Pressable>
    </View>
  );
}

export const uiStyles = {
  card: { backgroundColor: RITMO.surface, borderColor: RITMO.line, borderWidth: 1, borderRadius: RADIUS.lg, padding: 18 } satisfies ViewStyle,
  title: { color: RITMO.ink, fontSize: 28, lineHeight: 34, fontWeight: "700" } satisfies TextStyle,
  eyebrow: { color: RITMO.oliveDark, fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" } satisfies TextStyle,
  body: { color: RITMO.muted, fontSize: 14, lineHeight: 21 } satisfies TextStyle,
  button: { minHeight: 52, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.md, paddingHorizontal: 18, backgroundColor: RITMO.olive } satisfies ViewStyle,
  buttonText: { color: RITMO.white, fontSize: 15, fontWeight: "700" } satisfies TextStyle,
  outlineButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.md, paddingHorizontal: 16, backgroundColor: RITMO.white, borderColor: RITMO.line, borderWidth: 1 } satisfies ViewStyle,
  outlineButtonText: { color: RITMO.ink, fontSize: 14, fontWeight: "600" } satisfies TextStyle,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: RITMO.bg },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34, gap: 22, width: "100%", maxWidth: 600, alignSelf: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  wordmarkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordmarkMark: { width: 22, height: 22, justifyContent: "center", alignItems: "center", position: "relative" },
  markArc: { width: 18, height: 18, borderWidth: 2.5, borderColor: RITMO.olive, borderTopColor: "transparent", borderRadius: 10, transform: [{ rotate: "-42deg" }] },
  markDot: { position: "absolute", width: 5, height: 5, borderRadius: 3, backgroundColor: RITMO.peach, top: 1, right: 1 },
  wordmark: { color: RITMO.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.6 },
  headerDate: { color: RITMO.muted, fontSize: 12, marginTop: 5, textTransform: "capitalize" },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: RITMO.line, backgroundColor: RITMO.surface, alignItems: "center", justifyContent: "center" },
  offlineBanner: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 11, paddingHorizontal: 13, backgroundColor: RITMO.blueWash, borderRadius: RADIUS.md },
  offlineText: { flex: 1, color: RITMO.blue, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: RITMO.ink, fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  sectionAction: { color: RITMO.oliveDark, fontSize: 13, fontWeight: "700" },
  emptyCard: { backgroundColor: RITMO.surface, borderColor: RITMO.line, borderWidth: 1, borderRadius: RADIUS.lg, padding: 23, alignItems: "center", gap: 9 },
  emptyIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: RITMO.oliveWash, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  emptyTitle: { color: RITMO.ink, fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyMessage: { color: RITMO.muted, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 280 },
  emptyAction: { marginTop: 6, minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 13, backgroundColor: RITMO.oliveWash },
  emptyActionText: { color: RITMO.oliveDark, fontWeight: "700", fontSize: 13 },
  ring: { alignItems: "center", justifyContent: "center", borderWidth: 5, position: "relative", backgroundColor: RITMO.white },
  ringAccent: { position: "absolute", top: -5, left: -5, right: -5, bottom: -5, borderWidth: 5, borderRadius: 999 },
  ringNumber: { color: RITMO.ink, fontWeight: "800" },
  taskCard: { flexDirection: "row", alignItems: "center", backgroundColor: RITMO.surface, borderColor: RITMO.line, borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  taskDone: { opacity: 0.74 },
  checkButton: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.7, borderColor: "#C8C9BF", alignItems: "center", justifyContent: "center" },
  checkButtonDone: { backgroundColor: RITMO.olive, borderColor: RITMO.olive },
  taskBody: { flex: 1, gap: 7 },
  taskTitle: { color: RITMO.ink, fontSize: 14, fontWeight: "600", lineHeight: 19 },
  taskTitleDone: { color: RITMO.muted, textDecorationLine: "line-through" },
  taskMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  taskMeta: { color: RITMO.muted, fontSize: 12, lineHeight: 15 },
  priorityTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.pill },
  priorityText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  moreButton: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
}) as unknown as Record<string, ViewStyle & TextStyle>;
