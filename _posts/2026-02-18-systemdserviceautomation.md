# Daily backup pruning with a shell script + systemd service + timer (Ubuntu 24.04)

This note captures a simple, reusable workflow for small Linux automations:

- Write a small shell script that does the work.
- Wrap it in a `systemd` **oneshot** service so it runs reliably and logs to the journal.
- Schedule it with a `systemd` timer.

In this example, we prune RT (Request Tracker) database dump backups stored on an NFS mount, keeping the newest **14** `.sql` files and deleting older ones each day at **2:00 PM America/New_York**.

---

## Problem statement

- Server: Ubuntu 24.x
- Application: Request Tracker (RT) 6.0.0
- Backups: daily database dumps created overnight into:

  - `/requestor_data` (NFS mount backed by a NetApp volume)

- Goal: each day at 2 PM, count the `.sql` files in `/requestor_data` **(only the top-level directory; ignore `.snapshot`)** and **if more than 14 exist, delete the oldest** until only 14 remain.

---

## What we created

### Files

| Component | Path | Purpose |
|---|---|---|
| Script | `/usr/local/sbin/rt-db-backup-prune.sh` | Finds `.sql` backups in `/requestor_data` and deletes the oldest until only 14 remain |
| Service | `/etc/systemd/system/rt-db-backup-prune.service` | Runs the script as a `oneshot` job (with optional hardening) |
| Timer | `/etc/systemd/system/rt-db-backup-prune.timer` | Schedules the service daily at 2 PM |

---

## 1) The prune script

Create:

- `/usr/local/sbin/rt-db-backup-prune.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/requestor_data"
KEEP=14
PATTERN="*.sql"

log() { echo "[$(date -Is)] $*"; }

# Find *.sql in BACKUP_DIR only (do not descend into .snapshot)
# Print mtime epoch + path, sort oldest->newest
mapfile -t files < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name "$PATTERN" -printf '%T@ %p\n'   | sort -n   | awk '{print $2}'
)

count=${#files[@]}
log "Found $count SQL backup file(s) in $BACKUP_DIR (keeping newest $KEEP)."

if (( count <= KEEP )); then
  log "Nothing to prune."
  exit 0
fi

to_delete=$(( count - KEEP ))
log "Pruning $to_delete oldest file(s)."

for (( i=0; i<to_delete; i++ )); do
  f="${files[$i]}"
  log "Deleting: $f"
  rm -f -- "$f"
done

log "Prune complete."
```

Make it executable:

```bash
sudo chmod 0750 /usr/local/sbin/rt-db-backup-prune.sh
```

### Why this works

- `find ... -maxdepth 1` ensures we only look in `/requestor_data` and **do not** traverse into subdirectories like `.snapshot`.
- `%T@` prints modification time as an epoch float, making it easy to sort by age.
- Sorting oldest → newest and deleting the first `count - KEEP` items leaves the newest `KEEP` files intact.
- The script logs timestamped messages that show up in `systemd`’s journal.

> Optional improvement: change `PATTERN="*.sql"` to something stricter like `PATTERN="rtdb_backup_*.sql"` if you ever store other `.sql` files in that directory.

---

## 2) systemd service (oneshot)

Create:

- `/etc/systemd/system/rt-db-backup-prune.service`

```ini
[Unit]
Description=Prune RT DB SQL backups in /requestor_data (keep newest 14)
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/rt-db-backup-prune.sh

# Nice-to-have hardening:
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/requestor_data
```

### Notes

- `Type=oneshot` is ideal for scripts that run and exit.
- `ReadWritePaths=/requestor_data` is required because `ProtectSystem=strict` makes the filesystem read-only by default, except for explicitly allowed paths.

---

## 3) systemd timer (daily at 2 PM ET)

Create:

- `/etc/systemd/system/rt-db-backup-prune.timer`

```ini
[Unit]
Description=Run RT DB backup prune daily at 2PM ET

[Timer]
OnCalendar=*-*-* 14:00:00
Persistent=true
Unit=rt-db-backup-prune.service

[Install]
WantedBy=timers.target
```

### Timezone

For `OnCalendar=14:00:00` to truly mean “2 PM ET”, set the server timezone:

```bash
timedatectl
sudo timedatectl set-timezone America/New_York
```

If you prefer leaving the server in UTC (common in fleets), you can instead schedule `OnCalendar` in UTC and translate the desired run time, or use a more explicit timezone-aware approach.

---

## 4) Enable, start, and verify

Reload units:

```bash
sudo systemctl daemon-reload
```

Enable the timer so it starts on boot, and start it now:

```bash
sudo systemctl enable --now rt-db-backup-prune.timer
```

Check status and next run time:

```bash
systemctl status rt-db-backup-prune.timer
systemctl list-timers --all | grep rt-db-backup-prune
```

Test the service immediately:

```bash
sudo systemctl start rt-db-backup-prune.service
journalctl -u rt-db-backup-prune.service -n 200 --no-pager
```

---

## Reusable pattern for Linux automations

This workflow generalizes well:

1. **Script** does the work (idempotent if possible; clear logging).
2. **Oneshot service** runs the script reliably and captures output in the journal.
3. **Timer** replaces cron with better introspection (`systemctl list-timers`) and persistence (`Persistent=true`).

Common use cases:

- Retention/rotation (logs, dumps, exports, snapshots)
- Health checks + alerts
- Periodic cleanup (tmp dirs, old artifacts)
- Daily reports (generate, sync, upload)

---

## Troubleshooting quick tips

- See logs:

  ```bash
  journalctl -u rt-db-backup-prune.service --since today
  ```

- Confirm your timer is active:

  ```bash
  systemctl is-enabled rt-db-backup-prune.timer
  systemctl is-active rt-db-backup-prune.timer
  ```

- Confirm the NFS mount exists before pruning:

  ```bash
  mount | grep /requestor_data
  ```

---

## Final reminder

This setup deletes files. If you ever change patterns or directories, **test the script** first (and consider adding a “dry-run” mode) before enabling the timer.
