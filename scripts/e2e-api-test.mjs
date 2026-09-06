/**
 * Script de teste End-to-End das Rotas de API de Autenticação
 */

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🚀 Iniciando testes E2E dos endpoints de autenticação...\n');

  // 1. Teste de Cadastro com dados válidos
  console.log('[TESTE 1] POST /api/auth/register (Cadastro Válido)');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'João da Silva',
      email: 'joao.silva@exemplo.com.br',
      password: 'SenhaForte@2026',
    }),
  });
  const regData = await regRes.json();
  console.log(`Status: ${regRes.status} (Esperado: 201)`);
  console.log('Resposta:', JSON.stringify(regData, null, 2));
  if (regRes.status !== 201 || !regData.success) {
    throw new Error('Falha no Teste 1: Cadastro');
  }

  // 2. Teste de Cadastro com e-mail duplicado
  console.log('\n[TESTE 2] POST /api/auth/register (Tentativa com E-mail Duplicado)');
  const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'João Duplicado',
      email: 'joao.silva@exemplo.com.br',
      password: 'OutraSenha@123',
    }),
  });
  const dupData = await dupRes.json();
  console.log(`Status: ${dupRes.status} (Esperado: 409)`);
  console.log('Resposta:', JSON.stringify(dupData, null, 2));
  if (dupRes.status !== 409) {
    throw new Error('Falha no Teste 2: Conflito de email duplicado');
  }

  // 3. Teste de Validação com dados inválidos (Zod)
  console.log('\n[TESTE 3] POST /api/auth/register (Validação Zod - E-mail e Senha Inválidos)');
  const invalidRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'J',
      email: 'nao-e-um-email',
      password: '123',
    }),
  });
  const invalidData = await invalidRes.json();
  console.log(`Status: ${invalidRes.status} (Esperado: 422)`);
  console.log('Resposta:', JSON.stringify(invalidData, null, 2));
  if (invalidRes.status !== 422) {
    throw new Error('Falha no Teste 3: Validação de campos');
  }

  // 4. Teste de Login com senha errada
  console.log('\n[TESTE 4] POST /api/auth/login (Senha Incorreta)');
  const wrongLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'joao.silva@exemplo.com.br',
      password: 'SenhaTotalmenteErrada',
    }),
  });
  const wrongLoginData = await wrongLoginRes.json();
  console.log(`Status: ${wrongLoginRes.status} (Esperado: 401)`);
  console.log('Resposta:', JSON.stringify(wrongLoginData, null, 2));
  if (wrongLoginRes.status !== 401) {
    throw new Error('Falha no Teste 4: Senha errada');
  }

  // 5. Teste de Login com credenciais corretas
  console.log('\n[TESTE 5] POST /api/auth/login (Credenciais Corretas)');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'joao.silva@exemplo.com.br',
      password: 'SenhaForte@2026',
    }),
  });
  const loginData = await loginRes.json();
  const setCookieHeader = loginRes.headers.get('set-cookie');
  console.log(`Status: ${loginRes.status} (Esperado: 200)`);
  console.log('Set-Cookie Header presente?:', !!setCookieHeader ? '✅ SIM' : '❌ NÃO');
  console.log('Token JWT retornado:', loginData.token ? `${loginData.token.substring(0, 30)}...` : 'Nenhum');
  console.log('Dados do usuário:', loginData.user);
  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error('Falha no Teste 5: Login correto');
  }

  const token = loginData.token;

  // 6. Teste de rota protegida sem Token
  console.log('\n[TESTE 6] GET /api/auth/me (Sem Autenticação)');
  const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
  const unauthData = await unauthRes.json();
  console.log(`Status: ${unauthRes.status} (Esperado: 401)`);
  console.log('Resposta:', JSON.stringify(unauthData, null, 2));
  if (unauthRes.status !== 401) {
    throw new Error('Falha no Teste 6: Acesso não autenticado');
  }

  // 7. Teste de rota protegida com Token Bearer
  console.log('\n[TESTE 7] GET /api/auth/me (Com Bearer Token)');
  const authRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const authData = await authRes.json();
  console.log(`Status: ${authRes.status} (Esperado: 200)`);
  console.log('Usuário recuperado com sucesso:', authData.user);
  if (authRes.status !== 200 || authData.user.email !== 'joao.silva@exemplo.com.br') {
    throw new Error('Falha no Teste 7: Rota protegida com token');
  }

  // 8. Teste de Logout
  console.log('\n[TESTE 8] POST /api/auth/logout');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
  });
  const logoutData = await logoutRes.json();
  console.log(`Status: ${logoutRes.status} (Esperado: 200)`);
  console.log('Resposta:', JSON.stringify(logoutData, null, 2));
  if (logoutRes.status !== 200) {
    throw new Error('Falha no Teste 8: Logout');
  }

  console.log('\n=============================================');
  console.log('🎉 TODOS OS TESTES E2E FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
  console.log('=============================================');
}

run().catch((err) => {
  console.error('\n❌ Erro durante os testes:', err);
  process.exit(1);
});
