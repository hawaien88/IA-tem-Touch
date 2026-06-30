# IA.tem — Touch control panel for ATEM switchers

🇫🇷 *Une version française de ce document est disponible dans [README.md](README.md).*

**IA.tem** is a touch-friendly web interface (designed for a 1280×800 screen) that
controls a **Blackmagic Design ATEM** video switcher from a browser, without using
*ATEM Software Control*. A small Node.js server bridges the web page and the switcher
over the IP network.

The goal: turn a mini-PC + touchscreen into a **dedicated production panel** that
boots straight into fullscreen.

---

## ⚡ Quick start

1. Install **[Node.js](https://nodejs.org/)** (18+) and **[Google Chrome](https://www.google.com/chrome/)**.
2. Download the project, then run **`npm install`** in its folder.
3. Set the switcher IP (the *IP ATEM* page in the interface, or `atem-control/configIP.json`).
4. Double-click **`Demarrer-IAtem.bat`**.
5. For **auto-start with Windows**: put a shortcut to that `.bat` in `shell:startup`.

> ⚠️ **Google Chrome is required for kiosk mode** (automatic fullscreen), because the
> launcher opens it with specific flags. Without Chrome, the app still works via
> `npm start` in any modern browser, just without automatic fullscreen.

---

## ✨ Features

- 🎛️ **Transitions**: MIX, DIP, WIPE, STING, DVE — trigger and configure
- ⏱️ Adjustable transition **durations** per *Mix Effect* (ME1 / ME2)
- 🌫️ **DIP**: source and duration
- 🪟 **WIPE**: pattern, border, softness, position, direction, symmetry…
- 🖼️ **Media Players**: select stills / clips + transport (play, loop…)
- 🧩 **SuperSource**: box placement, cropping, and ready-to-use **presets**
- 📺 **AUX outputs**: route sources to each output
- 🎬 **Macros**: list and run the switcher's macros
- 🔌 **Hot-swap ATEM**: pick the switcher's IP from the interface
- 🟢 **Status indicators**: ATEM connected / Raspberry Pi reachable
- 🖥️ **Kiosk mode**: auto-start, fullscreen, hidden taskbar

The interface adapts to the **connected ATEM model**: features that don't exist
(e.g. SuperSource on an ATEM Mini Pro) are automatically greyed out.

---

## 🧠 How it works

The application has **two parts** running on the same machine.

```
   Touchscreen (Chrome browser)
            │  HTTP  (http://localhost:3000)
            ▼
   ┌──────────────────────────┐        ATEM protocol (UDP)
   │  Node.js / Express server │ ─────────────────────────────▶  ATEM switcher
   │     atem-control/server.js │ ◀─────────────────────────────  (on the IP network)
   └──────────────────────────┘            real-time state
```

1. **The server** (`atem-control/server.js`) connects to the switcher through the
   [`atem-connection`](https://www.npmjs.com/package/atem-connection) library. It keeps
   the ATEM state in sync and exposes a set of **HTTP routes**
   (see [Route reference](#-route-reference)).
2. **The interface** (`atem-control/public/`) is a set of HTML/CSS/JS pages served by
   that same server. Each button calls a route, which translates the action into an
   ATEM command and returns the result.
3. **The configuration** (`atem-control/configIP.json`) holds a single thing: the
   switcher's IP address. It can be changed **live** from the *IP ATEM* page, without
   restarting the server.

### Interface pages

| Page | Purpose |
|------|---------|
| `index.html` | Main menu + transition bar + ME1/ME2 selector + status |
| `mix.html` | Mix transition duration |
| `dip.html` | DIP source and duration |
| `wipe.html` | All Wipe settings |
| `mediaplayer.html` | Media Players (stills / clips + transport) |
| `supersource.html` | SuperSource boxes + presets |
| `auxatem.html` | AUX output routing |
| `macro.html` | List and run macros |
| `atem-ip.html` | Pick / connect the switcher's IP |

### Raspberry Pi integration (optional)

The interface can display the **real active ME** pushed by a companion Raspberry Pi
(routes `/me-update` and `/me-current`) and offers a *CONFIG RPI* button that opens the
configuration page served by the Raspberry Pi.

This integration is **optional**. The Raspberry Pi address is set in one place, at the
top of the script in `atem-control/public/index.html`:

```js
const rpiIP = ""; // e.g. "192.168.12.103" — leave empty if you have no Raspberry Pi
```

- If `rpiIP` is **set**, the *CONFIG RPI* button points to
  `http://<rpiIP>:3000/config.html`.
- If `rpiIP` is **empty** (`""`, the default), the *CONFIG RPI* button is
  **automatically greyed out** (no 404 page) and Raspberry Pi monitoring is disabled.

> 💡 To build the **full panel with a Raspberry Pi**, see the companion *atem-panel*
> repository. This Windows version works **with or without** a Raspberry Pi.

---

## 📋 Requirements

- **Windows 10 / 11**
- **[Node.js](https://nodejs.org/)** 18 LTS or newer (includes `npm`)
- **Google Chrome** — **required** for automatic fullscreen start (kiosk mode). For
  simple use via `npm start`, any modern browser works.
- An **ATEM** switcher reachable on the local IP network

---

## 🚀 Installation

### 1. Install Node.js (which includes npm)

`npm` ships **with Node.js**: there is nothing separate to install.

- **Easiest**: download the **LTS** installer from <https://nodejs.org/> and run it
  (keep the default options).
- **From the command line** (Windows 10/11):

  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```

Then verify, in a **new** terminal:

```bash
node -v
npm -v
```

### 2. Get the project

**Option A — with Git:**

```bash
git clone <repository-url> IAtem-control
cd IAtem-control
```

**Option B — download the ZIP (no Git):**

1. On the project's GitHub page: green **`Code`** button ▸ **`Download ZIP`**.
2. Extract the archive (right-click ▸ *Extract All…*).
3. Open a terminal **in the extracted folder**: in File Explorer, click the address
   bar, type `powershell`, then press Enter.

### 3. Install dependencies

In the project folder:

```bash
npm install
```

---

## ⚙️ Configuration

The switcher IP can be set in two ways:

- **From the interface** (recommended): *IP ATEM* page → pick a switcher or type an
  address → *Save*. Reconnection happens on the fly.
- **By hand**: edit `atem-control/configIP.json`:

```json
{
  "atemIP": "192.168.12.101"
}
```

> The *IP ATEM* page lists named switchers. Those names are purely cosmetic: you can
> rename them in `atem-ip.html` without breaking anything.

---

## ▶️ Running the app

### Development / simple use

```bash
npm start
```

Then open **http://localhost:3000** in a browser.

### Kiosk mode (auto-start, fullscreen)

Double-click **`Demarrer-IAtem.bat`**. This script:

1. hides the Windows taskbar;
2. starts the server if it isn't already running;
3. **waits for the server to respond** (no more "404" page at boot);
4. opens Chrome fullscreen on the interface.

To **launch at Windows startup**: put a shortcut to `Demarrer-IAtem.bat` in the
`shell:startup` folder (`Win + R` → type `shell:startup` → Enter).

#### Back to normal Windows

- On the home page, the small **⛶** button (in the *Réglages DIP MIX WIPE* bar)
  toggles **fullscreen ⇄ windowed**. In windowed mode, the Chrome window regains its
  *minimize / close* buttons.
- To bring back the taskbar after closing Chrome, double-click
  **`Afficher-barre-des-taches.bat`**.

---

## 🗂️ Project structure

```
IAtem-control/
├── atem-control/
│   ├── server.js              ← Node.js server (ATEM bridge + HTTP routes)
│   ├── configIP.json          ← switcher IP
│   └── public/                ← web interface (pages, JS, images)
│       ├── index.html
│       ├── mix.html · dip.html · wipe.html · auxatem.html · macro.html
│       ├── mediaplayer.html · supersource.html · atem-ip.html
│       ├── js/
│       └── images/
├── package.json
├── start-iatem.ps1            ← kiosk launcher (hide taskbar + wait server + Chrome)
├── show-taskbar.ps1           ← restores the taskbar
├── Demarrer-IAtem.bat         ← double-click shortcut for the launcher
├── Afficher-barre-des-taches.bat
└── lancement_server-js.bat    ← starts the server only (visible console, debug)
```

---

## 📡 Route reference

The server listens on port **3000**. Main routes consumed by the interface:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/atem-status` | ATEM connection state |
| GET | `/atemCaps` | Connected model capabilities (ME, AUX, SuperSource…) |
| GET | `/currentIP` · POST `/setIP` | Read / change the switcher IP (hot reconnect) |
| GET | `/inputsList` · `/auxInputsList` | Available sources |
| GET | `/currentDuration` · `/changeDuration` | Mix transition duration |
| GET | `/dipSettings` · `/setDipRate` · `/setDipSource` | DIP settings |
| GET | `/getWipeSettings` · `/setWipe…` | Wipe settings (pattern, border, position…) |
| POST | `/transition/:style` | Next transition style |
| GET | `/state` | ME transition state (progress, active style) |
| GET | `/getMediaPlayersState` · `/setMediaPlayer` · `/mpTransport` | Media Players |
| GET | `/getSuperSource` · `/setSuperSourceBox` · `/applySuperSourcePreset` | SuperSource |
| GET | `/getAuxSources` · `/setAuxSource` · `/auxInfo` | AUX outputs |
| GET | `/macrosList` · `/runMacro` · `/macrosRunStatus` | Macros |
| GET | `/ping` | Server availability probe |

Every route is commented in `atem-control/server.js`.

---

## 🔒 Notes & security

- The server is meant for use on a **trusted local network**. There is no
  authentication: any machine on the network can reach the interface.
- Do not expose it directly to the Internet.
- **Windows Firewall**: on first launch, Windows may ask to allow Node.js on the
  network. For **local** use (interface shown on the same machine that runs the server)
  this is **not needed**. Allow it only if you want to reach the panel **from another
  device** — for example the companion Raspberry Pi, or another PC displaying the
  settings remotely.

---

## 📝 License

ISC (see `package.json`).
