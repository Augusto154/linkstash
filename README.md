# LinkStash

Link-in-bio / hub pessoal de links pronto para rodar na internet com domínio próprio.

## Stack
- Frontend: React + Vite + TypeScript
- API: Node.js + Express + TypeScript
- Banco: PostgreSQL
- Autenticação: JWT + bcrypt
- Web server: Nginx
- HTTPS: Caddy com certificado automático Let's Encrypt
- Deploy: Docker Compose

## Produção com domínio próprio

1. No servidor que vai hospedar o LinkStash, instale Docker e Docker Compose.
2. Clone o repositório:
   `git clone https://github.com/Augusto154/linkstash.git`
3. Entre na pasta e crie o `.env`:
   `cd linkstash && cp .env.example .env`
4. Edite `.env`:
   - `DOMAIN=seu-dominio.com` ou `links.seu-dominio.com`
   - coloque uma senha forte em `POSTGRES_PASSWORD`
   - coloque uma chave aleatória forte em `JWT_SECRET`
   - ajuste `FRONTEND_URL` para `https://` + seu domínio
5. No Namecheap, crie um registro DNS `A` apontando o domínio para o IP público do servidor.
6. Garanta que as portas TCP 80 e 443 estejam liberadas no firewall/roteador e encaminhadas para o servidor.
7. Execute:
   `sudo docker compose up -d --build`
8. Aguarde o Caddy emitir o certificado HTTPS. Depois abra `https://seu-dominio.com`.

O frontend e a API ficam no mesmo domínio. A API usa `/api` e não é necessário configurar uma porta pública para o backend.

## Página pública

Depois de criar uma conta com usuário `augusto`, a página pública fica em:
`https://seu-dominio.com/u/augusto`

Os links públicos passam por `/api/go/<id>`, registram o clique e então redirecionam para o destino.

## Desenvolvimento local

Crie `.env` com valores locais e execute `sudo docker compose up --build`. Para usar o domínio real, siga o fluxo de produção acima.

## Funcionalidades
- Cadastro e login reais.
- Senhas criptografadas com bcrypt.
- Sessão JWT.
- CRUD de links por usuário.
- Página pública `/u/usuario`.
- Contagem real de cliques.
- Registro básico de analytics.
- Dashboard e análises.
- Interface responsiva.
- HTTPS automático.
- PostgreSQL persistente.

> O domínio do Namecheap fornece o DNS/domínio; o aplicativo ainda precisa estar hospedado em um servidor acessível pela internet. Não exponha PostgreSQL publicamente.
