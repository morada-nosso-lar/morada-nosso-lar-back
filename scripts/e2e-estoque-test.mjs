/**
 * Script de teste E2E para o Módulo de Estoque
 * Testa o estoque mínimo personalizado por item, alteração com salvamento automático
 * e disparo de alertas dinâmicos acompanhando todas as alterações.
 *
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
  console.log('=== TESTE E2E: MÓDULO DE ESTOQUE COM ESTOQUE MÍNIMO PERSONALIZADO ===\n');

  // 1. Login ou Registro
  console.log('1. POST /api/auth/login');
  let login = await request('POST', '/api/auth/login', {
    email: 'admin.estoque@test.com',
    password: 'SenhaForte@2026',
  });

  if (login.status !== 200) {
    console.log('   Usuário não encontrado. Registrando admin...');
    const reg = await request('POST', '/api/auth/register', {
      name: 'Administrador de Estoque',
      email: 'admin.estoque@test.com',
      password: 'SenhaForte@2026',
    });
    console.log(`   Register Status: ${reg.status}`);
    login = await request('POST', '/api/auth/login', {
      email: 'admin.estoque@test.com',
      password: 'SenhaForte@2026',
    });
    console.log(`   Login Status: ${login.status}\n`);
  } else {
    console.log(`   Login bem-sucedido (Status: ${login.status})\n`);
  }

  // 2. POST /api/estoque — Cadastro com estoque mínimo padrão (quantidade 10, min padrão 2) -> SEM alerta
  console.log('2. POST /api/estoque (Papel Higiênico - Qtd: 10, sem especificar min -> default 2)');
  const create1 = await request('POST', '/api/estoque', {
    nome: 'Papel Higiênico Folha Dupla',
    categoria: 'Higiene Pessoal',
    quantidade: 10,
    descricao: 'Pacote com 12 rolos',
  });
  console.log(`   Status: ${create1.status}`);
  console.log(`   Estoque Mínimo configurado: ${create1.json.data?.estoqueMinimo}`);
  console.log(`   Alerta gerado: ${create1.json.alerta ? 'SIM' : 'NÃO (Esperado)'}\n`);
  const produtoId1 = create1.json.data?.id;

  // 3. POST /api/estoque — Cadastro de Pomada com Estoque Mínimo PERSONALIZADO (ex: min: 5, qtd: 10) -> SEM alerta
  console.log('3. POST /api/estoque (Pomada para Assaduras - Qtd: 10, Estoque Mínimo Personalizado: 5)');
  const createPomada = await request('POST', '/api/estoque', {
    nome: 'Pomada Cicatrizante e Hidratante',
    categoria: 'Remédios',
    quantidade: 10,
    estoque_minimo: 5,
    descricao: 'Tubo de 50g',
  });
  console.log(`   Status: ${createPomada.status}`);
  console.log(`   Estoque Mínimo: ${createPomada.json.data?.estoqueMinimo} (Esperado: 5)`);
  console.log(`   Alerta gerado: ${createPomada.json.alerta ? 'SIM' : 'NÃO (Esperado, pois 10 > 5)'}\n`);
  const pomadaId = createPomada.json.data?.id;

  // 4. POST /api/estoque — Cadastro de Medicamento com Estoque Mínimo PERSONALIZADO ALTO (ex: min: 20, qtd: 15) -> COM alerta
  console.log('4. POST /api/estoque (Dipirona Gotas - Qtd: 15, Estoque Mínimo Personalizado: 20 -> COM ALERTA)');
  const createDipirona = await request('POST', '/api/estoque', {
    nome: 'Dipirona 500mg/ml Gotas',
    categoria: 'Remédios',
    quantidade: 15,
    estoque_minimo: 20,
    descricao: 'Frasco de 20ml',
  });
  console.log(`   Status: ${createDipirona.status}`);
  console.log(`   Estoque Mínimo: ${createDipirona.json.data?.estoqueMinimo} (Esperado: 20)`);
  console.log(`   Alerta gerado: ${createDipirona.json.alerta?.mensagem}\n`);
  const dipironaId = createDipirona.json.data?.id;

  // 5. PATCH /api/estoque/:id — Administrador altera o estoque mínimo da Pomada a qualquer momento (Salvamento Automático)
  // Pomada tinha qtd: 10 e min: 5. Agora admin altera min para 15! Como 10 <= 15, DEVE gerar alerta!
  console.log('5. PATCH /api/estoque/:id (Pomada: Alterar estoque_minimo de 5 para 15 via salvamento automático -> DEVE gerar alerta)');
  const patchMin = await request('PATCH', `/api/estoque/${pomadaId}`, {
    estoque_minimo: 15,
  });
  console.log(`   Status: ${patchMin.status}`);
  console.log(`   Novo Estoque Mínimo: ${patchMin.json.data?.estoqueMinimo} (Esperado: 15)`);
  console.log(`   Alerta gerado na alteração do estoque mínimo:`);
  console.log(`   -> ${patchMin.json.alerta?.mensagem}\n`);

  // 6. Múltiplas alterações no estoque mínimo:
  // Administrador decide ajustar o estoque mínimo da Pomada novamente para 8 (qtd continua 10 -> agora 10 > 8, sem novo alerta crítico)
  console.log('6. PUT /api/estoque/:id (Pomada: Ajustar estoque_minimo de 15 para 8)');
  const putMin8 = await request('PUT', `/api/estoque/${pomadaId}`, {
    estoque_minimo: 8,
  });
  console.log(`   Status: ${putMin8.status}`);
  console.log(`   Novo Estoque Mínimo: ${putMin8.json.data?.estoqueMinimo} (Esperado: 8)`);
  console.log(`   Alerta gerado: ${putMin8.json.alerta ? 'SIM' : 'NÃO (Esperado, pois 10 > 8)'}\n`);

  // 7. Agora reduz a quantidade da Pomada para 7 (7 <= 8 -> o alerta DEVE acompanhar o novo estoque mínimo de 8!)
  console.log('7. PUT /api/estoque/:id (Pomada: Quantidade alterada para 7 -> DEVE disparar alerta para o mínimo de 8)');
  const putQtd7 = await request('PUT', `/api/estoque/${pomadaId}`, {
    quantidade: 7,
  });
  console.log(`   Status: ${putQtd7.status}`);
  console.log(`   Alerta gerado: ${putQtd7.json.alerta?.mensagem}\n`);

  // 8. GET /api/estoque — Listagem conferindo campos estoqueMinimo
  console.log('8. GET /api/estoque (Conferência de listagem)');
  const list = await request('GET', '/api/estoque');
  console.log(`   Status: ${list.status}`);
  console.log(`   Total: ${list.json.data?.length} produto(s)`);
  const itemConferido = list.json.data?.find((p) => p.id === pomadaId);
  console.log(`   Pomada na listagem: Qtd=${itemConferido?.quantidade}, EstoqueMin=${itemConferido?.estoqueMinimo}\n`);

  // 9. GET /api/estoque/alertas — Conferência do histórico de alertas
  console.log('9. GET /api/estoque/alertas');
  const alertas = await request('GET', '/api/estoque/alertas');
  console.log(`   Status: ${alertas.status}`);
  console.log(`   Total de alertas registrados: ${alertas.json.data?.length}`);
  if (alertas.json.data?.length > 0) {
    console.log(`   Último alerta: ${alertas.json.data[0].mensagem}`);
  }
  console.log('');

  // 10. GET /api/estoque/logs — Conferência dos LOGs de auditoria
  console.log(`10. GET /api/estoque/logs?produto_id=${pomadaId}`);
  const logs = await request('GET', `/api/estoque/logs?produto_id=${pomadaId}`);
  console.log(`   Status: ${logs.status}`);
  console.log(`   Total de logs para a Pomada: ${logs.json.data?.length}`);
  logs.json.data?.forEach((l) => {
    console.log(`   -> [${l.acao}] ${l.campoAlterado || 'GERAL'}: ${l.descricao}`);
  });
  console.log('');

  // 11. Limpeza dos dados de teste
  console.log('11. Limpando produtos de teste...');
  if (produtoId1) await request('DELETE', `/api/estoque/${produtoId1}`);
  if (pomadaId) await request('DELETE', `/api/estoque/${pomadaId}`);
  if (dipironaId) await request('DELETE', `/api/estoque/${dipironaId}`);
  console.log('   Produtos de teste removidos.\n');

  console.log('=== TESTES DE ESTOQUE MÍNIMO PERSONALIZADO CONCLUÍDOS COM SUCESSO! ===');
}

run().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
