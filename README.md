# LinkStash

Hub pessoal de links com autenticação, gerenciamento de links e analytics.

## Stack
- Frontend: React + Vite + TypeScript
- API: Node.js + Express + TypeScript
- Banco: PostgreSQL
- Autenticação: JWT + bcrypt
- Deploy local: Docker Compose

## Executar
1. Copie `.env.example` para `.env` e altere os segredos.
2. Execute `docker compose up --build`.
3. Frontend: `http://localhost:3000`.
4. API: `http://localhost:5000/api/health`.

## Funcionalidades
- Cadastro e login reais com senha criptografada.
- Sessão JWT.
- CRUD de links por usuário.
- Perfil do usuário.
- Dashboard com total de links e cliques.
- Interface responsiva para desktop e celular.

> Para produção, use HTTPS, segredos fortes e não exponha PostgreSQL publicamente.
