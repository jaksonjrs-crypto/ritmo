import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export type Priority = "alta" | "média" | "baixa";
export type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  estimateMin: number;
  scheduledAt: string | null;
  note: string;
  goalId: string | null;
};
export type Goal = {
  id: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
  color: string;
};
export type Preferences = {
  displayName: string;
  remindersEnabled: boolean;
  focusMinutes: number;
  hapticsEnabled: boolean;
};
export type AppData = {
  version: 1;
  onboardingComplete: boolean;
  tasks: Task[];
  goals: Goal[];
  preferences: Preferences;
};

type StorageStatus = "loading" | "ready" | "error";
type AppContextValue = {
  data: AppData;
  storageStatus: StorageStatus;
  saveError: string | null;
  dismissSaveError: () => void;
  retryStorage: () => Promise<void>;
  restoreBackup: () => Promise<boolean>;
  completeOnboarding: (name?: string, remindersEnabled?: boolean) => Promise<void>;
  addTask: (task: Omit<Task, "id" | "completed">) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, "id">) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>;
  resetData: () => Promise<void>;
};

const STORAGE_KEY = "ritmo.data.v1";
const BACKUP_KEY = "ritmo.data.backup.v1";
const COLORS = ["#768B38", "#D77C5D", "#5E7F86", "#B48A3C"];
const blankPreferences: Preferences = {
  displayName: "",
  remindersEnabled: false,
  focusMinutes: 25,
  hapticsEnabled: true,
};

const localDayKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function makeInitialData(withExamples = true): AppData {
  const today = new Date();
  const at = (hour: number, minute: number) => {
    const time = new Date(today);
    time.setHours(hour, minute, 0, 0);
    return time.toISOString();
  };
  return {
    version: 1,
    onboardingComplete: false,
    preferences: { ...blankPreferences },
    tasks: withExamples
      ? [
          {
            id: "sample-1",
            title: "Revisar o que realmente importa hoje",
            completed: false,
            priority: "alta",
            estimateMin: 25,
            scheduledAt: at(9, 30),
            note: "Comece pelo próximo passo, não por tudo de uma vez.",
            goalId: null,
          },
          {
            id: "sample-2",
            title: "Enviar a pauta da reunião",
            completed: false,
            priority: "média",
            estimateMin: 15,
            scheduledAt: at(11, 0),
            note: "",
            goalId: null,
          },
          {
            id: "sample-3",
            title: "Caminhar por 20 minutos",
            completed: false,
            priority: "baixa",
            estimateMin: 20,
            scheduledAt: at(17, 30),
            note: "",
            goalId: "goal-move",
          },
          {
            id: "sample-4",
            title: "Anotar uma ideia para o projeto",
            completed: false,
            priority: "baixa",
            estimateMin: 10,
            scheduledAt: null,
            note: "",
            goalId: "goal-learn",
          },
        ]
      : [],
    goals: withExamples
      ? [
          { id: "goal-move", title: "Movimentar o corpo", progress: 2, target: 4, unit: "vezes na semana", color: COLORS[0] },
          { id: "goal-learn", title: "Aprender algo novo", progress: 3, target: 5, unit: "sessões na semana", color: COLORS[1] },
        ]
      : [],
  };
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppData>;
  return (
    candidate.version === 1 &&
    typeof candidate.onboardingComplete === "boolean" &&
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.goals) &&
    !!candidate.preferences &&
    typeof candidate.preferences === "object"
  );
}

const AppStateContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => makeInitialData(true));
  const dataRef = useRef(data);
  const lastGoodJson = useRef<string | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);

  const applyData = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const readStoredData = useCallback(async () => {
    setStorageStatus("loading");
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        const initial = makeInitialData(true);
        applyData(initial);
        const serialized = JSON.stringify(initial);
        await AsyncStorage.setItem(STORAGE_KEY, serialized);
        lastGoodJson.current = serialized;
      } else {
        const parsed: unknown = JSON.parse(stored);
        if (!isAppData(parsed)) throw new Error("O formato dos dados salvos não é reconhecido.");
        applyData(parsed);
        lastGoodJson.current = stored;
      }
      setStorageStatus("ready");
      setSaveError(null);
    } catch {
      setStorageStatus("error");
      setSaveError("Não foi possível abrir seus dados locais. Tente novamente ou recupere a última cópia segura.");
    }
  }, [applyData]);

  useEffect(() => {
    void readStoredData();
  }, [readStoredData]);

  useEffect(() => {
    if (storageStatus !== "ready" || Platform.OS === "web") return;
    let cancelled = false;
    const syncReminders = async () => {
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(scheduled.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
        if (cancelled || !data.preferences.remindersEnabled) return;
        const now = Date.now();
        const upcoming = data.tasks.filter((task) => !task.completed && task.scheduledAt && new Date(task.scheduledAt).getTime() > now).slice(0, 20);
        for (const task of upcoming) {
          if (cancelled) break;
          await Notifications.scheduleNotificationAsync({
            content: { title: "Hora do seu próximo passo", body: task.title, data: { taskId: task.id } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(task.scheduledAt!) },
          });
        }
      } catch {
        if (!cancelled) setSaveError("Não foi possível atualizar os lembretes. Confira a permissão do aplicativo.");
      }
    };
    void syncReminders();
    return () => { cancelled = true; };
  }, [data.tasks, data.preferences.remindersEnabled, storageStatus]);

  const commit = useCallback((updater: (current: AppData) => AppData) => {
    const next = updater(dataRef.current);
    applyData(next);
    const serialized = JSON.stringify(next);
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(async () => {
        try {
          const current = await AsyncStorage.getItem(STORAGE_KEY);
          if (current && current !== serialized) await AsyncStorage.setItem(BACKUP_KEY, current);
          await AsyncStorage.setItem(STORAGE_KEY, serialized);
          lastGoodJson.current = serialized;
          setSaveError(null);
        } catch {
          setSaveError("A alteração aparece aqui, mas ainda não foi salva. Verifique o espaço do aparelho e tente outra vez.");
          throw new Error("local-storage-write-failed");
        }
      });
    return writeQueue.current;
  }, [applyData]);

  const retryStorage = useCallback(async () => {
    await readStoredData();
  }, [readStoredData]);

  const restoreBackup = useCallback(async () => {
    try {
      const backup = await AsyncStorage.getItem(BACKUP_KEY);
      if (!backup) return false;
      const parsed: unknown = JSON.parse(backup);
      if (!isAppData(parsed)) return false;
      await AsyncStorage.setItem(STORAGE_KEY, backup);
      lastGoodJson.current = backup;
      applyData(parsed);
      setStorageStatus("ready");
      setSaveError(null);
      return true;
    } catch {
      return false;
    }
  }, [applyData]);

  const completeOnboarding = useCallback(async (name = "", remindersEnabled?: boolean) => {
    await commit((current) => ({
      ...current,
      onboardingComplete: true,
      preferences: { ...current.preferences, displayName: name.trim(), ...(remindersEnabled === undefined ? {} : { remindersEnabled }) },
    }));
  }, [commit]);

  const addTask = useCallback(async (task: Omit<Task, "id" | "completed">) => {
    await commit((current) => ({ ...current, tasks: [{ ...task, id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, completed: false }, ...current.tasks] }));
  }, [commit]);

  const updateTask = useCallback(async (task: Task) => {
    await commit((current) => ({ ...current, tasks: current.tasks.map((item) => (item.id === task.id ? task : item)) }));
  }, [commit]);

  const toggleTask = useCallback(async (id: string) => {
    await commit((current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return current;
      const completed = !task.completed;
      const goals = task.goalId
        ? current.goals.map((goal) => goal.id === task.goalId ? { ...goal, progress: completed ? Math.min(goal.progress + 1, goal.target) : Math.max(0, goal.progress - 1) } : goal)
        : current.goals;
      return { ...current, goals, tasks: current.tasks.map((item) => item.id === id ? { ...item, completed } : item) };
    });
  }, [commit]);

  const deleteTask = useCallback(async (id: string) => {
    await commit((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== id) }));
  }, [commit]);

  const addGoal = useCallback(async (goal: Omit<Goal, "id">) => {
    await commit((current) => ({ ...current, goals: [...current.goals, { ...goal, id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }] }));
  }, [commit]);

  const updateGoal = useCallback(async (goal: Goal) => {
    await commit((current) => ({ ...current, goals: current.goals.map((item) => item.id === goal.id ? goal : item) }));
  }, [commit]);

  const deleteGoal = useCallback(async (id: string) => {
    await commit((current) => ({
      ...current,
      goals: current.goals.filter((goal) => goal.id !== id),
      tasks: current.tasks.map((task) => task.goalId === id ? { ...task, goalId: null } : task),
    }));
  }, [commit]);

  const updatePreferences = useCallback(async (patch: Partial<Preferences>) => {
    await commit((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }));
  }, [commit]);

  const resetData = useCallback(async () => {
    const fresh = { ...makeInitialData(false), onboardingComplete: true };
    await commit(() => fresh);
  }, [commit]);

  const value = useMemo<AppContextValue>(() => ({
    data,
    storageStatus,
    saveError,
    dismissSaveError: () => setSaveError(null),
    retryStorage,
    restoreBackup,
    completeOnboarding,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addGoal,
    updateGoal,
    deleteGoal,
    updatePreferences,
    resetData,
  }), [data, storageStatus, saveError, retryStorage, restoreBackup, completeOnboarding, addTask, updateTask, toggleTask, deleteTask, addGoal, updateGoal, deleteGoal, updatePreferences, resetData]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState deve ser usado dentro de AppStateProvider");
  return value;
}

export function isScheduledForToday(task: Task, date = new Date()) {
  if (!task.scheduledAt) return false;
  const scheduledDate = new Date(task.scheduledAt);
  return localDayKey(scheduledDate) === localDayKey(date);
}
