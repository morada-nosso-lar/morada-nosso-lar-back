/**
 * ==============================================================================
 * VALIDAÇÃO DE CPF (src/lib/validations/cpf.ts)
 * ==============================================================================
 *
 * Implementa o algoritmo oficial de validação do CPF (Cadastro de Pessoa Física)
 * conforme as regras da Receita Federal do Brasil.
 *
 * O CPF possui 11 dígitos, sendo os dois últimos dígitos verificadores.
 * A validação garante que:
 *   1. O CPF tem exatamente 11 dígitos numéricos
 *   2. Não é uma sequência repetida (ex: 111.111.111-11)
 *   3. Os dígitos verificadores estão corretos conforme o algoritmo oficial
 *
 * ALGORITMO DOS DÍGITOS VERIFICADORES:
 *   - O 1º dígito verificador (posição 10) é calculado a partir dos 9 primeiros dígitos.
 *   - O 2º dígito verificador (posição 11) é calculado a partir dos 10 primeiros dígitos.
 *   - Cada dígito usa uma multiplicação ponderada e o módulo 11.
 *
 * REFERÊNCIA: Receita Federal — https://www.gov.br/receitafederal/
 */

/**
 * Remove todos os caracteres não numéricos do CPF.
 * Aceita formatos como "123.456.789-09" ou "12345678909".
 *
 * @param cpf - CPF em qualquer formato (com ou sem pontuação)
 * @returns Somente os dígitos numéricos do CPF
 */
export function sanitizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formata um CPF numérico no padrão visual "XXX.XXX.XXX-XX".
 *
 * @param cpf - CPF com 11 dígitos numéricos (já sanitizado)
 * @returns CPF formatado ou a string original se não tiver 11 dígitos
 */
export function formatCPF(cpf: string): string {
  const digits = sanitizeCPF(cpf);
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Valida se um CPF é válido conforme o algoritmo oficial da Receita Federal.
 *
 * Etapas da validação:
 *   1. Remove caracteres não numéricos (pontos e traço)
 *   2. Verifica se tem exatamente 11 dígitos
 *   3. Rejeita CPFs com todos os dígitos iguais (ex: 000.000.000-00)
 *   4. Calcula e verifica o 1º dígito verificador
 *   5. Calcula e verifica o 2º dígito verificador
 *
 * @param cpf - CPF a ser validado (aceita com ou sem formatação)
 * @returns true se o CPF for válido, false caso contrário
 */
export function isValidCPF(cpf: string): boolean {
  // 1. Remove caracteres não numéricos
  const digits = sanitizeCPF(cpf);

  // 2. Verifica se possui exatamente 11 dígitos
  if (digits.length !== 11) {
    return false;
  }

  // 3. Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  //    Esses CPFs passam no algoritmo matemático mas são inválidos na prática
  const allSameDigit = /^(\d)\1{10}$/.test(digits);
  if (allSameDigit) {
    return false;
  }

  // 4. Calcula o 1º dígito verificador (posição 10)
  //    Multiplica cada um dos 9 primeiros dígitos por pesos de 10 a 2
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  // Se o resto for 10, o dígito verificador é 0
  if (remainder === 10) remainder = 0;
  // Compara com o dígito na posição 10 (índice 9)
  if (remainder !== parseInt(digits.charAt(9), 10)) {
    return false;
  }

  // 5. Calcula o 2º dígito verificador (posição 11)
  //    Multiplica cada um dos 10 primeiros dígitos por pesos de 11 a 2
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  // Compara com o dígito na posição 11 (índice 10)
  if (remainder !== parseInt(digits.charAt(10), 10)) {
    return false;
  }

  // CPF válido!
  return true;
}
