# Cron de Alertas de Orçamentos

Endpoint: `/api/cron-alerta-orcamentos`

Requer header `x-cron-secret` com o valor de `CRON_SECRET_ALERTAS` (ou `CRON_SECRET`).

## Variáveis de ambiente

- `PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `CRON_SECRET_ALERTAS` ou `CRON_SECRET`
- Opcional webhook: `ALERTA_WEBHOOK_URL` ou `WEBHOOK_ALERTA_ORCAMENTOS`
- Opcional e-mail (Resend): `RESEND_API_KEY`, `ALERTA_FROM_EMAIL`
- Opcional e-mail (SendGrid fallback): `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`

## Corpo (POST) — todos opcionais

```json
{
  "diasJanela": 7,
  "diasSemInteracao": 7,
  "diasThrottle": 1,
  "marcarEnviado": true,
  "dryRun": false,
  "mensagem": "Alerta follow-up. Status {{status}}, viagem {{viagem}}, gerado em {{agora}}.",
  "canal": "email",
  "destinatario": "cliente@exemplo.com",
  "webhook": "https://sua-url/webhook",
  "diasStatus": {
    "novo": 5,
    "negociando": 2,
    "viagem_negociando": 3
  },
  "mensagensStatus": {
    "negociando": "Urgente: status {{status}}, viagem {{viagem}} ({{agora}})."
  }
}
```

### Regras de filtragem
- Status elegíveis: `novo`, `enviado`, `negociando`.
- Entra em alerta se:
  - viagem em `diasJanela` (ou `viagem_<status>` se definido em `diasStatus`);
  - sem data e criação ≥ `diasSemInteracao`;
  - sem interação recente (última interação ≥ `diasStatus[status]` ou `diasSemInteracao`);
  - throttle: ignora se já houve alerta nos últimos `diasThrottle` dias.

### Template de mensagem
Placeholders: `{{status}}`, `{{viagem}}`, `{{agora}}`, `{{canal}}`, `{{destinatario}}`.
`mensagensStatus` permite sobrescrever o template por status.

### Entrega
- E-mail: tenta Resend; se ausente, tenta SendGrid; envia resumo único.
- Webhook: POST com resumo dos alertas (`alertas: [{ orcamento_id, mensagem }]`).
- `dryRun=true`: apenas simula, não grava interações, não muda status, não envia.

### Logs (opcional)
Tenta inserir em `cron_log_alertas`. Crie a tabela para auditoria:

```sql
create table if not exists public.cron_log_alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  total int,
  pendentes int,
  gerados int,
  status_atualizados int,
  webhook_status text,
  email_status text,
  dry_run boolean,
  dias_status jsonb,
  canal text,
  destinatario text,
  criado_em timestamptz default now()
);
create index if not exists idx_cron_log_alertas_tipo on public.cron_log_alertas(tipo);
create index if not exists idx_cron_log_alertas_criado_em on public.cron_log_alertas(criado_em);
```

## Exemplos rápidos

### GET (simples)
```bash
curl -X GET \
  -H "x-cron-secret: $CRON_SECRET_ALERTAS" \
  https://seu-site.vercel.app/api/cron-alerta-orcamentos
```

### POST com thresholds e dry-run
```bash
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET_ALERTAS" \
  -H "content-type: application/json" \
  -d '{
    "diasJanela": 5,
    "diasSemInteracao": 5,
    "diasThrottle": 1,
    "dryRun": true,
    "diasStatus": { "negociando": 2, "viagem_negociando": 3 }
  }' \
  https://seu-site.vercel.app/api/cron-alerta-orcamentos
```

### Agendamento (exemplo)
- Em um cron externo (Cloudflare Cron Triggers, GitHub Actions, UptimeRobot, etc.) chame o endpoint com o header `x-cron-secret`.
- Para cada ambiente, configure as variáveis acima; evite expor `SUPABASE_SERVICE_ROLE_KEY` em cliente.
