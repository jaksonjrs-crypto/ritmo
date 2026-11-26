import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RITMO } from "@/constants/ritmo-theme";
import { uiStyles } from "@/components/ritmo-ui";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type FocusSessionProps = { visible: boolean; taskTitle: string; minutes: number; onClose: () => void; onComplete: () => void };

export function FocusSession(props: FocusSessionProps) {
  if (!props.visible) return null;
  return <FocusSessionModal key={`${props.taskTitle}:${props.minutes}`} {...props} />;
}

function FocusSessionModal({ taskTitle, minutes, onClose, onComplete }: FocusSessionProps) {
  const reduceMotion = useReducedMotion();
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(minutes * 60);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setRemaining((value) => {
      if (value <= 1) { clearInterval(timer); setRunning(false); setFinished(true); return 0; }
      return value - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const display = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const percent = Math.max(0, Math.min(100, (1 - remaining / Math.max(1, minutes * 60)) * 100));
  return (
    <Modal visible animationType={reduceMotion ? "none" : "fade"} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}><View style={styles.sheet}>
        <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Fechar sessão"><Ionicons name="close" size={22} color={RITMO.ink} /></Pressable>
        <Text style={styles.eyebrow}>UM INTERVALO PARA O QUE IMPORTA</Text>
        <Text style={styles.heading}>{finished ? "Bom trabalho." : "Hora de focar."}</Text>
        <Text style={styles.task} numberOfLines={2}>{taskTitle}</Text>
        <View style={styles.timerWrap}><View style={styles.timerOuter}><View style={[styles.timerProgress, { width: `${percent}%` }]} /><Text style={styles.timer}>{display}</Text><Text style={styles.timerCaption}>{finished ? "TEMPO CONCLUÍDO" : running ? "EM ANDAMENTO" : "PRONTO PARA COMEÇAR"}</Text></View></View>
        {finished ? <Pressable onPress={onComplete} style={uiStyles.button} accessibilityRole="button"><Text style={uiStyles.buttonText}>Marcar tarefa como concluída</Text></Pressable> : <Pressable onPress={() => setRunning((value) => !value)} style={[uiStyles.button, styles.start]} accessibilityRole="button"><Ionicons name={running ? "pause" : "play"} size={17} color={RITMO.white} /><Text style={uiStyles.buttonText}>{running ? "Pausar foco" : remaining < minutes * 60 ? "Retomar foco" : "Começar foco"}</Text></Pressable>}
        <Text style={styles.footer}>Você pode fechar quando quiser. Seu progresso fica com você.</Text>
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(22,24,20,0.45)", padding: 18 },
  sheet: { width: "100%", maxWidth: 440, padding: 24, borderRadius: 28, backgroundColor: RITMO.bg, alignItems: "center", gap: 12 },
  close: { alignSelf: "flex-end", width: 44, height: 44, borderRadius: 20, backgroundColor: RITMO.white, borderWidth: 1, borderColor: RITMO.line, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: RITMO.oliveDark, fontSize: 12, fontWeight: "800", letterSpacing: 1.1, textAlign: "center" },
  heading: { color: RITMO.ink, fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  task: { color: RITMO.muted, fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 300 },
  timerWrap: { paddingVertical: 10 },
  timerOuter: { width: 200, height: 200, borderRadius: 100, backgroundColor: RITMO.white, borderWidth: 9, borderColor: RITMO.oliveWash, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  timerProgress: { position: "absolute", top: 0, bottom: 0, left: 0, backgroundColor: "#F5F7EF" },
  timer: { color: RITMO.ink, fontSize: 48, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] },
  timerCaption: { color: RITMO.oliveDark, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: 4 },
  start: { flexDirection: "row", gap: 8, width: "100%" },
  footer: { color: RITMO.muted, fontSize: 12, lineHeight: 17, textAlign: "center" },
}) as unknown as Record<string, import("react-native").ViewStyle & import("react-native").TextStyle>;
