import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RITMO } from "@/constants/ritmo-theme";
import type { Goal } from "@/providers/app-state-provider";
import { uiStyles } from "@/components/ritmo-ui";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const swatches = [RITMO.olive, RITMO.peach, RITMO.blue, RITMO.gold];

type GoalEditorProps = { visible: boolean; goal?: Goal | null; onClose: () => void; onSave: (goal: Omit<Goal, "id"> | Goal) => Promise<void> };

export function GoalEditor(props: GoalEditorProps) {
  if (!props.visible) return null;
  return <GoalEditorForm key={props.goal?.id ?? "new"} {...props} />;
}

function GoalEditorForm({ visible, goal, onClose, onSave }: GoalEditorProps) {
  const reduceMotion = useReducedMotion();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [progress, setProgress] = useState(String(goal?.progress ?? 0));
  const [target, setTarget] = useState(String(goal?.target ?? 5));
  const [unit, setUnit] = useState(goal?.unit ?? "vezes na semana");
  const [color, setColor] = useState(goal?.color ?? swatches[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const count = Number(target); const current = Number(progress);
    if (!title.trim()) { setError("Dê um nome para sua meta."); return; }
    if (!Number.isInteger(count) || count < 1 || count > 100 || !Number.isInteger(current) || current < 0 || current > count) { setError("Use um alvo de 1 a 100 e um progresso dentro desse alvo."); return; }
    setBusy(true);
    try {
      const value = { title: title.trim(), progress: current, target: count, unit: unit.trim() || "etapas", color };
      await onSave(goal ? { ...goal, ...value } : value); onClose();
    } catch { setError("Não foi possível salvar sua meta. Tente novamente."); }
    finally { setBusy(false); }
  };
  return (
    <Modal visible={visible} animationType={reduceMotion ? "none" : "slide"} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}><View style={styles.sheet}><View style={styles.handle} />
        <View style={styles.header}><View><Text style={styles.eyebrow}>UM HORIZONTE DE CADA VEZ</Text><Text style={styles.title}>{goal ? "Ajustar meta" : "Nova meta"}</Text></View><Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Fechar"><Ionicons name="close" size={22} color={RITMO.ink} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="O que você quer cultivar?"><TextInput value={title} onChangeText={setTitle} placeholder="Ex.: ler mais" placeholderTextColor="#A3A59C" style={styles.input} accessibilityLabel="Nome da meta" /></Field>
          <View style={styles.row}><Field label="Progresso" style={{ flex: 1 }}><TextInput value={progress} onChangeText={(v) => setProgress(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={styles.input} accessibilityLabel="Progresso atual" /></Field><Field label="Alvo" style={{ flex: 1 }}><TextInput value={target} onChangeText={(v) => setTarget(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={styles.input} accessibilityLabel="Alvo da meta" /></Field></View>
          <Field label="Ritmo"><TextInput value={unit} onChangeText={setUnit} placeholder="vezes na semana" placeholderTextColor="#A3A59C" style={styles.input} accessibilityLabel="Unidade da meta" /></Field>
          <Field label="Cor"><View style={styles.swatches}>{swatches.map((swatch) => <Pressable key={swatch} onPress={() => setColor(swatch)} accessibilityRole="radio" accessibilityState={{ selected: color === swatch }} accessibilityLabel="Escolher cor da meta" style={[styles.swatch, { backgroundColor: swatch }, color === swatch && styles.swatchSelected]}>{color === swatch ? <Ionicons name="checkmark" size={17} color="white" /> : null}</Pressable>)}</View></Field>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable onPress={() => void save()} disabled={busy} accessibilityRole="button" style={uiStyles.button}><Text style={uiStyles.buttonText}>{busy ? "Salvando…" : goal ? "Salvar meta" : "Criar minha meta"}</Text></Pressable>
        </ScrollView>
      </View></View>
    </Modal>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: import("react-native").ViewStyle }) { return <View style={[styles.field, style]}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>; }
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(22,24,20,0.38)" },
  sheet: { maxHeight: "88%", backgroundColor: RITMO.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 22, paddingBottom: 26, width: "100%", maxWidth: 560, alignSelf: "center" },
  handle: { width: 42, height: 4, backgroundColor: "#D4D1C7", borderRadius: 5, alignSelf: "center", marginBottom: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  eyebrow: { color: RITMO.oliveDark, fontSize: 12, letterSpacing: 1.2, fontWeight: "800", marginBottom: 4 },
  title: { color: RITMO.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  close: { width: 44, height: 44, backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  form: { gap: 17, paddingBottom: 14 }, field: { gap: 7 }, fieldLabel: { color: RITMO.ink, fontSize: 12, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: RITMO.line, backgroundColor: RITMO.white, borderRadius: 13, paddingHorizontal: 14, color: RITMO.ink, fontSize: 14 }, row: { flexDirection: "row", gap: 12 },
  swatches: { flexDirection: "row", gap: 12 }, swatch: { width: 44, height: 44, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "transparent" }, swatchSelected: { borderColor: RITMO.white, shadowColor: "#242620", shadowOpacity: 0.23, shadowRadius: 3, elevation: 2 }, error: { color: RITMO.danger, fontSize: 12, fontWeight: "600" },
}) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
