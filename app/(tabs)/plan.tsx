import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Header, OfflineBanner, EmptyState, SectionTitle, TaskCard } from "@/components/ritmo-ui";
import { TaskEditor } from "@/components/task-editor";
import { RITMO, RADIUS } from "@/constants/ritmo-theme";
import { localDayKey, timeLabel, todayLabel } from "@/lib/date";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useAppState } from "@/providers/app-state-provider";
import type { Task } from "@/providers/app-state-provider";

export default function PlanScreen() {
  const { data, addTask, updateTask, toggleTask, deleteTask } = useAppState();
  const offline = useConnectivity();
  const [selected, setSelected] = useState(() => new Date());
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const key = localDayKey(selected);
  const scheduled = useMemo(() => data.tasks.filter((task) => task.scheduledAt && localDayKey(task.scheduledAt) === key).sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()), [data.tasks, key]);
  const unscheduled = useMemo(() => data.tasks.filter((task) => !task.scheduledAt && !task.completed), [data.tasks]);
  const shiftDate = (amount: number) => setSelected((current) => { const next = new Date(current); next.setDate(next.getDate() + amount); return next; });
  const save = async (value: Omit<Task, "id" | "completed"> | Task) => { if ("id" in value) await updateTask(value); else await addTask(value); };
  const open = (task: Task | null = null) => { setEditing(task); setEditorVisible(true); };

  return (
    <Screen>
      <Header date="Um lugar para cada coisa." />
      <OfflineBanner visible={offline} />
      <View style={styles.heading}><View><Text style={styles.title}>Planejar</Text><Text style={styles.lead}>Organize o tempo com gentileza.</Text></View><Pressable onPress={() => open()} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Planejar nova tarefa"><Ionicons name="add" size={19} color={RITMO.white} /></Pressable></View>
      <View style={styles.dateCard}><Pressable onPress={() => shiftDate(-1)} accessibilityRole="button" accessibilityLabel="Dia anterior" style={styles.arrow}><Ionicons name="chevron-back" size={20} color={RITMO.ink} /></Pressable><View style={styles.dateCenter}><Text style={styles.dateMain}>{localDayKey(selected) === localDayKey() ? "Hoje" : todayLabel(selected).split(",")[0]}</Text><Text style={styles.dateSub}>{todayLabel(selected)}</Text></View><Pressable onPress={() => shiftDate(1)} accessibilityRole="button" accessibilityLabel="Próximo dia" style={styles.arrow}><Ionicons name="chevron-forward" size={20} color={RITMO.ink} /></Pressable></View>
      <View style={styles.summary}><View style={styles.summaryIcon}><Ionicons name="time-outline" size={19} color={RITMO.oliveDark} /></View><View style={{ flex: 1 }}><Text style={styles.summaryTitle}>{scheduled.length} {scheduled.length === 1 ? "bloco planejado" : "blocos planejados"}</Text><Text style={styles.summaryCopy}>Deixe espaço para as pausas também.</Text></View><Text style={styles.total}>{scheduled.reduce((total, task) => total + task.estimateMin, 0)} min</Text></View>
      <View><SectionTitle title="Linha do tempo" />{scheduled.length ? <View style={styles.timeline}>{scheduled.map((task, index) => <View key={task.id} style={styles.timelineRow}><View style={styles.timeRail}><Text style={styles.time}>{timeLabel(task.scheduledAt)}</Text><View style={[styles.railDot, task.completed && styles.railDotDone]} />{index < scheduled.length - 1 ? <View style={styles.railLine} /> : null}</View><View style={styles.timelineContent}><TaskCard task={task} onToggle={() => void toggleTask(task.id).catch(() => undefined)} onEdit={() => open(task)} /></View></View>)}</View> : <EmptyState icon="calendar-outline" title="Sem horários por aqui" message="Uma agenda leve deixa espaço para o que surgir." action="Reservar um horário" onAction={() => open()} />}</View>
      <View><SectionTitle title="Sem horário marcado" action={unscheduled.length ? "+ Planejar" : undefined} onAction={() => open()} />{unscheduled.length ? <View style={styles.list}>{unscheduled.slice(0, 3).map((task) => <TaskCard key={task.id} task={task} onToggle={() => void toggleTask(task.id).catch(() => undefined)} onEdit={() => open(task)} />)}</View> : <Text style={styles.hint}>Você pode manter algumas tarefas flexíveis.</Text>}</View>
      <TaskEditor visible={editorVisible} task={editing} goals={data.goals} defaultDate={selected} onClose={() => setEditorVisible(false)} onSave={save} onDelete={deleteTask} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -8 }, title: { color: RITMO.ink, fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.8 }, lead: { color: RITMO.muted, fontSize: 13, marginTop: 4 },
  addButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: RITMO.olive, alignItems: "center", justifyContent: "center" },
  dateCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: RADIUS.lg, backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line },
  arrow: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: RITMO.bg }, dateCenter: { alignItems: "center", gap: 3 }, dateMain: { color: RITMO.ink, fontSize: 16, fontWeight: "800", textTransform: "capitalize" }, dateSub: { color: RITMO.muted, fontSize: 12, textTransform: "capitalize" },
  summary: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: RITMO.oliveWash, borderRadius: 17, padding: 14 }, summaryIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: RITMO.white, alignItems: "center", justifyContent: "center" }, summaryTitle: { color: RITMO.ink, fontSize: 13, fontWeight: "700" }, summaryCopy: { color: RITMO.muted, fontSize: 12, marginTop: 3 }, total: { color: RITMO.oliveDark, fontSize: 13, fontWeight: "800" },
  timeline: { gap: 1 }, timelineRow: { flexDirection: "row", minHeight: 81 }, timeRail: { width: 70, alignItems: "flex-start", position: "relative" }, time: { color: RITMO.muted, fontSize: 12, fontWeight: "600", paddingTop: 17, width: 50 }, railDot: { position: "absolute", right: 8, top: 18, width: 10, height: 10, borderRadius: 5, backgroundColor: RITMO.peach, borderWidth: 2, borderColor: RITMO.bg }, railDotDone: { backgroundColor: RITMO.olive }, railLine: { position: "absolute", right: 12, top: 29, bottom: -1, width: 1, backgroundColor: RITMO.line }, timelineContent: { flex: 1, paddingBottom: 8 }, list: { gap: 9 }, hint: { color: RITMO.muted, fontSize: 13, padding: 8 },
}) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
