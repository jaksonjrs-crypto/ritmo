import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { inferRouterOutputs } from "@trpc/server";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FolderKanban,
  Gauge,
  Heart,
  LayoutDashboard,
  Link2,
  LayoutGrid,
  ListTodo,
  LoaderCircle,
  LogOut,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AppsView, QuickLauncher, type ShortcutRow } from "@/components/Launcher";
import { useNow } from "@/hooks/useNow";
import { KIND_LABELS, SHORTCUT_KINDS, type ShortcutKind } from "@shared/launcher";
import type { AppRouter } from "../../../server/routers";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Workspace = RouterOutput["hub"]["workspace"];
type Project = Workspace["projects"][number];
type Task = Workspace["tasks"][number];
type ContentItem = Workspace["content"][number];
type View = "overview" | "projects" | "content" | "calendar" | "tools";
type ModalKind = "project" | "task" | "content" | "event" | "result" | "shortcut" | "capacity";
type ModalState = { kind: ModalKind; record?: any } | null;

const VIEWS: readonly View[] = ["overview", "projects", "content", "calendar", "tools"];
function initialView(): View {
  const requested = new URLSearchParams(window.location.search).get("view");
  return VIEWS.includes(requested as View) ? (requested as View) : "overview";
}
function initialModal(): ModalState {
  return new URLSearchParams(window.location.search).get("new") === "task" ? { kind: "task" } : null;
}

const CHANNELS = ["Instagram", "Facebook", "TikTok", "YouTube", "Pinterest", "Shopee Vídeos", "Telegram"] as const;
const CONTENT_STAGES = [
  ["product_selected", "Produto escolhido"],
  ["brief", "Briefing"],
  ["script", "Roteiro / texto"],
  ["recording", "Gravação"],
  ["editing", "Edição"],
  ["review", "Revisão"],
  ["approved", "Aprovado por você"],
  ["scheduled_manual", "Agendado manualmente"],
  ["published", "Publicado"],
  ["measuring", "Acompanhamento"],
] as const;
const PRE_APPROVAL_STAGES = CONTENT_STAGES.slice(0, 6);
const REVIEW_ITEMS = [
  ["copyReviewed", "Texto e informações conferidos"],
  ["creativeVerified", "Vídeo, carrossel e arquivo corretos"],
  ["channelVerified", "Canal e perfil/conta corretos"],
  ["dateVerified", "Data, hora e fuso conferidos"],
  ["linkVerified", "Link e chamada para ação testados"],
  ["offerVerified", "Produto, oferta e condições conferidos"],
] as const;
const EMPTY_CHECKLIST = {
  copyReviewed: false,
  creativeVerified: false,
  channelVerified: false,
  dateVerified: false,
  linkVerified: false,
  offerVerified: false,
};

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateTime(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function niceDate(value?: Date | string | null, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

function mondayOf(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

function readString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function contentStatusLabel(status: string) {
  return CONTENT_STAGES.find(([value]) => value === status)?.[1] ?? "Em andamento";
}

function priorityLabel(priority: string) {
  if (priority === "high") return "Prioridade alta";
  if (priority === "low") return "Prioridade baixa";
  return "Prioridade normal";
}

function projectName(workspace: Workspace, id: number | null) {
  return workspace.projects.find(project => project.id === id)?.name ?? "Sem projeto";
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <small className="field-hint">{hint}</small>}</label>;
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="brand-mark"><span /><span /><span /></div><LoaderCircle className="spin" size={22} /><p>Carregando seu espaço...</p></div>;
}

function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export default function Home() {
  const auth = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const workspaceQuery = trpc.hub.workspace.useQuery(undefined, { enabled: Boolean(auth.user), retry: false });
  const workspace = (workspaceQuery.data ?? {
    projects: [], tasks: [], content: [], events: [], results: [], shortcuts: [], settings: null,
  }) as Workspace;
  const [view, setView] = useState<View>(initialView);
  const [modal, setModal] = useState<ModalState>(initialModal);
  const now = useNow();
  const [reviewItem, setReviewItem] = useState<ContentItem | null>(null);
  const [checklist, setChecklist] = useState({ ...EMPTY_CHECKLIST });
  const [search, setSearch] = useState("");

  const refresh = () => utils.hub.workspace.invalidate();
  const handleError = (error: { message?: string }) => {
    toast.error(error.message || "Não foi possível salvar. Tente novamente.");
  };
  const projectCreate = trpc.hub.createProject.useMutation({ onSuccess: refresh, onError: handleError });
  const projectUpdate = trpc.hub.updateProject.useMutation({ onSuccess: refresh, onError: handleError });
  const taskCreate = trpc.hub.createTask.useMutation({ onSuccess: refresh, onError: handleError });
  const taskUpdate = trpc.hub.updateTask.useMutation({ onSuccess: refresh, onError: handleError });
  const taskDelete = trpc.hub.deleteTask.useMutation({ onSuccess: refresh, onError: handleError });
  const contentCreate = trpc.hub.createContent.useMutation({ onSuccess: refresh, onError: handleError });
  const contentUpdate = trpc.hub.updateContent.useMutation({ onSuccess: refresh, onError: handleError });
  const contentMove = trpc.hub.moveContent.useMutation({ onSuccess: refresh, onError: handleError });
  const contentApprove = trpc.hub.approveContent.useMutation({ onSuccess: refresh, onError: handleError });
  const eventCreate = trpc.hub.createEvent.useMutation({ onSuccess: refresh, onError: handleError });
  const eventDelete = trpc.hub.deleteEvent.useMutation({ onSuccess: refresh, onError: handleError });
  const resultCreate = trpc.hub.createResult.useMutation({ onSuccess: refresh, onError: handleError });
  const shortcutCreate = trpc.hub.createShortcut.useMutation({ onSuccess: refresh, onError: handleError });
  const shortcutUpdate = trpc.hub.updateShortcut.useMutation({ onSuccess: refresh, onError: handleError });
  const shortcutOpen = trpc.hub.openShortcut.useMutation({ onSuccess: refresh });
  const shortcutDelete = trpc.hub.deleteShortcut.useMutation({ onSuccess: refresh, onError: handleError });
  const capacityUpdate = trpc.hub.setCapacity.useMutation({ onSuccess: refresh, onError: handleError });

  const todayKey = dateKey(now);
  const weekStart = useMemo(() => mondayOf(now), [todayKey]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  }), [weekStart]);
  const weekEndKey = dateKey(weekDays[6]);
  const weekStartKey = dateKey(weekDays[0]);
  const weeklyTasks = useMemo(() => (workspace?.tasks ?? []).filter(task => task.status !== "done" && task.dueDate && task.dueDate >= weekStartKey && task.dueDate <= weekEndKey), [workspace, weekStartKey, weekEndKey]);
  const plannedMinutes = weeklyTasks.reduce((sum, task) => sum + (task.estimateMinutes || 0), 0);
  const needsReview = (workspace?.content ?? []).filter(item => item.status === "review");
  const activeProjects = (workspace?.projects ?? []).filter(project => project.status === "active");

  const openShortcut = (item: ShortcutRow) => shortcutOpen.mutate({ id: item.id });
  const openModal = (kind: ModalKind, record?: any) => setModal({ kind, record });
  const closeModal = () => setModal(null);
  const openReview = (item: ContentItem) => {
    setChecklist({ ...EMPTY_CHECKLIST });
    setReviewItem(item);
  };

  async function submitModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const record = modal.record;
    try {
      if (modal.kind === "project") {
        const values = {
          name: readString(form, "name"),
          category: readString(form, "category") || "Pessoal",
          description: readString(form, "description"),
          nextAction: readString(form, "nextAction"),
        };
        if (record?.id) await projectUpdate.mutateAsync({ id: record.id, ...values, status: String(form.get("status")) as "active" | "paused" | "completed" });
        else await projectCreate.mutateAsync(values);
        toast.success(record ? "Projeto atualizado." : "Projeto criado.");
      }
      if (modal.kind === "task") {
        const projectIdRaw = readString(form, "projectId");
        const dueDate = readString(form, "dueDate") || null;
        const estimateRaw = readString(form, "estimateMinutes");
        const values = {
          projectId: projectIdRaw ? Number(projectIdRaw) : null,
          title: readString(form, "title"),
          notes: readString(form, "notes"),
          dueDate,
          estimateMinutes: estimateRaw ? Number(estimateRaw) : 0,
          priority: readString(form, "priority") as "low" | "normal" | "high",
          status: readString(form, "status") as "todo" | "doing" | "done",
        };
        if (record?.id) await taskUpdate.mutateAsync({ id: record.id, ...values });
        else await taskCreate.mutateAsync(values);
        toast.success(record ? "Tarefa atualizada." : "Tarefa adicionada.");
      }
      if (modal.kind === "content") {
        const projectIdRaw = readString(form, "projectId");
        const channels = form.getAll("channels").map(value => String(value))
          .filter((value): value is (typeof CHANNELS)[number] => (CHANNELS as readonly string[]).includes(value));
        const plannedAt = formDateTime(form.get("plannedAt"));
        const values = {
          projectId: projectIdRaw ? Number(projectIdRaw) : null,
          productName: readString(form, "productName"),
          title: readString(form, "title"),
          objective: readString(form, "objective"),
          channels,
          plannedAt,
          notes: readString(form, "notes"),
        };
        if (record?.id) await contentUpdate.mutateAsync({ id: record.id, ...values });
        else await contentCreate.mutateAsync(values);
        toast.success(record ? "Conteúdo atualizado. Se já estava aprovado, a revisão foi reaberta." : "Conteúdo adicionado ao fluxo.");
      }
      if (modal.kind === "event") {
        const projectIdRaw = readString(form, "projectId");
        const startsAt = formDateTime(form.get("startsAt"));
        const endsAt = formDateTime(form.get("endsAt"));
        if (!startsAt) throw new Error("Escolha data e hora para o evento.");
        await eventCreate.mutateAsync({
          projectId: projectIdRaw ? Number(projectIdRaw) : null,
          title: readString(form, "title"),
          kind: readString(form, "kind") as "work" | "content" | "personal" | "rest",
          startsAt,
          endsAt,
          notes: readString(form, "notes"),
        });
        toast.success("Bloco adicionado à agenda.");
      }
      if (modal.kind === "result") {
        const target = readString(form, "target");
        const [targetKind, targetId] = target.split(":");
        await resultCreate.mutateAsync({
          projectId: targetKind === "project" ? Number(targetId) : null,
          contentId: targetKind === "content" ? Number(targetId) : null,
          metricName: readString(form, "metricName"),
          metricValue: readString(form, "metricValue"),
          recordedOn: readString(form, "recordedOn"),
          notes: readString(form, "notes"),
        });
        toast.success("Resultado registrado manualmente.");
      }
      if (modal.kind === "shortcut") {
        const values = {
          name: readString(form, "name"),
          url: readString(form, "url"),
          category: readString(form, "category") || "Ferramenta",
          kind: (readString(form, "kind") || "tool") as ShortcutKind,
          description: readString(form, "description") || null,
          emoji: readString(form, "emoji") || null,
          pinned: form.get("pinned") === "on",
        };
        if (record?.id) await shortcutUpdate.mutateAsync({ id: record.id, ...values });
        else await shortcutCreate.mutateAsync(values);
        toast.success(record?.id ? "Atalho atualizado." : "Atalho salvo. Ele apenas abre o site.");
      }
      if (modal.kind === "capacity") {
        const value = readString(form, "hours");
        await capacityUpdate.mutateAsync({ weeklyCapacityMinutes: value ? Math.round(Number(value) * 60) : null });
        toast.success(value ? "Capacidade semanal atualizada." : "Capacidade removida.");
      }
      closeModal();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error("Não foi possível salvar."));
    }
  }

  if (auth.loading || workspaceQuery.isLoading) return <LoadingScreen />;
  if (!auth.user) return <LoadingScreen />;
  if (workspaceQuery.isError && workspaceQuery.error.data?.code === "FORBIDDEN") {
    return <div className="loading-screen"><div className="error-card"><ShieldCheck size={25} /><h2>Este espaço é privado.</h2><p>Essa conta não é a dona do Ritmo. Saia e entre com a conta correta.</p><Button onClick={() => auth.logout()}>Sair da conta</Button></div></div>;
  }
  if (workspaceQuery.isError) {
    return <div className="loading-screen"><div className="error-card"><ShieldCheck size={25} /><h2>Não consegui abrir seu espaço.</h2><p>Se sua sessão venceu, entre novamente. Seus dados não foram alterados.</p><Button onClick={() => workspaceQuery.refetch()}>Tentar de novo</Button><button className="text-button" onClick={() => auth.logout()}>Sair da conta</button></div></div>;
  }
  if (!workspace) return <LoadingScreen />;

  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: "overview", label: "Visão geral", icon: <LayoutDashboard size={19} /> },
    { id: "projects", label: "Projetos", icon: <FolderKanban size={19} /> },
    { id: "content", label: "Conteúdos", icon: <Video size={19} /> },
    { id: "calendar", label: "Agenda", icon: <CalendarDays size={19} /> },
    { id: "tools", label: "Apps e IAs", icon: <LayoutGrid size={19} /> },
  ];
  const titles: Record<View, [string, string]> = {
    overview: ["Um passo de cada vez", "Seu trabalho em andamento, sem precisar abrir mais frentes."],
    projects: ["Projetos", "Veja o que está ativo e escolha o próximo passo."],
    content: ["Fluxo de conteúdo", "Da escolha do produto ao acompanhamento — com sua revisão no controle."],
    calendar: ["Agenda da semana", "Inclua trabalho, compromissos pessoais e tempo para descansar."],
    tools: ["Apps e IAs", "Todos os seus apps, PWAs e IAs em um só lugar. Cada um abre em outra aba."],
  };
  const today = now;
  const firstName = auth.user.name?.split(" ")[0] || "Jakson";
  const allTasks = workspace.tasks;
  const todoTasks = allTasks.filter(task => task.status !== "done");
  const filteredProjects = workspace.projects.filter(project => `${project.name} ${project.category} ${project.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const filteredContent = workspace.content.filter(item => `${item.title} ${item.productName} ${item.channels.join(" ")}`.toLowerCase().includes(search.toLowerCase()));

  const renderTask = (task: Task) => (
    <div className={`task-row ${task.status === "done" ? "is-done" : ""}`} key={task.id}>
      <button className={`task-check ${task.status === "done" ? "checked" : ""}`} aria-label={task.status === "done" ? "Reabrir tarefa" : "Concluir tarefa"} onClick={() => taskUpdate.mutate({ id: task.id, status: task.status === "done" ? "todo" : "done" })}>
        {task.status === "done" ? <Check size={15} /> : <Circle size={17} />}
      </button>
      <button className="task-main" onClick={() => openModal("task", task)}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">{projectName(workspace, task.projectId)}{task.dueDate ? ` · ${niceDate(`${task.dueDate}T12:00:00`)}` : " · Sem prazo"}{task.estimateMinutes ? ` · ${task.estimateMinutes} min` : ""}</span>
      </button>
      <span className={`priority-dot priority-${task.priority}`} title={priorityLabel(task.priority)} />
      <button className="icon-button subtle" aria-label="Excluir tarefa" onClick={() => { if (window.confirm("Excluir esta tarefa?")) taskDelete.mutate({ id: task.id }); }}><Trash2 size={15} /></button>
    </div>
  );

  const renderProjectCard = (project: Project) => {
    const projectTasks = allTasks.filter(task => task.projectId === project.id && task.status !== "done");
    const projectContents = workspace.content.filter(item => item.projectId === project.id);
    const results = workspace.results.filter(result => result.projectId === project.id).slice(0, 2);
    return <article className="project-card" key={project.id}>
      <div className="project-card-top"><span className="project-category">{project.category}</span><select className="status-select project-status" aria-label={`Status de ${project.name}`} value={project.status} onChange={event => projectUpdate.mutate({ id: project.id, status: event.target.value as "active" | "paused" | "completed" })}><option value="active">Ativo</option><option value="paused">Em pausa</option><option value="completed">Concluído</option></select></div>
      <button className="project-card-title" onClick={() => openModal("project", project)}>{project.name}<Pencil size={14} /></button>
      <p className="project-description">{project.description || "Adicione contexto e próximos passos para este projeto."}</p>
      <div className="project-next"><span>Próximo passo</span><p>{project.nextAction || "Escolher quando fizer sentido"}</p></div>
      <div className="project-stats"><span><ListTodo size={14} /> {projectTasks.length} pendente{projectTasks.length === 1 ? "" : "s"}</span><span><Video size={14} /> {projectContents.length} conteúdo{projectContents.length === 1 ? "" : "s"}</span></div>
      {results.length > 0 && <div className="result-chips">{results.map(result => <span key={result.id}>{result.metricName}: {result.metricValue}</span>)}</div>}
      <div className="project-card-actions"><button className="text-action" onClick={() => openModal("task", { projectId: project.id })}><Plus size={15} /> Nova tarefa</button><button className="text-action" onClick={() => openModal("content", { projectId: project.id })}><Plus size={15} /> Conteúdo</button><button className="icon-button subtle" aria-label="Registrar resultado" title="Registrar resultado manual" onClick={() => openModal("result", { projectId: project.id })}><Activity size={16} /></button></div>
    </article>;
  };

  const renderContentCard = (item: ContentItem) => {
    const statusIndex = CONTENT_STAGES.findIndex(([value]) => value === item.status);
    const isExternal = statusIndex >= 7;
    const relatedResults = workspace.results.filter(result => result.contentId === item.id).slice(0, 1);
    return <article className="content-card" key={item.id}>
      <div className="content-card-head"><div><div className="content-project">{projectName(workspace, item.projectId)}</div><button className="content-title" onClick={() => openModal("content", item)}>{item.title}<Pencil size={14} /></button></div><span className={`stage-pill ${item.status === "review" ? "stage-review" : item.status === "approved" ? "stage-approved" : isExternal ? "stage-external" : ""}`}>{contentStatusLabel(item.status)}</span></div>
      <div className="content-meta-line"><span><BookOpen size={14} /> {item.productName}</span><span><CalendarDays size={14} /> {niceDate(item.plannedAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
      {item.objective && <p className="content-objective">{item.objective}</p>}
      <div className="channel-row">{item.channels.map(channel => <span className="channel-chip" key={channel}>{channel}</span>)}</div>
      <div className="stage-track" aria-label={`Etapa: ${contentStatusLabel(item.status)}`}>{CONTENT_STAGES.slice(0, 7).map(([stage, label], index) => <span key={stage} title={label} className={index <= Math.min(statusIndex, 6) ? "stage-dot reached" : "stage-dot"} />)}</div>
      {item.approvedAt && <p className="content-note approval-history"><Clock3 size={14} /> Revisão aprovada manualmente em {niceDate(item.approvedAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
      {item.notes && <p className="content-note">{item.notes}</p>}
      {relatedResults.length > 0 && <p className="content-note">Último registro: {relatedResults[0].metricName} · {relatedResults[0].metricValue}</p>}
      <div className="content-actions">
        {statusIndex < 6 && <label className="stage-control">Mover etapa <ChevronDown size={14} /><select aria-label={`Etapa de ${item.title}`} value={item.status} onChange={event => contentMove.mutate({ id: item.id, status: event.target.value as any })}>{PRE_APPROVAL_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        {item.status === "review" && <Button size="sm" onClick={() => openReview(item)}><ClipboardCheck size={16} /> Revisar conteúdo</Button>}
        {item.status === "approved" && <Button size="sm" variant="outline" onClick={() => { if (window.confirm("Registrar que você agendou este conteúdo manualmente na plataforma? O Ritmo não abrirá nem alterará sua conta.")) contentMove.mutate({ id: item.id, status: "scheduled_manual" }); }}><CheckCircle2 size={16} /> Registrei o agendamento manual</Button>}
        {item.status === "scheduled_manual" && <Button size="sm" variant="outline" onClick={() => { if (window.confirm("Registrar que este conteúdo já foi publicado manualmente? O Ritmo não fará a publicação.")) contentMove.mutate({ id: item.id, status: "published" }); }}><CheckCircle2 size={16} /> Registrar publicação manual</Button>}
        {item.status === "published" && <Button size="sm" variant="outline" onClick={() => contentMove.mutate({ id: item.id, status: "measuring" })}><Activity size={16} /> Iniciar acompanhamento</Button>}
        {(item.status === "published" || item.status === "measuring") && <button className="text-action" onClick={() => openModal("result", { contentId: item.id })}><Plus size={15} /> Resultado</button>}
        <button className="icon-button subtle" aria-label="Editar conteúdo" onClick={() => openModal("content", item)}><Pencil size={15} /></button>
      </div>
      {isExternal && <div className="manual-notice"><ShieldCheck size={15} /> Etapa registrada por você. Nenhum conteúdo foi enviado pelo Ritmo.</div>}
    </article>;
  };

  const renderAgenda = () => <div className="agenda-list">{weekDays.map(day => {
    const key = dateKey(day);
    const dayTasks = workspace.tasks.filter(task => task.status !== "done" && task.dueDate === key);
    const dayEvents = workspace.events.filter(event => dateKey(new Date(event.startsAt)) === key);
    const dayContent = workspace.content.filter(item => item.plannedAt && dateKey(new Date(item.plannedAt)) === key);
    const hasToday = dateKey(today) === key;
    return <section className={`agenda-day ${hasToday ? "agenda-today" : ""}`} key={key}>
      <div className="agenda-date"><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day)}</span><strong>{day.getDate()}</strong>{hasToday && <em>Hoje</em>}</div>
      <div className="agenda-items">
        {dayEvents.map(event => <div className={`agenda-item event-${event.kind}`} key={`e${event.id}`}><span className="agenda-item-time">{niceDate(event.startsAt, { hour: "2-digit", minute: "2-digit" })}</span><span>{event.title}</span><span className="agenda-item-type">{event.kind === "rest" ? "Descanso" : event.kind === "personal" ? "Pessoal" : event.kind === "content" ? "Conteúdo" : "Trabalho"}</span><button className="icon-button tiny" aria-label="Remover evento" onClick={() => { if (window.confirm("Remover este bloco da agenda?")) eventDelete.mutate({ id: event.id }); }}><X size={14} /></button></div>)}
        {dayTasks.map(task => <div className="agenda-item event-work" key={`t${task.id}`}><span className="agenda-item-time">—</span><span>{task.title}</span><span className="agenda-item-type">Tarefa · {projectName(workspace, task.projectId)}</span><button className="icon-button tiny" aria-label="Abrir tarefa" onClick={() => openModal("task", task)}><Pencil size={13} /></button></div>)}
        {dayContent.map(item => <div className="agenda-item event-content" key={`c${item.id}`}><span className="agenda-item-time">{niceDate(item.plannedAt, { hour: "2-digit", minute: "2-digit" })}</span><span>{item.title}</span><span className="agenda-item-type">Conteúdo · {item.channels.join(", ")}</span><button className="icon-button tiny" aria-label="Abrir conteúdo" onClick={() => { setView("content"); setSearch(item.title); }}><ArrowRight size={13} /></button></div>)}
        {!dayTasks.length && !dayEvents.length && !dayContent.length && <p className="agenda-empty">Sem blocos planejados. Espaço livre também é válido.</p>}
      </div>
    </section>;
  })}</div>;

  function renderModal() {
    if (!modal) return null;
    const record = modal.record;
    const submitting = projectCreate.isPending || projectUpdate.isPending || taskCreate.isPending || taskUpdate.isPending || contentCreate.isPending || contentUpdate.isPending || eventCreate.isPending || resultCreate.isPending || shortcutCreate.isPending || shortcutUpdate.isPending || capacityUpdate.isPending;
    let title = "";
    let description = "";
    if (modal.kind === "project") { title = record?.id ? "Editar projeto" : "Novo projeto"; description = "Mantenha o próximo passo simples e concreto."; }
    if (modal.kind === "task") { title = record?.id ? "Editar tarefa" : "Nova tarefa"; description = "Uma tarefa clara ajuda a escolher o que cabe no dia."; }
    if (modal.kind === "content") { title = record?.id ? "Editar conteúdo" : "Planejar conteúdo"; description = "O Ritmo organiza o fluxo; você mantém o controle das plataformas."; }
    if (modal.kind === "event") { title = "Adicionar à agenda"; description = "Inclua trabalho, compromisso pessoal ou descanso."; }
    if (modal.kind === "result") { title = "Registrar resultado"; description = "Anote apenas números que você conferiu na fonte."; }
    if (modal.kind === "shortcut") { title = record?.id ? "Editar atalho" : "Adicionar atalho"; description = "O atalho abre o app ou site; ele não conecta sua conta."; }
    if (modal.kind === "capacity") { title = "Sua capacidade semanal"; description = "Defina só o tempo que você realmente quer reservar. Você pode deixar em branco."; }
    return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><h2 id="modal-title">{title}</h2><p>{description}</p></div><button className="icon-button" aria-label="Fechar" onClick={closeModal}><X size={19} /></button></div>
      <form onSubmit={submitModal} className="modal-form">
        {modal.kind === "project" && <>
          <Field label="Nome do projeto"><input name="name" required maxLength={160} defaultValue={record?.name ?? ""} placeholder="Ex.: Divulgação do e-book" /></Field>
          <Field label="Tipo ou área"><input name="category" maxLength={80} defaultValue={record?.category ?? ""} placeholder="Ex.: Produto digital" /></Field>
          <Field label="Contexto"><textarea name="description" rows={3} maxLength={5000} defaultValue={record?.description ?? ""} placeholder="O que importa lembrar sobre este projeto?" /></Field>
          <Field label="Próximo passo"><input name="nextAction" maxLength={240} defaultValue={record?.nextAction ?? ""} placeholder="Uma ação pequena e concreta" /></Field>
          {record?.id && <Field label="Situação"><select name="status" defaultValue={record.status}><option value="active">Ativo</option><option value="paused">Em pausa</option><option value="completed">Concluído</option></select></Field>}
        </>}
        {modal.kind === "task" && <>
          <Field label="O que precisa ser feito?"><input name="title" required maxLength={220} defaultValue={record?.title ?? ""} placeholder="Ex.: Conferir roteiro do vídeo" /></Field>
          <Field label="Projeto"><select name="projectId" defaultValue={record?.projectId ? String(record.projectId) : ""}><option value="">Sem projeto</option>{workspace.projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></Field>
          <div className="form-split"><Field label="Prazo"><input type="date" name="dueDate" defaultValue={record?.dueDate ?? ""} /></Field><Field label="Estimativa (min)" hint="Opcional"><input type="number" min="0" max="10000" name="estimateMinutes" defaultValue={record?.estimateMinutes ?? ""} placeholder="—" /></Field></div>
          <div className="form-split"><Field label="Prioridade"><select name="priority" defaultValue={record?.priority ?? "normal"}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option></select></Field><Field label="Estado"><select name="status" defaultValue={record?.status ?? "todo"}><option value="todo">A fazer</option><option value="doing">Em andamento</option><option value="done">Concluída</option></select></Field></div>
          <Field label="Notas"><textarea name="notes" rows={3} maxLength={5000} defaultValue={record?.notes ?? ""} placeholder="Detalhes opcionais" /></Field>
        </>}
        {modal.kind === "content" && <>
          <Field label="Produto"><input name="productName" required maxLength={180} defaultValue={record?.productName ?? ""} placeholder="Ex.: e-book Amazon KDP" /></Field>
          <Field label="Nome deste conteúdo"><input name="title" required maxLength={220} defaultValue={record?.title ?? ""} placeholder="Ex.: Carrossel — 3 dicas para dormir melhor" /></Field>
          <Field label="Projeto relacionado"><select name="projectId" defaultValue={record?.projectId ? String(record.projectId) : (record?.projectId === 0 ? "" : "")}><option value="">Sem projeto</option>{workspace.projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></Field>
          <Field label="Objetivo"><input name="objective" maxLength={180} defaultValue={record?.objective ?? ""} placeholder="Ex.: Gerar vendas no KDP" /></Field>
          <fieldset className="channel-fieldset"><legend>Canais</legend><div className="channel-options">{CHANNELS.map(channel => <label key={channel}><input type="checkbox" name="channels" value={channel} defaultChecked={record?.channels?.includes(channel) ?? ["Instagram", "Facebook"].includes(channel)} /><span>{channel}</span></label>)}</div></fieldset>
          <Field label="Data pretendida" hint="É um plano; o Ritmo não agenda por você."><input type="datetime-local" name="plannedAt" defaultValue={localDateTime(record?.plannedAt)} /></Field>
          <Field label="Notas"><textarea name="notes" rows={3} maxLength={5000} defaultValue={record?.notes ?? ""} placeholder="Referência, formato, ideias ou dependências" /></Field>
          {record?.id && record.status && ["approved", "scheduled_manual", "published", "measuring"].includes(record.status) && <p className="inline-warning"><ShieldCheck size={16} /> Ao editar um conteúdo aprovado, a revisão será invalidada e precisará ser refeita.</p>}
        </>}
        {modal.kind === "event" && <>
          <Field label="Título"><input name="title" required maxLength={180} placeholder="Ex.: Academia, gravação ou pausa" /></Field>
          <Field label="Tipo"><select name="kind" defaultValue="personal"><option value="work">Trabalho</option><option value="content">Conteúdo</option><option value="personal">Pessoal</option><option value="rest">Descanso</option></select></Field>
          <Field label="Início"><input type="datetime-local" name="startsAt" required defaultValue={localDateTime(new Date(Date.now() + 60 * 60 * 1000))} /></Field>
          <Field label="Fim (opcional)"><input type="datetime-local" name="endsAt" /></Field>
          <Field label="Projeto relacionado"><select name="projectId" defaultValue=""><option value="">Sem projeto</option>{workspace.projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></Field>
          <Field label="Notas"><textarea name="notes" rows={2} maxLength={5000} placeholder="Opcional" /></Field>
        </>}
        {modal.kind === "result" && <>
          <Field label="Projeto ou conteúdo"><select name="target" required defaultValue={record?.contentId ? `content:${record.contentId}` : record?.projectId ? `project:${record.projectId}` : ""}><option value="" disabled>Escolha onde registrar</option><optgroup label="Projetos">{workspace.projects.map(project => <option key={project.id} value={`project:${project.id}`}>{project.name}</option>)}</optgroup><optgroup label="Conteúdos">{workspace.content.map(item => <option key={item.id} value={`content:${item.id}`}>{item.title}</option>)}</optgroup></select></Field>
          <div className="form-split"><Field label="Métrica"><input name="metricName" required maxLength={120} placeholder="Ex.: visualizações, cliques, vendas" /></Field><Field label="Valor"><input name="metricValue" required maxLength={120} placeholder="Ex.: 430 ou R$ 29,90" /></Field></div>
          <Field label="Data do registro"><input name="recordedOn" type="date" required defaultValue={dateKey(new Date())} /></Field>
          <Field label="Observação"><textarea name="notes" rows={2} maxLength={5000} placeholder="Fonte do dado ou contexto" /></Field>
        </>}
        {modal.kind === "shortcut" && <>
          <Field label="Nome"><input name="name" required maxLength={100} defaultValue={record?.name ?? ""} placeholder="Ex.: Claude" /></Field>
          <Field label="Endereço (HTTPS)" hint="Pode digitar só claude.ai: o https:// é completado."><input name="url" required inputMode="url" autoCapitalize="none" autoCorrect="off" maxLength={1000} defaultValue={record?.url ?? ""} placeholder="claude.ai" /></Field>
          <div className="form-split"><Field label="Tipo"><select name="kind" defaultValue={record?.kind ?? "tool"}>{SHORTCUT_KINDS.map(kind => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}</select></Field><Field label="Ícone (emoji)" hint="Opcional"><input name="emoji" maxLength={8} defaultValue={record?.emoji ?? ""} placeholder="🟠" /></Field></div>
          <Field label="Categoria"><input name="category" maxLength={80} defaultValue={record?.category ?? "Ferramenta"} placeholder="Ex.: Redes sociais" /></Field>
          <Field label="Descrição curta" hint="Opcional"><input name="description" maxLength={200} defaultValue={record?.description ?? ""} placeholder="Para que você usa" /></Field>
          <label className="pin-field"><input type="checkbox" name="pinned" defaultChecked={record?.pinned ?? false} /> Mostrar no acesso rápido da Visão geral</label>
          <p className="inline-warning"><Link2 size={16} /> Um endereço salvo abre o site, mas não conecta a ferramenta ao Ritmo.</p>
        </>}
        {modal.kind === "capacity" && <>
          <Field label="Horas por semana"><input name="hours" type="number" min="1" max="100" step="0.5" defaultValue={workspace.settings?.weeklyCapacityMinutes ? String(workspace.settings.weeklyCapacityMinutes / 60) : ""} placeholder="Deixe em branco para não definir" /></Field>
          {workspace.settings?.weeklyCapacityMinutes && <button className="text-button" type="button" onClick={() => capacityUpdate.mutate({ weeklyCapacityMinutes: null }, { onSuccess: () => { refresh(); closeModal(); toast.success("Capacidade removida."); } })}>Remover capacidade</button>}
        </>}
        <div className="modal-actions"><Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{modal.kind === "capacity" ? "Salvar" : record?.id ? "Salvar alterações" : "Adicionar"}</Button></div>
      </form>
    </section></div>;
  }

  const renderOverview = () => {
    const upcomingTasks = [...todoTasks].sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")).slice(0, 4);
    const upcomingContent = workspace.content.filter(item => item.status !== "published" && item.status !== "measuring").sort((a, b) => (a.plannedAt ? new Date(a.plannedAt).getTime() : Infinity) - (b.plannedAt ? new Date(b.plannedAt).getTime() : Infinity)).slice(0, 3);
    const cap = workspace.settings?.weeklyCapacityMinutes ?? null;
    const workloadPercent = cap ? Math.min(100, Math.round((plannedMinutes / cap) * 100)) : 0;
    const todayEvents = workspace.events.filter(event => dateKey(new Date(event.startsAt)) === todayKey);
    const todayTasks = todoTasks.filter(task => task.dueDate === todayKey);
    const todayContent = workspace.content.filter(item => item.plannedAt && dateKey(new Date(item.plannedAt)) === todayKey);
    return <>
      <QuickLauncher items={workspace.shortcuts} onOpen={openShortcut} onManage={() => { setView("tools"); setSearch(""); }} onAdd={() => openModal("shortcut", { pinned: true })} />
      <section className="panel today-panel"><div className="panel-heading"><div><span className="eyebrow">HOJE</span><h3>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(today)}</h3></div><button className="text-action" onClick={() => setView("calendar")}>Ver semana <ArrowRight size={15} /></button></div>
        {todayEvents.length + todayTasks.length + todayContent.length === 0 ? <p className="agenda-empty">Nada marcado para hoje. Espaço livre também é válido.</p> : <div className="today-list">
          {todayEvents.map(event => <div className="today-row" key={`e${event.id}`}><span>{niceDate(event.startsAt, { hour: "2-digit", minute: "2-digit" })}</span><strong>{event.title}</strong></div>)}
          {todayContent.map(item => <button className="today-row" key={`c${item.id}`} onClick={() => { setView("content"); setSearch(item.title); }}><span>{niceDate(item.plannedAt, { hour: "2-digit", minute: "2-digit" })}</span><strong>{item.title}</strong><small>{item.channels.join(", ")}</small></button>)}
          {todayTasks.map(task => <button className="today-row" key={`t${task.id}`} onClick={() => openModal("task", task)}><span>Tarefa</span><strong>{task.title}</strong><small>{projectName(workspace, task.projectId)}</small></button>)}
        </div>}
      </section>
      <section className="welcome-panel"><div className="welcome-copy"><span className="eyebrow"><Sparkles size={14} /> SEMANA EM FOCO</span><h2>Olá, {firstName}.</h2><p>Vamos tornar o que já está em andamento mais fácil de acompanhar.</p><div className="welcome-date"><CalendarDays size={15} /> {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(today)}</div></div><div className="welcome-illustration" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-center"><div className="brand-mark"><span /><span /><span /></div></div><span className="orbit-leaf"><Heart size={17} /></span><span className="orbit-moon"><Moon size={16} /></span></div></section>
      <div className="stat-grid"><button className="stat-card" onClick={() => setView("projects")}><span className="stat-icon stat-green"><FolderKanban size={18} /></span><span className="stat-number">{activeProjects.length}</span><span className="stat-label">projetos ativos</span><ArrowUpRight className="stat-arrow" size={17} /></button><button className="stat-card" onClick={() => setView("projects")}><span className="stat-icon stat-lilac"><ListTodo size={18} /></span><span className="stat-number">{todoTasks.length}</span><span className="stat-label">tarefas abertas</span><ArrowUpRight className="stat-arrow" size={17} /></button><button className="stat-card" onClick={() => setView("content")}><span className="stat-icon stat-amber"><ClipboardCheck size={18} /></span><span className="stat-number">{needsReview.length}</span><span className="stat-label">conteúdo{needsReview.length === 1 ? "" : "s"} para revisar</span><ArrowUpRight className="stat-arrow" size={17} /></button><button className="stat-card" onClick={() => setView("calendar")}><span className="stat-icon stat-blue"><CalendarDays size={18} /></span><span className="stat-number">{workspace.events.length + workspace.content.filter(item => item.plannedAt).length}</span><span className="stat-label">blocos na agenda</span><ArrowUpRight className="stat-arrow" size={17} /></button></div>
      <div className="overview-grid"><section className="panel workload-panel"><div className="panel-heading"><div><span className="eyebrow">CAPACIDADE</span><h3>Quanto cabe nesta semana?</h3></div><button className="icon-button" aria-label="Definir capacidade semanal" onClick={() => openModal("capacity")}><Pencil size={16} /></button></div>{cap ? <><div className="workload-numbers"><strong>{(plannedMinutes / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}<small> h planejadas</small></strong><span>de {(cap / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h que você reservou</span></div><div className="progress-track"><span style={{ width: `${workloadPercent}%` }} /></div><p className="panel-footnote">Estimativas só consideram tarefas com prazo nesta semana. Ajuste o plano quando precisar.</p></> : <div className="capacity-empty"><div className="capacity-symbol"><Gauge size={23} /></div><div><p>Sem meta de horas definida.</p><span>Se ajudar, escolha um limite realista. Também pode deixar em branco.</span></div><Button size="sm" variant="outline" onClick={() => openModal("capacity")}>Definir</Button></div>}</section>
        <section className="panel focus-panel"><div className="panel-heading"><div><span className="eyebrow">PRÓXIMO PASSO</span><h3>Um foco de cada vez</h3></div><span className="gentle-mark"><Moon size={16} /></span></div>{workspace.projects.find(project => project.status === "active" && project.nextAction) ? <><h4>{workspace.projects.find(project => project.status === "active" && project.nextAction)?.name}</h4><p>{workspace.projects.find(project => project.status === "active" && project.nextAction)?.nextAction}</p><button className="text-action" onClick={() => setView("projects")}>Ver projeto <ArrowRight size={15} /></button></> : <div className="soft-empty"><p>Escolha um próximo passo pequeno para um projeto ativo.</p><button className="text-action" onClick={() => openModal("project")}>Adicionar projeto ou passo <ArrowRight size={15} /></button></div>}</section></div>
      <div className="overview-grid lower-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">TAREFAS</span><h3>Próximas na fila</h3></div><button className="text-action" onClick={() => setView("projects")}>Ver tudo <ArrowRight size={15} /></button></div>{upcomingTasks.length ? <div className="task-list">{upcomingTasks.map(renderTask)}</div> : <EmptyState icon={<CheckCircle2 size={23} />} title="Sem tarefas abertas" text="Você não precisa preencher o espaço só para parecer produtivo." action={<button className="text-action" onClick={() => openModal("task")}>Adicionar tarefa <Plus size={15} /></button>} />}</section>
        <section className="panel"><div className="panel-heading"><div><span className="eyebrow">CONTEÚDO</span><h3>Em preparação</h3></div><button className="text-action" onClick={() => setView("content")}>Ver fluxo <ArrowRight size={15} /></button></div>{upcomingContent.length ? <div className="mini-content-list">{upcomingContent.map(item => <button className="mini-content" key={item.id} onClick={() => { setView("content"); setSearch(item.title); }}><span className="mini-content-icon"><Video size={17} /></span><span className="mini-content-text"><strong>{item.title}</strong><small>{projectName(workspace, item.projectId)} · {contentStatusLabel(item.status)}</small></span><ChevronDown className="mini-chevron" size={17} /></button>)}</div> : <EmptyState icon={<Video size={23} />} title="Nenhum conteúdo no fluxo" text="Adicione uma peça quando for o momento de planejar a próxima semana." action={<button className="text-action" onClick={() => openModal("content")}>Planejar conteúdo <Plus size={15} /></button>} />}</section></div>
      <section className="calm-banner"><span className="calm-icon"><Heart size={18} /></span><div><strong>Planejar também é escolher o que não fazer.</strong><p>Seu hub não vai criar mais trabalho por conta própria.</p></div><button className="text-action" onClick={() => openModal("event")}>Reservar uma pausa <Plus size={15} /></button></section>
    </>;
  };

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark"><span /><span /><span /></div><div><strong>ritmo</strong><small>seu espaço de trabalho</small></div></div><div className="sidebar-label">ESPAÇO PESSOAL</div><nav className="side-nav">{navItems.map(item => <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => { setView(item.id); setSearch(""); }}>{item.icon}<span>{item.label}</span>{item.id === "content" && needsReview.length > 0 && <em>{needsReview.length}</em>}</button>)}</nav><div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={17} /><span><strong>Seu espaço, privado</strong><small>Nenhuma rede conectada</small></span></div><div className="user-row"><div className="user-avatar">{firstName[0]?.toUpperCase()}</div><div className="user-details"><strong>{auth.user.name || "Jakson"}</strong><small>Conta pessoal</small></div><button className="icon-button" aria-label="Sair" title="Sair" onClick={() => auth.logout()}><LogOut size={16} /></button></div></div></aside>
    <main className="main-panel"><header className="topbar"><div className="breadcrumb"><span>Ritmo</span><span className="crumb-divider">/</span><strong>{titles[view][0]}</strong></div><div className="topbar-actions"><span className="sync-indicator"><span /> Sincronizado</span><button className="top-action" onClick={() => openModal("task")}><Plus size={16} /> Nova tarefa</button><button className="top-action primary-action" onClick={() => openModal("content")}><Plus size={16} /> Planejar conteúdo</button></div></header>
      <div className="page-content"><div className={`page-heading${view === "overview" ? " is-overview" : ""}`}><div><p className="eyebrow">{view === "overview" ? "SEU HUB PESSOAL" : "ACOMPANHAMENTO"}</p><h1>{titles[view][0]}</h1><p>{titles[view][1]}</p></div>{view !== "overview" && <div className="heading-actions">{(view === "projects" || view === "content") && <div className="search-box"><input aria-label="Buscar" value={search} onChange={event => setSearch(event.target.value)} placeholder={view === "projects" ? "Buscar projetos" : "Buscar conteúdo"} /></div>}{view === "projects" && <Button onClick={() => openModal("project")}><Plus size={16} /> Novo projeto</Button>}{view === "content" && <Button onClick={() => openModal("content")}><Plus size={16} /> Novo conteúdo</Button>}{view === "calendar" && <Button onClick={() => openModal("event")}><Plus size={16} /> Adicionar bloco</Button>}{view === "tools" && <Button onClick={() => openModal("shortcut")}><Plus size={16} /> Novo atalho</Button>}</div>}</div>
        {view === "overview" && renderOverview()}
        {view === "projects" && <>{filteredProjects.length ? <div className="project-grid">{filteredProjects.map(renderProjectCard)}</div> : <EmptyState icon={<FolderKanban size={23} />} title={search ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"} text={search ? "Tente outra palavra." : "Adicione os projetos que quer acompanhar. Comece só com o que já está em andamento."} action={!search && <Button onClick={() => openModal("project")}><Plus size={16} /> Novo projeto</Button>} />}{todoTasks.length > 0 && <section className="panel task-panel"><div className="panel-heading"><div><span className="eyebrow">AÇÕES</span><h3>Tarefas abertas</h3></div><Button variant="outline" size="sm" onClick={() => openModal("task")}>Nova tarefa <Plus size={15} /></Button></div><div className="task-list">{todoTasks.map(renderTask)}</div></section>}</>}
        {view === "content" && <><div className="safety-callout"><ShieldCheck size={19} /><div><strong>Você continua no comando.</strong><p>O Ritmo não se conecta às redes, não agenda e não publica. “Aprovado”, “agendado” e “publicado” são registros que você confirma depois de agir manualmente.</p></div></div>{filteredContent.length ? <div className="content-list">{filteredContent.map(renderContentCard)}</div> : <EmptyState icon={<Video size={23} />} title={search ? "Nenhum conteúdo encontrado" : "Comece pelo próximo conteúdo, não por todos"} text={search ? "Tente outro termo." : "Escolha um produto e um objetivo. Você pode completar as etapas com calma."} action={!search && <Button onClick={() => openModal("content")}><Plus size={16} /> Planejar conteúdo</Button>} />}</>}
        {view === "calendar" && <><div className="calendar-explainer"><span className="calm-icon"><Moon size={18} /></span><p>Agenda manual: seus compromissos, tarefas com prazo e conteúdo planejado. Nenhum calendário externo está conectado.</p></div>{renderAgenda()}</>}
        {view === "tools" && <AppsView items={workspace.shortcuts} search={search} onSearch={setSearch} onOpen={openShortcut} onEdit={item => openModal("shortcut", item)} onTogglePin={item => shortcutUpdate.mutate({ id: item.id, pinned: !item.pinned })} onDelete={item => { if (window.confirm(`Remover "${item.name}" do Ritmo? Isso não apaga o app ou site.`)) shortcutDelete.mutate({ id: item.id }); }} onAdd={() => openModal("shortcut")} footer={<><div className="safety-callout"><Link2 size={19} /><div><strong>Atalhos não são integrações.</strong><p>Um link abre o site em outra aba. O Ritmo não lê conversas, arquivos, publicações ou dados internos desses serviços.</p></div></div><div className="export-card"><div><strong>Leve uma cópia dos seus dados</strong><p>Baixe projetos, tarefas, conteúdos, agenda, resultados e atalhos em JSON.</p></div><ExportButton /></div></>} />}
        <footer className="page-footer"><span>Ritmo guarda seus dados privados. As ações nas plataformas continuam manuais.</span><button onClick={() => openModal("shortcut")}><Plus size={14} /> Atalho</button><button onClick={() => setView("tools")}><ExternalLink size={14} /> Dados e ferramentas</button></footer>
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Navegação principal">{navItems.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setSearch(""); }}>{item.icon}<span>{item.label}</span>{item.id === "content" && needsReview.length > 0 && <em>{needsReview.length}</em>}</button>)}</nav>
    {modal && renderModal()}
    {reviewItem && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setReviewItem(null); }}><section className="modal-card review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><div className="modal-heading"><div><span className="eyebrow">REVISÃO HUMANA</span><h2 id="review-title">Conferir antes de aprovar</h2><p>{reviewItem.title}</p></div><button className="icon-button" aria-label="Fechar" onClick={() => setReviewItem(null)}><X size={19} /></button></div><div className="review-alert"><ShieldCheck size={18} /><p>Esta confirmação só muda o estado dentro do Ritmo. Ela não agenda nem publica o conteúdo.</p></div><div className="review-checklist">{REVIEW_ITEMS.map(([key, label]) => <label className="review-check" key={key}><input type="checkbox" checked={checklist[key]} onChange={event => setChecklist(current => ({ ...current, [key]: event.target.checked }))} /><span className="custom-check">{checklist[key] && <Check size={14} />}</span><span>{label}</span></label>)}</div><div className="review-bottom"><p>{Object.values(checklist).filter(Boolean).length} de 6 itens conferidos</p><div className="modal-actions"><Button variant="outline" onClick={() => setReviewItem(null)}>Ainda não</Button><Button disabled={!Object.values(checklist).every(Boolean) || contentApprove.isPending} onClick={() => contentApprove.mutate({ id: reviewItem.id, reviewRevision: reviewItem.contentRevision, checklist }, { onSuccess: () => { setReviewItem(null); toast.success("Aprovado no hub. Nada foi enviado ou agendado."); }, onError: handleError })}>{contentApprove.isPending ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />} Aprovar para ação manual</Button></div></div></section></div>}
  </div>;

  function ExportButton() {
    const exportQuery = trpc.hub.export.useQuery(undefined, { enabled: false });
    return <Button variant="outline" onClick={async () => {
      try {
        const data = await exportQuery.refetch();
        if (!data.data) throw new Error("Não foi possível preparar a exportação.");
        const file = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `ritmo-backup-${dateKey(new Date())}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success("Cópia JSON baixada para este dispositivo.");
      } catch (error) { handleError(error instanceof Error ? error : new Error("Falha na exportação.")); }
    }}><ArrowUpRight size={16} /> Baixar JSON</Button>;
  }
}
