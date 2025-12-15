# Plano de Módulos do SGTUR
Guia de tudo o que já foi construído, o que falta e melhores práticas para transformar o SGTUR em um sistema profissional de gestão para turismo.

---

## 1. Visão Geral da Arquitetura

**Stack atual (recomendada para o projeto):**

- **Frontend**
  - [x] **Astro 4** (SSR + Islands)
  - [x] **React + TypeScript** nos islands
  - [x] CSS utilitário próprio (padrão SGTUR: cards, tabelas, cores por módulo)
  - [x] **TailwindCSS** (configurado com `preflight` desativado para preservar o visual atual)
- **Deploy / Infra**
  - [x] Cloudflare Pages + Functions (adapter `@astrojs/cloudflare`)
  - [x] Build `npm run build` → pasta `dist/` (gera `_worker.js/` + `_routes.json`)
  - [x] Variáveis: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` em Preview/Production
  - [x] Imagens em modo **passthrough** (Sharp não roda no runtime do Cloudflare)

- **Backend / Dados**
  - [x] **Supabase (PostgreSQL)** como banco principal
  - [x] Autenticação Supabase (e-mail/senha)
  - [x] Policies (RLS) no banco para segurança
  - [ ] Edge Functions para lógicas mais pesadas (futuro: faturamento, integrações, etc.)

- **Outros componentes**
  - [x] Sistema de **logs de auditoria** centralizado
  - [x] Permissões por módulo (tabela `modulo_acesso`)
  - [ ] Geração de PDF/Excel (relatórios, contratos, orçamentos)
  - [ ] Integração com gateways de pagamento (Stripe / MercadoPago)
  - [ ] Notificações (e-mail / WhatsApp / push)

---

## 2. Módulos Já Implementados / Em Andamento

### 2.1 Autenticação & Controle de Acesso

**Módulos concluídos / em uso:**

- **Login / Registro / Recuperação de Senha**
  - Páginas: `/auth/login`, `/auth/register`, `/auth/recover`, `/auth/update-password`
  - Tecnologias:
    - Supabase Auth (e-mail/senha)
    - Astro + React Islands (`AuthLoginIsland`, `AuthRegisterIsland`, `AuthRecoverIsland`, `AuthUpdatePasswordIsland`)
    - Middleware Astro para proteger rotas

- **Middleware Astro**
  - Verifica sessão via Supabase SSR
  - Protege rotas não públicas
  - Faz o mapeamento rota → módulo de permissão
  - Redireciona para `/auth/login` se não logado ou sem permissão

- **Permissões por módulo (`modulo_acesso`)**
  - Módulos suportados:
    - `Dashboard`, `Clientes`, `Vendas`, `Cadastros`, `Relatorios`, `Parametros`, `Admin`
  - Níveis de permissão:
    - `none` / `view` / `create` / `edit` / `delete` / `admin`
  - Hook `usePermissao(modulo)`:
    - Retorna: `permissao`, `ativo`, `podeVer`, `podeCriar`, `podeEditar`, `podeExcluir`, `isAdmin`

- **Menu Dinâmico (`MenuIsland`)**
  - Renderiza o menu lateral com base nas permissões
  - Mostra seção **Administração** apenas para `Admin`
  - Modulação por cores e ícones por módulo

**Tecnologias-chave:**
- `astro:middleware` + `@supabase/ssr`
- React Hooks (`useEffect`, `useState`)
- Supabase Auth & RLS

---

### 2.2 Cadastros

#### 2.2.1 Países
- Tabela: `paises`
- Funcionalidades:
  - CRUD completo (criar/editar/excluir)
  - Listagem com busca
  - Tabela padronizada (header azul, hover, zebra)
- Tecnologias:
  - React Island (`PaisesIsland`)
  - Supabase CRUD
  - Permissão baseada em `Cadastros`

#### 2.2.2 Cidades
- Tabela: `cidades` (relacionada a `paises`)
- Funcionalidades:
  - CRUD completo
  - Seleção de País
  - Campo Estado/Província
  - Busca por nome ou país
- Tecnologias:
  - `CidadesIsland`
  - Relação com `paises`
  - Auditoria (`cidade_criada`, `cidade_editada`, `cidade_excluida`)

#### 2.2.3 Destinos
- Tabela: `destinos` (relacionada a `cidades`)
- Funcionalidades:
  - CRUD completo
  - Seleção País → Cidade (filtro)
  - Campos específicos:
    - tipo, atração principal, melhor época, duração sugerida, nível de preço, imagem, ativo, informações importantes
  - Tabela enriquecida com nome de cidade e país
- Tecnologias:
  - `DestinosIsland`
  - `useMemo` para enriquecer dados (cidade/pais)
  - Supabase joins por client-side

#### 2.2.4 Produtos
- Tabela: `produtos`
- Funcionalidades:
  - CRUD completo
  - Campos:
    - tipo, regra_comissionamento (geral/diferenciado), soma_na_meta, ativo, nome
  - Usado em vendas e comissionamento
- Tecnologias:
  - `ProdutosIsland`
  - Integração com comissão (futuro já planejado)

---

### 2.3 Clientes

- Tabela: `clientes`
- Campos principais:
  - nome, nascimento, cpf, telefone, whatsapp, email, endereço, complemento, cidade, estado, cep
  - rg, genero, nacionalidade, tags (array), tipo_cliente (passageiro/responsável), notas, active
- Funcionalidades:
  - CRUD completo com validações
  - Busca (nome, CPF, e-mail)
  - Permissões por nível (`view/create/edit/delete/admin`)
  - Auditoria:
    - `cliente_criado`, `cliente_editado`, `cliente_excluido`
- Tecnologias:
  - `ClientesIsland`
  - Supabase CRUD
  - `usePermissao("Clientes")`

---

### 2.4 Vendas

#### 2.4.1 Cadastro de Vendas
- Tabelas:
  - `vendas`
  - `vendas_recibos`
- Regras de negócio:
  - **Uma venda só existe se houver recibo(s)**.
- Funcionalidades:
  - Seleção de cliente (autocomplete)
  - Seleção de destino (autocomplete)
  - Seleção de produto (autocomplete)
  - Data de lançamento (automática)
  - Data de embarque
  - Associação de vendedor (`vendedor_id`) para filtros e RLS
  - Múltiplos recibos por venda:
    - produto, número, valor total, valor taxas
  - Salvamento atômico (venda + recibos)
  - UX: toasts de sucesso/erro e validações explícitas
  - Auditoria:
    - `venda_criada`
- Tecnologias:
  - `VendasCadastroIsland`
  - Supabase inserts encadeados
  - `usePermissao("Vendas")`
- Banco:
  - Garantir coluna `vendedor_id uuid` em `vendas` (FK `users(id)`):
    ```sql
    ALTER TABLE public.vendas
      ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES public.users(id);
    ```
  - Backfill recomendado (atribuir temporariamente a um admin para não perder visibilidade):
    ```sql
    UPDATE public.vendas v
    SET vendedor_id = u.id
    FROM LATERAL (
      SELECT u2.id
      FROM public.users u2
      JOIN public.user_types t ON t.id = u2.user_type_id
      WHERE upper(t.name) LIKE '%ADMIN%'
      ORDER BY u2.created_at
      LIMIT 1
    ) u
    WHERE v.vendedor_id IS NULL;
    ```

#### 2.4.2 Consulta de Vendas
- Tabelas:
  - `vendas`, `clientes`, `destinos`, `vendas_recibos`
- Funcionalidades:
  - Listagem com cliente, destino, datas
  - Modal de detalhes ultra fluido:
    - Recibos da venda
    - Valores e taxas
  - Ações:
    - Remarcar venda (alterar data de embarque)
    - Cancelar venda (exclui recibos + venda)
    - Excluir recibo individual
  - UX: toasts padronizados para operações, tabela com header fixo em scroll
  - Auditoria:
    - `venda_cancelada`, `venda_remarcada`, `recibo_excluido`
- Tecnologias:
  - `VendasConsultaIsland`
  - Modal customizado (overlay)
  - `usePermissao("Vendas")` por ação

---

### 2.5 Relatórios

#### 2.5.1 Relatórios de Vendas
- Páginas:
  - `/relatorios/vendas`
  - `/relatorios/vendas-por-destino`
  - `/relatorios/vendas-por-produto`
  - `/relatorios/vendas-por-cliente`
- Funcionalidades planejadas/implementadas:
  - Filtro por período
  - Agrupamento por destino, produto, cliente
  - Sumários numéricos
  - Base para gráficos (pizza/barras)

#### 2.5.2 Gráficos
- Planejado/começado:
  - Uso de **Recharts** no `DashboardGeralIsland`
  - Gráficos de:
    - Vendas por destino
    - Vendas por produto
    - Evolução mensal
  - Ajustes atuais:
    - Pizza: **Vendas por destino (Top 5)** mostra apenas os cinco mais vendidos (título atualizado).
    - Barras: **Vendas por Destino (Visão Completa)** mantém todos os itens.
- Tecnologias:
  - React + Recharts
  - Islands para gráficos (Astro client:load)

---

### 2.6 Admin & Permissões

#### 2.6.1 Painel Admin
- Páginas:
  - `/dashboard/admin`
  - `/admin/permissoes`
  - `/dashboard/logs`
- Funcionalidades:
  - Listagem de usuários (ativos/inativos)
  - Painel financeiro (planejado)
  - Editor de permissões:
    - Por usuário x módulo
    - Nível: none/view/create/edit/delete/admin
    - Bloqueio total por módulo
  - Auditoria de alterações de permissões

#### 2.6.2 Logs de Auditoria
- Tabela: `logs` (estrutura definida/implementada)
- Eventos registrados:
  - Login, logout
  - Criação/edição/exclusão de clientes
  - Criação/edição/cancelamento de vendas/recibos
  - Alteração de permissões
- Página:
  - `/dashboard/logs` com filtro básico (já planejada/implementada)

---

### 2.7 Documentação Interna

- Página: `/documentacao`
- Funcionalidades:
  - Sumário lateral (navegação por seções)
  - Busca interna na documentação
  - Estrutura em Markdown
- Objetivo:
  - Servir como manual vivo do sistema
  - Facilitar passagem de bastão entre desenvolvedores

### 2.8 Parâmetros do Sistema (Novo)

- Página: `/parametros`
- Tabela: `parametros_comissao` (usada também para parâmetros globais)
- Campos atuais:
  - `usar_taxas_na_meta` (bool)
  - `foco_valor` (`bruto` | `liquido`)
  - `foco_faturamento` (`bruto` | `liquido`)
  - `modo_corporativo` (bool)
  - `politica_cancelamento` (`cancelar_venda` | `estornar_recibos`)
  - `exportacao_pdf` (bool)
  - `exportacao_excel` (bool)
  - `company_id`, `owner_user_id`
  - Auditoria leve: origem dos dados (default vs banco), última atualização, quem editou por último (join em `users`)
- Funcionalidades:
  - Leitura/Upsert por empresa (chave única `company_id`)
  - Feedback de sucesso/erro, origem dos dados (padrão vs banco), última atualização
  - Exibe “Última edição por” com base no `owner_user_id`
  - Logs: `parametros_sistema_salvos`
- Tecnologias:
  - Island React (`ParametrosSistemaIsland`)
  - Supabase upsert + RLS
  - Permissão via `usePermissao("Parametros")`
- Banco:
  - Adicionar colunas (se ainda não existirem):
    ```sql
    ALTER TABLE public.parametros_comissao
      ADD COLUMN IF NOT EXISTS foco_faturamento text DEFAULT 'bruto',
      ADD COLUMN IF NOT EXISTS exportacao_pdf boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS exportacao_excel boolean DEFAULT false;
    ```

---

### 2.9 Operação / Comissionamento (Novo)

- Página: `/operacao/comissionamento`
- Menu: seção **Operação** → Comissionamento
- Funcionalidades:
  - Filtro rápido de período (mês atual/anteriores, 3/6/12 meses)
  - KPIs separados em dois cards:
    - **Como está seu Progresso**: Meta do mês, Total Bruto, Total Taxas, Valor Líquido, Meta atingida (texto centralizado, cores por status)
    - **Seus Valores a Receber**: Comissão geral, cards por produto diferenciado e cards por produto com meta específica (apenas quando a flag `exibe_kpi_comissao` está ligada no tipo de produto); comissão total consolida geral + diferenciados + metas de produto (se atingidas)
  - Cálculo considera:
    - Parâmetros do sistema (`foco_valor`, `usar_taxas_na_meta`) para decidir se a meta é avaliada sobre bruto ou líquido (com/sem taxas)
    - Metas gerais (`metas_vendedor`) e metas por produto (`metas_vendedor_produto` ou meta específica por tipo de produto)
    - Regras gerais (`commission_rule`) e regras/percentuais fixos por produto (`product_commission_rule`)
    - Recebíveis da venda (`vendas` + `vendas_recibos`) filtrando `cancelada = false`
    - Produtos diferenciados: pagam comissão fixa; se `soma_na_meta = true` contribuem para atingimento; KPIs exibem um card por produto (somente o nome do produto) e zeram comissão se a meta específica não for atingida
    - Produtos com meta específica (`usa_meta_produto`, `meta_produto_valor`, `comissao_produto_meta_pct`, `descontar_meta_geral`, `exibe_kpi_comissao`):
      - Se a meta do produto não for atingida, o card aparece zerado (“Meta não atingida”)
      - Se atingir, paga `comissao_produto_meta_pct` sobre o foco (bruto ou líquido); quando `descontar_meta_geral = true`, desconta o que já foi pago na meta geral para evitar duplicidade
      - A flag `exibe_kpi_comissao` liga/desliga a exibição do KPI na tela e no Dashboard
    - Comissão sempre calculada sobre o líquido (`valor_total`), atingimento de meta pode usar bruto ou líquido conforme parâmetros
    - Valores e taxas formatados como moeda nos inputs e nos KPIs
- Tecnologias:
  - React Island (`ComissionamentoIsland`)
  - Supabase queries paralelas
  - Layout em cards/KPIs alinhados e centralizados

### 2.10 Orçamentos (CRM)

- Página: `/orcamentos` com islands `OrcamentosCadastroIsland` e `OrcamentosConsultaIsland`.
- Consulta:
  - Filtros em uma linha (Status, Datas, Valores) e botões padronizados: Atualizar, Exportar CSV, Limpar filtros.
  - Card **Situação do Orçamento** com KPIs por status (Novo/Enviado/Negociando/Fechado/Perdido), mostrando quantidade (`XX Itens`) e valor total; cores ajustadas (#1d4ed8 azul, amarelo, laranja, verde, vermelho).
  - Tabela dentro de card, espaçada dos KPIs, com status editável inline, modal de edição e conversão para venda.
  - Mensagens de sucesso/erro legíveis; autoatualização ao receber o evento `orcamento-criado`.
  - Timeline de interações por orçamento (mensagem, responsável), envio/compartilhamento (link + e-mail), alerta/flag de follow-up, filtro “Só pendentes de follow-up” e badge “Sem interação”.
  - Kanban opcional (ativável) para visão por etapa.
- Cadastro:
  - Formulário com espaçamento vertical maior, botão “Criar orçamento” no padrão do sistema e ação “Limpar”.
  - Ao criar: dispara o evento `orcamento-criado`, exibe sucesso em preto/negrito.
- Conversão:
  - Converter cria venda + recibo, encerra o orçamento e registra nota de referência.
- Observações:
  - Exportação CSV disponível na consulta.

---

## 3. Módulos Que Faltam (Essenciais para um Sistema Profissional)

### 3.1 Orçamentos (próximos incrementos)

- PDF/WhatsApp/e-mail com template (hoje link + e-mail simples).
- Anexos nas interações (hoje só texto).
- Alertas/lembranças com templates por status ou data de viagem (cron já existe; falta parametrização de mensagens e liga/desliga por status).
- Kanban com drag-and-drop (hoje leitura).
- Relacionar interações diretamente a vendas criadas a partir do orçamento.

---

### 3.2 Kanban de Vendas / Orçamentos

- Visual tipo Trello:
  - Colunas por status
  - Cartões representando orçamentos ou vendas
- Funcionalidades:
  - Drag-and-drop entre colunas
  - Cálculo de conversão
  - Contagem por etapa e por vendedor
- Tecnologias:
  - React + Drag & Drop (ex: `@dnd-kit` ou `react-beautiful-dnd`)
  - Island dedicado: `KanbanVendasIsland`
  - Supabase para persistir coluna (status)

---

### 3.3 Metas & Comissionamento (Completar)

Parte já estruturada:

- Tabelas:
  - `metas_vendedor`
  - `commission_rule`
  - `commission_tier`
  - `commission_templates`
  - `product_commission_rule`
  - `comissionamento_geral`

Falta consolidar:

- Interface para criar/editar **templates de comissão**
- Interface para definir **metas do vendedor** (mensal, por equipe, individual)
- Tela de **fechamento de comissões**:
  - Cálculo automático com base nas regras
  - Controle de status (pendente, pago)

Tecnologias:

- Islands específicos:
  - `CommissionTemplatesIsland`
  - `MetasVendedorIsland`
  - `FechamentoComissoesIsland`
- Supabase + funções SQL para cálculos (ou edge functions)

**Incrementos entregues agora:**
- `MetasVendedorIsland` agora suporta múltiplas metas diferenciadas por produto (lista dinâmica de produtos + valores, com formatação monetária).
- Criar tabela `metas_vendedor_produto` (FK para `metas_vendedor` e `produtos`) para armazenar metas diferenciadas por produto; ao salvar, a soma é gravada em `meta_diferenciada`.
- Removida dependência de template em metas (campo `template_id` não é mais usado na UI de metas).
- `FechamentoComissaoIsland` permanece usando `meta_geral`; metas diferenciadas ficam disponíveis via `metas_vendedor_produto` para evoluções futuras de cálculo.
- `MetasVendedorIsland` segue escopo “vendedor/equipe”, status ativo/inativo e validação com `parametros_comissao` (foco líquido exige metas diferenciadas > 0).
- `CommissionTemplatesIsland` mantém validações de modo fixo/escalonado; templates continuam no fluxo de regras, mas não são mais selecionados em metas.
- **Comissionamento (novo)**: página `/operacao/comissionamento` mostra KPIs de progresso e valores a receber, calcula comissão geral e por produto diferenciado com base em parâmetros, metas e recebíveis do período.
- **Comissionamento & Produtos**:
  - Campos novos em `tipo_produtos`: `usa_meta_produto`, `meta_produto_valor`, `comissao_produto_meta_pct`, `descontar_meta_geral`, `exibe_kpi_comissao` (controla exibição dos KPIs por produto tanto na tela de Comissionamento quanto no Dashboard).
  - Produtos diferenciados que `soma_na_meta = true` somam a comissão calculada na meta geral; detalhamento por produto segue como KPI individual.
- **product_commission_rule**: correção no upsert para produtos diferenciados criando regra fixa automática quando faltar `rule_id` e garantindo persistência dos campos `fix_meta_*`.

**Perfil do Usuário (refatorado)**
- Card de Dados Pessoais ocupa 100% da largura; Dados de Acesso e Empresa ficam abaixo, lado a lado (50/50).
- Campos adicionais em `users`: `rg`, `whatsapp`, `cep`, `endereco`, `numero`, `complemento`; labels reorganizados (Data Nascimento, Estado etc.).
- Campo CEP integrado ao ViaCEP (sem autenticação) para preencher endereço/cidade/estado automaticamente.

**Próximos passos imediatos:**
- Garantir no Supabase a tabela `metas_vendedor_produto` (FK para `metas_vendedor` e `produtos`) para evitar erros 42703 no CRUD de metas diferenciadas.
- Garantir no Supabase a coluna `exibe_kpi_comissao boolean default true` em `tipo_produtos` para habilitar o toggle de KPI por produto.
- Garantir no Supabase as colunas extras do perfil em `users`: `rg text`, `whatsapp text`, `cep text`, `endereco text`, `numero text`, `complemento text`.
- Se `template_id` em `metas_vendedor` não for mais usado, avaliar remoção/ignorar nas consultas e policies.
- Ajustar fechamento para, futuramente, ponderar comissão por produto usando `metas_vendedor_produto` (hoje usa apenas `meta_geral`).

**Dashboard (personalização)**
- Dashboard Geral agora permite personalizar widgets por usuário (KPIs, vendas por destino/produto, timeline, orçamentos, aniversariantes) com ordem e visibilidade.
- Preferências salvas em `dashboard_widgets` (quando a tabela existir; fallback em localStorage). Mantém layout responsivo via grid CSS/Tailwind utilitário.
- Botão “Personalizar dashboard” abre modal para toggles e reorder (↑↓). Ordem padrão é a sequência atual caso não haja preferências.
- Widgets de gráficos permitem escolher tipo (pizza/barras para destino/produto; linha/barras para timeline). Preferências de gráficos em `settings` (coluna opcional) ou localStorage (`dashboard_charts`).
- KPIs de produto: se o tipo de produto estiver com `exibe_kpi_comissao = true`, o dashboard adiciona um KPI com o nome do produto (valor vendido no período) e ele aparece no painel de personalização para ligar/desligar e reordenar.

### 3.4 Dashboard Premium (Gestor / Vendedor / Admin)

Já existe um esqueleto, mas pode ser ampliado:

- **Dashboard do Vendedor**:
  - Minhas vendas no mês
  - Minhas metas vs atingido
  - Meus produtos/destinos mais vendidos
  - Aniversariantes do mês (clientes)
  - Orçamentos abertos

- **Dashboard do Gestor**:
  - Equipe (vendedores vinculados em `gestor_vendedor`)
  - Comparativo entre vendedores
  - Metas da equipe vs atingido
  - Funil por etapa

- **Dashboard do Admin (SaaS)**:
  - Empresas cadastradas
  - Usuários ativos
  - Planos (se houver billing)
  - Status financeiro do sistema

Tecnologias:

- Recharts + islands exclusivos por perfil
- Supabase com views otimizadas
- Filtros de período e de escopo (meus números / minha equipe / toda a empresa)

---

### 3.5 Parâmetros do Sistema

- **Entregue na seção 2.8.** Próximos incrementos:
  - Expandir parâmetros específicos de metas/comissões e billing
  - Exibir usuário que salvou por último
  - Amarrar com cálculos de metas/relatórios (usar `foco_valor`, etc.)

---

### 3.6 Exportações (PDF / Excel)

Para:

- Relatórios de vendas
- Relatórios de comissionamento
- Fechamento do mês
- Dossiê do cliente (histórico de viagens)

Tecnologias possíveis:

- **Gerar no backend**:
  - Supabase Edge Functions (Node)
  - Bibliotecas: `pdf-lib`, `exceljs`
- **Ou gerar no frontend**:
  - `jsPDF`, `SheetJS`

---

### 3.7 Billing / Planos (caso SaaS)

- Tabelas novas:
  - `companies` (já existe)
  - `billing_plans`
  - `billing_subscriptions`
- Funcionalidades:
  - Assinatura por empresa
  - Limite de usuários/vendas por plano
  - Integração com Stripe / MercadoPago
  - Bloqueio automático em caso de inadimplência
- Tecnologias:
  - Edge Functions (webhooks de pagamento)
  - Painel admin específico (`BillingAdminIsland`)

---
### 3.8 Cadastro de fornecedores / campo de fornecedores no cadastro de produtos, linkado aos fornecedores

- Criar formulário de cadastro de fornecedores dos produtos (cadastro completo)
- linkar aos formulários de produtos, podendo ou não ter forcenedor (aceita null no banco de dados se o usuário não tiver acesso ao módulo de fornecedores, caso contrário ele é obrigado a cadastrar o fornecedor)

### 3.9 Marketing & Pós-Venda

- Fluxos automáticos:
  - Lembrete antes da viagem
  - Pós-viagem (pedir feedback)
  - Contato com clientes antigos
- Tecnologias:
  - Integração com provedor de e-mail (SendGrid / Resend)
  - Webhooks ou funções agendadas (cron no Supabase)
  - Tabela de templates de mensagens

---

### 3.10 Automação / Crons

- **Cron Alerta Orçamentos** (`/api/cron-alerta-orcamentos`): envia lembretes por status com `diasStatus`, suporta webhook + e-mail (Resend/SendGrid) e dry-run, grava log opcional em `cron_log_alertas`.
- **Cron Alerta Comissão** (`/api/cron-alerta-comissao`): calcula atingimento mensal vs metas (`metas_vendedor`/`vendas`), envia resumo por canal e registra log.
- Ambiente: `CRON_SECRET[_ALERTAS]`, `CRON_SECRET_COMISSAO`, Resend/SendGrid (opcional), webhook (opcional), `SUPABASE_SERVICE_ROLE_KEY`.
- Próximos: painel para templates/mensagens por status e liga/desliga por canal; monitoramento via `cron_log_alertas`.

---

### 3.11 Viagens / Dossiê de Viagem

- Objetivo: consolidar o pós-venda (serviços, vouchers, documentos, alertas ao passageiro).
- Tabelas sugeridas:
  - `viagens` (FK `venda_id` ou `orcamento_id`, status: planejada/confirmada/em_viagem/concluida/cancelada, datas de início/fim, origem/destino, responsável interno).
  - `viagem_passageiros` (FK `cliente_id`, `viagem_id`, papel: passageiro/responsável).
  - `viagem_servicos` (tipo: aéreo/hotel/terrestre/seguro/passeio; dados de reserva/PNR, `fornecedor_id`, valores, datas, anotações).
  - `viagem_documentos` (tipo: voucher, bilhete, seguro, roteiro; URL em storage com `expires_at`, `assinado_por`).
  - `viagem_checklist` opcional (tarefas pré/pós-viagem).
- Funcionalidades:
  - Tela `/operacao/viagens` com filtros por status, período e responsável; card com resumo e botão “Abrir dossiê”.
  - Dossiê mostra timeline da viagem, passageiros, serviços (voos/hotel/transfer) e anexos; permite upload para Supabase Storage e geração de links assinados.
  - Geração de dossiê PDF (roteiro + documentos) para envio por e-mail/WhatsApp; opção de compartilhar link temporário.
  - Alertas automáticos (cron) X dias antes da viagem com checklist e documentos principais; logar em `cron_log_alertas`.
  - Permissões: novo módulo `Operacao` ou reaproveitar `Vendas` com níveis de edição.
- Tecnologias:
  - Islands dedicados: `ViagensListaIsland`, `DossieViagemIsland`.
  - Supabase Storage para anexos + geração de URLs assinadas.
  - Cron usando a mesma estrutura dos alertas de orçamentos.

### 3.12 Financeiro Operacional (Recebíveis/Pagamentos)

- Objetivo: ligar vendas/recibos ao fluxo de caixa, conciliando recebimentos de clientes e pagamentos a fornecedores.
- Tabelas sugeridas:
  - `financeiro_contas_receber` (FK `venda_id`, `recibo_id`, `cliente_id`, `vencimento`, `valor_bruto`, `taxas`, `valor_liquido`, `forma_pagamento`, `status`, `comprovante_url`).
  - `financeiro_contas_pagar` (FK `fornecedor_id`, `viagem_servico_id` ou `venda_id`, `vencimento`, `valor`, `status`).
  - `financeiro_baixas` (vincula recebimento/pagamento à conciliação; armazena data, valor pago, quem registrou).
  - Views para `fluxo_caixa` e `dre` (mês atual/anterior).
- Funcionalidades:
  - Tela `/financeiro/receber` com filtros (status, vencimento, vendedor) e ações de baixa parcial/total; exportação CSV/Excel.
  - Tela `/financeiro/pagar` para compromissos com fornecedores, alerta de vencimento e upload de comprovantes.
  - Conciliação automática opcional: webhook de pagamento (Stripe/MercadoPago) marca `contas_receber` como pago; manual via modal.
  - Integração com comissionamento: comissão só considera recibos baixados (configurável).
  - Auditoria: logs para baixas, alterações de vencimento e exclusões.
- Tecnologias:
  - Islands: `FinanceiroReceberIsland`, `FinanceiroPagarIsland`, `ConciliaPagamentoIsland`.
  - Supabase Storage para comprovantes; policies alinhadas a `usePermissao("Vendas")`/`"Admin"`.
  - Possível uso de Edge Functions para conciliação automática e reconciliação de split de pagamento.

---

### 3.13 Cadastro de Acompanhantes (Cliente/Viagem)

- Objetivo: registrar acompanhantes de cada cliente e vinculá-los às viagens (pós-venda).
- Tabelas sugeridas:
  - `cliente_acompanhantes` (FK `cliente_id`; campos: `nome_completo`, `cpf`, `rg`, `telefone`, `grau_parentesco`, `data_nascimento`, `observacoes`, `ativo boolean default true`, `created_by`).
  - `viagem_acompanhantes` (FK `viagem_id`, `acompanhante_id`, papel: acompanhante/passageiro principal, campos de documento/observação por viagem).
- Funcionalidades:
  - No cadastro de clientes: card “Acompanhantes” com CRUD inline (adicionar, editar, inativar); validações leves (CPF opcional, mas evitar duplicidade quando preenchido).
  - No dossiê de viagem: seleção de passageiros inclui acompanhantes cadastrados; permite anexar documentos específicos para a viagem (ex: autorização de menor).
  - Busca de acompanhantes por nome/CPF dentro do cliente; exibição no histórico do cliente.
- Permissões:
  - CRUD em clientes exige `usePermissao("Clientes")`; vínculo na viagem exige `usePermissao("Operacao")` ou `Vendas` conforme módulo escolhido.
- Tecnologias:
  - Islands: `ClienteAcompanhantesIsland` (embed no formulário de cliente) e reuso dentro de `DossieViagemIsland`.
  - Supabase Storage opcional para documentos por viagem; RLS seguindo o escopo do cliente/viagem.

---

#### SQL de validação/ajuste (Supabase)

```sql
-- Viagens (criar primeiro para não quebrar FKs de viagem_acompanhantes)
CREATE TABLE IF NOT EXISTS public.viagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid REFERENCES public.vendas(id) ON DELETE SET NULL,
  orcamento_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  cliente_id uuid REFERENCES public.clientes(id),
  responsavel_user_id uuid REFERENCES public.users(id),
  origem text,
  destino text,
  data_inicio date,
  data_fim date,
  status text NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada','confirmada','em_viagem','concluida','cancelada')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_viagens_ref CHECK (venda_id IS NOT NULL OR orcamento_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_viagens_company_status ON public.viagens (company_id, status);

-- Acompanhantes do cliente
CREATE TABLE IF NOT EXISTS public.cliente_acompanhantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  nome_completo text NOT NULL,
  cpf text,
  rg text,
  telefone text,
  grau_parentesco text,
  data_nascimento date,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_acompanhantes_cpf_cliente
  ON public.cliente_acompanhantes (cliente_id, cpf) WHERE cpf IS NOT NULL;

-- Acompanhantes vinculados à viagem (depois de viagens + cliente_acompanhantes)
CREATE TABLE IF NOT EXISTS public.viagem_acompanhantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id uuid NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  acompanhante_id uuid NOT NULL REFERENCES public.cliente_acompanhantes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  papel text CHECK (papel IN ('passageiro', 'responsavel')),
  documento_url text,
  observacoes text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_viagem_acompanhantes_viagem ON public.viagem_acompanhantes (viagem_id);
```

#### RLS sugeridas (ajustar ao modelo de tenancy)

```sql
-- Alinhar com o modelo atual: se company_id vem de claim, troque o join por current_setting('request.jwt.claims.company_id', true)
ALTER TABLE public.cliente_acompanhantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY cliente_acompanhantes_select ON public.cliente_acompanhantes
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
CREATE POLICY cliente_acompanhantes_ins ON public.cliente_acompanhantes
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
CREATE POLICY cliente_acompanhantes_upd ON public.cliente_acompanhantes
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
CREATE POLICY cliente_acompanhantes_del ON public.cliente_acompanhantes
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));

ALTER TABLE public.viagem_acompanhantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY viagem_acompanhantes_select ON public.viagem_acompanhantes
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
CREATE POLICY viagem_acompanhantes_ins ON public.viagem_acompanhantes
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
CREATE POLICY viagem_acompanhantes_upd ON public.viagem_acompanhantes
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
CREATE POLICY viagem_acompanhantes_del ON public.viagem_acompanhantes
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));

ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY viagens_select ON public.viagens
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
CREATE POLICY viagens_ins ON public.viagens
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
CREATE POLICY viagens_upd ON public.viagens
  FOR UPDATE USING (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
CREATE POLICY viagens_del ON public.viagens
  FOR DELETE USING (company_id IN (SELECT company_id FROM public.users u WHERE u.id = auth.uid()));
```

> Ajuste as políticas se o multi-tenant for por claim (`current_setting('request.jwt.claims.company_id')`) ou por tabela intermediária (ex: `user_companies`); se não houver multi-tenant, simplifique para permissões baseadas em role/admin.

## 4. Melhorias Gerais Recomendadas

### 4.1 UX / UI

- Adicionar feedbacks visuais padronizados:
  - toasts de sucesso/erro
  - skeleton loaders nas tabelas
- Melhorar responsividade (mobile-first):
  - usar grid system coerente
  - garantir tabelas scrolláveis em telas menores
- Tailwind habilitado (preflight off):
  - Usar utilitários para responsividade (`flex`, `grid`, `gap`, `md:` etc.) sem mudar o tema atual.
  - Manter tokens CSS existentes para cores de módulo e cartões; Tailwind entra como complemento.

**Tecnologia sugerida:**
- TailwindCSS para acelerar
- Biblioteca de componentes leve (ou própria)

---

### 4.2 Padronização de Código

- Criar hooks reutilizáveis:
  - `useFetchSupabase(table, options)`
  - `useDebouncedValue` para buscas
- Criar componentes:
  - `<DataTable />`
  - `<ConfirmDialog />`
  - `<SearchInput />`

---

### 4.3 Observabilidade & Logs

- Expandir sistema de logs para:
  - gravação de IP / user agent (respeitando LGPD)
  - trilha de auditoria por entidade (ex: histórico do cliente)
- Páginas:
  - `/admin/logs` com filtros avançados

---

### 4.4 Segurança

- Reforçar policies RLS no Supabase para:
  - garantir que vendedor só vê sua própria carteira, se desejado
  - gestor vê equipe inteira (`gestor_vendedor`)
  - admin vê tudo
- Usar:
  - `auth.uid()` em policies
  - Claims customizadas, se necessário
- Policies recomendadas (vendas e metas):
  - `vendas`: permitir `select` quando `vendedor_id = auth.uid()`; para gestores, `vendedor_id IN (SELECT vendedor_id FROM gestor_vendedor WHERE gestor_id = auth.uid())`; admins sem filtro.
  - `metas_vendedor`: mesma lógica acima usando `vendedor_id`.

---

### 4.5 Checklist para não quebrar a lógica atual

- **Banco alinhado**: `metas_vendedor_produto`, `orcamentos.vendedor_id`, `numero_venda`/`venda_criada` em `orcamentos`, `disponivel_todas_cidades` em `tipo_produtos`, `valor_taxas` em `vendas_recibos`, `cron_log_alertas` — garantir colunas e FKs existentes.
- **Parâmetros como fonte única**: `usar_taxas_na_meta` + `foco_valor` guiam tanto o atingimento de meta quanto a base de comissão (bruto x líquido).
- **Produtos globais**: produtos marcados como “Disponível para todas as cidades” vêm de `tipo_produtos`; seleção de produtos não exige cadastro por cidade, mas a cidade da venda deve ser salva.
- **Orçamentos**: lista + KPIs com filtros em linha, tabela dentro de card, timeline de interações, alerta de follow-up, envio/compartilhamento e Kanban opcional; evento `orcamento-criado` deve disparar atualização; mensagens legíveis.
- **UI padrão**: tabelas sempre em `card-base`, botões primários/secondary/light padronizados, espaçamentos consistentes (filtros, formulários e KPIs).

---

## 5. Tecnologias-Chave Resumidas (Sugestão Final)

**Frontend**
- Astro 4 (SSR + Islands)
- React + TypeScript
- Recharts (gráficos)
- (Opcional) TailwindCSS

**Backend & Dados**
- Supabase (Postgres + Auth + Storage)
- Row Level Security (RLS)
- Edge Functions para processos pesados (comissão, billing)

**Relatórios & Arquivos**
- PDF: `pdf-lib` ou `jsPDF`
- Excel: `exceljs` ou `SheetJS`

**Comunicação**
- E-mail transacional: Resend / SendGrid
- WhatsApp: integração via API (Twilio / Gupshup / Z-API, dependendo da viabilidade)

---

## 6. Ordem Recomendada dos Próximos Passos

1. **Orçamentos**: histórico/interações, envio (PDF/WhatsApp/e-mail), alertas; manter lista+KPIs e autoatualização; Kanban só se necessário.
2. **Comissionamento**: validar cálculos com `usar_taxas_na_meta`/`foco_valor`; consolidar metas diferenciadas (schema `metas_vendedor_produto`), testes de atingimento (comissão zero quando não bate meta diferenciada).
3. **Segurança/Dados**: revisar RLS (vendas, metas, orçamentos), garantir colunas/FKs alinhadas; logs dos principais eventos.
4. **Relatórios/Exportações**: PDFs/Excel para vendas, comissionamento e orçamentos; gráficos já padronizados (Top 5 destino em pizza, visão completa em barras).
5. **Dashboards Premium**: preferências por perfil (vendedor/gestor/admin) e widgets adicionais.
6. **Billing/Planos**: apenas quando fluxo operacional/financeiro estiver sólido.

---

## 7. Checklist rápido (migrações + envs de crons)

- Migrações/SQL:
  - `public/migration-orcamentos-vendedor.sql` → adiciona `orcamentos.vendedor_id` (FK `users`) e prepara policies.
  - `public/cron-log-alertas.sql` → cria tabela de auditoria `cron_log_alertas` (opcional, usada pelos crons).
  - (já mencionado) garantir `metas_vendedor_produto` e colunas extras de produto/usuário, se ainda não aplicados.
- Env necessários para os crons:
  - Comum: `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (ou específicos abaixo).
  - Orçamentos (`/api/cron-alerta-orcamentos`): `CRON_SECRET_ALERTAS` (fallback `CRON_SECRET`), `ALERTA_WEBHOOK_URL` ou `WEBHOOK_ALERTA_ORCAMENTOS` (opcional), `RESEND_API_KEY` + `ALERTA_FROM_EMAIL` (opcional), ou `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` (opcional).
  - Comissão (`/api/cron-alerta-comissao`): `CRON_SECRET_COMISSAO` (fallback `CRON_SECRET`), `ALERTA_WEBHOOK_COMISSAO` ou `ALERTA_WEBHOOK_URL` (opcional), `RESEND_API_KEY` + `ALERTA_FROM_EMAIL` ou `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL`.
  - Header ao chamar: `x-cron-secret` deve bater com o secret configurado.

---

Nota Importante ---> Será preciso fazer Cadastro de acompanhates na viagem no cadastro de clientes (dados como NOME COMPLETO, CPF, RG, TELEFONE, GRAU DE PARENTENCO, ETC)


Este documento pode ser mantido em `/documentacao/plano-modulos-sgtur.md` e atualizado conforme novas features forem entrando, servindo como **mapa mestre do projeto SGTUR**.
