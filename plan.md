# Ritmo V2.0 — Hub / Suite

## Objetivo da V2.0
Reduzir a dispersão no celular: um único ícone que leva às IAs, aos PWAs domésticos, aos sites e ao que está em andamento. A V2.0 mantém todos os limites da V1: nenhuma conexão com contas, nenhuma publicação, nenhuma leitura do conteúdo dos serviços.

## Decisões
- A Visão geral começa pelo **acesso rápido** (fixados, abertos por último e pergunta rápida), depois "Hoje" e o resumo da semana.
- **Apps e IAs** substitui "Ferramentas": atalhos com tipo (IA, app/PWA, site, rede, ferramenta), fixar, editar, descrição e emoji.
- Pergunta rápida: só o Claude e o ChatGPT aceitam o texto por endereço; nos demais o texto é copiado e o site é aberto. O texto só sai quando o usuário toca em uma IA.
- Sem ícones externos (nenhum pedido de favicon a terceiros): ícone é emoji ou inicial.
- Espaço privado por `OWNER_OPEN_ID`; sem a variável, isolamento por usuário continua valendo.
- Migrações somente aditivas (`0003_hub_launcher`).

## Fora da V2.0 (avaliar à parte)
Chat com IA dentro do Ritmo (API/chaves/custos), abrir apps nativos por esquema próprio (`intent://`, `claude://`), sincronizar com Google Agenda, notificações.

---

# Ritmo — plano de implementação

## Produto e escopo

PWA pessoal e privada, sincronizada entre dispositivos, para Jakson acompanhar projetos, tarefas, agenda e produção semanal de conteúdo. O MVP prioriza reduzir dispersão e tornar visível o que já está em andamento. Não conecta contas de redes sociais ou ferramentas de IA, não agenda nem publica, não envia conteúdo e não promete notificações externas. Toda ação externa continua sendo feita manualmente pelo usuário.

O ponto de partida inclui projetos editáveis derivados do que Jakson já relatou: e-book Amazon KDP e sua divulgação; e-book Hotmart; ferramenta própria de garimpo e vitrine; canais de música para relaxar e dormir no YouTube. As redes Instagram, Facebook, TikTok, YouTube, Pinterest, Shopee Vídeos e Telegram são opções de canal para planejamento. Nenhuma métrica, prazo, agendamento ou resultado financeiro será inventado.

## Experiência principal

A Home é um painel calmo de “semana em foco”: próximos passos, tarefas por prazo/prioridade, estimativa de carga e conteúdos aguardando revisão. A capacidade semanal fica sem valor inicial; o usuário pode defini-la. O painel mostra carga estimada versus capacidade somente depois de a capacidade ser informada. Não há streaks, alertas alarmistas nem linguagem que sugira que o usuário deveria estar sempre produzindo.

A navegação mobile-first oferece Visão geral, Projetos, Conteúdos, Agenda e Ferramentas; em desktop, esses destinos aparecem numa barra lateral. Tarefas e conteúdos ficam ligados a projetos. Eventos pessoais e blocos de descanso podem ocupar a agenda. A agenda semanal usa registros manuais e datas locais; não sincroniza com Google Calendar no MVP.

O fluxo de conteúdo registra produto, objetivo, canais, data pretendida, notas e etapa: produto escolhido → briefing → roteiro/texto → gravação → edição → revisão → aprovado → agendado manualmente → publicado → acompanhamento. Marcar como aprovado exige checklist explícito de texto, peça visual, canal/conta, data/hora, link/CTA e oferta. Agendado/publicado são estados informativos atualizados pelo usuário, nunca uma operação realizada pelo Ritmo. A confirmação é humana e a interface identifica que a ação externa deve ser feita na plataforma correspondente.

Resultados são lançamentos manuais, com data, métrica, valor e observação por conteúdo ou projeto. Os atalhos iniciais abrem Gemini (Google AI Pro), Claude e ElevenLabs; atalhos de redes e URLs personalizadas podem ser cadastrados pelo usuário. Um atalho só abre a URL; não lê nem controla o serviço. Uma exportação JSON manual permite ao usuário guardar uma cópia de seus dados.

## Arquitetura e segurança

- Frontend: React, TypeScript, Vite, Wouter, Tailwind e tRPC React Query, com layout responsivo e dados sempre carregados da API autenticada.
- Backend: Express + tRPC; todos os procedimentos de negócio usam `protectedProcedure`.
- Login: OAuth Manus fornecido pelo starter. Sem senha própria ou coleta de credenciais de terceiros.
- Persistência: MySQL gerenciado do projeto com Drizzle. Tabelas de domínio têm `userId`; cada listagem, leitura, alteração e exclusão filtra pelo `ctx.user.id`. IDs de outra conta não podem ser usados para consultar ou modificar registros.
- Aprovação sincronizada: cada conteúdo tem uma revisão monotônica; edições e mudanças de etapa avançam a versão, e a aprovação só grava se a versão e a etapa continuarem iguais às abertas no checklist, impedindo aprovações antigas entre dispositivos.
- Dados conceituais: `Project`, `Task`, `ContentItem`, `CalendarEvent`, `ResultMetric` e `Shortcut`, além de `User` do starter.
- Alterações de esquema são aditivas, versionadas por migração e aplicadas uma vez via `pnpm db:migrate`. Desenvolvimento e publicação usam o mesmo banco; nenhuma migração destrutiva é prevista.
- Nenhuma saída de IA é executada como instrução. O MVP não possui roteador de IA nem conectores operacionais.
- Atalhos validam URLs HTTPS e abrem em nova aba. Não guardam senhas ou tokens.
- A exportação é iniciada pelo usuário, autenticada e contém apenas os registros da conta atual.
- A PWA tem manifesto e identidade visual próprios; nenhum service worker cacheia respostas privadas. Dados sincronizados exigem conexão online.

## Estrutura do projeto

- `client/src/pages/Home.tsx`: shell, navegação e telas de resumo, projetos, conteúdo, agenda e atalhos.
- `client/src/components/`: elementos reutilizáveis de cards, formulários, diálogo de aprovação e navegação mobile.
- `client/src/index.css`: tokens visuais, tipografia e responsividade.
- `client/public/manifest.webmanifest` e ícones: instalação como PWA.
- `server/routers.ts`: endpoints tRPC autenticados para as entidades e exportação.
- `server/db.ts`: consultas Drizzle com isolamento por usuário e criação inicial dos projetos/atalhos.
- `drizzle/schema.ts` e `drizzle/0001_*.sql`: modelo e migração aditiva do MVP.
- `plan.md` e `TODO.md`: fonte de decisões e critérios de entrega.

## Direção de design

Três opções consideradas: **bancada editorial serena** (0,08); **planner analógico tátil, como caderno de estúdio** (0,04); **painel escuro de alta energia, com acentos neon** (0,06). Escolha: bancada editorial serena, para priorizar clareza sem pressionar a pessoa.

- **Movimento:** editorial suíço contemporâneo, aplicado a uma ferramenta pessoal.
- **Princípios:** calma; informação escaneável; estados explícitos; revisão humana visível.
- **Cores:** fundo papel quente, tinta verde-petróleo como cor de ação e âmbar suave para espera; vermelho apenas para erro real, nunca para produtividade atrasada.
- **Layout:** barra lateral discreta em desktop; navegação inferior em celular; conteúdo alinhado em coluna com resumos e listas, evitando grade de métricas como tela inteira.
- **Elementos de assinatura:** trilha de etapas do conteúdo; selo “revisão manual”; marcador de foco semanal sem pontuação competitiva.
- **Interação:** estado só muda por ação explícita; antes de aprovar, checklist; textos sempre dizem se algo é apenas registro ou ação externa.
- **Animação:** transições breves de opacidade/posição, sem movimento contínuo ou celebrações gamificadas.
- **Tipografia:** Georgia para títulos e system-ui/Arial para interface e corpo, com hierarquia curta e legível.
- **Essência:** “um lugar para fechar o ciclo da semana sem abrir mais dez frentes”; personalidade tranquila, precisa e encorajadora.
- **Tom:** mensagens concretas e sem cobrança. Exemplos: “Escolha o próximo passo, não o próximo projeto.” e “A publicação só fica aprovada depois da sua conferência.”
- **Marca:** wordmark Ritmo acompanhado de três traços curvos que evocam cadência; verde-petróleo `#28675B` como cor distintiva.

## Fora do MVP

Publicação/agendamento automático, integrações com Meta/Instagram/Facebook, Google Calendar, APIs de Claude/Gemini/ElevenLabs, análise automática de métricas, leitura de contas, equipes, notificações em tempo real, gestão financeira e recomendações de IA. Qualquer uma dessas capacidades exige avaliação separada das APIs, permissões, limites e estados observáveis antes de ser prometida.
