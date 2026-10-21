# API Morada Nosso Lar

Contrato das rotas em `src/app/api/`, derivado dos handlers e dos schemas Zod em `src/lib/validations/`. Base local: `http://localhost:3000`.

O corpo de escrita usa **snake_case** (`nome_completo`, `paciente_id`). As respostas das entidades TypeORM saem em **camelCase** (`nomeCompleto`, `pacienteId`, `createdAt`). Chaves desconhecidas são descartadas pelo Zod; elas não geram erro por si só.

## Autenticação

Rotas de negócio exigem JWT de uma destas formas:

| Fonte | Valor |
| --- | --- |
| Header | `Authorization: Bearer <token>` |
| Cookie | `morada_auth_token` (HttpOnly, definido no login, validade 7 dias) |

`Content-Type: application/json` é necessário em todo POST, PUT e PATCH com corpo.

Sem token válido a rota responde **401**:

```json
{ "success": false, "error": "Acesso negado. Faça login para continuar." }
```

O middleware em `src/middleware.ts` só bloqueia páginas (`/dashboard`, `/perfil`, `/admin`). As rotas `/api/*` fazem a checagem dentro de cada handler. Login, registro e logout são públicos.

Formato comum de validação (**422**). `details` é `flatten().fieldErrors` do Zod: um objeto campo → lista de mensagens. Refinamentos do objeto inteiro (por exemplo “pelo menos um campo”) ficam em `formErrors` e **não** entram em `details`, que pode vir `{}`.

```json
{
  "success": false,
  "error": "Dados inválidos. Verifique os campos obrigatórios.",
  "details": {
    "cpf": ["O CPF é obrigatório"]
  }
}
```

JSON ilegível é **400**, não 422:

```json
{ "success": false, "error": "O corpo da requisição deve ser um JSON válido." }
```

Erro interno é **500**:

```json
{ "success": false, "error": "Erro interno ao …" }
```

## Por que Pacientes e Estoque devolvem 422

O servidor em execução registrou `POST /api/pacientes` **422** e `PUT /api/estoque/:id` **422** em dezenas de milissegundos. Esse tempo é o `safeParse` do Zod, antes de consultar o banco. `PUT /api/pacientes/60` respondeu **200** na mesma sessão, então o cliente já envia snake_case válido na edição de paciente. O 422 não é autenticação (isso seria 401) nem regra de paciente desativado (isso é 403, depois do Zod).

### POST /api/pacientes

`createPacienteSchema` exige os três campos abaixo. A edição (`updatePacienteSchema`) não exige `cpf` e foi a que passou.

| Campo | Regra que gera 422 |
| --- | --- |
| `cpf` | Ausente, não-string, menos ou mais de 11 dígitos, sequência repetida (`111.111.111-11`) ou dígitos verificadores inválidos. Pontuação é aceita e removida (`123.456.789-09`). |
| `nome_completo` | Ausente, não-string, menos de 2 ou mais de 150 caracteres. `nomeCompleto` é ignorado. |
| `data_nascimento` | Ausente ou fora de `YYYY-MM-DD` (`15/03/1950` e `1950-03-15T00:00:00.000Z` falham). Data futura também falha. |
| `observacoes_medicas` | Opcional. String com mais de 1000 caracteres falha. `null` é aceito. |

Exemplo que o schema rejeita (CPF de teste e data brasileira):

```json
{
  "nome_completo": "João da Silva",
  "data_nascimento": "15/03/1950",
  "cpf": "111.111.111-11"
}
```

```json
{
  "success": false,
  "error": "Dados inválidos. Verifique os campos obrigatórios.",
  "details": {
    "cpf": ["CPF inválido. Verifique os dígitos informados."],
    "data_nascimento": ["A data de nascimento deve estar no formato YYYY-MM-DD"]
  }
}
```

Corpo mínimo aceito:

```json
{
  "cpf": "529.982.247-25",
  "nome_completo": "João da Silva",
  "data_nascimento": "1950-03-15"
}
```

`529.982.247-25` é um CPF com dígitos verificadores corretos, útil só como exemplo de formato.

### PUT /api/estoque/:id

`updateProdutoSchema` valida só o que vier no JSON. Vários IDs (24, 25, 26, 27) falharam juntos, então a causa é o formato do corpo, não um produto específico.

| Campo enviado | Regra que gera 422 |
| --- | --- |
| `categoria` | Qualquer texto fora da lista oficial. O log de exclusão do produto 27 gravou `Analgésico / Antitérmico`, valor que **não** está em `CATEGORIAS_VALIDAS`. Reenviar a categoria lida do banco, nesse caso, devolve 422 mesmo que a quantidade seja válida. |
| `quantidade` | Precisa ser número JSON (`10`), inteiro e `>= 0`. A string `"10"` falha com “deve ser um número”. |
| `nome` | Se enviado: string de 2 a 200 caracteres. |
| `descricao` | Se enviada: no máximo 500 caracteres. `null` é aceito. |
| corpo vazio ou só chaves desconhecidas (`pacienteId`, `id`, `createdAt`) | Nenhum campo do schema fica definido. A mensagem “Pelo menos um campo deve ser informado para atualização” não aparece em `details`. |
| `paciente_id` | É removido do schema de update. Enviá-lo não causa 422 e também não troca o dono do item. |

Categorias aceitas, exatamente com estes acentos e maiúsculas: `Remédios`, `Roupas`, `Higiene Pessoal`, `Alimentos`, `Material de Limpeza`, `Materiais Médicos`, `Cama, Mesa e Banho`, `Utensílios Domésticos`, `Produtos de Enfermagem`, `Outros`.

Exemplo que passa no Zod:

```json
{ "quantidade": 4, "categoria": "Remédios" }
```

### DELETE

Não há `DELETE /api/pacientes/:id`. Desativação é `PATCH` com `acao`. Chamar DELETE nessa URL não entra no handler (405 do Next.js).

`DELETE /api/estoque/:id` não usa Zod, então não responde 422. Na sessão atual o produto 27 respondeu **500**: a relação `LogEstoque` → `Produto` está com `onDelete: 'SET NULL'`, e o PostgreSQL tenta `UPDATE logs_estoque SET produto_id = NULL` enquanto a coluna `produto_id` é `NOT NULL`.

---

## POST /api/auth/register

Cadastra usuário. Não emite JWT e não grava cookie.

**Headers:** `Content-Type: application/json`. Autenticação não é exigida.

**Body**

| Campo | Tipo | Regra |
| --- | --- | --- |
| `name` | string | obrigatório, trim, 2–100 |
| `email` | string | obrigatório, trim, minúsculas, e-mail válido |
| `password` | string | obrigatório, 6–72 caracteres |

```json
{
  "name": "Ana Souza",
  "email": "ana@example.com",
  "password": "segredo"
}
```

**201**

```json
{
  "success": true,
  "message": "Usuário cadastrado com sucesso!",
  "user": {
    "id": 1,
    "name": "Ana Souza",
    "email": "ana@example.com",
    "createdAt": "2026-10-21T15:00:00.000Z",
    "updatedAt": "2026-10-21T15:00:00.000Z"
  }
}
```

**400** JSON inválido. **422** `error`: `"Dados de cadastro inválidos"` e `details` por campo. **409** e-mail já cadastrado. **500** erro interno.

## POST /api/auth/login

Autentica e devolve o JWT no corpo e no cookie `morada_auth_token`.

**Headers:** `Content-Type: application/json`.

**Body**

| Campo | Tipo | Regra |
| --- | --- | --- |
| `email` | string | obrigatório, trim, minúsculas, e-mail válido |
| `password` | string | obrigatório, mínimo 1 caractere |

```json
{ "email": "ana@example.com", "password": "segredo" }
```

**200**

```json
{
  "success": true,
  "message": "Login realizado com sucesso!",
  "user": {
    "id": 1,
    "name": "Ana Souza",
    "email": "ana@example.com",
    "createdAt": "2026-10-21T15:00:00.000Z",
    "updatedAt": "2026-10-21T15:00:00.000Z"
  },
  "token": "<jwt>"
}
```

**400** corpo não é JSON. **422** `error`: `"Dados de login inválidos"`. **401** e-mail inexistente ou senha incorreta, com a mesma mensagem: `"Credenciais inválidas. Verifique seu e-mail e senha."`. **500** erro interno. Também existe `OPTIONS` → 200 com corpo `{}`.

## POST /api/auth/logout

Apaga o cookie. Não lê corpo nem valida JWT.

**200**

```json
{
  "success": true,
  "message": "Logout realizado com sucesso. Sessão encerrada."
}
```

## GET /api/auth/me

Devolve o usuário do token.

**Headers:** `Authorization: Bearer <token>` ou cookie `morada_auth_token`.

**200**

```json
{
  "success": true,
  "message": "Dados do usuário autenticado recuperados com sucesso.",
  "user": {
    "id": 1,
    "name": "Ana Souza",
    "email": "ana@example.com",
    "createdAt": "2026-10-21T15:00:00.000Z",
    "updatedAt": "2026-10-21T15:00:00.000Z"
  }
}
```

**401** token ausente, inválido ou expirado. **404** usuário do token não existe mais. **500** erro interno.

---

## GET /api/pacientes

Lista pacientes. Sem query, só os ativos.

**Headers:** autenticação.

**Query**

| Param | Valores | Efeito |
| --- | --- | --- |
| `ativo` | `true` (padrão), `false`, `todos` | ativos, desativados, ou todos. Qualquer outro valor cai no padrão (ativos). |

**200**

```json
{
  "success": true,
  "message": "2 paciente(s) ativo(s) encontrado(s).",
  "data": [
    {
      "id": 60,
      "cpf": "52998224725",
      "nomeCompleto": "João da Silva",
      "dataNascimento": "1950-03-15",
      "observacoesMedicas": null,
      "ativo": true,
      "dataDesativacao": null,
      "motivoDesativacao": null,
      "createdAt": "2026-10-21T15:00:00.000Z",
      "updatedAt": "2026-10-21T15:00:00.000Z"
    }
  ]
}
```

Registros antigos podem ter `cpf: null`. **401** / **500**.

## POST /api/pacientes

Cadastra paciente ativo e uma notificação `SISTEMA`. O comentário do arquivo fala em três itens padrão de estoque; o handler atual **não** cria esses itens.

**Headers:** autenticação e `Content-Type: application/json`.

**Body:** ver a tabela da seção de 422. `observacoes_medicas` é opcional (`string | null`, máximo 1000).

**201**

```json
{
  "success": true,
  "message": "Paciente cadastrado com sucesso!",
  "data": {
    "id": 61,
    "cpf": "52998224725",
    "nomeCompleto": "João da Silva",
    "dataNascimento": "1950-03-15",
    "observacoesMedicas": null,
    "ativo": true,
    "dataDesativacao": null,
    "motivoDesativacao": null,
    "createdAt": "2026-10-21T16:00:00.000Z",
    "updatedAt": "2026-10-21T16:00:00.000Z"
  }
}
```

**400** JSON inválido. **401**. **409** CPF já cadastrado (`Já existe um paciente cadastrado com o CPF …`). **422** schema. **500**.

## GET /api/pacientes/{id}

`id` é inteiro positivo, sem zeros à esquerda (`"60"` vale; `"60abc"` e `"0"` não).

**Headers:** autenticação.

**200** O paciente mais `produtos` (estoque vinculado, mais recentes primeiro).

```json
{
  "success": true,
  "message": "Paciente encontrado.",
  "data": {
    "id": 60,
    "cpf": "52998224725",
    "nomeCompleto": "João da Silva",
    "dataNascimento": "1950-03-15",
    "observacoesMedicas": null,
    "ativo": true,
    "dataDesativacao": null,
    "motivoDesativacao": null,
    "createdAt": "2026-10-21T15:00:00.000Z",
    "updatedAt": "2026-10-21T15:00:00.000Z",
    "produtos": []
  }
}
```

**400** ID inválido. **401**. **404** `"Paciente não encontrado."`. **500**.

## PUT /api/pacientes/{id}

Atualização parcial. CPF não entra no schema: se vier no JSON, é ignorado e o documento não muda. Paciente desativado não pode ser editado.

**Headers:** autenticação e `Content-Type: application/json`.

**Path:** `id` inteiro positivo.

**Body** (pelo menos um campo)

| Campo | Tipo | Regra |
| --- | --- | --- |
| `nome_completo` | string | opcional, trim, 2–150 |
| `data_nascimento` | string | opcional, `YYYY-MM-DD`, data real, não futura |
| `observacoes_medicas` | string ou null | opcional, máximo 1000 |

```json
{
  "nome_completo": "João da Silva Santos",
  "observacoes_medicas": "Hipertenso"
}
```

**200**

```json
{
  "success": true,
  "message": "Paciente atualizado com sucesso!",
  "data": {
    "id": 60,
    "cpf": "52998224725",
    "nomeCompleto": "João da Silva Santos",
    "dataNascimento": "1950-03-15",
    "observacoesMedicas": "Hipertenso",
    "ativo": true,
    "dataDesativacao": null,
    "motivoDesativacao": null,
    "createdAt": "2026-10-21T15:00:00.000Z",
    "updatedAt": "2026-10-21T16:10:00.000Z"
  }
}
```

**400** ID ou JSON inválido. **401**. **403** paciente desativado. **404**. **422** campo fora da regra, ou nenhum campo reconhecido. **500**.

## PATCH /api/pacientes/{id}

Desativa (zera quantidades do estoque daquele paciente, grava logs `ESTOQUE_ZERADO` e notificação) ou reativa. Não existe DELETE.

**Headers:** autenticação e `Content-Type: application/json`.

**Path:** `id` inteiro positivo.

**Body para desativar**

| Campo | Tipo | Regra |
| --- | --- | --- |
| `acao` | string | obrigatório, exatamente `desativar` |
| `motivo` | string | obrigatório, trim, 5–500 |

```json
{
  "acao": "desativar",
  "motivo": "Transferido para outra instituição"
}
```

**Body para reativar**

```json
{ "acao": "reativar" }
```

**200 desativar**

```json
{
  "success": true,
  "message": "Paciente \"João da Silva\" desativado com sucesso. 2 item(ns) de estoque zerado(s).",
  "data": {
    "id": 60,
    "ativo": false,
    "dataDesativacao": "2026-10-21T16:20:00.000Z",
    "motivoDesativacao": "Transferido para outra instituição"
  }
}
```

**200 reativar:** `message` termina em `reativado com sucesso!` e os campos de desativação voltam a `null`.

**400** ID ou JSON inválido. **401**. **404**. **409** já desativado ou já ativo. **422** se `acao` não for `desativar` ou `reativar` (sem `details`), ou se `motivo` falhar no schema (`error`: `"Dados inválidos para desativação."`). **500**.

---

## GET /api/estoque

**Headers:** autenticação.

**Query** (todas opcionais; ID inválido é ignorado)

| Param | Efeito |
| --- | --- |
| `paciente_id` | inteiro positivo: só itens daquele paciente |
| `geral` | `true`: só estoque geral (`pacienteId` null). Se vier junto com `paciente_id`, este filtro prevalece. |
| `categoria` | igualdade exata com o texto salvo |

**200**

```json
{
  "success": true,
  "message": "1 produto(s) encontrado(s).",
  "data": [
    {
      "id": 27,
      "nome": "Dipirona Sódica 500mg",
      "categoria": "Remédios",
      "quantidade": 1,
      "descricao": null,
      "pacienteId": null,
      "createdAt": "2026-10-21T15:00:00.000Z",
      "updatedAt": "2026-10-21T15:00:00.000Z"
    }
  ]
}
```

**401** / **500**.

## POST /api/estoque

Cadastra produto, grava log `CRIACAO`. Se `quantidade <= 2`, também cria alerta e notificação `ESTOQUE_BAIXO`. O limite 2 está fixo no handler; a configuração `estoque_minimo` não altera esta rota.

**Headers:** autenticação e `Content-Type: application/json`.

**Body**

| Campo | Tipo | Regra |
| --- | --- | --- |
| `nome` | string | obrigatório, trim, 2–200 |
| `categoria` | string | obrigatório, um dos 10 valores oficiais |
| `quantidade` | number | obrigatório, inteiro `>= 0`. Não aceita string. |
| `descricao` | string ou null | opcional, máximo 500 |
| `paciente_id` | number ou null | opcional, inteiro positivo. Omitido ou `null` = estoque geral. |

```json
{
  "nome": "Dipirona Sódica 500mg",
  "categoria": "Remédios",
  "quantidade": 10,
  "descricao": "Caixa com 20 comprimidos",
  "paciente_id": null
}
```

**201** `data` é o produto; `alerta` é o registro criado ou `null`.

```json
{
  "success": true,
  "message": "Produto cadastrado com sucesso!",
  "data": {
    "id": 28,
    "nome": "Dipirona Sódica 500mg",
    "categoria": "Remédios",
    "quantidade": 10,
    "descricao": "Caixa com 20 comprimidos",
    "pacienteId": null,
    "createdAt": "2026-10-21T16:30:00.000Z",
    "updatedAt": "2026-10-21T16:30:00.000Z"
  },
  "alerta": null
}
```

**400** JSON inválido. **401**. **403** paciente desativado. **404** `paciente_id` inexistente. **422** categoria fora da lista, quantidade como string, nome curto, etc. **500**.

## GET /api/estoque/{id}

**Headers:** autenticação. **Path:** `id` inteiro positivo.

**200**

```json
{
  "success": true,
  "message": "Produto encontrado.",
  "data": {
    "id": 28,
    "nome": "Dipirona Sódica 500mg",
    "categoria": "Remédios",
    "quantidade": 10,
    "descricao": "Caixa com 20 comprimidos",
    "pacienteId": null,
    "createdAt": "2026-10-21T16:30:00.000Z",
    "updatedAt": "2026-10-21T16:30:00.000Z"
  }
}
```

**400** / **401** / **404** `"Produto não encontrado."` / **500**.

## PUT /api/estoque/{id}

Atualização parcial de `nome`, `categoria`, `quantidade` e `descricao`. Não altera `paciente_id`. Grava log por campo realmente modificado. Quantidade resultante `<= 2` gera alerta e notificação. Item de paciente desativado responde 403 **depois** do Zod.

**Headers:** autenticação e `Content-Type: application/json`.

**Path:** `id` inteiro positivo.

**Body:** os mesmos tipos do POST, todos opcionais, pelo menos um presente. Ver a tabela de 422.

```json
{ "quantidade": 4 }
```

**200**

```json
{
  "success": true,
  "message": "Produto atualizado com sucesso!",
  "data": {
    "id": 28,
    "nome": "Dipirona Sódica 500mg",
    "categoria": "Remédios",
    "quantidade": 4,
    "descricao": "Caixa com 20 comprimidos",
    "pacienteId": null,
    "createdAt": "2026-10-21T16:30:00.000Z",
    "updatedAt": "2026-10-21T16:40:00.000Z"
  },
  "alerta": null,
  "logs_gerados": 1
}
```

**400** ID ou JSON inválido. **401**. **403** paciente do item está desativado. **404**. **422** categoria legado, quantidade string, ou nenhum campo do schema. **500**.

## DELETE /api/estoque/{id}

Remove o produto. Não tem body. Grava log `EXCLUSAO` e em seguida apaga a linha.

**Headers:** autenticação. **Path:** `id` inteiro positivo.

**200** esperado pelo handler:

```json
{
  "success": true,
  "message": "Produto \"Dipirona Sódica 500mg\" excluído com sucesso."
}
```

**400** / **401** / **403** paciente desativado / **404**. **500** hoje, quando já existe log daquele produto: o `ON DELETE SET NULL` da FK `logs_estoque.produto_id` conflita com a coluna `NOT NULL`. Não é 422.

---

## GET /api/estoque/alertas

**Headers:** autenticação.

**Query:** `lido=true` ou `lido=false`. Outro valor lista todos.

**200**

```json
{
  "success": true,
  "message": "1 alerta(s) encontrado(s).",
  "data": [
    {
      "id": 1,
      "produtoId": 28,
      "produtoNome": "Dipirona Sódica 500mg",
      "quantidade": 1,
      "mensagem": "⚠️ ALERTA: O produto \"Dipirona Sódica 500mg\" atingiu 1 unidade(s).",
      "lido": false,
      "createdAt": "2026-10-21T16:40:00.000Z"
    }
  ]
}
```

**401** / **500**.

## GET /api/estoque/alertas/{id}

**Headers:** autenticação. **Path:** `id` inteiro positivo.

**200** `{ "success": true, "message": "Alerta encontrado.", "data": { } }` com o mesmo objeto do item acima.

**400** / **401** / **404** `"Alerta não encontrado."` / **500**.

## PATCH /api/estoque/alertas/{id}

**Headers:** autenticação e `Content-Type: application/json`.

**Body:** `{ "lido": true }` ou `{ "lido": false }`. Precisa ser booleano JSON, não `"true"`.

**200**

```json
{
  "success": true,
  "message": "Alerta marcado como lido.",
  "data": { "id": 1, "lido": true }
}
```

**400** ID ou JSON inválido. **401**. **404**. **422** sem `details`: `"O campo \"lido\" é obrigatório e deve ser true ou false."`. **500**.

## GET /api/estoque/logs

**Headers:** autenticação.

**Query** (opcionais; IDs inválidos são ignorados)

| Param | Efeito |
| --- | --- |
| `produto_id` | inteiro positivo |
| `paciente_id` | inteiro positivo |
| `acao` | comparado em maiúsculas: `CRIACAO`, `ATUALIZACAO_QTD`, `ATUALIZACAO_DADOS`, `EXCLUSAO`, `ESTOQUE_ZERADO`, `ITEM_INICIAL` |
| `usuario_id` | inteiro positivo |
| `limite` | padrão 100, máximo aceito 500. Fora disso, permanece 100. |

**200**

```json
{
  "success": true,
  "message": "1 log(s) encontrado(s).",
  "data": [
    {
      "id": 2,
      "produtoId": 27,
      "pacienteId": null,
      "usuarioId": 4,
      "usuarioNome": "Adiministrador",
      "acao": "EXCLUSAO",
      "campoAlterado": null,
      "valorAnterior": "Dipirona Sódica 500mg | Categoria: Analgésico / Antitérmico | Qtd: 1",
      "valorNovo": null,
      "descricao": "Produto \"Dipirona Sódica 500mg\" excluído do estoque.",
      "createdAt": "2026-10-21T16:03:15.658Z"
    }
  ]
}
```

**401** / **500**.

## GET /api/categorias

**Headers:** autenticação.

**200**

```json
{
  "success": true,
  "message": "10 categoria(s) disponível(is).",
  "data": [
    "Remédios",
    "Roupas",
    "Higiene Pessoal",
    "Alimentos",
    "Material de Limpeza",
    "Materiais Médicos",
    "Cama, Mesa e Banho",
    "Utensílios Domésticos",
    "Produtos de Enfermagem",
    "Outros"
  ]
}
```

**401**.

---

## GET /api/notificacoes

**Headers:** autenticação.

**Query**

| Param | Efeito |
| --- | --- |
| `lida` | `true` ou `false`. Outro valor não filtra. |
| `tipo` | igualdade após `toUpperCase()` (`ESTOQUE_BAIXO`, `PACIENTE_DESATIVADO`, `PACIENTE_ATIVADO`, `SISTEMA`) |
| `limite` | padrão 50, máximo aceito 200 |

**200** inclui `nao_lidas` (contagem global de não lidas, sem o filtro da lista).

```json
{
  "success": true,
  "message": "1 notificação(ões) encontrada(s).",
  "data": [
    {
      "id": 1,
      "tipo": "SISTEMA",
      "titulo": "Novo paciente cadastrado: João da Silva",
      "mensagem": "O paciente \"João da Silva\" foi cadastrado no sistema.",
      "destinatarioId": null,
      "referenciaTipo": "paciente",
      "referenciaId": 61,
      "lida": false,
      "createdAt": "2026-10-21T16:00:00.000Z"
    }
  ],
  "nao_lidas": 1
}
```

**401** / **500**.

## POST /api/notificacoes

**Headers:** autenticação e `Content-Type: application/json`.

**Body**

| Campo | Tipo | Regra |
| --- | --- | --- |
| `titulo` | string | obrigatório, trim, 3–200 |
| `mensagem` | string | obrigatório, trim, 5–2000 |
| `tipo` | string | opcional, máximo 50, padrão `SISTEMA` |
| `destinatario_id` | number ou null | opcional, inteiro positivo. `null` ou omitido = broadcast. |

```json
{
  "titulo": "Reunião de equipe",
  "mensagem": "Reunião amanhã às 14h na sala de enfermagem.",
  "tipo": "SISTEMA",
  "destinatario_id": null
}
```

**201**

```json
{
  "success": true,
  "message": "Notificação enviada com sucesso!",
  "data": {
    "id": 2,
    "tipo": "SISTEMA",
    "titulo": "Reunião de equipe",
    "mensagem": "Reunião amanhã às 14h na sala de enfermagem.",
    "destinatarioId": null,
    "referenciaTipo": null,
    "referenciaId": null,
    "lida": false,
    "createdAt": "2026-10-21T17:00:00.000Z"
  }
}
```

**400** / **401** / **422** / **500**.

## GET /api/notificacoes/{id}

**Headers:** autenticação. **Path:** `id` inteiro positivo.

**200** `{ "success": true, "message": "Notificação encontrada.", "data": { } }`.

**400** / **401** / **404** `"Notificação não encontrada."` / **500**.

## PATCH /api/notificacoes/{id}

**Body:** `{ "lida": true }` ou `{ "lida": false }` (booleano JSON).

**200**

```json
{
  "success": true,
  "message": "Notificação marcada como lida.",
  "data": { "id": 2, "lida": true }
}
```

**400** / **401** / **404**. **422** `"O campo \"lida\" é obrigatório e deve ser true ou false."`. **500**.

---

## GET /api/configuracoes

**Headers:** autenticação. Sem registros, cria os cinco padrões e devolve a lista.

Chaves padrão: `estoque_minimo` (`"2"`), `nome_instituicao` (`"Morada Nosso Lar"`), `notificacoes_ativas` (`"true"`), `itens_padrao_paciente` (`"3"`), `permitir_exclusao_estoque_geral` (`"true"`). Valores são sempre string.

**200**

```json
{
  "success": true,
  "message": "5 configuração(ões) encontrada(s).",
  "data": [
    {
      "id": 1,
      "chave": "estoque_minimo",
      "valor": "2",
      "descricao": "Quantidade mínima de estoque antes de gerar alerta automático.",
      "createdAt": "2026-10-21T15:00:00.000Z",
      "updatedAt": "2026-10-21T15:00:00.000Z"
    }
  ]
}
```

**401** / **500**.

## POST /api/configuracoes

Sem body. Cria apenas chaves padrão que ainda não existem; não sobrescreve valores já gravados.

**Headers:** autenticação.

**200**

```json
{
  "success": true,
  "message": "Configurações inicializadas com sucesso. 0 nova(s) criada(s). 5 configuração(ões) no total.",
  "data": []
}
```

**401** / **500**.

## GET /api/configuracoes/{chave}

**Headers:** autenticação. **Path:** `chave` não vazia (`estoque_minimo`).

**200** `{ "success": true, "message": "Configuração encontrada.", "data": { "chave": "estoque_minimo", "valor": "2" } }`.

**400** chave vazia. **401**. **404** `"Configuração \"…\" não encontrada."`. **500**.

## PUT /api/configuracoes/{chave}

**Headers:** autenticação e `Content-Type: application/json`.

**Body:** `{ "valor": "5" }`. `valor` é string não vazia após trim. Número JSON (`5`) é 422.

**200**

```json
{
  "success": true,
  "message": "Configuração \"estoque_minimo\" atualizada com sucesso.",
  "data": { "id": 1, "chave": "estoque_minimo", "valor": "5" },
  "valor_anterior": "2"
}
```

**400** chave vazia ou JSON inválido. **401**. **404**. **422** valor ausente, não-string, ou string em branco. **500**.
