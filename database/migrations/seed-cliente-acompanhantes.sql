-- Insere cliente com company_id e dois acompanhantes de exemplo.
-- Substitua pelos IDs reais antes de rodar no Supabase.
-- Certifique-se de aplicar antes o script public/migration-clientes-company-id.sql para criar a coluna company_id.

-- Ajuste estes IDs
-- company_id da empresa alvo
-- usuário responsável (opcional, para logs/auditoria)
-- cliente_id gerado no insert abaixo, se quiser forçar um UUID
-- select * from public.companies limit 1;

-- 1) Cliente
insert into public.clientes (
  id,
  company_id,
  nome,
  nascimento,
  cpf,
  telefone,
  whatsapp,
  email,
  endereco,
  numero,
  complemento,
  cidade,
  estado,
  cep,
  rg,
  genero,
  nacionalidade,
  tags,
  tipo_cliente,
  notas,
  active
) values (
  gen_random_uuid(), -- ou um UUID fixo, se preferir
  '<COMPANY_ID>',
  'Cliente Teste Acompanhantes',
  '1990-05-10',
  '00000000000',
  '(11) 99999-0000',
  '(11) 99999-0000',
  'cliente+teste@example.com',
  'Rua Exemplo, 123',
  '10',
  'Ap 10',
  'São Paulo',
  'SP',
  '01000-000',
  '1234567',
  'M',
  'Brasileira',
  '{vip,teste}',
  'passageiro',
  'Cliente de teste para validar acompanhantes.',
  true
) returning id;

-- Anote o id retornado e use abaixo em cliente_id
-- 2) Acompanhantes do cliente
insert into public.cliente_acompanhantes (
  id,
  cliente_id,
  company_id,
  nome_completo,
  cpf,
  rg,
  telefone,
  grau_parentesco,
  data_nascimento,
  observacoes,
  ativo
) values
(
  gen_random_uuid(),
  '<CLIENTE_ID>',
  '<COMPANY_ID>',
  'Acompanhante 1',
  '11111111111',
  'RG111',
  '(11) 90000-0001',
  'Esposa',
  '1992-03-15',
  'Acompanhante de teste 1',
  true
),
(
  gen_random_uuid(),
  '<CLIENTE_ID>',
  '<COMPANY_ID>',
  'Acompanhante 2',
  '22222222222',
  'RG222',
  '(11) 90000-0002',
  'Filho',
  '2015-08-20',
  'Acompanhante de teste 2',
  true
);

-- Caso queira limpar depois:
-- delete from public.cliente_acompanhantes where cliente_id = '<CLIENTE_ID>';
-- delete from public.clientes where id = '<CLIENTE_ID>';
