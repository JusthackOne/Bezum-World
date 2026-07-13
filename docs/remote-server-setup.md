# Deploying Bezum World to a New Remote Server

This runbook describes a production deployment from a clean Ubuntu Server 26.04 LTS host without a domain name. Server provisioning is performed once over SSH. Every subsequent application deployment is performed automatically by GitHub Actions after a successful push to `main`. The application is available directly through the server's public IPv4 address, with Nginx proxying the frontend and backend over HTTP.

The examples use:

- server address: `SERVER_PUBLIC_IPV4`;
- repository: `git@github.com:OWNER/bezum-world.git`;
- application directory: `/opt/bezum-world`;
- Linux user: `deploy-bezum-world`.

Replace all of these values with real ones. Commands prefixed with `sudo` are executed on the server.

## 1. Resulting architecture

```text
Internet
   |
   | 80
   v
Nginx (HTTP by public IP)
   |-- /                         -> Next.js, 127.0.0.1:3000
   |-- /api/                     -> NestJS, 127.0.0.1:3001
   |-- /uploads/                 -> NestJS, 127.0.0.1:3001
   `-- /docs and /docs/          -> NestJS Swagger, 127.0.0.1:3001

Docker Compose
   |-- frontend
   |-- backend
   |-- PostgreSQL (internal network and persistent volume)
   `-- Redis (internal network and persistent volume)
```

Recommended minimum server size for the current stack is 2 CPU cores, 4 GB RAM, 30 GB SSD, and an x86_64 or arm64 Ubuntu Server 26.04 LTS image. A 2 GB host may run the project, but Docker builds can run out of memory.

## 2. Record and verify the server IP address

Copy the public IPv4 address from the hosting provider panel. The examples call it `SERVER_PUBLIC_IPV4`, for example `203.0.113.10`.

From the local computer, verify that the server is reachable:

```bash
ping SERVER_PUBLIC_IPV4
ssh root@SERVER_PUBLIC_IPV4
```

Some providers block ICMP, so a failed `ping` is not a problem when SSH works. If the provider assigns a dynamic IP, reserve a static IP before deployment; otherwise the frontend API address will stop working after an IP change.

## 3. First SSH login and a deployment user

Connect using the initial account supplied by the hosting provider:

```bash
ssh root@SERVER_PUBLIC_IPV4
```

Create a non-root user and grant administrative access:

```bash
adduser deploy-bezum-world
usermod -aG sudo deploy-bezum-world
install -d -m 700 -o deploy-bezum-world -g deploy-bezum-world /home/deploy-bezum-world/.ssh
```

On the local computer, print the public SSH key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy that one-line public key to the server:

```bash
sudo -u deploy-bezum-world nano /home/deploy-bezum-world/.ssh/authorized_keys
chmod 600 /home/deploy-bezum-world/.ssh/authorized_keys
chown deploy-bezum-world:deploy-bezum-world /home/deploy-bezum-world/.ssh/authorized_keys
```

Open a second terminal and verify the new login before closing the root session:

```bash
ssh deploy-bezum-world@SERVER_PUBLIC_IPV4
sudo whoami
```

The last command must print `root`.

After key login is confirmed, optional SSH hardening can be placed in `/etc/ssh/sshd_config.d/99-hardening.conf`:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Validate and reload SSH without terminating the current connection:

```bash
sudo sshd -t
sudo systemctl reload ssh
```

Never disable password login until key login works in a separate session.

## 4. Base operating-system setup

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl git nano nginx ufw fail2ban openssl
sudo timedatectl set-timezone Europe/Moscow
sudo systemctl enable --now nginx fail2ban
```

Configure the firewall while keeping the active SSH port open:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx HTTP'
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
sudo ufw status verbose
```

Only SSH and HTTP should be public. PostgreSQL, Redis, ports `3000`, and `3001` must not be exposed to the Internet.

## 5. Install Docker Engine and Compose

Use Docker's official APT repository:

```bash
sudo apt remove -y docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc || true
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Create Docker's APT source using the server's actual Ubuntu codename and CPU architecture:

```bash
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

Install and start Docker:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker deploy-bezum-world
```

Log out and reconnect so the new group is applied:

```bash
exit
ssh deploy-bezum-world@SERVER_PUBLIC_IPV4
docker version
docker compose version
docker run --rm hello-world
```

Membership in the `docker` group is effectively root access. Add only trusted administrators.

Official references: [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/) and [Docker Compose plugin](https://docs.docker.com/compose/install/linux/).

## 6. Prepare the server for GitHub Actions

Create an empty application directory owned by the deployment user. GitHub Actions will clone the repository into it during the first deployment:

```bash
sudo mkdir -p /opt/bezum-world
sudo chown deploy-bezum-world:deploy-bezum-world /opt/bezum-world
```

The current `deploy.sh` checks and installs base packages on every run and therefore invokes `sudo`. Because GitHub Actions cannot type a sudo password, allow only the exact commands used by the script:

```bash
sudo visudo -f /etc/sudoers.d/bezum-world-deploy
```

Add:

```sudoers
Cmnd_Alias BEZUM_DEPLOY = /usr/bin/apt-get update -y, \
    /usr/bin/apt-get install -y ca-certificates curl git, \
    /usr/bin/apt-get install -y docker-compose-plugin, \
    /usr/bin/mkdir -p /opt/bezum-world, \
    /usr/bin/chown -R deploy-bezum-world\:deploy-bezum-world /opt/bezum-world
deploy-bezum-world ALL=(root) NOPASSWD: BEZUM_DEPLOY
```

Validate it:

```bash
sudo visudo -cf /etc/sudoers.d/bezum-world-deploy
sudo -l -U deploy-bezum-world
```

Docker must already be installed using section 5. Otherwise `deploy.sh` can fall back to a privileged shell command that is intentionally not included in this sudo policy.

### Repository access from the server

For a public repository, no additional Git credentials are required. Set the later `REPO_URL` secret to:

```text
https://github.com/OWNER/bezum-world.git
```

For a private repository, create a separate read-only key on the server while logged in as `deploy-bezum-world`:

```bash
ssh-keygen -t ed25519 -C "bezum-world-repository-read" -f ~/.ssh/bezum_world_repository -N ""
cat ~/.ssh/bezum_world_repository.pub
```

Add the public key in GitHub under **Repository -> Settings -> Deploy keys -> Add deploy key**. Do not enable write access. Then create `~/.ssh/config` on the server:

```text
Host github-bezum-world
    HostName github.com
    User git
    IdentityFile ~/.ssh/bezum_world_repository
    IdentitiesOnly yes
```

Apply permissions and test access:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/config ~/.ssh/bezum_world_repository
ssh-keyscan -H github.com >> ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts
ssh -T git@github-bezum-world
```

GitHub normally prints a successful-authentication message followed by a notice that shell access is unavailable. Use this value for the later `REPO_URL` secret:

```text
git@github-bezum-world:OWNER/bezum-world.git
```

Do not clone manually. The `Deploy VPS` workflow performs the initial clone and all later pulls.

## 7. Restrict application ports to localhost in the repository

Docker-published ports can bypass UFW rules. Before deploying, ensure `docker-compose.prod.yml` binds the two application ports explicitly to loopback:

```yaml
backend:
  # ...
  ports:
    - "127.0.0.1:3001:3000"

frontend:
  # ...
  ports:
    - "127.0.0.1:3000:3000"
```

Do not add `ports` to PostgreSQL or Redis. Commit this change locally; do not edit only the server copy and do not push it until GitHub secrets are configured in section 9:

```bash
git add docker-compose.prod.yml
git commit -m "chore: restrict production ports to localhost"
```

## 8. Create the GitHub Actions SSH key

On a trusted local computer, generate a dedicated key used only by GitHub Actions to connect to this VPS:

```bash
ssh-keygen -t ed25519 -C "bezum-world-github-actions" -f ./bezum_world_actions -N ""
```

Print the public key:

```bash
cat ./bezum_world_actions.pub
```

Append that public key as a new line to `/home/deploy-bezum-world/.ssh/authorized_keys` on the server:

```bash
sudo -u deploy-bezum-world nano /home/deploy-bezum-world/.ssh/authorized_keys
chmod 600 /home/deploy-bezum-world/.ssh/authorized_keys
chown deploy-bezum-world:deploy-bezum-world /home/deploy-bezum-world/.ssh/authorized_keys
```

Print the private key on the trusted computer:

```bash
cat ./bezum_world_actions
```

Copy the complete value, including the `BEGIN` and `END` lines, into the GitHub `SSH_PRIVATE_KEY` secret described in the next section. After the secret is saved and tested, securely remove the local private-key copy. Never commit either key.

## 9. Configure GitHub Environment secrets and variables

Open **GitHub repository -> Settings -> Environments -> New environment**, create an environment named exactly `production`, and add the following environment secrets.

### Required secrets

`SSH_HOST`:

```text
SERVER_PUBLIC_IPV4
```

`SSH_PORT`:

```text
22
```

`SSH_USER`:

```text
deploy-bezum-world
```

`SSH_PRIVATE_KEY`: the complete private key from `bezum_world_actions`.

`REPO_URL`: the public HTTPS repository URL or the private-repository SSH URL prepared in section 6.

Generate application secrets on a trusted computer:

```bash
openssl rand -hex 64
openssl rand -hex 64
openssl rand -base64 36
```

Create `BACKEND_ENV_PRODUCTION` as a multiline GitHub secret. Replace the IP and every `CHANGE_ME` value:

```dotenv
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
APP_TIME_ZONE=Europe/Moscow
APP_DOMAIN=http://SERVER_PUBLIC_IPV4

# These credentials match the current docker-compose.prod.yml PostgreSQL service.
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/social_rpg?schema=public

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

QUEUE_DEFAULT_NAME=default

AUTH_JWT_ACCESS_SECRET=CHANGE_ME_FIRST_OPENSSL_HEX
AUTH_JWT_REFRESH_SECRET=CHANGE_ME_SECOND_OPENSSL_HEX
AUTH_ACCESS_TOKEN_TTL_SECONDS=900
AUTH_REFRESH_TOKEN_TTL_SECONDS=604800
AUTH_REFRESH_COOKIE_NAME=refresh_token
AUTH_REFRESH_COOKIE_SECURE=false
AUTH_ADMIN_USERNAME=admin
AUTH_ADMIN_PASSWORD=CHANGE_ME_RANDOM_ADMIN_PASSWORD

SEED_ENV=prod
```

Create `FRONTEND_ENV_PRODUCTION` as another multiline GitHub secret:

```dotenv
NEXT_PUBLIC_APP_NAME=Bezum World
NEXT_PUBLIC_API_BASE_URL=http://SERVER_PUBLIC_IPV4/api
```

The workflow base64-encodes these two secrets, sends them through SSH, and `deploy.sh` writes them to `backend/.env.production` and `frontend/.env.production` with mode `600`. Do not create or commit production env files manually.

### Required variables

In the same `production` environment, add:

```text
APP_DIR=/opt/bezum-world
BACKEND_PORT=3001
HEALTHCHECK_PATH=/api/health
```

Important details:

- `SSH_PORT=22` matches the current `ssh-keyscan` step. A custom SSH port requires adding `-p "$SSH_PORT"` to that step.
- `PORT=3000` is the backend port inside its container; the host publishes it as `3001`.
- `DATABASE_URL` uses the Compose service name `postgres`, not `localhost`.
- `REDIS_HOST` uses the Compose service name `redis`.
- `AUTH_REFRESH_COOKIE_SECURE=false` is required while the application is served over plain HTTP.
- `NEXT_PUBLIC_API_BASE_URL` is compiled into the Next.js bundle; Actions rebuilds the frontend whenever it deploys.
- The current Compose file hardcodes the internal PostgreSQL user and password as `postgres`. Secret-driven database credentials remain a recommended hardening change.

### Protect the production environment

For a personal project, deployments may start immediately. For a shared repository, configure protected branches and optionally add required reviewers under the `production` environment so an unexpected push cannot deploy without approval.

## 10. Perform the first deployment through GitHub Actions

The repository already contains `.github/workflows/deploy.yml`. It is triggered by every push to `main` and can also be started manually using `workflow_dispatch`.

After all secrets and variables are saved, push the pending commit to `main`:

```bash
git push origin main
```

This push starts the first deployment automatically. If `main` already contains every required configuration change, open **GitHub -> Actions -> Deploy VPS -> Run workflow -> main -> Run workflow** instead. Do not run Docker build, migrations, or application startup manually on the server.

The workflow performs this sequence:

```text
GitHub Actions connects over SSH
  -> clones or updates /opt/bezum-world
  -> writes production env files from GitHub secrets
  -> stops backend and frontend
  -> builds Docker images
  -> starts PostgreSQL and Redis
  -> runs prisma migrate deploy
  -> starts the complete stack
  -> checks http://127.0.0.1:3001/api/health
```

Watch every step in the Actions job. A successful deployment ends with `Post-deploy backend health check`. Then use SSH only to inspect the result:

```bash
ssh deploy-bezum-world@SERVER_PUBLIC_IPV4
cd /opt/bezum-world
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 backend frontend
curl --fail http://127.0.0.1:3001/api/health
```

The backend creates the initial admin account from `AUTH_ADMIN_USERNAME` and `AUTH_ADMIN_PASSWORD` when it starts for the first time.

### Optional initial seed

Run the production seed only on a new, empty database and only if the prepared initial dataset is required. Open **GitHub -> Actions -> Run Prod Seed -> Run workflow**. The seed workflow uses the same production SSH settings and executes the seed inside the running backend container.

The current seed deletes and recreates accounts, tasks, submissions, battle logs, items, and related records. Never run it as a routine deployment step or on a live database with user data.

## 11. Configure Nginx

Create `/etc/nginx/sites-available/bezum-world`:

```bash
sudo nano /etc/nginx/sites-available/bezum-world
```

Paste this initial HTTP configuration:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 6m;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /docs {
        return 301 /docs/;
    }

    location /docs/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

The backend accepts images up to 5 MB, so Nginx uses a slightly larger 6 MB request limit.

Enable the site and validate Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/bezum-world /etc/nginx/sites-enabled/bezum-world
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
curl --fail http://SERVER_PUBLIC_IPV4/api/health
```

Official Ubuntu references: [installing Nginx](https://ubuntu.com/server/docs/how-to/web-services/install-nginx/) and [configuring Nginx](https://ubuntu.com/server/docs/how-to/web-services/configure-nginx/).

## 12. Verify access through the public IP

Run the public checks from a different computer, not from inside the server:

```bash
curl --fail http://SERVER_PUBLIC_IPV4/api/health
curl --head http://SERVER_PUBLIC_IPV4
curl --head http://SERVER_PUBLIC_IPV4/docs/
```

Open these URLs in a browser:

- `http://SERVER_PUBLIC_IPV4`;
- `http://SERVER_PUBLIC_IPV4/login`;
- `http://SERVER_PUBLIC_IPV4/admin/login`;
- `http://SERVER_PUBLIC_IPV4/docs/`.

There is no trusted HTTPS certificate in this configuration. Login codes, passwords, access tokens, cookies, and uploaded files travel over the network without TLS encryption. For Internet-facing production, add a domain and HTTPS later or place the application behind a private VPN such as WireGuard/Tailscale and restrict port 80 to the VPN network.

## 13. Routine deployment after a commit

Application deployment is not run manually on the server. Develop and verify the change on a feature branch, merge it into `main`, and push:

```bash
git checkout main
git pull --ff-only origin main
git merge --ff-only YOUR_FEATURE_BRANCH
git push origin main
```

The push triggers both `CI` and `Deploy VPS`. Open the Actions page and confirm that the deployment finishes with a successful backend health check. Afterward verify:

```bash
curl --fail http://SERVER_PUBLIC_IPV4/api/health
curl --head http://SERVER_PUBLIC_IPV4
```

When only a GitHub production secret changes, use **Actions -> Deploy VPS -> Run workflow** because editing a secret does not create a Git push.

The current workflows start CI and deployment independently on the same push. This means deployment does not wait for lint and build jobs to pass. Before treating this as a strict production pipeline, change the workflow so deployment is triggered only after the `CI` workflow completes successfully. Until that change is made, monitor both workflows and do not merge unverified changes directly into `main`.

The Actions workflow always passes `BACKEND_ENV_B64` and `FRONTEND_ENV_B64`, so the missing local `*.env.production.example` fallback files in `deploy.sh` are not used. Missing or empty GitHub secrets will still make the deployment fail.

Do not run `docker compose down -v`: the `-v` flag deletes PostgreSQL, Redis, and uploaded-file volumes.

## 14. Backups

Database and `backend_uploads` are the irreplaceable parts. Redis is a cache/queue store and normally does not need to be restored.

Create a protected backup directory:

```bash
sudo mkdir -p /var/backups/bezum-world
sudo chown deploy-bezum-world:deploy-bezum-world /var/backups/bezum-world
chmod 700 /var/backups/bezum-world
```

Create a PostgreSQL dump:

```bash
cd /opt/bezum-world
STAMP=$(date +%Y%m%d-%H%M%S)
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres -d social_rpg -Fc > "/var/backups/bezum-world/postgres-${STAMP}.dump"
```

Archive uploaded files from the backend container's mounted volume:

```bash
docker run --rm \
  --volumes-from social-rpg-backend \
  -v /var/backups/bezum-world:/backup \
  alpine:3.22 \
  tar -C /app -czf "/backup/uploads-${STAMP}.tar.gz" uploads
```

Verify files and restrict permissions:

```bash
ls -lh /var/backups/bezum-world
chmod 600 /var/backups/bezum-world/*
```

Copy backups to a different machine or object storage. A backup stored only on the application server does not protect against disk or provider failure. Keep at least daily backups for 7 days and test restoration regularly.

### Restore PostgreSQL

Schedule downtime and take one more backup first:

```bash
cd /opt/bezum-world
docker compose -f docker-compose.prod.yml stop backend frontend
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
  -U postgres \
  -d social_rpg \
  --clean \
  --if-exists \
  < /var/backups/bezum-world/postgres-YYYYMMDD-HHMMSS.dump
```

Restore uploads:

```bash
docker run --rm \
  --volumes-from social-rpg-backend \
  -v /var/backups/bezum-world:/backup:ro \
  alpine:3.22 \
  sh -c 'rm -rf /app/uploads/* && tar -C /app -xzf /backup/uploads-YYYYMMDD-HHMMSS.tar.gz'
```

Then start and verify:

```bash
docker compose -f docker-compose.prod.yml up -d backend frontend
curl --fail http://SERVER_PUBLIC_IPV4/api/health
```

## 15. Logs, health, and disk usage

Useful commands:

```bash
cd /opt/bezum-world
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=200 backend
docker compose -f docker-compose.prod.yml logs -f --tail=200 frontend
docker compose -f docker-compose.prod.yml logs -f --tail=200 postgres redis
docker stats
df -h
docker system df
sudo journalctl -u nginx --since today
sudo tail -f /var/log/nginx/error.log
```

Docker's default JSON logs can grow indefinitely. Create `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
```

Apply it during a maintenance window:

```bash
sudo systemctl restart docker
cd /opt/bezum-world
docker compose -f docker-compose.prod.yml up -d
```

The logging options apply to containers created after the change. Recreate existing services if necessary.

To remove unused image layers without touching volumes:

```bash
docker image prune -f
docker builder prune -f
```

Never run volume-pruning commands unless verified backups exist.

## 16. Troubleshooting

### Backend repeatedly restarts

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 backend
docker compose -f docker-compose.prod.yml config
```

Typical causes are a missing environment variable, a JWT secret shorter than 16 characters, an invalid `DATABASE_URL`, or unavailable PostgreSQL/Redis.

### Frontend still calls localhost or an old IP address

`NEXT_PUBLIC_API_BASE_URL` is a build-time value. Correct `frontend/.env.production`, then rebuild and recreate the frontend:

```bash
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d --force-recreate frontend
```

### Login immediately expires or refresh does not work

Confirm:

```dotenv
AUTH_REFRESH_COOKIE_SECURE=false
NEXT_PUBLIC_API_BASE_URL=http://SERVER_PUBLIC_IPV4/api
```

Then recreate the backend and rebuild the frontend.

### Nginx returns 502 Bad Gateway

```bash
curl http://127.0.0.1:3001/api/health
curl -I http://127.0.0.1:3000
docker compose -f docker-compose.prod.yml ps
sudo nginx -t
sudo tail -n 100 /var/log/nginx/error.log
```

### Migration fails

Do not run `prisma migrate dev` in production. Inspect the failure and migration state:

```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps backend bunx --bun prisma migrate status
docker compose -f docker-compose.prod.yml logs --tail=100 postgres
```

Restore the pre-deployment backup if the application and schema cannot safely be brought forward.

### Server runs out of memory while building

Keep `COMPOSE_PARALLEL_LIMIT=1`. If the host still runs out of memory, add temporary swap or build images in CI and pull them from a registry. Do not treat swap as a substitute for sufficient production memory.

## 17. Production checklist

- [ ] The server has a static public IPv4 address.
- [ ] SSH key login works; root/password login is disabled only after verification.
- [ ] UFW exposes only SSH and port 80.
- [ ] Docker ports 3000 and 3001 are bound to `127.0.0.1`.
- [ ] PostgreSQL and Redis have no published ports.
- [ ] The dedicated GitHub Actions public key is present in the `deploy-bezum-world` user's `authorized_keys`.
- [ ] The server has read access to the repository, including a read-only deploy key for a private repository.
- [ ] GitHub environment `production` contains all required secrets and variables.
- [ ] Production env files are delivered from GitHub secrets, have mode `600`, and are not tracked by Git.
- [ ] JWT secrets are independently generated and admin password is unique.
- [ ] Refresh cookie has `secure=false` because the site currently uses HTTP.
- [ ] The first `Deploy VPS` workflow completed with a successful health check.
- [ ] CI and deployment independence is accepted temporarily, or deployment has been gated on successful CI.
- [ ] Migrations completed successfully.
- [ ] Production seed was either intentionally run on an empty database or skipped.
- [ ] Frontend, health endpoint, login, admin login, image upload, and Swagger were tested.
- [ ] The lack of transport encryption is accepted temporarily, or access is restricted through a VPN.
- [ ] PostgreSQL and uploads backups exist outside the server.
- [ ] Docker log rotation and disk monitoring are enabled.
