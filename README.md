# Ritmo — Hub pessoal (V2.0)

Hub privado e sincronizado para o Jakson achar tudo em um toque: **IAs, apps/PWAs, sites, projetos, agenda e produção de conteúdo**. Pensado para o celular (PWA instalável), com barra lateral no desktop.

## O que a V2.0 traz
- **Acesso rápido** na Visão geral: ícones fixados (IAs, apps, sites), "abertos por último" e uma **pergunta rápida** (escreva e toque na IA; no Claude e no ChatGPT o texto chega preenchido, nas outras é copiado).
- **Apps e IAs**: tudo agrupado (IAs, meus apps/PWAs, meus sites, redes, ferramentas), com busca, fixar, editar e remover. Já vem com um ponto de partida editável.
- **Hoje** na Visão geral (agenda, conteúdo e tarefas do dia).
- **Atalhos do ícone do app** (segurar o ícone no Android): Apps e IAs, Agenda, Nova tarefa.
- **Espaço realmente privado**: com `OWNER_OPEN_ID` definido, só a conta do dono entra.
- Correções: semana/“hoje” agora acompanham o relógio (o app aberto por dias não fica preso no dia antigo); primeira carga não duplica projetos; ícone mascarável para Android.

Os atalhos **só abrem** o endereço em outra aba. O Ritmo não conecta contas, não lê conversas e não publica nada. Tudo que vai para redes sociais continua manual.

## Rodar
```bash
pnpm install
pnpm dev            # desenvolvimento (PORT, padrão 3000)
pnpm check          # tipos
pnpm test           # testes
pnpm build && pnpm start
pnpm db:migrate     # aplica as migrações (0003 é nova na V2.0 e só adiciona colunas)
```

## Variáveis importantes
- `OWNER_OPEN_ID`: openId do dono. **Defina em produção** para bloquear outras contas. Sem ela, qualquer conta autenticada entra no próprio espaço (isolado), útil só em desenvolvimento.
- `DATABASE_URL`, `MANUS_JWT_SECRET`, `MANUS_OAUTH_API_URL` e demais variáveis da plataforma (ver `server/_core/env.ts`).

## Atualizando da V1 (Expo/React Native)
A V1 ficou preservada na branch `v1-expo`. A V2.0 é outra base (web/PWA: React + Vite + Express + tRPC + Drizzle/MySQL). Não há migração de dados: a V1 guardava tudo no aparelho.

## Estrutura
- `client/src/pages/Home.tsx`: telas (visão geral, projetos, conteúdos, agenda, apps e IAs).
- `client/src/components/Launcher.tsx`: acesso rápido e tela de Apps e IAs.
- `shared/launcher.ts`: regras puras do lançador (validação HTTPS, pergunta rápida, agrupamento, atalhos iniciais).
- `server/routers.ts` / `server/db.ts`: API autenticada e consultas isoladas por usuário.
- `drizzle/`: esquema e migrações (somente aditivas).
- `plan.md`, `TODO.md`, `CHANGELOG.md`: decisões, critérios e histórico.
