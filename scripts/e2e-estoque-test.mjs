/**
 * Script de teste E2E para as APIs de Estoque
 * Executa: node scripts/e2e-estoque-test.mjs
 */

const BASE = 'http://localhost:3000';
let cookie = '';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (cookie) opts.headers['Cookie'] = cookie;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const json = await res.json();
  return { status: res.status, json };
}

async function run() {
  console.log('=== TESTE E2E: MÓDULO DE ESTOQUE ===\n');

  // 1. Login
  console.log('1. POST /api/auth/login');
  const login = await request('POST', '/api/auth/login', {
    email: 'test@test.com',
    password: '123456',
  });
  console.log(`   Status: ${login.status}`);
  console.log(`   Body: ${JSON.stringify(login.json)}\n`);
  if (login.status !== 200) {
    console.log('❌ Login falhou. Registrando usuário...');
    const reg = await request('POST', '/api/auth/register', {
      name: 'Test User',
      email: 'test@test.com',
      password: '123456',
    });
    console.log(`   Register Status: ${reg.status}`);
    console.log(`   Body: ${JSON.stringify(reg.json)}\n`);
    const login2 = await request('POST', '/api/auth/login', {
      email: 'test@test.com',
      password: '123456',
    });
    console.log(`   Login2 Status: ${login2.status}\n`);
  }

  // 2. POST /api/estoque — Cadastro com estoque normal (>2)
  console.log('2. POST /api/estoque (quantidade: 10 — sem alerta)');
  const create1 = await request('POST', '/api/estoque', {
    nome: 'Papel Higiênico',
    categoria: 'Higiene',
    quantidade: 10,
    descricao: 'Pacote com 12 rolos',
  });
  console.log(`   Status: ${create1.status}`);
  console.log(`   Body: ${JSON.stringify(create1.json)}\n`);
  const produtoId1 = create1.json.data?.id;

  // 3. POST /api/estoque — Cadastro com estoque baixo (≤2) → deve gerar alerta
  console.log('3. POST /api/estoque (quantidade: 1 — COM alerta)');
  const create2 = await request('POST', '/api/estoque', {
    nome: 'Detergente',
    categoria: 'Limpeza',
    quantidade: 1,
  });
  console.log(`   Status: ${create2.status}`);
  console.log(`   Alerta: ${JSON.stringify(create2.json.alerta)}\n`);
  const produtoId2 = create2.json.data?.id;

  // 4. GET /api/estoque — Listagem
  console.log('4. GET /api/estoque');
  const list = await request('GET', '/api/estoque');
  console.log(`   Status: ${list.status}`);
  console.log(`   Total: ${list.json.data?.length} produto(s)\n`);

  // 5. GET /api/estoque/:id — Detalhe
  console.log(`5. GET /api/estoque/${produtoId1}`);
  const detail = await request('GET', `/api/estoque/${produtoId1}`);
  console.log(`   Status: ${detail.status}`);
  console.log(`   Body: ${JSON.stringify(detail.json)}\n`);

  // 6. PUT /api/estoque/:id — Atualizar quantidade para ≤2 → deve gerar alerta
  console.log(`6. PUT /api/estoque/${produtoId1} (quantidade: 2 — COM alerta)`);
  const update = await request('PUT', `/api/estoque/${produtoId1}`, {
    quantidade: 2,
  });
  console.log(`   Status: ${update.status}`);
  console.log(`   Alerta: ${JSON.stringify(update.json.alerta)}\n`);

  // 7. GET /api/estoque/alertas — Histórico de alertas
  console.log('7. GET /api/estoque/alertas');
  const alertas = await request('GET', '/api/estoque/alertas');
  console.log(`   Status: ${alertas.status}`);
  console.log(`   Total: ${alertas.json.data?.length} alerta(s)\n`);

  // 8. GET /api/estoque/alertas?lido=false — Apenas não lidos
  console.log('8. GET /api/estoque/alertas?lido=false');
  const naoLidos = await request('GET', '/api/estoque/alertas?lido=false');
  console.log(`   Status: ${naoLidos.status}`);
  console.log(`   Total não lidos: ${naoLidos.json.data?.length}\n`);

  // 9. PATCH /api/estoque/alertas/:id — Marcar como lido
  const alertaId = alertas.json.data?.[0]?.id;
  if (alertaId) {
    console.log(`9. PATCH /api/estoque/alertas/${alertaId} (marcar como lido)`);
    const patch = await request('PATCH', `/api/estoque/alertas/${alertaId}`, {
      lido: true,
    });
    console.log(`   Status: ${patch.status}`);
    console.log(`   Body: ${JSON.stringify(patch.json)}\n`);
  }

  // 10. PUT /api/estoque/:id — Validação (sem campos)
  console.log(`10. PUT /api/estoque/${produtoId1} (body vazio — deve falhar 422)`);
  const failUpdate = await request('PUT', `/api/estoque/${produtoId1}`, {});
  console.log(`   Status: ${failUpdate.status}\n`);

  // 11. DELETE /api/estoque/:id — Excluir produto
  console.log(`11. DELETE /api/estoque/${produtoId2}`);
  const del = await request('DELETE', `/api/estoque/${produtoId2}`);
  console.log(`   Status: ${del.status}`);
  console.log(`   Body: ${JSON.stringify(del.json)}\n`);

  // 12. DELETE do outro produto
  console.log(`12. DELETE /api/estoque/${produtoId1}`);
  const del2 = await request('DELETE', `/api/estoque/${produtoId1}`);
  console.log(`   Status: ${del2.status}`);
  console.log(`   Body: ${JSON.stringify(del2.json)}\n`);

  console.log('=== TESTES CONCLUÍDOS ===');
}

run().catch(console.error);
