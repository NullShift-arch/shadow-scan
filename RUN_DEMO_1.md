# Shadow Scan DEMO 1 — How to Run Locally

## Quick Start (Administrator PowerShell Required)

```powershell
# Navigate to project
cd C:\Users\IDOIT\shadow-scan

# Run the development server
npm run tauri dev
```

The app window will open automatically.

---

## What You'll See

### Network Tab
- **Real-time TCP connections** — updates every 2 seconds
- Service name and PID for each connection
- Remote IP, port, and hostname (once DNS resolves)
- Risk level indicator (Red/Orange/Yellow/Green)
- **ACTION:** Click "Block" next to any IP to create a Windows Firewall rule

### Apple Relay Tab
- **All Windows services** running on the system
- Service name, display name, state (Running/Stopped)
- PID and startup type (Auto/Manual/Disabled)
- **Correlated connections** — expand a service to see its active network connections
- **ACTION:** Click "Stop" or "Disable" buttons to control services

### Audit Tab
- **Risk score** (0-100) displayed as large animated SVG gauge
- **Risk level** badge (Safe/Low/Medium/High/Critical)
- **Score trend** — chart showing past audits
- **Top actions** — highest-impact findings you should address
- **Restore panel** — lists all blocks/disables with one-click restore
- **ACTION:** Click "Restore All" to undo all blocks and service disables

### Settings Tab
- Application preferences
- Theme settings
- Debug options

---

## Testing the Features

### Test 1: Monitor Network (2 minutes)
1. Open **Network tab**
2. Open a web browser (Chrome, Edge, Firefox)
3. Visit a website (google.com, youtube.com, etc.)
4. Watch Shadow Scan detect the connections in real-time
5. See which services own the connections

### Test 2: Control Services (5 minutes)
1. Open **Apple Relay tab**
2. Find "Print Spooler" service (safe to test)
3. Click it to expand and see its connections
4. Click **"Stop"** button
5. Verify it stops in the service list
6. Click **"Start"** to restart it

### Test 3: Block an IP (5 minutes)
1. Open **Network tab**
2. Find any connection and click **"Block"**
3. Watch the button change from "Block" (red) to "Unblock" (amber)
4. Open **Audit tab**
5. Click **"Scan Now"** to update risk score
6. See the score increase (you blocked an IP)
7. Scroll down to **"Kill-Switch Log & Restore"**
8. See your block listed
9. Click **"Restore All"** to undo it

### Test 4: Check Risk Score (5 minutes)
1. Open **Audit tab**
2. See the **large risk gauge** (0-100)
3. Read the **risk level** (Safe/Low/Medium/High/Critical)
4. See the **"Score Delta"** (↓ N pts for improvement, ↑ N pts for degradation)
5. See the **"Score Trend"** chart with past audits
6. Read the **"Top Actions"** recommendations
7. See the **"All Findings"** list with impact points

### Test 5: Restore Everything (5 minutes)
1. Block a few IPs (Network tab)
2. Disable a service (Apple Relay tab)
3. Open **Audit tab**
4. Scroll to **"Kill-Switch Log & Restore"**
5. See **"2 active"** badge (or however many you blocked/disabled)
6. Click **"Restore All (2)"**
7. Confirm in the modal dialog
8. Watch the log update with a "RESTORE_ALL" entry
9. Verify IPs are unblocked: `netsh advfirewall show rule name="tenfold*"`
10. Verify service is re-enabled in Apple Relay tab

---

## Requirements to Run

- **Windows 10 Build 19041+** or **Windows 11**
- **Administrator PowerShell** (for full functionality)
- **Node.js 18+** (for npm)
- **Rust** (for cargo, if rebuilding)
- **Git** (already installed)

---

## Troubleshooting

### "Access Denied" when blocking/disabling
**Solution:** Run `npm run tauri dev` from an **elevated (Administrator) PowerShell**

The app needs admin rights to:
- Create firewall rules (netsh requires elevation)
- Control services (Service Control Manager requires elevation)
- Monitor system connections

### "Windows Defender SmartScreen" warning
**Normal behavior** — the .exe isn't signed yet (planned for v1.0)
- Click "More info" then "Run anyway"

### Connections list is empty
**Possible causes:**
- App just started (give it 10 seconds for first poll)
- No network activity on your machine
- **Solution:** Open a browser, visit a website

### Services list is empty
**Unlikely** — Windows always has services running
- **Solution:** Try scrolling down, or click "Refresh" in header

### "Program not found: cargo"
**Solution:**
```powershell
# Ensure Rust is installed
rustup update

# Then try again
npm run tauri dev
```

---

## Performance Tips

- **2-second network polling** is default — this is intentional (captures all traffic)
- **60-second audit refresh** is background (doesn't block UI)
- **DNS resolution** happens in background batches (5-second intervals)
- All data is **local SQLite** — instant queries, zero network lag

If the app feels slow:
1. Check Task Manager — see CPU/Memory usage
2. Check number of active connections (>500 is high)
3. Try Settings tab for optimization options

---

## What's Actually Happening Under the Hood

### When you open Network tab
1. Rust backend enumerates all TCP connections via `GetExtendedTcpTable()`
2. For each connection, it looks up the owning process PID
3. For each PID, it fetches the service name via Service Control Manager
4. Results are stored in SQLite connection log
5. Frontend subscribes to updates, renders in real-time
6. Every 2 seconds, repeat (polling)

### When you open Apple Relay tab
1. Rust backend calls `OpenSCManagerA()` to open Service Control Manager
2. Enumerates all services with `EnumServicesStatusExA()`
3. For each service, correlates its PID to active connections
4. Frontend fetches this data and renders hierarchically
5. When you click "Stop" → calls `ControlService()` → service stops immediately
6. Click "Enable" → calls `ChangeServiceConfigA()` → startup type changes

### When you block an IP
1. Rust backend validates the IP format
2. Creates a Windows Firewall rule via `netsh advfirewall firewall add rule`
3. Logs the action to kill_switch_log table in SQLite
4. Frontend receives response and updates button state
5. Next audit scan will detect the IP is blocked and reduce risk score

### When you click "Restore All"
1. Rust backend queries all previous "block" and "disable" entries
2. For each blocked IP, calls `netsh advfirewall firewall delete rule`
3. For each disabled service, calls `ChangeServiceConfigA()` to re-enable
4. Logs the "restore_all" action
5. Frontend updates the restore panel list

---

## Demo Video Flow (90 seconds)

If you want to record a quick demo:

**0:00** — Open Network tab, show live connections (10s)  
**0:10** — Open browser, watch new connections appear (10s)  
**0:20** — Block an IP, see button change (5s)  
**0:25** — Open Apple Relay tab, show services (10s)  
**0:35** — Expand a service, see connections (10s)  
**0:45** — Open Audit tab, show risk gauge and score (10s)  
**0:55** — Scroll to Restore, click "Restore All" (10s)  
**1:05** — Show it worked, end (5s)  

---

## Need Help?

- **Bug report?** → GitHub Issues
- **Question?** → Check docs/ folder
- **Crash?** → Check Windows Event Viewer > Applications

---

**Version:** v0.5.0-beta (DEMO 1)  
**Tag:** DEMO-1  
**Status:** Production beta ready  

**Let's go!**
