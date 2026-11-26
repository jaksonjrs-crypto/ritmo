import { useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RITMO } from "@/constants/ritmo-theme";
import { localDayKey } from "@/lib/date";
import type { Goal, Priority, Task } from "@/providers/app-state-provider";
import { uiStyles } from "@/components/ritmo-ui";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

function partsFromTask(task?: Task, defaultDate = new Date()) {
  const date = task?.scheduledAt ? new Date(task.scheduledAt) : defaultDate;
  return {
    day: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`,
    time: task?.scheduledAt ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : "09:00",
  };
}

type TaskEditorProps = {
  visible: boolean;
  task?: Task | null;
  goals: Goal[];
  defaultDate?: Date;
  onClose: () => void;
  onSave: (task: Omit<Task, "id" | "completed"> | Task) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export function TaskEditor(props: TaskEditorProps) {
  if (!props.visible) return null;
  const key = `${props.task?.id ?? "new"}:${props.defaultDate ? localDayKey(props.defaultDate) : "today"}`;
  return <TaskEditorForm key={key} {...props} />;
}

function TaskEditorForm({ visible, task, goals, defaultDate, onClose, onSave, onDelete }: TaskEditorProps) {
  const reduceMotion = useReducedMotion();
  const initialParts = partsFromTask(task ?? undefined, defaultDate);
  const [title, setTitle] = useState(task?.title ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "média");
  const [estimate, setEstimate] = useState(String(task?.estimateMin ?? 25));
  const [day, setDay] = useState(initialParts.day);
  const [time, setTime] = useState(initialParts.time);
  const [scheduled, setScheduled] = useState(task?.scheduledAt ? true : !task);
  const [note, setNote] = useState(task?.note ?? "");
  const [goalId, setGoalId] = useState<string | null>(task?.goalId ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed) { setError("Dê um nome para esta tarefa."); return; }
    const minutes = Number(estimate);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 600) { setError("A duração precisa ficar entre 5 e 600 minutos."); return; }
    let scheduledAt: string | null = null;
    if (scheduled) {
      const dateMatch = day.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!dateMatch || !timeMatch) { setError("Use data dd/mm/aaaa e horário hh:mm."); return; }
      const [, dd, mm, yyyy] = dateMatch;
      const [, hh, min] = timeMatch;
      const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
      if (date.getFullYear() !== Number(yyyy) || date.getMonth() !== Number(mm) - 1 || date.getDate() !== Number(dd) || Number(hh) > 23 || Number(min) > 59) {
        setError("Confira a data e o horário informados."); return;
      }
      scheduledAt = date.toISOString();
    }
    setBusy(true);
    try {
      if (task) await onSave({ ...task, title: trimmed, priority, estimateMin: minutes, scheduledAt, note: note.trim(), goalId });
      else await onSave({ title: trimmed, priority, estimateMin: minutes, scheduledAt, note: note.trim(), goalId });
      onClose();
    } catch {
      setError("Não foi possível salvar. Confira o aviso de armazenamento e tente de novo.");
    } finally { setBusy(false); }
  };

  const remove = () => {
    if (!task || !onDelete) return;
    const confirm = async () => { setBusy(true); try { await onDelete(task.id); onClose(); } catch { setError("Não foi possível excluir. Verifique o aviso de armazenamento e tente de novo."); } finally { setBusy(false); } };
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Excluir esta tarefa? Esta ação não pode ser desfeita.")) void confirm();
    } else {
      Alert.alert("Excluir tarefa?", "Esta ação não pode ser desfeita.", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => void confirm() }]);
    }
  };

  return (
    <Modal visible={visible} animationType={reduceMotion ? "none" : "slide"} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}><View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}><View><Text style={styles.eyebrow}>{task ? "AJUSTE O PLANO" : "UM PASSO DE CADA VEZ"}</Text><Text style={styles.title}>{task ? "Editar tarefa" : "Nova tarefa"}</Text></View><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.close}><Ionicons name="close" size={22} color={RITMO.ink} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
          <Field label="O que você quer fazer?" error={error}>
            <TextInput value={title} onChangeText={setTitle} placeholder="Ex.: preparar a apresentação" placeholderTextColor="#A3A59C" style={styles.input} autoFocus={false} returnKeyType="next" accessibilityLabel="Nome da tarefa" />
          </Field>
          <View style={styles.row}>
            <Field label="Prioridade" style={{ flex: 1.2 }}>
              <View style={styles.choiceRow}>{(["baixa", "média", "alta"] as Priority[]).map((item) => <Pressable key={item} onPress={() => setPriority(item)} accessibilityRole="radio" accessibilityState={{ selected: priority === item }} style={[styles.priorityChoice, priority === item && styles.prioritySelected]}><Text style={[styles.choiceText, priority === item && styles.choiceTextSelected]}>{item}</Text></Pressable>)}</View>
            </Field>
            <Field label="Duração · min" style={{ flex: 0.8 }}>
              <TextInput value={estimate} onChangeText={(value) => setEstimate(value.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={styles.input} accessibilityLabel="Duração estimada em minutos" />
            </Field>
          </View>
          <Pressable onPress={() => setScheduled((value) => !value)} style={styles.scheduleToggle} accessibilityRole="switch" accessibilityState={{ checked: scheduled }}><View style={[styles.smallCheck, scheduled && styles.smallCheckOn]}>{scheduled ? <Ionicons name="checkmark" size={12} color={RITMO.white} /> : null}</View><View style={{ flex: 1 }}><Text style={styles.labelMain}>Reservar um horário</Text><Text style={styles.labelHint}>Planeje quando essa tarefa entra no seu dia</Text></View><Ionicons name={scheduled ? "time-outline" : "time-outline"} size={19} color={RITMO.olive} /></Pressable>
          {scheduled ? <View style={styles.row}><Field label="Data · dd/mm/aaaa" style={{ flex: 1 }}><TextInput value={day} onChangeText={setDay} placeholder={localDayKey()} keyboardType="numbers-and-punctuation" style={styles.input} accessibilityLabel="Data planejada" /></Field><Field label="Hora · hh:mm" style={{ flex: 0.8 }}><TextInput value={time} onChangeText={setTime} placeholder="09:00" keyboardType="numbers-and-punctuation" style={styles.input} accessibilityLabel="Horário planejado" /></Field></View> : null}
          {goals.length > 0 ? <Field label="Vincular a uma meta · opcional"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalChoices}><Pressable onPress={() => setGoalId(null)} style={[styles.goalChip, !goalId && styles.goalChipActive]}><Text style={[styles.goalChipText, !goalId && styles.goalChipTextActive]}>Sem meta</Text></Pressable>{goals.map((goal) => <Pressable key={goal.id} onPress={() => setGoalId(goal.id)} style={[styles.goalChip, goalId === goal.id && styles.goalChipActive]}><Text style={[styles.goalChipText, goalId === goal.id && styles.goalChipTextActive]}>{goal.title}</Text></Pressable>)}</ScrollView></Field> : null}
          <Field label="Nota · opcional"><TextInput value={note} onChangeText={setNote} placeholder="Um detalhe que ajuda a começar..." placeholderTextColor="#A3A59C" style={[styles.input, styles.noteInput]} multiline accessibilityLabel="Nota opcional" /></Field>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable onPress={() => void save()} disabled={busy} accessibilityRole="button" style={[uiStyles.button, busy && { opacity: 0.65 }]}><Text style={uiStyles.buttonText}>{busy ? "Salvando…" : task ? "Salvar alterações" : "Adicionar ao meu dia"}</Text></Pressable>
          {task ? <Pressable onPress={remove} disabled={busy} style={styles.deleteButton} accessibilityRole="button"><Text style={styles.deleteText}>Excluir tarefa</Text></Pressable> : null}
        </ScrollView>
      </View></View>
    </Modal>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; error?: string; style?: import("react-native").ViewStyle }) {
  return <View style={[styles.field, style]}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(22,24,20,0.38)" },
  sheet: { maxHeight: "93%", backgroundColor: RITMO.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 22, paddingBottom: Platform.OS === "ios" ? 28 : 18, width: "100%", maxWidth: 560, alignSelf: "center" },
  handle: { width: 42, height: 4, backgroundColor: "#D4D1C7", borderRadius: 5, alignSelf: "center", marginBottom: 18 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  eyebrow: { color: RITMO.oliveDark, fontSize: 12, letterSpacing: 1.2, fontWeight: "800", marginBottom: 4 },
  title: { color: RITMO.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  close: { width: 44, height: 44, backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  form: { gap: 16, paddingBottom: 14 },
  field: { gap: 7 },
  fieldLabel: { color: RITMO.ink, fontSize: 12, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: RITMO.line, backgroundColor: RITMO.white, borderRadius: 13, paddingHorizontal: 14, color: RITMO.ink, fontSize: 14 },
  noteInput: { minHeight: 68, paddingTop: 12, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  choiceRow: { flexDirection: "row", gap: 5, backgroundColor: "#EFEEE8", padding: 4, borderRadius: 13 },
  priorityChoice: { minHeight: 44, justifyContent: "center", alignItems: "center", flex: 1, borderRadius: 10 },
  prioritySelected: { backgroundColor: RITMO.white, shadowColor: "#202018", shadowOpacity: 0.07, shadowRadius: 5, elevation: 1 },
  choiceText: { color: RITMO.muted, fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  choiceTextSelected: { color: RITMO.ink, fontWeight: "700" },
  scheduleToggle: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: RITMO.oliveWash, borderRadius: 15, padding: 13 },
  smallCheck: { width: 21, height: 21, borderRadius: 7, borderWidth: 1.5, borderColor: "#A9B18A", alignItems: "center", justifyContent: "center", backgroundColor: RITMO.white },
  smallCheckOn: { backgroundColor: RITMO.olive, borderColor: RITMO.olive },
  labelMain: { color: RITMO.ink, fontSize: 13, fontWeight: "700" },
  labelHint: { color: RITMO.muted, fontSize: 12, lineHeight: 15, marginTop: 3 },
  goalChoices: { flexDirection: "row", gap: 8, paddingRight: 12 },
  goalChip: { backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 12 },
  goalChipActive: { backgroundColor: RITMO.oliveWash, borderColor: RITMO.olive },
  goalChipText: { color: RITMO.muted, fontSize: 12, fontWeight: "600" },
  goalChipTextActive: { color: RITMO.oliveDark },
  error: { color: RITMO.danger, fontSize: 12, fontWeight: "600" },
  deleteButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  deleteText: { color: RITMO.danger, fontSize: 13, fontWeight: "700" },
}) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
