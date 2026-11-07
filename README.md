# 🏢 Morada Nosso Lar - Backend & Sistema de Gestão (Next.js)

Backend robusto construído com **Next.js 16 (App Router Route Handlers)**, **Neon PostgreSQL (Serverless via WebSocket)**, **TypeORM**, **Bcrypt**, **JWT (JSON Web Tokens)** e **Zod**.

---

## 🚀 Como Executar o Projeto

### 1. Instalar as dependências:
```bash
npm install
```

### 2. Configurar variáveis de ambiente:
Crie ou edite o arquivo `.env.local` com base no modelo `.env.example`:
```bash
JWT_SECRET="sua_chave_secreta_aqui"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

### 3. Iniciar o servidor de desenvolvimento:
```bash
npm run dev
```
O servidor estará rodando em [http://localhost:3000](http://localhost:3000).

### 4. Executar os testes automatizados da API:
Com o servidor rodando em outro terminal, você pode rodar os testes:
```bash
# Executa todos os testes E2E do sistema (Autenticação, Pacientes, Estoque, Logs, etc.):
npm run test:auth

# Executa o teste focado de Estoque Mínimo Personalizado e Alertas Reativos:
node scripts/e2e-estoque-test.mjs
```

---

## 📡 Endpoints da API

### 🔐 Autenticação
| Método | Rota | Descrição | Protegido? |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Cria uma nova conta de usuário | Não |
| `POST` | `/api/auth/login` | Autentica o usuário e emite Cookie HttpOnly + Token JWT | Não |
| `GET` | `/api/auth/me` | Retorna os dados do usuário autenticado | **Sim** |
| `POST` | `/api/auth/logout` | Encerra a sessão e apaga o cookie HttpOnly | Não |

### 📦 Estoque & Suprimentos
| Método | Rota | Descrição | Protegido? |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/estoque` | Lista todos os produtos (suporta filtros: `?categoria=X`, `?paciente_id=Y`, `?geral=true`) | **Sim** |
| `POST` | `/api/estoque` | Cadastra novo produto com **estoque mínimo personalizado** (`estoque_minimo`) | **Sim** |
| `GET` | `/api/estoque/:id` | Retorna detalhes de um produto específico | **Sim** |
| `PUT` | `/api/estoque/:id` | Atualiza produto (nome, categoria, quantidade, estoque mínimo, etc.) | **Sim** |
| `PATCH` | `/api/estoque/:id` | **Salvamento automático rápido** (permite atualizar estoque mínimo ou quantidade dinamicamente) | **Sim** |
| `DELETE`| `/api/estoque/:id` | Remove produto do estoque com registro de auditoria | **Sim** |

### ⚠️ Alertas de Estoque Baixo
| Método | Rota | Descrição | Protegido? |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/estoque/alertas` | Lista histórico de alertas disparados (suporta `?lido=true` ou `?lido=false`) | **Sim** |
| `GET` | `/api/estoque/alertas/:id` | Consulta dados de um alerta específico | **Sim** |
| `PATCH`| `/api/estoque/alertas/:id` | Marca alerta como lido/resolvido ou reverte | **Sim** |

### 📋 Auditoria & Logs de Estoque
| Método | Rota | Descrição | Protegido? |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/estoque/logs` | Consulta a trilha de auditoria completa (quem alterou, o que alterou, valores antes/depois) | **Sim** |

### 🏥 Pacientes
| Método | Rota | Descrição | Protegido? |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/pacientes` | Lista pacientes (suporta `?ativo=true`, `?ativo=false` ou `?ativo=todos`) | **Sim** |
| `POST` | `/api/pacientes` | Cadastra novo paciente com CPF validado | **Sim** |
| `GET` | `/api/pacientes/:id` | Retorna dados completos do paciente com histórico e itens vinculados | **Sim** |
| `PUT` | `/api/pacientes/:id` | Atualiza dados cadastrais do paciente | **Sim** |
| `PATCH`| `/api/pacientes/:id` | Desativa paciente (zerando estoque) ou reativa | **Sim** |

### 🔔 Notificações da Equipe
| Método | Rota | Descrição | Protegido? |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/notificacoes` | Lista notificações do sistema e da equipe de enfermagem | **Sim** |
| `POST` | `/api/notificacoes` | Envia uma nova notificação para a equipe | **Sim** |
| `PATCH`| `/api/notificacoes/:id` | Marca notificação como lida | **Sim** |
| `DELETE`| `/api/notificacoes/:id` | Remove uma notificação | **Sim** |

### ⚙️ Configurações Gerais
| Método | Rota | Descrição | Protegido? |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/configuracoes` | Lista configurações gerais do sistema | **Sim** |
| `POST` | `/api/configuracoes` | Inicializa configurações padrão se necessário | **Sim** |
| `GET` | `/api/configuracoes/:chave` | Busca configuração específica por chave | **Sim** |
| `PUT` | `/api/configuracoes/:chave` | Atualiza o valor de uma configuração | **Sim** |

---

## 🎯 Regras de Negócio de Estoque Mínimo Personalizado

1. **Estoque Mínimo Individual**:
   * Cada item possui seu próprio campo `estoque_minimo` (ex: pomada = 5, medicamento = 20, fralda = 50).
   * O administrador pode definir e alterar a qualquer momento.

2. **Salvamento Automático**:
   * Modificações no estoque mínimo através do painel ou do endpoint `PATCH /api/estoque/:id` são salvas imediatamente sem necessidade de formulários adicionais.

3. **Alertas Dinâmicos e Reativos**:
   * Disparam alertas e notificações automáticas se a `quantidade <= estoque_minimo`.
   * Se o estoque mínimo for elevado e a quantidade atual estiver abaixo do novo limite, o alerta é gerado instantaneamente no momento da alteração.
   * Não importa quantas vezes o estoque mínimo for ajustado, os alertas sempre acompanharão fielmente a configuração atualizada.

4. **Auditoria (`LogEstoque`)**:
   * Todas as modificações no estoque mínimo geram um registro imutável com usuário responsável, valor anterior e novo valor.
