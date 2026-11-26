import { useEffect, useMemo, useState } from "react";
import { Redirect, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Header, OfflineBanner, SectionTitle, EmptyState, ProgressRing, TaskCard } from "@/components/ritmo-ui";
import { TaskEditor } from "@/components/task-editor";
import { FocusSession } from "@/components/focus-session";
import { RITMO, RADIUS } from "@/constants/ritmo-theme";
import { greeting, timeLabel, todayLabel } from "@/lib/date";
import { isScheduledForToday, useAppState } from "@/providers/app-state-provider";
import { useConnectivity } from "@/hooks/use-connectivity";
import type { Task } from "@/providers/app-state-provider";
import { StorageRecovery } from "@/components/storage-recovery";

export default function TodayScreen() {
  const { data, storageStatus, retryStorage, restoreBackup, addTask, updateTask, toggleTask, deleteTask, saveError, dismissSaveError } = useAppState();
  const offline = useConnectivity();
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [focusVisible, setFocusVisible] = useState(false);
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(0);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      const refresh = () => setNow(Date.now());
      refresh();
      interval = setInterval(refresh, 60_000);
    }, 0);
    return () => { clearTimeout(timeout); if (interval) clearInterval(interval); };
  }, []);
  const todaysTasks = useMemo(() => data.tasks.filter((task) => isScheduledForToday(task) || (!task.scheduledAt && !task.completed)), [data.tasks]);
  const completed = todaysTasks.filter((task) => task.completed).length;
  const incompleteTasks = todaysTasks.filter((task) => !task.completed).sort((a, b) => {
    if (!a.scheduledAt) return 1;
    if (!b.scheduledAt) return -1;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });
  const nextTask = incompleteTasks.find((task) => !task.scheduledAt || new Date(task.scheduledAt).getTime() >= now) ?? incompleteTasks[0];
  const ordered = [...todaysTasks].sort((a, b) => {
    if (!a.scheduledAt) return 1;
    if (!b.scheduledAt) return -1;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });
  const showEditor = (task: Task | null = null) => { setEditing(task); setEditorVisible(true); };
  const persistTask = async (value: Omit<Task, "id" | "completed"> | Task) => {
    if ("id" in value) await updateTask(value); else await addTask(value);
    setToast("Seu próximo passo já está no lugar.");
    setTimeout(() => setToast(""), 2600);
  };

  if (storageStatus === "loading") return <View style={styles.loading}><ActivityIndicator size="large" color={RITMO.olive} /><Text style={styles.loadingText}>Preparando seu espaço…</Text></View>;
  if (storageStatus === "error") return <StorageRecovery message={saveError} onRetry={retryStorage} onRestore={restoreBackup} />;
  if (!data.onboardingComplete) return <Redirect href="/onboarding" />;

  return (
    <Screen>
      <Header date={todayLabel()} />
      <OfflineBanner visible={offline} />
      {saveError ? <View style={styles.errorBanner}><Ionicons name="alert-circle-outline" size={18} color={RITMO.danger} /><Text style={styles.errorText}>{saveError}</Text><Pressable onPress={dismissSaveError} accessibilityRole="button" accessibilityLabel="Fechar aviso"><Ionicons name="close" size={18} color={RITMO.danger} /></Pressable></View> : null}
      <View style={styles.intro}><Text style={styles.greeting}>{greeting()}, {data.preferences.displayName || "vamos começar"}.</Text><Text style={styles.headline}>Vamos por partes.</Text><Text style={styles.lead}>Seu dia não precisa caber inteiro na cabeça.</Text></View>
      <View style={styles.progressCard}>
        <View style={styles.progressCopy}><Text style={styles.cardEyebrow}>SEU RITMO HOJE</Text><Text style={styles.progressTitle}>{completed === todaysTasks.length && todaysTasks.length > 0 ? "Que bom ver seu avanço." : nextTask ? "Um passo de cada vez." : "Dia aberto para você."}</Text><Text style={styles.progressCaption}>{completed} de {todaysTasks.length} {todaysTasks.length === 1 ? "passo" : "passos"} concluídos</Text><Pressable onPress={() => showEditor()} accessibilityRole="button" style={styles.quickAdd}><Ionicons name="add" size={17} color={RITMO.oliveDark} /><Text style={styles.quickAddText}>Adicionar tarefa</Text></Pressable></View>
        <ProgressRing value={completed} total={Math.max(1, todaysTasks.length)} size={74} color={RITMO.olive} />
        <View style={styles.progressDecorOne} /><View style={styles.progressDecorTwo} />
      </View>
      <View>
        <SectionTitle title="Seu próximo passo" action={nextTask ? "Foco" : undefined} onAction={() => setFocusVisible(true)} />
        {nextTask ? <View style={styles.nextCard}><View style={styles.nextTop}><View style={styles.nowTag}><View style={styles.nowDot} /><Text style={styles.nowText}>{nextTask.scheduledAt ? `ÀS ${timeLabel(nextTask.scheduledAt)}` : "QUANDO VOCÊ QUISER"}</Text></View><Text style={styles.duration}>{nextTask.estimateMin} min</Text></View><Text style={styles.nextTitle}>{nextTask.title}</Text><Text style={styles.nextDescription}>{nextTask.note || "Você só precisa começar pelo primeiro minuto."}</Text><Pressable onPress={() => setFocusVisible(true)} accessibilityRole="button" style={styles.focusButton}><Ionicons name="play" size={15} color={RITMO.white} /><Text style={styles.focusButtonText}>Começar foco</Text><Ionicons name="arrow-forward" size={16} color={RITMO.white} /></Pressable></View> : <EmptyState icon="sparkles-outline" title="Sem pressa. Você chegou." message="Seu dia está livre por enquanto. Coloque um próximo passo aqui quando quiser." action="Criar tarefa" onAction={() => showEditor()} />}
      </View>
      <View>
        <SectionTitle title="Ainda no seu dia" action="Ver todas" onAction={() => router.push("/(tabs)/tasks")} />
        {ordered.length ? <View style={styles.taskList}>{ordered.slice(0, 4).map((task) => <TaskCard key={task.id} task={task} onToggle={() => void toggleTask(task.id).catch(() => undefined)} onEdit={() => showEditor(task)} />)}</View> : <Text style={styles.noMore}>Um espaço em branco também pode ser um bom plano.</Text>}
      </View>
      {toast ? <View accessibilityLiveRegion="polite" style={styles.toast}><Ionicons name="checkmark-circle" size={17} color={RITMO.oliveDark} /><Text style={styles.toastText}>{toast}</Text></View> : null}
      <TaskEditor visible={editorVisible} task={editing} goals={data.goals} onClose={() => setEditorVisible(false)} onSave={persistTask} onDelete={deleteTask} />
      <FocusSession visible={focusVisible} taskTitle={nextTask?.title ?? "Escolha um próximo passo"} minutes={data.preferences.focusMinutes} onClose={() => setFocusVisible(false)} onComplete={() => { if (nextTask) void toggleTask(nextTask.id).catch(() => undefined); setFocusVisible(false); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: RITMO.bg, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: RITMO.muted, fontSize: 13 },
  intro: { gap: 5, paddingTop: 1 },
  greeting: { color: RITMO.oliveDark, fontSize: 13, fontWeight: "700" },
  headline: { color: RITMO.ink, fontSize: 29, fontWeight: "800", letterSpacing: -0.9, lineHeight: 34 },
  lead: { color: RITMO.muted, fontSize: 13, lineHeight: 19 },
  progressCard: { minHeight: 170, backgroundColor: RITMO.oliveWash, borderRadius: RADIUS.lg, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden", position: "relative" },
  progressCopy: { flex: 1, gap: 7, zIndex: 1 },
  cardEyebrow: { color: RITMO.oliveDark, fontSize: 12, fontWeight: "800", letterSpacing: 1.1 },
  progressTitle: { color: RITMO.ink, fontSize: 18, lineHeight: 22, fontWeight: "800", maxWidth: 210 },
  progressCaption: { color: RITMO.muted, fontSize: 12 },
  quickAdd: { alignSelf: "flex-start", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: RITMO.white, paddingHorizontal: 10, borderRadius: 999, marginTop: 4 },
  quickAddText: { color: RITMO.oliveDark, fontSize: 12, fontWeight: "700" },
  progressDecorOne: { position: "absolute", right: -24, top: -45, width: 115, height: 115, borderRadius: 60, borderWidth: 1, borderColor: "#DDE4C9" },
  progressDecorTwo: { position: "absolute", right: -58, bottom: -64, width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: "#DDE4C9" },
  nextCard: { backgroundColor: RITMO.ink, borderRadius: RADIUS.lg, padding: 19, gap: 11 },
  nextTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nowTag: { flexDirection: "row", alignItems: "center", gap: 7 }, nowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#B8CB70" }, nowText: { color: "#CFD5BD", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  duration: { color: "#C0C2B9", fontSize: 12, fontWeight: "600" },
  nextTitle: { color: RITMO.white, fontSize: 20, lineHeight: 25, fontWeight: "700", letterSpacing: -0.35 },
  nextDescription: { color: "#C2C5BB", fontSize: 12, lineHeight: 17 },
  focusButton: { alignSelf: "flex-start", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: RITMO.olive, paddingHorizontal: 13, borderRadius: 12, marginTop: 2 },
  focusButtonText: { color: RITMO.white, fontSize: 12, fontWeight: "700" },
  taskList: { gap: 9 },
  noMore: { color: RITMO.muted, fontSize: 13, lineHeight: 20, padding: 8 },
  errorBanner: { flexDirection: "row", gap: 8, alignItems: "center", padding: 11, borderRadius: 13, backgroundColor: RITMO.dangerWash },
  errorText: { flex: 1, color: RITMO.danger, fontSize: 12, lineHeight: 15 },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: RITMO.white, borderColor: RITMO.line, borderWidth: 1, borderRadius: 14, padding: 12 },
  toastText: { color: RITMO.oliveDark, fontSize: 12, fontWeight: "700" },
}) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
