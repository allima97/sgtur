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

## 3. Módulos Que Faltam (Essenciais para um Sistema Profissional)

### 3.1 Módulo de Orçamentos (CRM)

**Objetivo:** Gerir oportunidades antes de virarem vendas.

- Tabela: `orcamentos`
- Funcionalidades:
  - Criar orçamento a partir de cliente e destino
  - Adicionar produtos e valores (similar a recibos)
  - Status:
    - novo, enviado, negociando, fechado, perdido
  - Conversão de orçamento → venda (transformar em venda com 1 clique)
  - Histórico de interações (logs)

**Tecnologias:**

- Nova página: `/orcamentos`
- Islands:
  - `OrcamentosCadastroIsland`
  - `OrcamentosConsultaIsland`
- Supabase CRUD + transações lógicas
- Integração com `clientes`, `destinos`, `produtos`

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

**Próximos passos imediatos:**
- Garantir no Supabase a tabela `metas_vendedor_produto` (FK para `metas_vendedor` e `produtos`) para evitar erros 42703 no CRUD de metas diferenciadas.
- Se `template_id` em `metas_vendedor` não for mais usado, avaliar remoção/ignorar nas consultas e policies.
- Ajustar fechamento para, futuramente, ponderar comissão por produto usando `metas_vendedor_produto` (hoje usa apenas `meta_geral`).

**Dashboard (personalização)**
- Dashboard Geral agora permite personalizar widgets por usuário (KPIs, vendas por destino/produto, timeline, orçamentos, aniversariantes) com ordem e visibilidade.
- Preferências salvas em `dashboard_widgets` (quando a tabela existir; fallback em localStorage). Mantém layout responsivo via grid CSS/Tailwind utilitário.
- Botão “Personalizar dashboard” abre modal para toggles e reorder (↑↓). Ordem padrão é a sequência atual caso não haja preferências.
- Widgets de gráficos permitem escolher tipo (pizza/barras para destino/produto; linha/barras para timeline). Preferências de gráficos em `settings` (coluna opcional) ou localStorage (`dashboard_charts`).

### 3.1 Módulo de Orçamentos (CRM) — Em andamento

- Páginas/Islands criados:
  - `/orcamentos`
  - `OrcamentosCadastroIsland` (criar orçamento com cliente, destino, produto opcional, status, valor, data viagem, notas)
  - `OrcamentosConsultaIsland` (listar orçamentos com nomes de cliente/destino/produto, filtros por status, atualização de status inline, edição em modal, conversão em venda)
    - Conversão cria venda/recibo com número `VND-YYYYMMDD-HHMM-RAND`, confirma antes e fecha o orçamento com nota de referência.
    - Kanban: drag-and-drop por status, cards mostram datas/valor/venda, colunas exibem contagem e total de valor, cores por status.
    - Título do quadro alterado para “Situação do Orçamento” para refletir contexto do funil.
    - Para persistir `numero_venda`/`venda_criada` no banco, rodar no Supabase:
      ```sql
      ALTER TABLE public.orcamentos
        ADD COLUMN IF NOT EXISTS numero_venda text,
        ADD COLUMN IF NOT EXISTS venda_criada boolean DEFAULT false;
      ```
    - Exportação: botão “Exportar CSV” na consulta, usa filtros atuais (status, período, faixa de valor).
    - Conversão redireciona diretamente para a tela de vendas com `venda_id` na URL (`numero_venda_url`).
    - Formulário de criação: botão “Criar orçamento” com espaçamento adicional para não colar na linha anterior.
- Permissões: usa módulo `Vendas` (middleware mapeia `/orcamentos` → `Vendas`).
- Menu: item “Orçamentos” em Vendas.
- Banco: usa tabela existente `orcamentos`.

---

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

### 3.8 Marketing & Pós-Venda

- Fluxos automáticos:
  - Lembrete antes da viagem
  - Pós-viagem (pedir feedback)
  - Contato com clientes antigos
- Tecnologias:
  - Integração com provedor de e-mail (SendGrid / Resend)
  - Webhooks ou funções agendadas (cron no Supabase)
  - Tabela de templates de mensagens

---

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

1. **Fechar completamente o fluxo operacional**:
   - Orçamentos → Conversão em Venda
   - Relatórios de vendas consolidados e confiáveis

2. **Fechar completamente o fluxo financeiro**:
   - Metas & comissionamento
   - Fechamento mensal + relatórios de comissão

3. **Dashboards Premium (Vendedor / Gestor / Admin)**

4. **Parâmetros do sistema + multi-empresa**

5. **Exportações (PDF/Excel) + Marketing Automatizado**

6. **Billing / Planos (se for virar SaaS comercial)**

---

Este documento pode ser mantido em `/documentacao/plano-modulos-sgtur.md` e atualizado conforme novas features forem entrando, servindo como **mapa mestre do projeto SGTUR**.
