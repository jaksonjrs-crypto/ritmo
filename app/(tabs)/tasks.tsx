import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Header, OfflineBanner, SectionTitle, EmptyState, TaskCard } from "@/components/ritmo-ui";
import { TaskEditor } from "@/components/task-editor";
import { RITMO, RADIUS } from "@/constants/ritmo-theme";
import { localDayKey } from "@/lib/date";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useAppState } from "@/providers/app-state-provider";
import type { Task } from "@/providers/app-state-provider";

const states = ["Todas", "Em aberto", "Concluídas"] as const;
type StateFilter = typeof states[number];
const priorities = ["Todas as prioridades", "Alta", "Média", "Baixa"] as const;
type PriorityFilter = typeof priorities[number];

export default function TasksScreen() {
  const { data, addTask, updateTask, toggleTask, deleteTask } = useAppState();
  const offline = useConnectivity();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("Em aberto");
  const [todayOnly, setTodayOnly] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("Todas as prioridades");
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const tasks = useMemo(() => data.tasks.filter((task) => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !normalized || task.title.toLocaleLowerCase("pt-BR").includes(normalized) || task.note.toLocaleLowerCase("pt-BR").includes(normalized);
    const matchesState = stateFilter === "Todas" || (stateFilter === "Concluídas" ? task.completed : !task.completed);
    const matchesDay = !todayOnly || (task.scheduledAt !== null && localDayKey(task.scheduledAt) === localDayKey());
    const matchesPriority = priorityFilter === "Todas as prioridades" || task.priority === priorityFilter.toLocaleLowerCase("pt-BR");
    return matchesSearch && matchesState && matchesDay && matchesPriority;
  }).sort((a, b) => Number(a.completed) - Number(b.completed) || (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999")), [data.tasks, search, stateFilter, todayOnly, priorityFilter]);
  const showEditor = (task: Task | null = null) => { setEditing(task); setEditorVisible(true); };
  const save = async (value: Omit<Task, "id" | "completed"> | Task) => { if ("id" in value) await updateTask(value); else await addTask(value); };

  return (
    <Screen>
      <Header date="Tudo o que você quer tirar da cabeça." />
      <OfflineBanner visible={offline} />
      <View style={styles.heading}><Text style={styles.title}>Tarefas</Text><Pressable onPress={() => showEditor()} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Criar nova tarefa"><Ionicons name="add" size={19} color={RITMO.white} /></Pressable></View>
      <View style={styles.searchBox}><Ionicons name="search-outline" size={18} color={RITMO.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar uma tarefa" placeholderTextColor="#9B9D94" style={styles.searchInput} returnKeyType="search" accessibilityLabel="Buscar tarefas" />{search ? <Pressable onPress={() => setSearch("")} accessibilityRole="button" accessibilityLabel="Limpar busca"><Ionicons name="close-circle" size={18} color={RITMO.muted} /></Pressable> : null}</View>
      <View style={styles.filterGroup}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{states.map((item) => <Chip key={item} label={item} active={stateFilter === item} onPress={() => setStateFilter(item)} />)}</ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}><Chip label="Hoje" icon="calendar-outline" active={todayOnly} onPress={() => setTodayOnly((value) => !value)} />{priorities.map((item) => <Chip key={item} label={item} icon={item === "Todas as prioridades" ? undefined : "flag-outline"} active={priorityFilter === item} onPress={() => setPriorityFilter(item)} />)}</ScrollView>
      </View>
      <View><SectionTitle title={`${tasks.length} ${tasks.length === 1 ? "tarefa" : "tarefas"}`} />{tasks.length ? <View style={styles.list}>{tasks.map((task) => <TaskCard key={task.id} task={task} onToggle={() => void toggleTask(task.id).catch(() => undefined)} onEdit={() => showEditor(task)} />)}</View> : <EmptyState icon={search ? "search-outline" : "checkmark-done-outline"} title={search ? "Nada encontrado" : data.tasks.length ? "Nenhum resultado com esses filtros" : "Uma lista em branco"} message={search ? "Tente outra palavra ou limpe a busca." : "Ajuste os filtros ou crie uma tarefa para começar."} action={data.tasks.length ? "Limpar filtros" : "Criar primeira tarefa"} onAction={() => { if (data.tasks.length) { setStateFilter("Todas"); setTodayOnly(false); setPriorityFilter("Todas as prioridades"); setSearch(""); } else showEditor(); }} />}</View>
      <TaskEditor visible={editorVisible} task={editing} goals={data.goals} onClose={() => setEditorVisible(false)} onSave={save} onDelete={deleteTask} />
    </Screen>
  );
}

function Chip({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>{icon ? <Ionicons name={icon} size={13} color={active ? RITMO.oliveDark : RITMO.muted} /> : null}<Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: -8 },
  title: { color: RITMO.ink, fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.8 },
  addButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: RITMO.olive, alignItems: "center", justifyContent: "center" },
  searchBox: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14, borderRadius: 15, borderWidth: 1, borderColor: RITMO.line, backgroundColor: RITMO.white },
  searchInput: { flex: 1, minHeight: 46, fontSize: 13, color: RITMO.ink },
  filterGroup: { gap: 8, marginTop: -9 }, filters: { flexDirection: "row", gap: 7, paddingRight: 8 },
  chip: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, borderRadius: RADIUS.pill, backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line },
  chipActive: { backgroundColor: RITMO.oliveWash, borderColor: "#CFD9B5" },
  chipText: { color: RITMO.muted, fontSize: 12, fontWeight: "600" }, chipTextActive: { color: RITMO.oliveDark, fontWeight: "700" },
  list: { gap: 9 },
}) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
