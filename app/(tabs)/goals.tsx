import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Header, OfflineBanner, EmptyState, SectionTitle } from "@/components/ritmo-ui";
import { GoalEditor } from "@/components/goal-editor";
import { RITMO, RADIUS } from "@/constants/ritmo-theme";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useAppState } from "@/providers/app-state-provider";
import type { Goal } from "@/providers/app-state-provider";

export default function GoalsScreen() {
  const { data, addGoal, updateGoal } = useAppState();
  const offline = useConnectivity();
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const completedCount = useMemo(() => data.goals.filter((goal) => goal.progress >= goal.target).length, [data.goals]);
  const open = (goal: Goal | null = null) => { setEditing(goal); setEditorVisible(true); };
  const save = async (value: Omit<Goal, "id"> | Goal) => { if ("id" in value) await updateGoal(value); else await addGoal(value); };
  const increment = (goal: Goal) => void updateGoal({ ...goal, progress: Math.min(goal.target, goal.progress + 1) }).catch(() => undefined);
  return (
    <Screen>
      <Header date="Pequenos passos, direção clara." />
      <OfflineBanner visible={offline} />
      <View style={styles.hero}><View style={styles.heroTop}><View style={styles.heroIcon}><Ionicons name="leaf-outline" size={21} color={RITMO.oliveDark} /></View><Text style={styles.heroEyebrow}>CRESCER NO SEU TEMPO</Text></View><Text style={styles.title}>Metas que cabem{ "\n" }na vida real.</Text><Text style={styles.subtitle}>O progresso não precisa ser perfeito para ser verdadeiro.</Text><View style={styles.heroBottom}><Text style={styles.goalCount}>{completedCount} de {data.goals.length} metas no alvo</Text><Pressable onPress={() => open()} style={styles.heroAdd} accessibilityRole="button"><Ionicons name="add" size={16} color={RITMO.oliveDark} /><Text style={styles.heroAddText}>Nova meta</Text></Pressable></View></View>
      <View><SectionTitle title="Seu caminho" action="Adicionar" onAction={() => open()} />{data.goals.length ? <View style={styles.cards}>{data.goals.map((goal, index) => <GoalCard key={goal.id} goal={goal} index={index} onEdit={() => open(goal)} onIncrement={() => increment(goal)} />)}</View> : <EmptyState icon="trending-up-outline" title="Uma intenção já é um começo" message="Escolha algo que você quer cultivar e acompanhe os passos, sem pressa." action="Criar minha primeira meta" onAction={() => open()} />}</View>
      <View style={styles.note}><Ionicons name="sparkles-outline" size={18} color={RITMO.gold} /><Text style={styles.noteText}>Dica: metas pequenas e repetíveis costumam ser mais gentis com a rotina.</Text></View>
      <GoalEditor visible={editorVisible} goal={editing} onClose={() => setEditorVisible(false)} onSave={save} />
    </Screen>
  );
}

function GoalCard({ goal, index, onEdit, onIncrement }: { goal: Goal; index: number; onEdit: () => void; onIncrement: () => void }) {
  const percent = Math.min(100, Math.round((goal.progress / goal.target) * 100));
  const wash = goal.color === RITMO.peach ? RITMO.peachWash : goal.color === RITMO.blue ? RITMO.blueWash : goal.color === RITMO.gold ? RITMO.goldWash : RITMO.oliveWash;
  return <View style={styles.goalCard}><View style={styles.goalTop}><View style={[styles.goalIcon, { backgroundColor: wash }]}><Ionicons name={index % 2 === 0 ? "sunny-outline" : "book-outline"} size={18} color={goal.color} /></View><View style={{ flex: 1 }}><Text style={styles.goalTitle}>{goal.title}</Text><Text style={styles.goalUnit}>{goal.unit}</Text></View><Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Editar meta ${goal.title}`} style={styles.more}><Ionicons name="ellipsis-horizontal" size={18} color={RITMO.muted} /></Pressable></View><View style={styles.progressLabels}><Text style={styles.progressText}>{goal.progress} de {goal.target}</Text><Text style={[styles.percent, { color: goal.color }]}>{percent}%</Text></View><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} accessibilityLabel={`${goal.title}, ${percent}% concluída`} style={styles.track}><View style={[styles.fill, { backgroundColor: goal.color, width: `${percent}%` }]} /></View><View style={styles.goalBottom}><Text style={styles.remaining}>{percent >= 100 ? "Você chegou ao seu alvo." : `Faltam ${goal.target - goal.progress} ${goal.unit}.`}</Text><Pressable onPress={onIncrement} disabled={percent >= 100} accessibilityRole="button" accessibilityLabel={`Registrar um passo em ${goal.title}`} style={[styles.markButton, percent >= 100 && styles.markButtonDone]}><Ionicons name={percent >= 100 ? "checkmark" : "add"} size={15} color={percent >= 100 ? RITMO.oliveDark : RITMO.white} /><Text style={[styles.markText, percent >= 100 && styles.markTextDone]}>{percent >= 100 ? "Concluída" : "Registrar"}</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({
  hero: { padding: 20, borderRadius: RADIUS.lg, backgroundColor: RITMO.oliveWash, gap: 9, overflow: "hidden" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 9 }, heroIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: RITMO.white, alignItems: "center", justifyContent: "center" }, heroEyebrow: { color: RITMO.oliveDark, fontSize: 12, letterSpacing: 1.1, fontWeight: "800" },
  title: { color: RITMO.ink, fontSize: 27, lineHeight: 32, fontWeight: "800", letterSpacing: -0.7 }, subtitle: { color: RITMO.muted, fontSize: 12, lineHeight: 18, maxWidth: 280 },
  heroBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 }, goalCount: { color: RITMO.oliveDark, fontSize: 12, fontWeight: "700" }, heroAdd: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: RITMO.white }, heroAddText: { color: RITMO.oliveDark, fontSize: 12, fontWeight: "700" },
  cards: { gap: 11 }, goalCard: { backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line, borderRadius: RADIUS.lg, padding: 16, gap: 13 },
  goalTop: { flexDirection: "row", alignItems: "center", gap: 11 }, goalIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, goalTitle: { color: RITMO.ink, fontSize: 14, fontWeight: "700" }, goalUnit: { color: RITMO.muted, fontSize: 12, marginTop: 3 }, more: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, progressText: { color: RITMO.muted, fontSize: 12, fontWeight: "600" }, percent: { fontSize: 12, fontWeight: "800" }, track: { height: 8, borderRadius: 4, backgroundColor: RITMO.bg, overflow: "hidden" }, fill: { height: 8, borderRadius: 4 },
  goalBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, remaining: { color: RITMO.muted, fontSize: 12, flex: 1 }, markButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 10, borderRadius: 11, backgroundColor: RITMO.olive }, markButtonDone: { backgroundColor: RITMO.oliveWash }, markText: { color: RITMO.white, fontSize: 12, fontWeight: "700" }, markTextDone: { color: RITMO.oliveDark },
  note: { flexDirection: "row", gap: 9, alignItems: "center", backgroundColor: RITMO.goldWash, padding: 13, borderRadius: 15 }, noteText: { flex: 1, color: RITMO.ink, fontSize: 12, lineHeight: 17 },
}) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
