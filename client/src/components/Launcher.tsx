import { useMemo, useState, type ReactNode } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { ExternalLink, MessageSquareText, Pencil, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildAskTarget,
  groupByKind,
  hostOf,
  KIND_SHORT_LABELS,
  matchesSearch,
  quickAccess,
  recentlyUsed,
} from "@shared/launcher";
import type { AppRouter } from "../../../server/routers";

export type ShortcutRow = inferRouterOutputs<AppRouter>["hub"]["workspace"]["shortcuts"][number];

type OpenHandler = (item: ShortcutRow) => void;

function iconOf(item: ShortcutRow) {
  return item.emoji || item.name.trim().charAt(0).toUpperCase() || "•";
}

/** Abre o endereço em outra aba. O clique só registra o uso; nunca lê nada do serviço. */
function LaunchTile({ item, onOpen }: { item: ShortcutRow; onOpen: OpenHandler }) {
  return (
    <a className="launch-tile" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen(item)} title={item.description || hostOf(item.url)}>
      <span className="launch-icon" data-kind={item.kind} aria-hidden="true">{iconOf(item)}</span>
      <span className="launch-name">{item.name}</span>
    </a>
  );
}

/** Painel da Visão geral: pergunta rápida + ícones fixados + usados por último. */
export function QuickLauncher({ items, onOpen, onManage, onAdd }: {
  items: ShortcutRow[];
  onOpen: OpenHandler;
  onManage: () => void;
  onAdd: () => void;
}) {
  const [question, setQuestion] = useState("");
  const pinned = useMemo(() => quickAccess(items, 12), [items]);
  const recent = useMemo(() => recentlyUsed(items, 4), [items]);
  const assistants = useMemo(
    () => items.filter(item => item.kind === "ai").sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.openCount - a.openCount).slice(0, 4),
    [items],
  );

  function ask(item: ShortcutRow) {
    const target = buildAskTarget(item.url, question);
    if (question.trim() && !target.prefilled) {
      navigator.clipboard?.writeText(question.trim())
        .then(() => toast.success(`Pergunta copiada. Cole no ${item.name}.`))
        .catch(() => toast.message(`Abri o ${item.name}. Digite sua pergunta lá.`));
    }
    onOpen(item);
    window.open(target.url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="launcher-panel" aria-labelledby="launcher-title">
      <div className="launcher-head">
        <div>
          <span className="eyebrow">ACESSO RÁPIDO</span>
          <h2 id="launcher-title">Para onde você quer ir?</h2>
        </div>
        <button className="text-action" onClick={onManage}>Todos os apps e IAs</button>
      </div>

      {assistants.length > 0 && (
        <div className="ask-box">
          <label className="ask-field">
            <MessageSquareText size={17} aria-hidden="true" />
            <input
              value={question}
              onChange={event => setQuestion(event.target.value)}
              maxLength={2000}
              placeholder="Escreva uma pergunta e escolha a IA"
              aria-label="Pergunta para uma IA"
            />
          </label>
          <div className="ask-targets">
            {assistants.map(item => (
              <button key={item.id} type="button" className="ask-chip" onClick={() => ask(item)}>
                <span aria-hidden="true">{iconOf(item)}</span> {item.name}
              </button>
            ))}
          </div>
          <p className="ask-hint">O texto só vai para a IA que você tocar. No Claude e no ChatGPT ele já chega preenchido; nos outros é copiado para você colar.</p>
        </div>
      )}

      {pinned.length > 0 ? (
        <div className="launch-grid">
          {pinned.map(item => <LaunchTile key={item.id} item={item} onOpen={onOpen} />)}
          <button className="launch-tile launch-add" onClick={onAdd}>
            <span className="launch-icon"><Plus size={20} /></span>
            <span className="launch-name">Adicionar</span>
          </button>
        </div>
      ) : (
        <p className="launcher-empty">Fixe seus apps e IAs favoritos em “Todos os apps e IAs” para tê-los aqui, a um toque.</p>
      )}

      {recent.length > 0 && (
        <div className="launch-recent">
          <span className="launch-recent-label">Abertos por último</span>
          <div>{recent.map(item => <a key={item.id} className="ask-chip" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen(item)}><span aria-hidden="true">{iconOf(item)}</span> {item.name}</a>)}</div>
        </div>
      )}
    </section>
  );
}

/** Tela “Apps e IAs”: tudo agrupado por tipo, com busca, fixar, editar e remover. */
export function AppsView({ items, search, onSearch, onOpen, onEdit, onTogglePin, onDelete, onAdd, footer }: {
  items: ShortcutRow[];
  search: string;
  onSearch: (value: string) => void;
  onOpen: OpenHandler;
  onEdit: (item: ShortcutRow) => void;
  onTogglePin: (item: ShortcutRow) => void;
  onDelete: (item: ShortcutRow) => void;
  onAdd: () => void;
  footer?: ReactNode;
}) {
  const groups = useMemo(() => groupByKind(items.filter(item => matchesSearch(item, search))), [items, search]);
  return (
    <>
      <div className="apps-search">
        <Search size={16} aria-hidden="true" />
        <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Buscar app, IA ou site" aria-label="Buscar app, IA ou site" />
      </div>
      {groups.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><Search size={23} /></div>
          <h3>{search ? "Nada encontrado" : "Nenhum atalho ainda"}</h3>
          <p>{search ? "Tente outra palavra." : "Adicione os apps, PWAs e IAs que você usa todo dia."}</p>
          {!search && <button className="text-action" onClick={onAdd}>Adicionar atalho <Plus size={15} /></button>}
        </div>
      )}
      {groups.map(group => (
        <section className="apps-group" key={group.kind} aria-label={group.label}>
          <h3 className="apps-group-title">{group.label}<span>{group.items.length}</span></h3>
          <div className="shortcut-grid">
            {group.items.map(item => (
              <article className="shortcut-card" key={item.id}>
                <a className="shortcut-open" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen(item)}>
                  <span className="launch-icon" data-kind={item.kind} aria-hidden="true">{iconOf(item)}</span>
                  <span className="shortcut-text">
                    <strong>{item.name}</strong>
                    <small>{item.description || hostOf(item.url)}</small>
                  </span>
                  <ExternalLink size={15} aria-hidden="true" className="shortcut-out" />
                </a>
                <div className="shortcut-actions">
                  <span className="project-category">{KIND_SHORT_LABELS[item.kind]} · {item.category}</span>
                  <span className="shortcut-buttons">
                    <button className="icon-button subtle" aria-label={item.pinned ? `Tirar ${item.name} do acesso rápido` : `Fixar ${item.name} no acesso rápido`} aria-pressed={item.pinned} onClick={() => onTogglePin(item)}>{item.pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>
                    <button className="icon-button subtle" aria-label={`Editar ${item.name}`} onClick={() => onEdit(item)}><Pencil size={15} /></button>
                    <button className="icon-button subtle" aria-label={`Remover ${item.name}`} onClick={() => onDelete(item)}><Trash2 size={15} /></button>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {footer}
    </>
  );
}
