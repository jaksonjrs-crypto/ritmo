# Changelog

## 2.0.0
### Novo
- Lançador: acesso rápido fixável, "abertos por último", pergunta rápida a uma IA e tela **Apps e IAs** agrupada por tipo.
- Atalhos com tipo, emoji, descrição, fixar e editar (migração `0003_hub_launcher`, aditiva). Atalhos iniciais editáveis: Claude, Gemini, ChatGPT, Manus, ElevenLabs, Suno, Vitrine, Pequenas Viagens, Lulu e Lelê, Google Agenda, Canva, Metricool, GitHub, Vercel.
- "Hoje" na Visão geral; atalhos do ícone do PWA (`?view=tools`, `?view=calendar`, `?new=task`); ícone mascarável.
- Endereços aceitam digitação curta (`claude.ai`) e só HTTPS.
### Segurança
- `OWNER_OPEN_ID` agora restringe o hub à conta do dono (`ownerProcedure` em toda a API do hub).
### Correções
- A semana e o "hoje" se atualizam com o relógio e ao voltar para o app.
- Primeira carga e exportação simultâneas não duplicam mais os projetos iniciais.
- Removido `vite.config.ts.bak`.
### Notas
- A V1 (Expo/React Native) está na branch `v1-expo`.
- `pnpm audit` ainda aponta 4 avisos (2 baixos, 2 moderados) via `streamdown`/`katex`, usada só pelo componente de chat do template, que o Ritmo não exibe.

## 1.0.0
- MVP web: projetos, tarefas, conteúdo com revisão humana, agenda manual, resultados, atalhos e exportação JSON.
