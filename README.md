# 🏢 Morada Nosso Lar - Backend de Autenticação (Next.js)

Backend robusto e seguro de autenticação construído com **Next.js (App Router Route Handlers)**, **Bcrypt**, **JWT (JSON Web Tokens)**, **Zod** e **Cookies HttpOnly**.

---

## 🚀 Como Executar o Projeto

### 1. Instalar as dependências:
```bash
npm install
```

### 2. Configurar variáveis de ambiente:
O arquivo `.env.local` já está configurado por padrão. Caso queira personalizar, use o modelo `.env.example`:
```bash
JWT_SECRET="sua_chave_secreta_aqui"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
```

### 3. Iniciar o servidor de desenvolvimento:
```bash
npm run dev
```
O servidor estará rodando em [http://localhost:3000](http://localhost:3000).

### 4. Executar os testes automatizados da API:
Com o servidor rodando em outro terminal, execute:
```bash
npm run test:auth
```

---

## 📡 Endpoints da API

| Método | Rota | Descrição | Protegido? |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Cria uma nova conta com senha em hash Bcrypt | Não |
| `POST` | `/api/auth/login` | Autentica o usuário e emite Cookie HttpOnly + Token JWT | Não |
| `GET` | `/api/auth/me` | Retorna os dados do usuário autenticado | **Sim** |
| `POST` | `/api/auth/logout` | Encerra a sessão e apaga o cookie HttpOnly | Não |

---

## 📖 Documentação Detalhada

Para uma explicação didática sobre o que cada biblioteca faz (Bcrypt, JWT, Zod, Route Handlers, Cookies HttpOnly):
👉 Consulte o arquivo [DOCS_AUTENTICACAO.md](./DOCS_AUTENTICACAO.md).
