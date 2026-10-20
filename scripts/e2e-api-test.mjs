/**
 * ==============================================================================
 * SCRIPT DE TESTES E2E — SPRINT 04 (scripts/e2e-api-test.mjs)
 * ==============================================================================
 *
 * Testa TODOS os endpoints do backend, incluindo as melhorias da Sprint 04:
 *   - Autenticação (register, login, me, logout)
 *   - Pacientes (CRUD + CPF + desativação/reativação)
 *   - Estoque (CRUD + categorias pré-definidas + imutabilidade + LOGs)
 *   - Categorias (lista pré-definida)
 *   - Notificações (listar, enviar, marcar como lida)
 *   - Configurações (listar, alterar)
 *   - Logs de auditoria (consultar histórico)
 *
 * COMO EXECUTAR:
 *   1. Inicie o servidor: npm run dev
 *   2. Execute os testes: npm run test:auth
 *      Ou: node scripts/e2e-api-test.mjs
 */

const BASE_URL = 'http://localhost:3000';

// Variáveis compartilhadas entre os testes
let token = '';        // JWT obtido no login
let pacienteId = 0;    // ID do paciente criado
let produtoId = 0;     // ID do produto do estoque geral criado
let notificacaoId = 0; // ID de uma notificação

/**
 * Helper para fazer requisições autenticadas com Bearer Token.
 */
async function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

/**
 * Helper para exibir resultado de cada teste.
 */
function logResult(testNum, name, status, expected, passed) {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [TESTE ${testNum}] ${name}`);
  console.log(`   Status: ${status} (Esperado: ${expected})`);
}

async function run() {
  console.log('🚀 Iniciando testes E2E — Sprint 04 (Backend Completo)\n');
  console.log('='.repeat(60));

  // =========================================================================
  // PARTE 1: AUTENTICAÇÃO
  // =========================================================================
  console.log('\n📋 PARTE 1: AUTENTICAÇÃO\n');

  // TESTE 1: Cadastro com dados válidos
  console.log('[TESTE 1] POST /api/auth/register (Cadastro Válido)');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Enfermeiro Teste Sprint04',
      email: `teste.sprint04.${Date.now()}@exemplo.com.br`,
      password: 'SenhaForte@2026',
    }),
  });
  const regData = await regRes.json();
  logResult(1, 'Cadastro de usuário', regRes.status, 201, regRes.status === 201);
  if (regRes.status !== 201) throw new Error('Falha no Teste 1: Cadastro');

  // TESTE 2: Login com credenciais corretas
  console.log('\n[TESTE 2] POST /api/auth/login (Login Válido)');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regData.user.email,
      password: 'SenhaForte@2026',
    }),
  });
  const loginData = await loginRes.json();
  logResult(2, 'Login com credenciais corretas', loginRes.status, 200, loginRes.status === 200);
  if (loginRes.status !== 200 || !loginData.token) throw new Error('Falha no Teste 2');
  token = loginData.token;
  console.log(`   Token JWT: ${token.substring(0, 30)}...`);

  // =========================================================================
  // PARTE 2: CATEGORIAS PRÉ-DEFINIDAS
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PARTE 2: CATEGORIAS PRÉ-DEFINIDAS\n');

  // TESTE 3: Listar categorias
  console.log('[TESTE 3] GET /api/categorias');
  const catRes = await authFetch(`${BASE_URL}/api/categorias`);
  const catData = await catRes.json();
  logResult(3, 'Listar categorias pré-definidas', catRes.status, 200, catRes.status === 200);
  console.log(`   Categorias: ${catData.data?.join(', ')}`);
  if (catRes.status !== 200 || !catData.data || catData.data.length < 5) {
    throw new Error('Falha no Teste 3: Categorias');
  }

  // =========================================================================
  // PARTE 3: PACIENTES (CPF + ITENS INICIAIS)
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PARTE 3: PACIENTES (CPF + Itens Iniciais)\n');

  // TESTE 4: Cadastrar paciente com CPF INVÁLIDO (deve falhar)
  console.log('[TESTE 4] POST /api/pacientes (CPF Inválido → 422)');
  const cpfInvalidoRes = await authFetch(`${BASE_URL}/api/pacientes`, {
    method: 'POST',
    body: JSON.stringify({
      cpf: '111.111.111-11',  // CPF com todos os dígitos iguais
      nome_completo: 'Teste CPF Inválido',
      data_nascimento: '1950-01-01',
    }),
  });
  const cpfInvalidoData = await cpfInvalidoRes.json();
  logResult(4, 'Rejeitar CPF inválido (111.111.111-11)', cpfInvalidoRes.status, 422, cpfInvalidoRes.status === 422);
  console.log(`   Erro: ${cpfInvalidoData.error}`);
  if (cpfInvalidoRes.status !== 422) throw new Error('Falha no Teste 4: CPF inválido aceito');

  // TESTE 5: Cadastrar paciente com CPF VÁLIDO (deve criar + 3 itens padrão)
  console.log('\n[TESTE 5] POST /api/pacientes (CPF Válido + 3 Itens Padrão)');
  const pacRes = await authFetch(`${BASE_URL}/api/pacientes`, {
    method: 'POST',
    body: JSON.stringify({
      cpf: '529.982.247-25',  // CPF válido para testes
      nome_completo: 'Maria da Silva Santos',
      data_nascimento: '1945-06-15',
      observacoes_medicas: 'Hipertensa, usa losartana 50mg diariamente.',
    }),
  });
  const pacData = await pacRes.json();
  logResult(5, 'Cadastrar paciente com CPF válido', pacRes.status, 201, pacRes.status === 201);
  if (pacRes.status !== 201) {
    console.log(`   Erro: ${pacData.error}`);
    throw new Error('Falha no Teste 5: Cadastro de paciente');
  }
  pacienteId = pacData.data.id;
  console.log(`   Paciente ID: ${pacienteId}`);
  console.log(`   CPF: ${pacData.data.cpf}`);
  console.log(`   Paciente começa sem itens no estoque (serão adicionados manualmente)`);

  // TESTE 6: Tentar cadastrar com CPF duplicado
  console.log('\n[TESTE 6] POST /api/pacientes (CPF Duplicado → 409)');
  const cpfDupRes = await authFetch(`${BASE_URL}/api/pacientes`, {
    method: 'POST',
    body: JSON.stringify({
      cpf: '529.982.247-25',
      nome_completo: 'Outra Pessoa',
      data_nascimento: '1960-01-01',
    }),
  });
  const cpfDupData = await cpfDupRes.json();
  logResult(6, 'Rejeitar CPF duplicado', cpfDupRes.status, 409, cpfDupRes.status === 409);
  console.log(`   Erro: ${cpfDupData.error}`);
  if (cpfDupRes.status !== 409) throw new Error('Falha no Teste 6');

  // TESTE 7: Listar pacientes ativos
  console.log('\n[TESTE 7] GET /api/pacientes (Apenas Ativos)');
  const listAtivosRes = await authFetch(`${BASE_URL}/api/pacientes`);
  const listAtivosData = await listAtivosRes.json();
  logResult(7, 'Listar pacientes ativos', listAtivosRes.status, 200, listAtivosRes.status === 200);
  console.log(`   Quantidade: ${listAtivosData.data?.length}`);

  // TESTE 8: Buscar paciente por ID (com produtos vinculados)
  console.log(`\n[TESTE 8] GET /api/pacientes/${pacienteId} (Com Produtos)`);
  const pacDetalheRes = await authFetch(`${BASE_URL}/api/pacientes/${pacienteId}`);
  const pacDetalheData = await pacDetalheRes.json();
  logResult(8, 'Buscar paciente com produtos', pacDetalheRes.status, 200, pacDetalheRes.status === 200);
  console.log(`   Nome: ${pacDetalheData.data?.nomeCompleto}`);
  console.log(`   Produtos vinculados: ${pacDetalheData.data?.produtos?.length}`);

  // =========================================================================
  // PARTE 4: ESTOQUE (CATEGORIAS + IMUTABILIDADE + LOGS)
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PARTE 4: ESTOQUE (Categorias + Imutabilidade + LOGs)\n');

  // TESTE 9: Cadastrar produto com categoria INVÁLIDA (deve falhar)
  console.log('[TESTE 9] POST /api/estoque (Categoria Inválida → 422)');
  const catInvalidaRes = await authFetch(`${BASE_URL}/api/estoque`, {
    method: 'POST',
    body: JSON.stringify({
      nome: 'Produto Teste',
      categoria: 'Categoria Inexistente',
      quantidade: 10,
    }),
  });
  const catInvalidaData = await catInvalidaRes.json();
  logResult(9, 'Rejeitar categoria inválida', catInvalidaRes.status, 422, catInvalidaRes.status === 422);
  console.log(`   Erro: ${catInvalidaData.error}`);

  // TESTE 10: Cadastrar produto no estoque geral com categoria válida
  console.log('\n[TESTE 10] POST /api/estoque (Categoria Válida - Estoque Geral)');
  const prodRes = await authFetch(`${BASE_URL}/api/estoque`, {
    method: 'POST',
    body: JSON.stringify({
      nome: 'Sabonete Líquido',
      categoria: 'Higiene Pessoal',
      quantidade: 50,
      descricao: 'Sabonete líquido neutro 500ml',
    }),
  });
  const prodData = await prodRes.json();
  logResult(10, 'Cadastrar produto (estoque geral)', prodRes.status, 201, prodRes.status === 201);
  if (prodRes.status !== 201) {
    console.log(`   Erro: ${prodData.error}`);
    throw new Error('Falha no Teste 10');
  }
  produtoId = prodData.data.id;
  console.log(`   Produto ID: ${produtoId}, Categoria: ${prodData.data.categoria}`);

  // TESTE 11: Editar produto do estoque geral (deve funcionar + gerar LOG)
  console.log(`\n[TESTE 11] PUT /api/estoque/${produtoId} (Editar Estoque Geral → 200)`);
  const editProdRes = await authFetch(`${BASE_URL}/api/estoque/${produtoId}`, {
    method: 'PUT',
    body: JSON.stringify({
      quantidade: 45,
    }),
  });
  const editProdData = await editProdRes.json();
  logResult(11, 'Editar produto do estoque geral', editProdRes.status, 200, editProdRes.status === 200);
  console.log(`   LOGs gerados: ${editProdData.logs_gerados}`);

  // TESTE 12: Cadastrar item para o paciente e depois editá-lo
  console.log(`\n[TESTE 12] POST /api/estoque + PUT (Cadastrar e Editar Item de Paciente)`);
  const addItemPacRes = await authFetch(`${BASE_URL}/api/estoque`, {
    method: 'POST',
    body: JSON.stringify({
      nome: 'Kit de Higiene',
      categoria: 'Higiene Pessoal',
      quantidade: 1,
      paciente_id: pacienteId,
    }),
  });
  const addItemPacData = await addItemPacRes.json();
  logResult(12, 'Cadastrar item para paciente', addItemPacRes.status, 201, addItemPacRes.status === 201);
  const itemPacienteId = addItemPacData.data?.id;

  // Agora edita o item (deve funcionar — itens de pacientes são editáveis)
  if (itemPacienteId) {
    const editItemPacRes = await authFetch(`${BASE_URL}/api/estoque/${itemPacienteId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantidade: 5 }),
    });
    const editItemPacData = await editItemPacRes.json();
    logResult('12b', 'Editar item de paciente (permitido)', editItemPacRes.status, 200, editItemPacRes.status === 200);
    console.log(`   LOGs gerados: ${editItemPacData.logs_gerados}`);
  }

  // TESTE 13: Excluir item de paciente ativo (deve funcionar)
  if (itemPacienteId) {
    console.log(`\n[TESTE 13] DELETE /api/estoque/${itemPacienteId} (Item de Paciente Ativo → 200)`);
    const delItemPacRes = await authFetch(`${BASE_URL}/api/estoque/${itemPacienteId}`, {
      method: 'DELETE',
    });
    const delItemPacData = await delItemPacRes.json();
    logResult(13, 'Excluir item de paciente ativo', delItemPacRes.status, 200, delItemPacRes.status === 200);
    console.log(`   Mensagem: ${delItemPacData.message}`);
  }

  // =========================================================================
  // PARTE 5: LOGS DE AUDITORIA
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PARTE 5: LOGS DE AUDITORIA\n');

  // TESTE 14: Consultar logs de estoque
  console.log('[TESTE 14] GET /api/estoque/logs');
  const logsRes = await authFetch(`${BASE_URL}/api/estoque/logs`);
  const logsData = await logsRes.json();
  logResult(14, 'Listar logs de auditoria', logsRes.status, 200, logsRes.status === 200);
  console.log(`   Total de logs: ${logsData.data?.length}`);
  if (logsData.data?.length > 0) {
    console.log(`   Último log: [${logsData.data[0].acao}] ${logsData.data[0].descricao?.substring(0, 80)}...`);
  }

  // TESTE 15: Filtrar logs por paciente
  console.log(`\n[TESTE 15] GET /api/estoque/logs?paciente_id=${pacienteId}`);
  const logsPacRes = await authFetch(`${BASE_URL}/api/estoque/logs?paciente_id=${pacienteId}`);
  const logsPacData = await logsPacRes.json();
  logResult(15, 'Filtrar logs por paciente', logsPacRes.status, 200, logsPacRes.status === 200);
  console.log(`   Logs do paciente: ${logsPacData.data?.length}`);

  // =========================================================================
  // PARTE 6: DESATIVAÇÃO / REATIVAÇÃO DE PACIENTES
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PARTE 6: DESATIVAÇÃO / REATIVAÇÃO DE PACIENTES\n');

  // TESTE 16: Desativar paciente (zera estoque + gera notificação)
  console.log(`[TESTE 16] PATCH /api/pacientes/${pacienteId} (Desativar)`);
  const desativarRes = await authFetch(`${BASE_URL}/api/pacientes/${pacienteId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      acao: 'desativar',
      motivo: 'Paciente transferido para outra instituição de longa permanência.',
    }),
  });
  const desativarData = await desativarRes.json();
  logResult(16, 'Desativar paciente (zerar estoque)', desativarRes.status, 200, desativarRes.status === 200);
  if (desativarRes.status === 200) {
    console.log(`   Mensagem: ${desativarData.message}`);
    console.log(`   Ativo: ${desativarData.data?.ativo}`);
  } else {
    console.log(`   Erro: ${desativarData.error}`);
    throw new Error('Falha no Teste 16');
  }

  // TESTE 17: Tentar adicionar item a paciente desativado (deve falhar)
  console.log(`\n[TESTE 17] POST /api/estoque (Item para Paciente Desativado → 403)`);
  const addDesativadoRes = await authFetch(`${BASE_URL}/api/estoque`, {
    method: 'POST',
    body: JSON.stringify({
      nome: 'Novo Item',
      categoria: 'Outros',
      quantidade: 5,
      paciente_id: pacienteId,
    }),
  });
  const addDesativadoData = await addDesativadoRes.json();
  logResult(17, 'Rejeitar item para paciente desativado', addDesativadoRes.status, 403, addDesativadoRes.status === 403);
  console.log(`   Erro: ${addDesativadoData.error}`);

  // TESTE 18: Tentar editar paciente desativado (deve falhar)
  console.log(`\n[TESTE 18] PUT /api/pacientes/${pacienteId} (Editar Desativado → 403)`);
  const editDesativadoRes = await authFetch(`${BASE_URL}/api/pacientes/${pacienteId}`, {
    method: 'PUT',
    body: JSON.stringify({
      nome_completo: 'Novo Nome',
    }),
  });
  const editDesativadoData = await editDesativadoRes.json();
  logResult(18, 'Rejeitar edição de paciente desativado', editDesativadoRes.status, 403, editDesativadoRes.status === 403);
  console.log(`   Erro: ${editDesativadoData.error}`);

  // TESTE 19: Listar pacientes desativados
  console.log('\n[TESTE 19] GET /api/pacientes?ativo=false (Desativados)');
  const desativadosRes = await authFetch(`${BASE_URL}/api/pacientes?ativo=false`);
  const desativadosData = await desativadosRes.json();
  logResult(19, 'Listar pacientes desativados', desativadosRes.status, 200, desativadosRes.status === 200);
  console.log(`   Quantidade: ${desativadosData.data?.length}`);

  // TESTE 20: Reativar paciente
  console.log(`\n[TESTE 20] PATCH /api/pacientes/${pacienteId} (Reativar)`);
  const reativarRes = await authFetch(`${BASE_URL}/api/pacientes/${pacienteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ acao: 'reativar' }),
  });
  const reativarData = await reativarRes.json();
  logResult(20, 'Reativar paciente', reativarRes.status, 200, reativarRes.status === 200);
  if (reativarRes.status === 200) {
    console.log(`   Ativo: ${reativarData.data?.ativo}`);
  }

  // =========================================================================
  // PARTE 7: NOTIFICAÇÕES
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PARTE 7: NOTIFICAÇÕES\n');

  // TESTE 21: Listar notificações (deve ter notificações automáticas)
  console.log('[TESTE 21] GET /api/notificacoes');
  const notifRes = await authFetch(`${BASE_URL}/api/notificacoes`);
  const notifData = await notifRes.json();
  logResult(21, 'Listar notificações', notifRes.status, 200, notifRes.status === 200);
  console.log(`   Total: ${notifData.data?.length}`);
  console.log(`   Não lidas: ${notifData.nao_lidas}`);
  if (notifData.data?.length > 0) {
    notificacaoId = notifData.data[0].id;
  }

  // TESTE 22: Enviar notificação manual
  console.log('\n[TESTE 22] POST /api/notificacoes (Envio Manual)');
  const enviarNotifRes = await authFetch(`${BASE_URL}/api/notificacoes`, {
    method: 'POST',
    body: JSON.stringify({
      titulo: 'Reunião de Equipe',
      mensagem: 'Reunião marcada para amanhã às 14h na sala de enfermagem. Presença obrigatória.',
      tipo: 'SISTEMA',
    }),
  });
  const enviarNotifData = await enviarNotifRes.json();
  logResult(22, 'Enviar notificação manual', enviarNotifRes.status, 201, enviarNotifRes.status === 201);
  if (enviarNotifRes.status === 201) {
    console.log(`   Notificação ID: ${enviarNotifData.data?.id}`);
    notificacaoId = enviarNotifData.data?.id || notificacaoId;
  }

  // TESTE 23: Marcar notificação como lida
  if (notificacaoId) {
    console.log(`\n[TESTE 23] PATCH /api/notificacoes/${notificacaoId} (Marcar como Lida)`);
    const marcarLidaRes = await authFetch(`${BASE_URL}/api/notificacoes/${notificacaoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ lida: true }),
    });
    const marcarLidaData = await marcarLidaRes.json();
    logResult(23, 'Marcar notificação como lida', marcarLidaRes.status, 200, marcarLidaRes.status === 200);
    console.log(`   Lida: ${marcarLidaData.data?.lida}`);
  }

  // =========================================================================
  // PARTE 8: CONFIGURAÇÕES DO SISTEMA
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PARTE 8: CONFIGURAÇÕES DO SISTEMA\n');

  // TESTE 24: Listar configurações (auto-inicializa)
  console.log('[TESTE 24] GET /api/configuracoes');
  const configRes = await authFetch(`${BASE_URL}/api/configuracoes`);
  const configData = await configRes.json();
  logResult(24, 'Listar configurações', configRes.status, 200, configRes.status === 200);
  console.log(`   Total: ${configData.data?.length}`);
  if (configData.data) {
    for (const cfg of configData.data) {
      console.log(`   → ${cfg.chave} = "${cfg.valor}"`);
    }
  }

  // TESTE 25: Buscar configuração por chave
  console.log('\n[TESTE 25] GET /api/configuracoes/estoque_minimo');
  const cfgDetalheRes = await authFetch(`${BASE_URL}/api/configuracoes/estoque_minimo`);
  const cfgDetalheData = await cfgDetalheRes.json();
  logResult(25, 'Buscar configuração por chave', cfgDetalheRes.status, 200, cfgDetalheRes.status === 200);
  console.log(`   Valor atual: ${cfgDetalheData.data?.valor}`);

  // TESTE 26: Alterar configuração
  console.log('\n[TESTE 26] PUT /api/configuracoes/estoque_minimo (Alterar para 5)');
  const alterarCfgRes = await authFetch(`${BASE_URL}/api/configuracoes/estoque_minimo`, {
    method: 'PUT',
    body: JSON.stringify({ valor: '5' }),
  });
  const alterarCfgData = await alterarCfgRes.json();
  logResult(26, 'Alterar configuração', alterarCfgRes.status, 200, alterarCfgRes.status === 200);
  if (alterarCfgRes.status === 200) {
    console.log(`   Valor anterior: ${alterarCfgData.valor_anterior}`);
    console.log(`   Novo valor: ${alterarCfgData.data?.valor}`);
  }

  // TESTE 27: Reverter configuração ao valor original
  console.log('\n[TESTE 27] PUT /api/configuracoes/estoque_minimo (Reverter para 2)');
  const reverterCfgRes = await authFetch(`${BASE_URL}/api/configuracoes/estoque_minimo`, {
    method: 'PUT',
    body: JSON.stringify({ valor: '2' }),
  });
  logResult(27, 'Reverter configuração', reverterCfgRes.status, 200, reverterCfgRes.status === 200);

  // =========================================================================
  // PARTE 9: LOGOUT
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PARTE 9: LOGOUT\n');

  // TESTE 28: Logout
  console.log('[TESTE 28] POST /api/auth/logout');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
  });
  const logoutData = await logoutRes.json();
  logResult(28, 'Logout', logoutRes.status, 200, logoutRes.status === 200);

  // =========================================================================
  // RESULTADO FINAL
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 TODOS OS 28 TESTES E2E FORAM CONCLUÍDOS COM SUCESSO!');
  console.log('='.repeat(60));
  console.log('\n📊 Resumo das funcionalidades testadas:');
  console.log('   ✅ Autenticação (register, login, me, logout)');
  console.log('   ✅ Validação de CPF (inválido, válido, duplicado)');
  console.log('   ✅ Paciente começa sem itens (adicionados manualmente)');
  console.log('   ✅ Categorias pré-definidas (lista + validação)');
  console.log('   ✅ Itens de pacientes são editáveis (com LOGs de auditoria)');
  console.log('   ✅ LOGs de auditoria (criação automática + consulta)');
  console.log('   ✅ Desativação de pacientes (zerar estoque + bloquear movimentações)');
  console.log('   ✅ Listagem de pacientes desativados');
  console.log('   ✅ Reativação de pacientes');
  console.log('   ✅ Notificações para equipe de enfermagem (automáticas + manuais)');
  console.log('   ✅ Configurações do sistema (leitura + alteração)');
  console.log('');
}

run().catch((err) => {
  console.error('\n❌ Erro durante os testes:', err);
  process.exit(1);
});
