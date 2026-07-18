# Infrastructure State — Kastwel Production Reporting

**Last Updated:** 2026-07-17
**Project:** production-reporting

---

## Hosting
- **Platform:** Direct install on the office Windows Server (`10.10.10.211`, hostname `KF-SRV-HP`, Windows Server 2016 build 10.0.14393) — **not** Docker, **not** Vercel/Atlas (both abandoned; see ADR-001).
- **Important:** this server is the office's Active Directory Domain Controller (confirmed via `SYSVOL`/`NETLOGON` shares and the full AD DS port set), and also hosts the `Account`/`Purchase`/`Sales` business file shares. Public exposure of this app was a deliberate, risk-accepted decision — see ADR-001.
- **Frontend + API:** single Node.js/Express process (`api/index.js`) serves both the built React `dist/` and `/api/*`, running as a Windows service (`KastwelAPI`) via NSSM, listening on `127.0.0.1:3001` only.
- **Reverse proxy / TLS:** Caddy, running as a Windows service (`Caddy`) via NSSM, listening on `:8443`. Serves a **statically generated self-signed cert** (`C:\Tools\certgen\cert.pem`/`key.pem`, SANs: `localhost`, `127.0.0.1`, `10.10.10.211`, `122.179.137.175`) — not Caddy's automatic `tls internal` management, which had an unresolved bug (see ADR-001's 2026-07-18 update). Ports 80 and 443 are unavailable on this box (443 externally is separately taken by an unrelated `dvr port-443` FortiGate VIP pointing at `10.10.10.245`; 80/443 internally are bound by existing DC/IIS-related services).
- **Public URL:** `https://122.179.137.175:8443` — **live and verified** (2026-07-18, tested from off-LAN).
- **LAN URL:** `https://10.10.10.211:8443` — **verified working** via real browser (2026-07-18).

## Database
- **Provider:** MongoDB Community Server 7.0.37, self-hosted directly on the same Windows Server (not officially listed as Server-2016-compatible by MongoDB, but confirmed working empirically).
- **Bind address:** `127.0.0.1` only — never touches the firewall, never LAN/externally reachable.
- **Auth:** `security.authorization: enabled`. Two users: a bootstrap `siteAdmin` (admin db, for management only) and the app's own `kastwel-app` user, scoped to `readWrite` on `kastwel-production` only.
- **Client tooling:** `mongosh` 2.9.2, installed as a standalone zip extract at `C:\Tools\mongosh\mongosh-2.9.2-win32-x64\bin\mongosh.exe` (modern MongoDB MSIs no longer bundle a shell — the legacy `mongo` "Client" MSI feature doesn't exist).

## Authentication (app-level)
- **Method:** JWT (HS256), 12h expiry, signed with a freshly rotated `JWT_SECRET` (not carried over from the pre-migration Vercel/Atlas-era secret).
- **Token storage:** `localStorage` (key: `production_token`).
- **Roles:** `worker`, `admin`.
- **Seed accounts:** created via `node seed.js`, which now **requires** `SEED_ADMIN_PASSWORD`/`SEED_WORKER_PASSWORD` env vars (refuses to run without them, min 12 chars) — the old hardcoded `admin123`/`worker123` defaults were removed from the script entirely.

## Process management
- **KastwelAPI** (Node/Express) and **Caddy**, both registered as genuine Windows services via **NSSM** (not PM2 — PM2's Windows auto-start relies on a scheduled task/registry Run key, the same class of mechanism that already proved unreliable on this server for `sshd`). Both set to `AppExit Default Restart` + `SERVICE_AUTO_START`. Auto-restart-on-crash verified for `KastwelAPI`; reboot-survival not yet tested for either (pending, off-hours).
- Logs: `C:\apps\logs\{api,caddy}-{out,err}.log`.

## Environment Variables (server-only `api\.env`, never committed)
| Variable | Purpose |
|---|---|
| `MONGODB_URI` | `mongodb://kastwel-app:<url-encoded-password>@127.0.0.1:27017/kastwel-production?authSource=kastwel-production` |
| `JWT_SECRET` | Freshly generated 64-byte hex |
| `CORS_ORIGIN` | `https://122.179.137.175:8443` (single explicit origin — code now fails loudly in production if unset, no more silent allow-all) |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |

## Local Development (unchanged from before)
- Frontend: `npm run dev` → Vite on `:5173`
- Backend: `npm run api:dev` → Express on `:3002` (per `vite.config.js`'s dev proxy target — a pre-existing mismatch with the code's own `3001` default, harmless in dev)

## Deployment (current, direct-install)
1. `git clone` to `C:\apps\production-reporting`, `npm install && npm run build` (root), `npm install` (in `api/`).
2. Create `api\.env` on the server only (never committed).
3. `node seed.js` once (with `SEED_*_PASSWORD` env vars set), then remove those two lines from `.env`.
4. NSSM-wrap both `node index.js` (service `KastwelAPI`) and `caddy run --config Caddyfile` (service `Caddy`).
5. Windows Firewall: allow inbound TCP 8443 (rule `Caddy-HTTPS`) — done.
6. FortiGate: VIP + policy for external 8443 → internal 8443 — **pending**, requires FortiGate admin GUI (LAN-only).

## Pending / Next Steps
- [x] Verify Caddy TLS actually works via a real browser (LAN: `https://10.10.10.211:8443`) — done 2026-07-18, required switching from `tls internal` to a static cert file (see ADR-001).
- [x] Create FortiGate VIP (`HTTPS-to-Reporting`, external 8443 → internal `10.10.10.211:8443`) + policy (`Allow-HTTPS-Reporting`, SD-WAN incoming, NAT off, enabled) — done 2026-07-18.
- [x] Verify externally: `https://122.179.137.175:8443/api/health` → `{"ok":true}` from off-LAN (mobile data), 2026-07-18. SSH (8022) confirmed still working from the same connection — no collateral damage.
- [ ] Schedule one off-hours reboot to verify MongoDB/KastwelAPI/Caddy all auto-start without manual intervention.
- [ ] Migrate Caddy from self-signed to a real domain + Let's Encrypt (DNS-01 challenge) once a domain is available.
- [ ] Rotate the admin/worker seed passwords again via the app's own User Management UI after first login, as a final step before considering credentials final.
