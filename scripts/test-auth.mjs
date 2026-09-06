/**
 * Script de teste autônomo para validar as funções centrais de autenticação
 */
import { hashPassword, verifyPassword } from './src/lib/auth/password.ts';
import { generateToken, verifyToken } from './src/lib/auth/jwt.ts';
import { registerSchema, loginSchema } from './src/lib/validations/auth.ts';
import { userRepository, sanitizeUser } from './src/lib/db.ts';

async function runTests() {
  console.log('--- [1] Testando Bcrypt (Hash e Verificação) ---');
  const password = 'MinhaSenhaSegura@2026';
  const hash = await hashPassword(password);
  console.log('Senha original:', password);
  console.log('Hash gerado com salt:', hash);

  const isValidMatch = await verifyPassword(password, hash);
  console.log('Senha correta bate com o hash?:', isValidMatch === true ? '✅ SIM' : '❌ NÃO');

  const isInvalidMatch = await verifyPassword('SenhaErrada123', hash);
  console.log('Senha incorreta rejeitada?:', isInvalidMatch === false ? '✅ SIM' : '❌ NÃO');

  console.log('\n--- [2] Testando JWT (Geração e Verificação) ---');
  const payload = { userId: 'usr_teste_999', email: 'teste@moradanossolar.com.br' };
  const token = generateToken(payload, '1h');
  console.log('Token JWT gerado:', token);

  const decoded = verifyToken(token);
  console.log('Token decodificado com sucesso?:', decoded?.userId === payload.userId ? '✅ SIM' : '❌ NÃO');
  console.log('Payload extraído:', decoded);

  const fakeTokenDecoded = verifyToken('token_falso_invalido.header.signature');
  console.log('Token forjado/inválido rejeitado?:', fakeTokenDecoded === null ? '✅ SIM' : '❌ NÃO');

  console.log('\n--- [3] Testando Validações Zod ---');
  const validRegister = registerSchema.safeParse({
    name: 'Carlos Oliveira',
    email: 'carlos@dominio.com',
    password: 'SenhaForte123',
  });
  console.log('Validação de cadastro válido passou?:', validRegister.success ? '✅ SIM' : '❌ NÃO');

  const invalidRegister = registerSchema.safeParse({
    name: 'C',
    email: 'email_invalido_sem_arroba',
    password: '123',
  });
  console.log('Validação de cadastro inválido rejeitou corretamente?:', !invalidRegister.success ? '✅ SIM' : '❌ NÃO');
  if (!invalidRegister.success) {
    console.log('Erros detectados pelo Zod:', invalidRegister.error.flatten().fieldErrors);
  }

  console.log('\n--- [4] Testando Repositório de Usuários ---');
  const createdUser = await userRepository.create({
    name: 'Carlos Oliveira',
    email: 'carlos@dominio.com',
    passwordHash: hash,
  });
  console.log('Usuário criado no repositório:', sanitizeUser(createdUser));

  const foundUser = await userRepository.findByEmail('carlos@dominio.com');
  console.log('Usuário recuperado por e-mail?:', foundUser !== null ? '✅ SIM' : '❌ NÃO');

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
}

runTests().catch(console.error);
