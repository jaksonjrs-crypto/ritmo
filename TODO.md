# TODO — Ritmo V2.0

## Lançador (Hub)
- Visão geral abre com acesso rápido: atalhos fixados, abertos por último e pergunta rápida a uma IA.
- Tela "Apps e IAs": agrupar por tipo, buscar, fixar/desafixar, editar e remover; atalhos só abrem o endereço.
- Aceitar endereço curto (`claude.ai`) e recusar tudo que não seja HTTPS.
- Atalhos iniciais editáveis, criados uma única vez por conta (sem duplicar o que o usuário já tinha).
- Atalhos do ícone do PWA: Apps e IAs, Agenda e Nova tarefa.

## Privacidade e robustez
- Com `OWNER_OPEN_ID` definido, outra conta não acessa nenhum dado nem altera nada.
- Semana e "Hoje" acompanham o relógio mesmo com o app aberto por dias.
- Primeira carga simultânea não duplica projetos nem atalhos.

## Fica para depois
- Dividir `Home.tsx` em telas menores.
- Reordenar atalhos por arrastar.
- Chat de IA dentro do Ritmo (exige avaliação de API, chaves e custo).

---

# TODO — Ritmo MVP

## Conta privada e sincronização
- A PWA deve exigir a conta autorizada antes de mostrar dados do hub.
- Os dados devem ser persistidos no banco em nuvem e carregados na sessão em outro dispositivo após login.
- Cada leitura, criação, atualização, exclusão e exportação deve ser limitada ao usuário autenticado; registros de outra conta não podem ser consultados ou alterados por IDs conhecidos.
- Login usa OAuth Manus do starter; não há senha própria nem coleta de credenciais externas.

## Painel de projetos e próximos passos
- Mostrar projetos em andamento, situação atual, próximo passo e tarefas pendentes.
- Permitir criar, editar, pausar/concluir e visualizar projetos.
- Iniciar com projetos editáveis derivados do contexto conhecido: e-book Amazon KDP e divulgação; e-book Hotmart; ferramenta de garimpo/vitrine; canais de música para relaxar/dormir no YouTube.
- Não inventar prazos, métricas ou resultados financeiros para os projetos iniciais.

## Tarefas e capacidade semanal
- Tarefas devem aceitar projeto opcional, título, prazo, prioridade, estimativa de minutos e estado pendente/em andamento/concluída.
- Permitir ordenar/filtrar por semana, prioridade, projeto e estado.
- Exibir carga estimada da semana versus capacidade somente se o usuário definir capacidade semanal; não presumir um limite inicial.
- Permitir atualizar estados explicitamente e exibir quando não há itens.

## Plano semanal de conteúdo
- Cada conteúdo deve poder se relacionar a um projeto, produto, objetivo, um ou mais canais, data pretendida e notas.
- Oferecer os canais Instagram, Facebook, TikTok, YouTube, Pinterest, Shopee Vídeos e Telegram sem conectar as contas.
- Acompanhar as etapas: produto escolhido, briefing, roteiro/texto, gravação, edição, revisão, aprovado, agendado manualmente, publicado e acompanhamento.
- “Agendado manualmente” e “publicado” são registros atualizados pelo usuário; a PWA não chama serviços de rede social.

## Revisão e trava de aprovação
- Antes de aprovar conteúdo, exigir confirmação humana de: texto revisado; vídeo/carrossel/peça correta; canal e conta corretos; data e hora conferidas; link/CTA testado; produto/oferta conferidos.
- Se qualquer item estiver desmarcado, bloquear a aprovação e indicar o que falta.
- Ao aprovar, mostrar explicitamente que nada será enviado nem agendado pelo Ritmo e que a ação externa ainda deve ser feita manualmente.
- Registrar checklist, estado e horário da aprovação para exibir o histórico básico da etapa. Vincular a aprovação à versão revisada: se outro dispositivo editar ou mover o conteúdo enquanto a revisão estiver aberta, exigir uma nova revisão antes de aprovar.

## Agenda pessoal e descanso
- Permitir eventos manuais para tarefas, conteúdos, compromissos pessoais e descanso.
- Exibir uma agenda semanal móvel/responsiva com data e horário locais.
- A agenda não sincroniza com Google Calendar no MVP e não envia lembretes externos.

## Resultados manuais
- Permitir registrar resultado vinculado a projeto ou conteúdo com data, nome da métrica, valor e observação.
- Mostrar registros existentes sem preencher valores fictícios ou conectar analytics.

## Atalhos de ferramentas
- Incluir links de atalho para Gemini (Google AI Pro), Claude e ElevenLabs, além de permitir atalhos personalizados.
- Abrir links HTTPS em nova aba e deixar claro que o atalho apenas abre o site; não concede acesso ao conteúdo ou às funções internas.
- Não armazenar senhas, tokens ou credenciais de serviços externos.

## Exportação de dados e PWA
- Disponibilizar exportação JSON manual dos registros pertencentes ao usuário autenticado.
- Incluir manifesto e ícones para instalação em dispositivos compatíveis.
- Não cachear respostas ou páginas com dados privados em service worker.

## Interface e tom
- A interface deve funcionar em telas de celular e desktop, com navegação adequada a cada tamanho.
- Exibir um resumo de semana em foco, projetos, tarefas, conteúdos pendentes de revisão e agenda.
- Usar linguagem calma e informativa, sem streaks, pontos, contagens regressivas, culpa ou notificações especulativas.
