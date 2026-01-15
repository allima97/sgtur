# Cron de Alerta de Meta/Comissão

Endpoint: `/api/cron-alerta-comissao`

Requer header `x-cron-secret` com `CRON_SECRET_COMISSAO` (ou `CRON_SECRET`).

## Variáveis de ambiente
- `PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `CRON_SECRET_COMISSAO` ou `CRON_SECRET`
- Opcional webhook: `ALERTA_WEBHOOK_COMISSAO` ou `ALERTA_WEBHOOK_URL`
- Opcional e-mail (Resend): `RESEND_API_KEY`, `ALERTA_FROM_EMAIL`
- Opcional e-mail (SendGrid fallback): `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`

## Corpo (POST) — todos opcionais
```json
{
  "periodoInicio": "2025-01-01",
  "periodoFim": "2025-01-31",
  "tempoPct": 0.5,
  "minPct": 0.5,
  "dryRun": false,
  "webhook": "https://sua-url/webhook",
  "canal": "email",
  "destinatario": "gestor@exemplo.com",
  "mensagem": "Alerta de meta: atingido {{pct}}% ({{atingido}} / {{meta}}) no período {{periodo}}."
}
```

### Regras
- Período padrão: mês atual (1º dia até hoje).
- Considera `parametros_comissao.usar_taxas_na_meta` para base de atingimento.
- Alerta quando: tempo decorrido do período ≥ `tempoPct` (padrão 50%) **e** atingimento < `minPct` (padrão 50%) da meta geral (`metas_vendedor.meta_geral`).
- GET atua como **dry-run**.

### Entrega
- E-mail por vendedor (Resend → fallback SendGrid) + `destinatario` extra (vírgulas aceitas). Envia mensagem com placeholders:
  - `{{pct}}`, `{{atingido}}`, `{{meta}}`, `{{periodo}}`.
- Webhook opcional com resumo (`alertas: [{ vendedor_id, email, meta, atingido, pct }]`).
- `dryRun=true`: não grava alertas, só retorna o payload.

### Logs (opcional)
Usa a mesma tabela `cron_log_alertas` (tipo `comissao_alerta`) se existir. Script em `public/cron-log-alertas.sql`.

## Exemplos de uso

### GET (dry-run padrão, mês atual)
```bash
curl -X GET \
  -H "x-cron-secret: $CRON_SECRET_COMISSAO" \
  https://seu-site/api/cron-alerta-comissao
```

### POST customizado
```bash
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET_COMISSAO" \
  -H "content-type: application/json" \
  -d '{
    "periodoInicio": "2025-01-01",
    "periodoFim": "2025-01-31",
    "tempoPct": 0.5,
    "minPct": 0.6,
    "dryRun": true,
    "destinatario": "gestor@exemplo.com"
  }' \
  https://seu-site/api/cron-alerta-comissao
```

### Agendamento
- Configure um cron externo (Cloudflare Cron, GitHub Actions, etc.) chamando o endpoint com `x-cron-secret`.
- Evite expor `SUPABASE_SERVICE_ROLE_KEY` no cliente; mantenha apenas no ambiente do worker/servidor.
