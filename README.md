# ⚙️ Morada Nosso Lar — API Backend

Repositório destinado ao desenvolvimento da API e regras de negócio do sistema **Morada Nosso Lar**.

---

## 🚧 Status: Arquitetura em Definição

As tecnologias base deste repositório (Linguagem, Framework e Banco de Dados) ainda estão em fase de avaliação pelo grupo. 

**Algumas tecnologias no nosso radar:**
* **Linguagem / Framework:** *A definir (ex: Node.js com Express, Java com Spring Boot, etc.)*
* **Banco de Dados:** *A definir (ex: PostgreSQL, MySQL, etc.)*

---

## 📌 Escopo e Regras de Negócio Previstas

A API será responsável por fornecer a inteligência do sistema, incluindo:
* Gerenciar a autenticação e permissões dos cuidadores.
* Fornecer endpoints RESTful para o controle de cadastro de pacientes e inventário de suprimentos/medicamentos.
* **Motor de Notificação:** Monitorar os itens e, sempre que o estoque de um paciente atingir `quantidade <= 3`, disparar um alerta/e-mail automático para a equipe.

*(As instruções de instalação, dependências e execução local serão adicionadas aqui assim que a arquitetura for definida).*