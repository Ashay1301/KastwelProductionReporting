# ADR-001: Direct Install on the Domain Controller + Public HTTPS Exposure

**Date:** 2026-07-17
**Status:** Accepted (in progress — server-side setup partially complete, external verification pending)

---

## Context

`production-reporting` was originally headed toward a Docker/nginx deployment on the office Windows Server (`10.10.10.211`, hostname `KF-SRV-HP`, Windows Server 2016). That plan is abandoned — Docker was never installed (only the prerequisite Containers/Hyper-V features were enabled). This ADR documents the replacement decisions made during the 2026-07-17 deployment session.

---

## Decisions

### 1. Direct install (Node.js + MongoDB), not Docker
**Decision:** Install Node.js, MongoDB Community Server, Git, and Caddy directly on the Windows Server — no containers.
**Reason:** Docker was never actually installed on this server; direct install avoids the Windows Containers/Hyper-V setup entirely and turned out simpler in practice (no named-pipe/Portainer quirks).

### 2. `10.10.10.211` is the domain controller — exposure risk accepted knowingly
**Decision:** Deploy on the existing server despite it being confirmed (via `Get-SmbShare` showing `SYSVOL`/`NETLOGON`, and the full AD DS port set — 53/88/389/636/3268/3269/464/9389 — all listening) to be the office's Active Directory Domain Controller, which also hosts the `Account`/`Purchase`/`Sales` business file shares.
**Alternatives considered and rejected:**
- Isolated Hyper-V VM on the same hardware (would have kept the DC's own OS untouched) — ruled out, Hyper-V not available as an option per user.
- FortiGate SSL-VPN instead of a public port (smaller attack surface, no pre-auth exposure) — ruled out, would reduce required availability for users.
**Reason:** User explicitly weighed the risk (an app-level RCE becoming a potential domain-wide compromise) against these alternatives and chose to proceed directly on the DC with public exposure regardless.
**Mitigation:** All application-level hardening from the same session (CORS default-deny, rate limiting, MongoDB bound to `127.0.0.1` with a dedicated least-privilege user, secrets rotated, default seed passwords eliminated) is treated as partial compensating control, not a substitute for the underlying risk.

### 3. Public port 8443, not 80/443 — due to existing conflicts
**Decision:** Caddy listens internally on `:8443` (TLS) instead of `:443`/`:80`.
**Reason:** A live port scan (`Get-NetTCPConnection -State Listen`) found ports 80 and 443 already bound by `PID 4` (System) — an existing DC/IIS-related service. Separately, the FortiGate's external port 443 is already mapped via the `dvr port-443` VIP to a different device (`10.10.10.245`, a DVR system) — confirmed in `.agents/infrastructure-and-projects.md`. External `8443` → internal `8443` (no port translation) was chosen as a clean, conflict-free alternative on both the Windows Firewall and FortiGate sides.

### 4. TLS: Caddy self-signed (`tls internal`) now, real domain later
**Decision:** Start with Caddy's self-signed internal CA; migrate to a real domain + Let's Encrypt via DNS-01 challenge once a domain is available (DNS-01 is required regardless, since external ports 80/443 are unavailable for the standard HTTP-01/TLS-ALPN-01 challenges).
**Reason:** Gets a working encrypted service immediately with zero external dependencies; avoids blocking the rollout on domain/DNS provisioning.
**Follow-up:** Caddy's site block explicitly lists `127.0.0.1:8443, 10.10.10.211:8443, 122.179.137.175:8443, localhost:8443` as SANs (rather than a bare `:8443` block) so one static certificate covers loopback, LAN, and public-IP access without relying on SNI-based on-demand issuance — necessary because clients connecting via bare IP addresses (not hostnames) frequently don't send an SNI value at all.

### 5. NSSM for process management, not PM2
**Decision:** Both the Node API and Caddy run as genuine Windows services registered via NSSM (`AppExit Default Restart`, `Start SERVICE_AUTO_START`), not PM2.
**Reason:** PM2's Windows auto-start relies on a scheduled task/registry Run key — the same class of mechanism that already proved unreliable on this exact server (`sshd`'s `StartupType=Automatic` not surviving reboot). NSSM produces a first-class Windows service using the same underlying mechanism we'll explicitly verify survives a reboot.

### 6. MongoDB 7.0 Community Server — works on Server 2016 despite not being officially listed
**Finding:** MongoDB's official platform support matrix lists Windows Server 2019 as the minimum for both 7.0 and 8.0 (6.0 also excludes 2016, and separately reached EOL July 2025). Empirically, the 7.0.37 MSI installs and runs correctly on this Server 2016 box (build 10.0.14393) once the correct `ADDLOCAL="ServerService"` feature is specified — the installer's `LaunchConditions` check does not actually block on OS version.
**Mitigation:** MongoDB bound to `127.0.0.1` only, `security.authorization: enabled`, dedicated `kastwel-app` user scoped to `readWrite` on `kastwel-production` only (not the built-in admin bootstrap user).

### 7. Secrets rotation
**Decision:** All secrets are freshly generated on the server, never carried over from the pre-migration Vercel/Atlas-era `api/.env` on the dev machine: new `JWT_SECRET` (64-byte hex), new MongoDB app-user password (URL-encoded when embedded in `MONGODB_URI`, since the generator's charset includes URI-reserved characters), user-chosen admin/worker login passwords (not the hardcoded `admin123`/`worker123` defaults — `seed.js` was changed in the same session to require `SEED_ADMIN_PASSWORD`/`SEED_WORKER_PASSWORD` env vars, refusing to run without them).

---

## Windows Server 2016-specific quirks discovered this session
(See also `.agents/infrastructure-and-projects.md` for prior SSH-setup-era quirks.)

- `msiexec /qn` **must** include `/norestart` explicitly — omitting it caused an unannounced mid-business-hours reboot of the shared DC when the MongoDB installer decided a restart was needed to "complete configuration." No other install (Node, Git, NSSM, Caddy) hit this because MSI-based installers vary in default reboot behavior; treat `/norestart` as mandatory on every `msiexec` invocation on this box going forward.
- `[Net.ServicePointManager]::SecurityProtocol = Tls12` and `$ProgressPreference = 'SilentlyContinue'` must be set **per PowerShell session** (not persistent) before any HTTPS download via `Invoke-WebRequest`/`WebClient` — otherwise either an SSL/TLS error or a severely degraded download rate occurs.
- `Start-BitsTransfer` fails over SSH sessions specifically (`0x800704DD`, "user has not logged on to the network") — BITS requires a full interactive/network-authenticated logon token that SSH sessions don't have. Use `System.Net.WebClient.DownloadFile` in a background `Start-Job` instead, polling file size for progress.
- Caddy (and likely other recent Go-built binaries) logs `"unable to set keepalive for new connection"` / `setsockopt` warnings on every connection on this OS — Go 1.23+'s default per-connection TCP keep-alive configuration uses `TCP_KEEPIDLE`/`TCP_KEEPINTVL`, only available from Windows 10 version 1709 (Server 2019) onward. Server 2016 predates this. Workaround: set `servers { keepalive_interval 0 }` in the Caddy global options block to disable the behavior entirely.
- MongoDB's Windows MSI has no `'Client'` feature (the legacy `mongo` shell was dropped in favor of the separately-distributed `mongosh`) — `ADDLOCAL="ServerService,Client"` fails with `Error 2711`. Use `ADDLOCAL="ServerService"` only; download `mongosh` separately as a standalone zip.
- `C:\Windows\system32\config\systemprofile\AppData\Roaming\...` (the SYSTEM account's own profile, where NSSM-wrapped services running as SYSTEM write their data, e.g. Caddy's PKI storage) does not reliably show contents to an Administrator's `Get-ChildItem` even without an explicit access-denied error — use the relevant application's own introspection (e.g., Caddy's local admin API at `http://localhost:2019/pki/ca/local`) rather than trusting an empty filesystem listing as proof something wasn't created.

## Update 2026-07-18: Caddy TLS mystery resolved

The real-browser test confirmed the loopback failure was **not** a false negative — `https://10.10.10.211:8443/api/health` genuinely failed with `ERR_SSL_PROTOCOL_ERROR` from an actual Chrome browser on the LAN, the same underlying problem as the scripted tests, just a different symptom (a protocol-level error rather than a certificate-trust warning).

**Fix:** abandoned Caddy's automatic/managed `tls internal` certificate system entirely in favor of a statically generated self-signed certificate, loaded via `tls <cert> <key>` instead of `tls internal`. Generated with Node's `selfsigned` package (v5.5.0, which wraps `@peculiar/x509`/`pkijs` — a WebCrypto-based, **Promise-returning** API, not the older synchronous/`node-forge`-based API from earlier versions — `await selfsigned.generate(...)` is required, not a bare call or a Node-style callback), covering `localhost` (DNS SAN) and `127.0.0.1`/`10.10.10.211`/`122.179.137.175` (IP SANs), 2048-bit RSA, 10-year validity. Script and generated cert/key live at `C:\Tools\certgen\` on the server.

```
{
    auto_https off
}

127.0.0.1:8443, 10.10.10.211:8443, 122.179.137.175:8443, localhost:8443 {
  tls C:\Tools\certgen\cert.pem C:\Tools\certgen\key.pem
  encode gzip
  reverse_proxy 127.0.0.1:3001
}
```

Verified working via both a Node.js script (`STATUS: 200 BODY: {"ok":true}`) and an actual Chrome browser on the LAN (`{"ok":true}`, with the expected "Not Secure" self-signed indicator). The root cause of the original failure in Caddy's automatic certificate matching was never fully identified (debug logs showed `cert_cache_fill: 0` / "no certificate available" even with `on_demand` configured) — not worth further investigation now that a working, static-cert alternative is in place. If Caddy is ever upgraded or reconfigured to use `tls internal` again, expect this to resurface and go straight to the static-cert workaround rather than re-debugging.

## Update 2026-07-18 (continued): full rollout complete

- FortiGate VIP `HTTPS-to-Reporting` created (external `122.179.137.175:8443` → internal `10.10.10.211:8443`) and firewall policy `Allow-HTTPS-Reporting` created (Incoming: SD-WAN, Outgoing: lan, Source: all, Destination: the VIP, Service: ALL, NAT off, Action ACCEPT) — same pattern as the existing `Allow-SSH` policy. Policy landed disabled by default (same gotcha as the SSH policy) and was manually enabled.
- **Verified externally** (mobile data, off-LAN): `https://122.179.137.175:8443/api/health` → `{"ok":true}`.
- **Confirmed no collateral damage**: SSH (`ssh -p 8022 Administrator@122.179.137.175`) still works from the same external connection — the new VIP/policy didn't disrupt the existing `SSH-to-Server`/`Allow-SSH` objects.
- **Still pending**: a scheduled off-hours reboot to verify MongoDB/KastwelAPI/Caddy all auto-start without manual intervention (per the original rollout plan's safety notes — do not reboot this shared DC without warning other users first).

## Residual / open items as of end of session (2026-07-17, before the above fix — kept for history)

### The Caddy TLS loopback mystery (unresolved, deferred to next session)
Every loopback test (`https://127.0.0.1:8443` from within the server's own SSH session) failed with `tlsv1 alert internal error` (TLS alert 80), across several attempted fixes:
- `keepalive_interval 0` (global Caddy option) — no change. Turned out to be the wrong layer: this controls HTTP-level keep-alive, not the OS-level `SO_KEEPALIVE` socket option Go's runtime sets on every accepted connection (a Go stdlib default since Go 1.12, not something Caddyfile-configurable, and not actually new in Go 1.23 as first suspected).
- `tls internal { skip_install_trust }` — **invalid syntax** in Caddy 2.11.4 ("unknown subdirective"); caused the config to fail loading entirely, leaving NSSM stuck restart-looping on a broken config until caught and fixed. Always run `caddy validate --config <path>` before restarting the service after a config change — it checks parseability without touching the running service.
- `tls internal { on_demand }` — syntactically valid (`caddy validate` passes), and is the theoretically correct direction, but the debug log still showed `"on_demand":false` on the actual connection attempt and `cert_cache_fill: 0` (no certificate ever cached for `127.0.0.1`) — not fully explained; left in place as the final config for this session.

**The actual likely explanation, found via research rather than further trial-and-error:** Caddy's certificate identifier-matching is fundamentally hostname/SNI-oriented — see [caddyserver/caddy#6784](https://github.com/caddyserver/caddy/issues/6784) ("Caddy does not consider IP addresses as a valid ServerName for TLS") and a [Caddy community thread](https://caddy.community/t/tls-handshake-error-no-certificate-available-for-ip/23423) with the identical error message. Debug logging confirmed our test client sent an **empty SNI** (`"ServerName":""`) when connecting to the bare IP `127.0.0.1`. Critically, **Node.js's `https` module (used for all our loopback tests, chosen specifically to bypass a separate Windows SSPI/SSH-session limitation) follows the SNI spec strictly and never sends SNI for IP-literal hostnames** — whereas real browsers (Chrome/Firefox/Edge) do populate SNI with the IP address string when a user navigates to `https://<ip>:<port>` directly, despite this bending RFC 6066. **This means our test methodology itself may have produced a false negative** — Caddy might already work correctly for actual browser-based access even though our Node-based loopback test could not confirm it.

**Next session must resolve this with a real browser, not another scripted test:** open `https://10.10.10.211:8443/api/health` from an actual browser on another LAN machine (once back on office WiFi) or `https://122.179.137.175:8443/api/health` externally (once the FortiGate VIP is added) — accept the self-signed certificate warning, and see if it actually loads. If it still fails in a real browser, the `on_demand` config needs further work (a global `on_demand_tls { ask ... }` permission policy may be required — untested), or fall back to loading an explicitly self-signed cert file directly (`tls /path/cert.pem /path/key.pem`) generated by a separate tool, bypassing Caddy's automatic/managed certificate system entirely.

### Other separately-discovered, unrelated Caddy/Windows Server 2016 quirks (confirmed cosmetic, not the cause of the above)
- `"unable to set keepalive for new connection"` warning appears on every connection — confirmed via research to be Go's stdlib trying `TCP_KEEPIDLE`/`TCP_KEEPINTVL` (only supported from Windows 10 version 1709 / Server 2019 onward) on every accepted connection; Caddy logs it as a non-fatal warning and continues. Safe to ignore.
- `"failed to install root certificate"` (`add cert failed: Failed adding cert: The request is not supported`) appears on every Caddy startup — this is Caddy (running as SYSTEM via NSSM) trying to add its root CA to the OS trust store for local-browsing convenience; confirmed via Caddy's own admin API (`GET http://localhost:2019/pki/ca/local`) that the root+intermediate CA certificates are generated successfully regardless of this failure. Not the cause of the TLS alert — cosmetic.
- `Get-ChildItem` against `C:\Windows\system32\config\systemprofile\AppData\Roaming\Caddy` returns empty even though Caddy (running as SYSTEM) does write there — likely an ACL/visibility quirk for the Administrator account, not proof files are missing. Use Caddy's own admin API to introspect its state instead of trusting an empty filesystem listing.

### Remaining rollout steps (blocked on office LAN / FortiGate access)
- Windows Firewall rule (`Caddy-HTTPS`, TCP 8443 inbound) — done and confirmed.
- Real-browser LAN test (`https://10.10.10.211:8443`) — blocked, requires office WiFi.
- FortiGate VIP + policy for the external path (external 8443 → internal 8443) — blocked, requires FortiGate admin GUI access (LAN-only).
- Full external verification (`https://122.179.137.175:8443` from off-LAN) — blocked on the above.
- Scheduled reboot to verify all three services (MongoDB, KastwelAPI, Caddy) auto-start correctly — not yet attempted, do only off-hours with advance warning per the original rollout plan.
