# Arquitetura do CRM/ERP para Operadora de Turismo

Um projeto robusto de CRM/ERP para operadora de turismo deve ser planejado em fases. O erotismo é construir primeiro as fundações (infraestrutura, autenticação, dados principais) e depois evoluir para as camadas operacionais, financeiras, administrativas e de marketing. Abaixo segue a sequência sugerida, seguida da estrutura de módulos com requisitos de dados, segurança e workflows que moldam um sistema rápido e seguro.

## 1. Etapas de desenvolvimento (ordem recomendada)

1. **Infraestrutura, build e permissões (fundação)**
   - Configurar repositório, CI/CD, deploy target (Cloudflare Pages/SSR), monitoramento e alertas.
   - Estruturar autenticação (SSO ou Supabase) e autorização (RBAC/ACL) com mapear módulos/permissões.
   - Criar bases de dados principais (empresas, usuários, papéis, módulos) com RLS geral.
2. **Core de clientes e empresas**
   - Tabelas de `clientes`, `empresas`, `contatos`, `documentos`, `vendedores`, `gestores`.
   - Formas de relacionamento (um cliente pode ter várias empresas e usuários múltiplos por empresa).
   - APIs para CRUD e pesquisa com filtros avançados.
3. **Catálogo de produtos (serviços/hotel/passagens)**
   - Catálogo de `produtos`, `hoteis`, `serviços`, `passagens`, `fornecedores`, `destinos`.
   - Cadastro com atributos específicos (classe, faixas de datas, regras de comissão).
4. **Fluxo de vendas e orçamentos**
   - Orçamentos multi-itens, cotações com serviços ligados a clientes e viagens.
   - Geração de `quote`, `quote_items`, `quote_discounts`, workflow de aprovação.
5. **Financeiro completo**
   - `contas_pagar`, `contas_receber`, `movimentacoes`, `centros_custo`.
   - Integração com gateways, conciliação e previsão de fluxo de caixa.
6. **Operação / Viagens**
   - Agenda de viagens, embarques, acompanhamento e checklists.
   - Integração com provedores (voo, hotel, seguro) via APIs ou upload.
7. **Marketing e fidelidade**
   - Campanhas, listas de contatos, automações e segmentações por perfil de viagem.
   - Integração com e-mail/SMS e métricas de conversão.
8. **Administração e segurança**
   - Logs de auditoria, controle de sessão, trails, alertas de RLS frágeis.
   - Parâmetros (taxas, limites, regras de cancelamento, multilíngue).
9. **Relatórios e dashboards**
   - Painéis de KPIs, widget configurável e exportações.
   - Permissão granular por módulo.

## 2. Módulos e requisitos detalhados

| Módulo | Descrição | Tabelas principais | RLS / Triggers sugeridas |
| --- | --- | --- | --- |
| Empresas/Multitenant | Gerencia múltiplas empresas, unidades e regras por consumidor | `empresas`, `empresas_parametros`, `empresas_usuarios` | RLS limita registros pela empresa_id; trigger sugere replicar configurações padrão ao criar nova empresa |
| Usuários e Papéis | Cadastro de múltiplos usuários, papéis, permissões | `usuarios`, `papéis`, `modulo_acesso`, `usuario_papeis` | RLS em tabelas sensíveis para `empresa_id`; trigger atualiza cache de permissões |
| Autenticação | Login + sessão com Supabase/JWT | `auth_sessions`, `refresh_tokens` | Trigger limpa sessões expiradas; logs auditados |
| Clientes | Controle completo dos clientes da operadora | `clientes`, `clientes_contatos`, `clientes_documentos`, `clientes_empresas` | RLS por `empresa_id`; trigger para validar CPF/CNPJ e atualizar score |
| Catálogo turístico | Produtos, hotéis, serviços, passagens e regras | `produtos`, `tipo_produtos`, `fornecedores`, `hoteis`, `servicos`, `passagens` | RLS limita fornecedores por empresa; trigger recalcula comissão ao alterar preço |
| Orçamentos e cotações | Construção de quotes com itens e descontos | `quote`, `quote_item`, `quote_discount`, `quote_logs` | RLS garante acesso apenas a quotes do vendedor/empresa; trigger calcula total automaticamente |
| Vendas e reservas | Consolidação em venda confirmada (passagens/hotel/serviços) | `vendas`, `venda_itens`, `venda_pagamentos`, `venda_status` | RLS por empresa; trigger gera eventos para financeiro |
| Bloqueios & Inventory | Gerenciamento de bloqueios de hotéis, excursões rodoviárias e quotas | `bloqueios`, `bloqueios_itens`, `inventario_hotel`, `inventario_excursao` | RLS por empresa; trigger atualiza disponibilidade e alertas de expiração |
| Operação/Viagem | Controle de embarques, roteiros e status de viagem | `viagens`, `viagens_passageiros`, `checklists`, `viagens_status` | RLS reservado por equipe; trigger aciona notificações |
| Financeiro | Contas a pagar/receber com conciliação | `contas_pagar`, `contas_receber`, `movimentacoes`, `caixa`, `centros_custo` | RLS por empresa; trigger atualiza saldo e envia alertas (ex.: vencimento) |
| Marketing | Campanhas, automações e métricas | `campanhas`, `segmentos`, `eventos_marketing`, `marketing_logs` | RLS por empresa; trigger sincroniza listas com ferramentas externas |
| Parâmetros/Admin | Regras do sistema, logs, notificações | `parametros_sistema`, `logs_auditoria`, `alertas`, `modulo_acesso`, `log_sessoes` | RLS total para `super_admin`; triggers gravam logs de alteração |
| Relatórios/Dashboards | KPI, performance e exportação | `dashboards`, `widgets`, `relatorios_execucao` | RLS conforme permissão, trigger para recalcular cache |

### Observações específicas por módulo

- **RLS (Row-Level Security)**: ativar em todas as tabelas críticas. Aplicar políticas que exigem `empresa_id` e `usuario_id` conforme papel. Usar `app_user` com claims para empresa/papel.
- **Triggers**: sugerir em `quote` para atualizar totais, em `financeiro` para recalcular saldo, em `logs` para auditoria e ativar alertas email/SMS.
- **Logs e auditoria**: registrar todas as alterações críticas em `logs_auditoria` (insert/update/delete consulta). Guardar IP/UA/ação/módulo.
- **Marketing**: tabelas de eventos permitem segmentação (ex.: `eventos_marketing` com referência a `quote_id`, `venda_id`). Triggers disparam chamadas a integrações REST.
- **Performance**: criar materialized views/dashboards com agregações (ex.: `vendas_mensais`, `fluxo_caixa`). Atualizar via jobs.
- **Segurança**: logins monitorados (locks temporários), senhas com bcrypt/argon, proteção CSRF, CORS restrito.
- **Infraestrutura**: usar supabase + Astro/SSR; organizar `src/lib/supabase` com client/browser/server; garantir permissões nos endpoints.

## 3. Próximos passos para detalhamento

1. Para cada módulo, criar sub-diretórios de documentação (ex.: `docs/financeiro.md`) com:
   - Diagrama de tabelas (campos, tipos, relacionamentos).
   - RLS definindo políticas precisas.
   - Triggers/usos de funções armazenadas.
   - Endpoints REST/GraphQL e eventos do front-end.
2. Elaborar backlog técnico com entregas por sprint (ex.: sprint 1 = Core/Clientes, sprint 2 = Catálogo/Orçamentos).
3. Planejar testes automatizados (e2e via Playwright para fluxos críticos, unitários para regras de permissão).

--- 
Documentação viva: iremos detalhando cada módulo com diagramas, tabelas e contratos conforme a construção do sistema avança. Quando quiser alinhar algum módulo específico (financeiro, marketing, orçamentos etc.), posso expandir esta base em um novo MD por módulo com tabelas, RLS, triggers e fluxos. Deseja começar por qual módulo? 
