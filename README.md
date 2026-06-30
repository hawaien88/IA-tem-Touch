# IA.tem — Panneau de contrôle tactile pour mélangeurs ATEM

🇬🇧 *An English version of this document is available in [README-en.md](README-en.md).*

**IA.tem** est une interface web tactile (pensée pour un écran 1280×800) qui pilote un
mélangeur vidéo **Blackmagic Design ATEM** depuis un navigateur, sans passer par
*ATEM Software Control*. Un petit serveur Node.js fait le pont entre la page web et
le mélangeur via le réseau IP.

L'objectif : transformer un mini-PC + écran tactile en **pupitre de régie dédié**,
qui démarre tout seul en plein écran.

---

## ⚡ Démarrage rapide

1. Installer **[Node.js](https://nodejs.org/)** (18+) et **[Google Chrome](https://www.google.com/chrome/)**.
2. Télécharger le projet puis, dans son dossier, lancer **`npm install`**.
3. Renseigner l'IP du mélangeur (page *IP ATEM* de l'interface, ou `atem-control/configIP.json`).
4. Double-cliquer sur **`Demarrer-IAtem.bat`**.
5. Pour un démarrage **automatique avec Windows** : placer un raccourci de ce `.bat` dans `shell:startup`.

> ⚠️ **Google Chrome est requis pour le mode borne** (plein écran automatique), car le
> lanceur l'ouvre avec des options spécifiques. Sans Chrome, l'app reste utilisable via
> `npm start` dans n'importe quel navigateur moderne, mais sans le plein écran automatique.

---

## ✨ Fonctionnalités

- 🎛️ **Transitions** : MIX, DIP, WIPE, STING, DVE — déclenchement et réglages
- ⏱️ **Durées** de transition réglables par *Mix Effect* (ME1 / ME2)
- 🌫️ **DIP** : source et durée
- 🪟 **WIPE** : motif, bordure, adoucissement, position, sens, symétrie…
- 🖼️ **Media Players** : sélection d'images fixes / clips + transport (lecture, boucle…)
- 🧩 **SuperSource** : placement des fenêtres, recadrage, et **presets** prêts à l'emploi
- 📺 **Sorties AUX** : routage des sources vers chaque sortie
- 🎬 **Macros** : liste et exécution des macros du mélangeur
- 🔌 **Changement d'ATEM à chaud** : on choisit l'IP du mélangeur depuis l'interface
- 🟢 **Indicateurs d'état** : ATEM connecté / Raspberry Pi joignable
- 🖥️ **Mode borne** : démarrage automatique, plein écran, barre des tâches masquée

L'interface s'adapte au **modèle d'ATEM connecté** : les fonctions absentes (ex. la
SuperSource sur un ATEM Mini Pro) sont automatiquement grisées.

---

## 🧠 Comment ça fonctionne

L'application est constituée de **deux parties** qui tournent sur la même machine.

```
   Écran tactile (navigateur Chrome)
            │  HTTP  (http://localhost:3000)
            ▼
   ┌──────────────────────────┐        protocole ATEM (UDP)
   │  Serveur Node.js/Express  │ ─────────────────────────────▶  Mélangeur ATEM
   │     atem-control/server.js │ ◀─────────────────────────────  (sur le réseau IP)
   └──────────────────────────┘            état en temps réel
```

1. **Le serveur** (`atem-control/server.js`) se connecte au mélangeur grâce à la
   bibliothèque [`atem-connection`](https://www.npmjs.com/package/atem-connection).
   Il maintient en permanence l'état de l'ATEM et expose une série de **routes HTTP**
   (voir [Référence des routes](#-référence-des-routes)).
2. **L'interface** (dossier `atem-control/public/`) est un ensemble de pages HTML/CSS/JS
   servies par ce même serveur. Chaque bouton appelle une route, qui traduit l'action
   en commande ATEM puis renvoie le résultat.
3. **La configuration** (`atem-control/configIP.json`) ne contient qu'une chose :
   l'adresse IP du mélangeur. Elle est modifiable **en direct** depuis la page
   *IP ATEM*, sans redémarrer le serveur.

### Les pages de l'interface

| Page | Rôle |
|------|------|
| `index.html` | Menu principal + barre de transitions + sélecteur ME1/ME2 + état |
| `mix.html` | Durée de la transition Mix |
| `dip.html` | Source et durée du DIP |
| `wipe.html` | Tous les réglages du Wipe |
| `mediaplayer.html` | Media Players (images / clips + transport) |
| `supersource.html` | Fenêtres SuperSource + presets |
| `auxatem.html` | Routage des sorties AUX |
| `macro.html` | Liste et lancement des macros |
| `atem-ip.html` | Choix / connexion de l'IP du mélangeur |

### Intégration Raspberry Pi (optionnelle)

L'interface peut afficher le **ME actif réel** poussé par un Raspberry Pi compagnon
(routes `/me-update` et `/me-current`) et propose un bouton *CONFIG RPI* qui ouvre la
page de configuration servie par le Raspberry Pi.

Cette intégration est **facultative**. L'adresse du Raspberry Pi se règle en un seul
endroit, en haut du script de `atem-control/public/index.html` :

```js
const rpiIP = ""; // ex. "192.168.12.103" — laisser vide si pas de Raspberry Pi
```

- Si `rpiIP` est **renseignée**, le bouton *CONFIG RPI* pointe vers
  `http://<rpiIP>:3000/config.html`.
- Si `rpiIP` est **vide** (`""`, valeur par défaut), le bouton *CONFIG RPI* est
  **automatiquement grisé** (pas de page 404) et la supervision du Raspberry Pi est
  désactivée.

> 💡 Pour créer le **pupitre complet avec Raspberry Pi**, voir le dépôt compagnon
> *atem-panel*. Cette version Windows fonctionne **avec ou sans** Raspberry Pi.

---

## 📋 Prérequis

- **Windows 10 / 11**
- **[Node.js](https://nodejs.org/)** 18 LTS ou plus récent (inclut `npm`)
- **Google Chrome** — **obligatoire** pour le démarrage automatique en plein écran
  (mode borne). Pour un usage simple via `npm start`, n'importe quel navigateur
  moderne convient.
- Un mélangeur **ATEM** accessible sur le réseau IP local

---

## 🚀 Installation

```bash
# 1. Récupérer le projet
git clone <url-du-depot> IAtem-control
cd IAtem-control

# 2. Installer les dépendances
npm install
```

---

## ⚙️ Configuration

L'IP du mélangeur se règle de deux façons :

- **Depuis l'interface** (recommandé) : page *IP ATEM* → choisir un mélangeur ou
  saisir une adresse → *Enregistrer*. La reconnexion se fait à chaud.
- **À la main** : éditer `atem-control/configIP.json` :

```json
{
  "atemIP": "192.168.12.101"
}
```

> La page *IP ATEM* propose une liste de mélangeurs nommés. Ces noms sont
> purement décoratifs : tu peux les renommer dans `atem-ip.html` sans rien casser.

---

## ▶️ Lancer l'application

### En développement / usage simple

```bash
npm start
```

Puis ouvre **http://localhost:3000** dans un navigateur.

### En mode borne (démarrage automatique plein écran)

Double-clique sur **`Demarrer-IAtem.bat`**. Ce script :

1. masque la barre des tâches Windows ;
2. démarre le serveur s'il ne tourne pas déjà ;
3. **attend que le serveur réponde** (plus de page « 404 » au démarrage) ;
4. ouvre Chrome en plein écran sur l'interface.

Pour un **lancement au démarrage de Windows** : place un raccourci vers
`Demarrer-IAtem.bat` dans le dossier `shell:startup`
(`Win + R` → tape `shell:startup` → Entrée).

#### Revenir à Windows normal

- Sur la page d'accueil, le petit bouton **⛶** (dans la barre *Réglages DIP MIX WIPE*)
  bascule **plein écran ⇄ fenêtré**. En mode fenêtré, la fenêtre Chrome retrouve ses
  boutons *réduire / fermer*.
- Pour réafficher la barre des tâches après avoir fermé Chrome, double-clique sur
  **`Afficher-barre-des-taches.bat`**.

---

## 🗂️ Structure du projet

```
IAtem-control/
├── atem-control/
│   ├── server.js              ← serveur Node.js (pont vers l'ATEM + routes HTTP)
│   ├── configIP.json          ← IP du mélangeur
│   └── public/                ← interface web (pages, JS, images)
│       ├── index.html
│       ├── mix.html · dip.html · wipe.html · auxatem.html · macro.html
│       ├── mediaplayer.html · supersource.html · atem-ip.html
│       ├── js/
│       └── images/
├── package.json
├── start-iatem.ps1            ← lanceur borne (masque barre + attend serveur + Chrome)
├── show-taskbar.ps1           ← réaffiche la barre des tâches
├── Demarrer-IAtem.bat         ← raccourci double-clic du lanceur
├── Afficher-barre-des-taches.bat
└── lancement_server-js.bat    ← lance seulement le serveur (console visible, debug)
```

---

## 📡 Référence des routes

Le serveur écoute sur le port **3000**. Principales routes consommées par l'interface :

| Méthode | Route | Rôle |
|--------|-------|------|
| GET | `/atem-status` | État de connexion à l'ATEM |
| GET | `/atemCaps` | Capacités du modèle connecté (ME, AUX, SuperSource…) |
| GET | `/currentIP` · POST `/setIP` | Lire / changer l'IP du mélangeur (reconnexion à chaud) |
| GET | `/inputsList` · `/auxInputsList` | Sources disponibles |
| GET | `/currentDuration` · `/changeDuration` | Durée de transition Mix |
| GET | `/dipSettings` · `/setDipRate` · `/setDipSource` | Réglages DIP |
| GET | `/getWipeSettings` · `/setWipe…` | Réglages Wipe (motif, bordure, position…) |
| POST | `/transition/:style` | Style de la prochaine transition |
| GET | `/state` | État de transition du ME (progression, style actif) |
| GET | `/getMediaPlayersState` · `/setMediaPlayer` · `/mpTransport` | Media Players |
| GET | `/getSuperSource` · `/setSuperSourceBox` · `/applySuperSourcePreset` | SuperSource |
| GET | `/getAuxSources` · `/setAuxSource` · `/auxInfo` | Sorties AUX |
| GET | `/macrosList` · `/runMacro` · `/macrosRunStatus` | Macros |
| GET | `/ping` | Sonde de disponibilité du serveur |

Chaque route est commentée dans `atem-control/server.js`.

---

## 🔒 Notes & sécurité

- Le serveur est prévu pour un usage sur **réseau local de confiance**. Il n'y a pas
  d'authentification : toute machine du réseau peut atteindre l'interface.
- Évite de l'exposer directement sur Internet.
- **Pare-feu Windows** : au premier lancement, Windows peut demander d'autoriser
  Node.js sur le réseau. Pour un usage **local** (interface affichée sur la machine qui
  fait tourner le serveur), ce n'est **pas nécessaire**. Autorise-le seulement si tu
  veux atteindre le pupitre **depuis un autre appareil** — par exemple le Raspberry Pi
  compagnon, ou un autre PC qui afficherait les réglages à distance.

---

## 📝 Licence

ISC (voir `package.json`).
