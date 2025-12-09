
# Documentação Geral do Sistema SGTUR  
*Resumo dos módulos implementados, funcionalidades concluídas e pendências.*

---

## 🟦 1. Autenticação & Segurança
### ✔ Concluído
- Login funcional
- Registro de usuário
- Recuperação de senha
- Middleware com proteção de rotas
- Permissões por módulo (view, edit, admin)
- Auditoria de login/logout
- Redirecionamento automático por tipo de usuário (admin/gestor/vendedor)

### ❗ Falta
- Página de preferências do usuário
- Logout com logs visíveis para admin

---

## 🟩 2. Cadastros (CRUD Completo)
### ✔ Concluído
- Países
- Cidades
- Destinos
- Produtos
- Clientes (campos completos: tags, gênero, nacionalidade, documentos, ativo)

### ❗ Falta
- Upload de imagem para destinos
- CRUD de empresas (admin-only)

---

## 🟫 3. Vendas
### ✔ Concluído
- Cadastro de vendas com:
  - cliente
  - destino
  - produto
  - datas
  - recibos vinculados
- Regra obrigatória: **"Venda só existe se houver recibos válidos"**
- Cálculo de valor total automático
- Auditoria completa:
  - venda_criada
  - venda_editada
  - venda_cancelada
  - recibo_adicionado
  - recibo_editado
  - recibo_excluido
- Consulta de vendas com modal ULTRA-FLUIDO
- Filtros por data / termo
- Remarcação de venda
- Cancelamento (soft delete)

### ❗ Falta
- Exportação de vendas (CSV/PDF)
- Vendas programadas (futuras)

---

## 🟪 4. Relatórios
### ✔ Concluído
- Agrupados:
  - Por destino
  - Por produto
  - Por cliente
- Relatório de vendas completo
- Gráficos em pizza e barra (Recharts)
- Dashboard geral mês atual com:
  - KPIs
  - Orçamentos recentes
  - Aniversariantes
  - Vendas por destino
  - Vendas por produto

### ❗ Falta
- Painel de conversão de orçamentos → vendas
- Exportar gráficos

---

## 🟥 5. Permissões & Acesso
### ✔ Concluído
- Tabela `modulo_acesso`
- Editor de permissões (admin)
- Menu dinâmico por módulo
- Proteção real via middleware SSR

### ❗ Falta
- Perfis de acesso pré-definidos (template: gestor/vendedor/admin)

---

## 🟦 6. Auditoria (Logs)
### ✔ Concluído
- Tabela `logs` robusta (jsonb, índices, IP, userAgent)
- Registro automático:
  - login
  - logout
  - módulos críticos (vendas)
- Visualização em tabela com filtros

### ❗ Falta
- Busca avançada no logs (por IP, por módulo, etc)
- Página detalhada da auditoria por venda/usuário

---

## 🟣 7. Metas do Vendedor
### ✔ Concluído
- Módulo completo:
  - uso individual → o usuário cria suas metas
  - uso corporativo → gestor/admin criam metas do vendedor
- CRUD completo
- Tela em padrão azul (parâmetros)
- Filtros por período / vendedor
- Meta diferenciada opcional

### ❗ Falta
- Histórico visual de metas por vendedor (gráfico linha)
- Alertas de meta atingida %

---

## 🟡 8. Templates de Comissão
### ✔ Concluído
- CRUD completo FIXO / ESCALONÁVEL
- ESC 1 + ESC 2 suportados
- Permitido para admin e individual
- Compatível com engine de cálculo

### ❗ Falta
- Visualização gráfica da curva escalonável
- Clonar template

---

## 🟢 9. Fechamento de Comissão
### ✔ Concluído
- Engine de cálculo 100% operacional
- Tela completa com:
  - Base da meta
  - Valores bruto / taxa / líquido
  - % meta atingida
  - % comissão
  - Valor final da comissão
  - Lista de vendas do período
- Suporte a:
  - uso individual
  - corporativo
  - admin/gestor

### ❗ Falta
- Exportar fechamento (PDF/Excel)
- Aprovação de comissão (workflow)

---

## 🔷 10. Dashboard Admin
### ✔ Concluído
- Controle de usuários
- Controle de empresas
- Logs
- Permissões
- Status de módulos

### ❗ Falta
- Painel financeiro da empresa
- Gerenciamento de planos/assinaturas (billing)

---

# 🧩 O que ainda falta no geral?

### 🚧 Infraestrutura
- Página de configurações do sistema
- Módulo de backups/exportação
- Configurações de email no painel admin

### 🚧 Front-End
- Dark mode opcional
- Animações leves no dashboard

### 🚧 Integrações futuras
- API de fornecedores e parceiros
- Emissão nota / fatura
- Pagamentos

---

# 🚀 Próximos passos recomendados

1) Finalizar exportações (PDF, CSV, Excel)  
2) Criar gráfico histórico de metas por vendedor  
3) Criar módulo de billing (admin)  
4) Criar módulo conversão de orçamentos → vendas  
5) Criar dashboard premium de comissionamento (gráficos)  

---

*Gerado automaticamente — SGTUR Core System Documentation.*
