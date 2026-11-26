# Plano — Ritmo

## Objetivo e decisões

Construir um aplicativo móvel em português que reduza o tempo entre abrir o app e iniciar a tarefa mais importante. A tela Hoje prioriza a próxima ação e o planejamento do dia; criar tarefa deve estar sempre a um toque. Dados pessoais serão mantidos no dispositivo com AsyncStorage, sem exigir conta ou conexão para o fluxo principal. A base fica no Expo Router, React Native, TypeScript e NativeWind já instalados; o backend existente não será necessário para as funções desta versão.

## Escopo funcional

- Onboarding curto para explicar o fluxo e escolher uma preferência de lembrete; conclusão persistida.
- Dia: saudação contextual, progresso de tarefas, próxima tarefa destacada, agenda em blocos e início rápido de foco.
- Tarefas: criar, editar, concluir e remover; título, prioridade, duração, data/horário, nota e meta opcional; busca e filtros por estado, data e prioridade.
- Planejamento: agenda diária que prioriza tarefas com horário, permite reagendamento simples e acesso rápido à criação.
- Metas: criar, editar e atualizar progresso; acompanhamento visual e associação opcional de tarefas.
- Configurações: preferências, ativação de notificações locais com explicação de permissão, e ação de recuperação/reinicialização de dados com confirmação.
- Persistência segura contra falha de leitura/escrita; detecção de indisponibilidade de rede quando possível, com mensagem de que os dados locais continuam acessíveis; estados de carregamento, vazio, permissão, erro, sucesso e recuperação.

## Arquitetura e estrutura

- `app/_layout.tsx`: provedores do starter, stack Expo Router e montagem de `AppStorageGate` antes de expor rotas.
- `app/onboarding.tsx`: fluxo inicial curto com nome opcional e escolha explícita de lembretes.
- `app/(tabs)/_layout.tsx`: navegação inferior com Hoje, Tarefas, Planejar e Metas.
- `app/(tabs)/index.tsx`, `tasks.tsx`, `plan.tsx`, `goals.tsx`: telas principais, com a tela Hoje priorizando o próximo passo.
- `app/settings.tsx` e `app/oauth/callback.tsx`: preferências/dados locais e rota do starter preservada.
- `components/`: portão global e recuperação de armazenamento, banner de falha, cartões, progresso, estados vazios e editores/timer modais.
- `providers/app-state-provider.tsx`: estado global tipado, hidratação, cópia anterior, fila de gravação AsyncStorage e ações de domínio.
- `hooks/use-connectivity.ts` e `hooks/use-reduced-motion.ts`: estado offline e preferência de movimento reduzido do sistema.
- `lib/date.ts`: helpers de data/horário; `constants/ritmo-theme.ts`: tokens e identidade visual.
- `assets/images/`: ícones de marca quadrados e arquivos nativos, sem cantos arredondados embutidos.

## Persistência, rede e permissões

Persistir tarefas, metas, preferências, estado de onboarding e lembretes como um único documento versionado em AsyncStorage. `AppStorageGate` mantém todas as rotas atrás do estado de carregamento/recuperação; erro de leitura oferece tentar novamente sem sobrescrever dados; falha ao salvar fica visível globalmente e pode ser tentada novamente por uma ação posterior. O app funciona offline porque operações centrais são locais; exibir um aviso não bloqueante quando a conectividade estiver indisponível. Solicitar permissão para notificações apenas após ação explícita em onboarding/configurações; se negada, explicar como alterar nas configurações do dispositivo. No Web, evitar prometer notificações nativas e informar a limitação/alternativa.

## PWA Web instalável e offline

A versão Web permanece no Expo Router com exportação estática e passa a possuir um manifest próprio, ícones quadrados derivados do ícone atual, metadados de cor e apresentação standalone. O projeto seleciona `application_owned` para o domínio PWA da Manus porque o aplicativo serve seu próprio manifest. Um service worker em `/service-worker.js` é registrado apenas no Web e usa uma estratégia conservadora: pré-cache do shell/ícones, cache-first para recursos estáticos same-origin e fallback local para navegação; chamadas `/api/`, endpoints externos e respostas autenticadas não entram em cache. Tarefas, metas e preferências seguem no armazenamento local existente, permitindo operações centrais offline depois que a interface for carregada ao menos uma vez.

## Design

**Direções consideradas (probabilidades de cauda):** Editorial caloroso de produtividade — 0,06; Neo-brutalismo enérgico — 0,03; Diário botânico contemplativo — 0,08. **Escolhida: Editorial caloroso de produtividade.**

- **Movimento de design:** editorial contemporâneo de bem-estar e produtividade, inspirado em cadernos de trabalho cuidadosamente diagramados.
- **Princípios centrais:** uma ação primária clara; densidade controlada e leitura em varredura; progresso motivador sem culpa; controles confortáveis para uso com uma mão.
- **Filosofia de cor:** fundo marfim quente e superfícies claras reduzem ruído; tinta quase preta dá legibilidade; verde-lima profundo é a cor própria e energética para ação/progresso; pêssego marca prioridades e acolhe avisos sem parecer alarme.
- **Paradigma de layout:** coluna editorial vertical com cabeçalho leve, cartão de foco de largura total, linha do tempo como eixo visual e barra inferior enxuta; evitar dashboards cheios de mini-gráficos.
- **Elementos-assinatura:** marcador circular de progresso desenhado como traço de caneta; cartões com filete lateral colorido por contexto; mini-etiqueta de tempo em formato de pílula.
- **Interação:** criação rápida em modal/bottom sheet com poucos campos e expansão opcional; concluir com toque e retorno tátil discreto; ações destrutivas requerem confirmação acessível; salvar oferece confirmação clara e recuperação.
- **Animação:** transições curtas de 160–220 ms, progresso com easing suave, entrada discreta do cartão de foco; respeitar Reduce Motion, sem animação essencial para entender estado.
- **Tipografia:** system sans-serif para leitura e interface, com títulos fortes, tamanho-base 16 px e rótulos nunca abaixo de 12 px; horas e contagens com números tabulares quando disponíveis.
- **Essência da marca:** “Ritmo ajuda você a transformar intenção na próxima ação, sem complicar o dia”; pessoal, atento, descomplicado.
- **Voz:** frases curtas, humanas e orientadas à ação; CTA direto e microcopy sem culpa. Exemplos: “Vamos por partes.” / “Seu próximo passo já está escolhido.”
- **Wordmark e símbolo:** “ritmo” em minúsculas com espaçamento amplo; símbolo autoral formado por um arco de progresso interrompido e um ponto de início, aplicado como ícone simples.
- **Cor-signatura:** verde-oliva vivo (referência aproximada `#758A32`), exclusivo do produto para ação e progresso.

## Execução técnica

Manter React Native e NativeWind do starter; componentes pressionáveis devem seguir o contrato do starter (`Pressable` estilizado via `style`). Usar ícones do `@expo/vector-icons`; suportar telas estreitas, safe areas, contraste e áreas de toque generosas. Implementar o onboarding e o estado local antes de ligar as telas, depois telas/fluxos e estados de feedback. O desenvolvimento deve iniciar pelas entradas declaradas em `runtime/dev-commands` para Metro (8081) e API (3000), com a migração/schema do starter sincronizados antes de tráfego de API conforme o README do Expo.
