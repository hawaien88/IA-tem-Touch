const express = require('express');
const fs      = require('fs');
const { Atem } = require('atem-connection');
const path = require('path');
const { Commands } = require('atem-connection');
const { Enums } = require('atem-connection');

const currentTransitionStyles = {};  // Clé = index de ME (0 = ME1, 1 = ME2, etc.)

const {
  TransitionPropertiesCommand,
  TransitionWipeCommand,
  TransitionMixCommand,
  TransitionDipCommand,
  AuxSourceCommand,
  SuperSourceBoxParametersCommand,
  MediaPlayerSourceCommand,
  MediaPlayerStatusCommand,
  MacroActionCommand
} = Commands;

// Valeur de repli si videoMode indisponible
const DEFAULT_FPS = 60;

// map videoMode (code ATEM) → fps réel
const modeToFps = {
  0: 59.94,  // 525i59.94 NTSC 4:3
  1: 50,     // 625i50 PAL 4:3
  2: 59.94,  // 525i59.94 NTSC 16:9
  3: 50,     // 625i50 PAL 16:9
  4: 50,     // 720p50
  5: 59.94,  // 720p59.94
  6: 50,     // 1080i50
  7: 59.94,  // 1080i59.94
  10: 59.94, // HD_1080i_5994
  11: 50,    // 1080p50
  12: 59.94  // 1080p5994
};



const app = express();
/*app.use(express.static('public'));*/
app.use(express.json());

// Chemin du fichier de config résolu relativement à ce script (et non au dossier courant),
// pour que l'app fonctionne quel que soit le dossier d'installation et le mode de lancement (.bat, npm start, service...).
const CONFIG_PATH = path.join(__dirname, 'configIP.json');

let config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const atem = new Atem();
const mixEffectIndex = 0;

let currentDuration = 15;
let dipRate  = 15;
let dipInput = 1;

let atemStatus = 'disconnected'; // Valeur par défaut

//debut ajout
atem.on('info', info => {
  console.log('ATEM info:', info);
  if (info === 'reconnect') {
    atemStatus = 'disconnected'; // ➕ MAJ statut
  }
});

// GET /atem-status : renvoie l'état de connexion à l'ATEM ('connected' / 'disconnected')
app.get('/atem-status', (req, res) => {
  res.json({ status: atemStatus });
});

// Capacités du modèle connecté (pour masquer/désactiver ce qui n'existe pas)
app.get('/atemCaps', (req, res) => {
  const caps = atem.state?.info?.capabilities || {};
  const modelId = atem.state?.info?.model;
  let modelName = 'Inconnu';
  try { if (modelId != null && Enums?.Model?.[modelId]) modelName = Enums.Model[modelId]; } catch (e) {}
  const isMini = /mini/i.test(modelName); // les ATEM Mini (Pro/ISO/Extreme) ne gèrent pas les clips
  res.json({
    connected: atemStatus === 'connected',
    model: modelName,
    isMini,
    mediaPlayers: caps.mediaPlayers ?? null,
    superSources: caps.superSources ?? null,
    auxilliaries: caps.auxilliaries ?? null,
    mixEffects: caps.mixEffects ?? null
  });
});
//fin ajout
atem.connect(config.atemIP);

atem.on('connected', () => {
  console.log('✅ ATEM connecté à', config.atemIP);
  atemStatus = 'connected';
  // Ajout ici : Réinitialisation des MediaPlayers au démarrage
  resetAllMediaPlayersToStill();
});



atem.on('stateChanged', (state, path) => {
//	console.log('État ATEM mis à jour');
  const mix = state.video.mixEffects[mixEffectIndex].transitionSettings.mix;
  currentDuration = Math.round(mix.rate);

  const dp = state.video.mixEffects[mixEffectIndex].transitionSettings.dip;
  if (dp) {
    dipRate  = dp.rate;
    dipInput = dp.input;
  }  
});


/* ----- MIX ----- */
// Pour stocker la durée par ME, on utilise un tableau (ou objet)
const durations = [currentDuration || 30, currentDuration || 30]; // valeurs initiales par défaut (exemple 30)

// GET /currentDuration?me=0|1 : renvoie la durée de transition MIX (en frames) du ME demandé
app.get('/currentDuration', (req, res) => {
  const me = parseInt(req.query.me, 10);
  if (me !== 0 && me !== 1) {
    return res.status(400).json({ error: 'ME invalide' });
  }
  res.json({ duration: durations[me] });
});

// GET /changeDuration?me=0|1&delta=±N : ajuste la durée de transition MIX du ME (bornée 1–250) et l'envoie à l'ATEM
app.get('/changeDuration', async (req, res) => {
  const me = parseInt(req.query.me, 10);
  const delta = parseInt(req.query.delta, 10);

  if (me !== 0 && me !== 1) {
    return res.status(400).json({ error: 'ME invalide' });
  }

  // Met à jour la durée locale pour ce ME
  durations[me] = Math.max(1, Math.min(250, (durations[me] || 30) + delta));

  // Envoi la commande à l'ATEM pour le ME demandé
  const cmd = new TransitionMixCommand(me, durations[me]);

  try {
    await atem.sendCommand(cmd);
    res.json({ duration: durations[me] });
  } catch (e) {
    console.error('Erreur mix → ATEM', e);
    res.status(500).json({ error: 'Échec mix' });
  }
});


// Stockage par ME (exemple 2 ME)
const dipRates = [30, 30];   // valeurs par défaut pour ME1 et ME2
const dipInputs = [0, 0];    // valeurs par défaut par ME

/* ----- DIP ----- */
app.get('/dipSettings', (req, res) => {
  const me = parseInt(req.query.me, 10) || 0;
  res.json({ rate: dipRates[me], input: dipInputs[me] });
});

/* ----- setDipRate ----- */
app.get('/setDipRate', async (req, res) => {
  const me = parseInt(req.query.me, 10) || 0;
  const { delta, value } = req.query;

  dipRates[me] = value !== undefined
    ? Math.max(1, Math.min(250, parseInt(value, 10)))
    : Math.max(1, Math.min(250, dipRates[me] + parseInt(delta, 10)));

  const cmd = new TransitionDipCommand(me);
  Object.assign(cmd.properties, { rate: dipRates[me], input: dipInputs[me] });
  cmd.flag = TransitionDipCommand.MaskFlags.rate | TransitionDipCommand.MaskFlags.input;

  try {
    await atem.sendCommand(cmd);
    res.json({ rate: dipRates[me], input: dipInputs[me] });
  } catch (err) {
    console.error('Erreur setDipRate → ATEM', err);
    res.status(500).json({ error: 'Échec setDipRate' });
  }
});

/* ----- setDipSource ----- */
app.get('/setDipSource', async (req, res) => {
  const me = parseInt(req.query.me, 10) || 0;
  const input = parseInt(req.query.input, 10);
  if (isNaN(input)) {
    return res.status(400).json({ error: 'Entrée invalide' });
  }

  dipInputs[me] = input;

  const cmd = new TransitionDipCommand(me);
  Object.assign(cmd.properties, { rate: dipRates[me], input: dipInputs[me] });
  cmd.flag = TransitionDipCommand.MaskFlags.rate | TransitionDipCommand.MaskFlags.input;

  try {
    await atem.sendCommand(cmd);
    res.json({ rate: dipRates[me], input: dipInputs[me] });
  } catch (err) {
    console.error('Erreur setDipSource → ATEM', err);
    res.status(500).json({ error: 'Échec setDipSource' });
  }
});


// GET /inputsList : liste les sources sélectionnables (entrées physiques 1–16 + sources internes : Black, Color Bars, Color 1/2, Media Players)
app.get('/inputsList', (req, res) => {
  const state = atem.state;

  // 1) Inputs physiques 1 à 16
  const phys = state?.inputs
    ? Object.values(state.inputs)
        .filter(inp => inp.inputId >= 1 && inp.inputId <= 16)
        .map(inp => ({ id: inp.inputId, name: inp.longName }))
    : [];

  // 2) Extras corrigés avec les bons IDs
  const extras = [
    { id: 0,    name: 'Black' },
    { id: 1000, name: 'Color Bars' },
    { id: 2001, name: 'Color 1' },
    { id: 2002, name: 'Color 2' },
    { id: 3010, name: 'Media Player 1' },
    { id: 3011, name: 'Media Player 1 Key' },
    { id: 3020, name: 'Media Player 2' },
    { id: 3021, name: 'Media Player 2 Key' }
  ];

  const all = [ ...extras, ...phys ];
  all.sort((a, b) => a.id - b.id);

  res.json(all);
});

// GET /currentIP : renvoie l'IP de l'ATEM actuellement configurée (lue depuis configIP.json)
app.get('/currentIP', (req, res) => {
  res.send({ atemIP: config.atemIP });
});

// POST /setIP { ip } : enregistre la nouvelle IP dans configIP.json et reconnecte l'ATEM à chaud (sans relancer le serveur)
app.post('/setIP', async (req, res) => {
  const newIP = req.body.ip;
  config.atemIP = newIP;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  // Reconnexion immédiate à la nouvelle IP (sans relancer le serveur)
  try {
    atemStatus = 'disconnected';
    try { await atem.disconnect(); } catch (e) { /* déjà déconnecté */ }
    await atem.connect(newIP);
    console.log('🔄 Reconnexion ATEM demandée sur', newIP);
    res.send({ status: 'IP mise à jour', atemIP: newIP });
  } catch (err) {
    console.error('❌ Échec reconnexion ATEM:', err.message);
    res.status(500).send({ error: 'Reconnexion échouée', detail: err.message });
  }
});


/* ----- Media Player Selection ----- */
app.get('/setMediaPlayer', async (req, res) => {
  const { id, slot } = req.query;
  const mpId = parseInt(id, 10);

  // Résolution correcte du mediaPlayerId (0 ou 1)
  const playerIndex = mpId === 3010 ? 0 : mpId === 3020 ? 1 : null;
  if (playerIndex === null) {
    return res.status(400).json({ error: 'ID Media Player invalide' });
  }

  // Format valide attendu : clip1, still12, etc.
  const slotMatch = slot?.match(/^(clip|still)(\d+)$/);
  if (!slotMatch) {
    return res.status(400).json({ error: 'Format slot invalide' });
  }

  const [, type, indexStr] = slotMatch;
  const index = parseInt(indexStr, 10);

  if ((type === 'clip' && (index < 1 || index > 2)) ||
      (type === 'still' && (index < 1 || index > 32))) {
    return res.status(400).json({ error: 'Index hors plage' });
  }

  // Création de la commande source
  const cmd = new MediaPlayerSourceCommand(playerIndex);
  const flags = cmd.constructor.MaskFlags;

  try {
    if (type === 'clip') {
      cmd.properties.clipIndex = index - 1;
      cmd.properties.sourceType = 2; // MediaSourceType.Clip
      cmd.flag = flags.clipIndex | flags.sourceType;
      await atem.sendCommand(cmd);
    } else {
      // Image fixe : on stoppe d'abord une éventuelle lecture de clip en cours.
      // Sur les gros switchers (Production), tant que le clip "joue" (playing/loop),
      // l'ATEM ignore la bascule vers une image fixe -> on force playing=false avant.
      try {
        const stop = new MediaPlayerStatusCommand(playerIndex);
        stop.properties.playing = false;
        stop.flag = MediaPlayerStatusCommand.MaskFlags.playing;
        await atem.sendCommand(stop);
      } catch (e) {
        console.warn('⚠️ Stop lecture MediaPlayer non appliqué:', e.message);
      }

      cmd.properties.stillIndex = index - 1;
      cmd.properties.sourceType = 1; // MediaSourceType.Still
      cmd.flag = flags.stillIndex | flags.sourceType;
      await atem.sendCommand(cmd);
    }

    res.json({ status: '🎬 Media slot appliqué avec succès', id: mpId, slot });
  } catch (err) {
    console.error(`❌ Erreur setMediaPlayer ${id}:`, err.message);
    res.status(500).json({ error: 'Échec setMediaPlayer' });
  }
});



/* ----- État des Media Players ----- */
app.get('/getMediaPlayersState', (req, res) => {
  const state = atem.state;
  if (!state || !state.media || !state.media.players) {
    return res.status(500).json({ error: 'État ATEM non disponible' });
  }

  const response = state.media.players.map((player, index) => ({
    index,
    sourceType: player.sourceType === 1 ? 'Still' : 'Clip', // MediaSourceType.Still = 1
    stillIndex: player.stillIndex,
    clipIndex: player.clipIndex,
    playing: player.playing,
    loop: player.loop,
    clipFrame: player.clipFrame
  }));

  res.json({ mediaPlayers: response });
});

/* ----- Contrôles de lecture d'un clip (transport) ----- */
app.get('/mpTransport', async (req, res) => {
  const mpId = parseInt(req.query.id, 10);
  const action = req.query.action;
  const player = mpId === 3010 ? 0 : mpId === 3020 ? 1 : null;
  if (player === null) {
    return res.status(400).json({ error: 'ID Media Player invalide' });
  }

  const cur = atem.state?.media?.players?.[player] || {};

  try {
    switch (action) {
      case 'beginning':
        await atem.setMediaPlayerSettings({ playing: false, atBeginning: true, clipFrame: 0 }, player);
        break;
      case 'playpause':
        await atem.setMediaPlayerSettings({ playing: !cur.playing }, player);
        break;
      case 'prev':
        await atem.setMediaPlayerSettings({ playing: false, clipFrame: Math.max(0, (cur.clipFrame || 0) - 1) }, player);
        break;
      case 'next':
        await atem.setMediaPlayerSettings({ playing: false, clipFrame: (cur.clipFrame || 0) + 1 }, player);
        break;
      case 'loop':
        await atem.setMediaPlayerSettings({ loop: !cur.loop }, player);
        break;
      default:
        return res.status(400).json({ error: 'Action inconnue' });
    }

    const after = atem.state?.media?.players?.[player] || {};
    res.json({ status: 'ok', playing: after.playing, loop: after.loop, clipFrame: after.clipFrame });
  } catch (err) {
    console.error('❌ Erreur mpTransport:', err.message);
    res.status(500).json({ error: 'Échec commande transport' });
  }
});

/* ----- Forçage du type de source (Still ou Clip) ----- */
app.get('/forceMediaPlayerSourceType', async (req, res) => {
  const { id, type } = req.query;
  const mpId = parseInt(id, 10);
  const sourceType = type === 'still' ? 1 : type === 'clip' ? 2 : null; // MediaSourceType: Still=1, Clip=2

  if (sourceType === null || (mpId !== 3010 && mpId !== 3020)) {
    return res.status(400).json({ error: 'Paramètres invalides' });
  }

  const cmd = new MediaPlayerSourceCommand(mpId - 3010);
  cmd.properties.sourceType = sourceType;
  cmd.flag = MediaPlayerSourceCommand.MaskFlags.sourceType;

  try {
    await atem.sendCommand(cmd);
    res.json({ status: 'Type de source forcé', id: mpId, sourceType: type });
  } catch (err) {
    console.error('❌ Erreur forceMediaPlayerSourceType:', err.message);
    res.status(500).json({ error: 'Échec changement de type' });
  }
});

const { MacroAction } = require('atem-connection/dist/enums');



/* ----- MACROS ----- */
// GET /macrosList : liste les macros enregistrées sur l'ATEM (id + nom)
app.get('/macrosList', (req, res) => {
  const macroProps = atem.state?.macro?.macroProperties;

  if (!macroProps || Object.keys(macroProps).length === 0) {
    return res.status(500).json({ error: 'Pas de macros disponibles' });
  }

  const macros = Object.entries(macroProps).map(([index, macro]) => ({
    id: Number(index),
    name: macro.name || `Macro ${index}`
  }));

  res.json(macros);
});


// GET /runMacro?id=N : déclenche l'exécution de la macro N sur l'ATEM
app.get('/runMacro', (req, res) => {
  const id = parseInt(req.query.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID macro invalide' });
  }

  try {
    const command = new MacroActionCommand(id, MacroAction.Run);
    atem.sendCommand(command);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur run macro:', err);
    res.status(500).json({ error: 'Échec exécution macro' });
  }
});

// GET /macrosRunStatus : indique quelle macro est en cours d'exécution (macroIndex), ou null si aucune
app.get('/macrosRunStatus', (req, res) => {
  const player = atem.state?.macro?.macroPlayer;
  if (!player || !player.isRunning) {
    return res.json({ macroIndex: null });
  }

  res.json({ macroIndex: player.macroIndex });
});

// Construit la liste des sources réellement assignables à une sortie AUX/Output sur le modèle connecté
function buildAuxSourceList() {
  const state = atem.state;
  if (!state || !state.inputs) return [];

  // Bit "Auxiliary" du masque sourceAvailability (1 si la lib ne l'expose pas)
  const AUX_BIT = (Enums && Enums.SourceAvailability && Enums.SourceAvailability.Auxiliary) || 1;

  // On ne garde que les sources que l'ATEM autorise sur une sortie AUX
  // (inclut automatiquement Program/Preview/Multiview/Clean feed/Media players selon le modèle)
  let list = Object.values(state.inputs)
    .filter(inp => typeof inp.sourceAvailability === 'number' && (inp.sourceAvailability & AUX_BIT) !== 0)
    .map(inp => ({ id: inp.inputId, name: inp.longName || inp.shortName || `Source ${inp.inputId}` }));

  // Repli si la lib n'expose pas sourceAvailability : ancienne liste (physiques 1-16 + sources internes)
  if (list.length === 0) {
    const phys = Object.values(state.inputs)
      .filter(inp => inp.inputId >= 1 && inp.inputId <= 16)
      .map(inp => ({ id: inp.inputId, name: inp.longName }));
    const extras = [
      { id: 0, name: 'Black' }, { id: 1000, name: 'Color Bars' },
      { id: 2001, name: 'Color 1' }, { id: 2002, name: 'Color 2' },
      { id: 3010, name: 'Media Player 1' }, { id: 3011, name: 'Media Player 1 Key' },
      { id: 3020, name: 'Media Player 2' }, { id: 3021, name: 'Media Player 2 Key' },
      { id: 10010, name: 'ME 1 Program' }, { id: 10011, name: 'ME 1 Preview' }
    ];
    list = [ ...extras, ...phys ];
  }

  list.sort((a, b) => a.id - b.id);
  return list;
}

// GET /auxInputsList : liste les sources assignables à une sortie AUX/Output sur le modèle connecté
app.get('/auxInputsList', (req, res) => {
  res.json(buildAuxSourceList());
});

// nombre de sorties AUX/Output du modèle + libellé + sources autorisées par sortie
app.get('/auxInfo', (req, res) => {
  const state = atem.state;
  let count = state?.info?.capabilities?.auxilliaries ?? 0;
  if (!count && state?.video?.auxilliaries) {
    count = Object.keys(state.video.auxilliaries).length;
  }
  const modelId = state?.info?.model;
  let modelName = 'Inconnu';
  try { if (modelId != null && Enums?.Model?.[modelId]) modelName = Enums.Model[modelId]; } catch (e) {}
  const isMini = /mini/i.test(modelName);

  // Les sorties configurables des Mini ont des menus restreints (côté ATEM Software Control)
  // que le protocole n'expose pas. On reproduit ce comportement ici.
  // Sources "Direct" d'entrée : id >= 11001 (11001 = direct input 1, 11002 = direct input 2, ...)
  const allIds = buildAuxSourceList().map(s => s.id);
  const isDirect = id => id >= 11001;
  const nonDirect = allIds.filter(id => !isDirect(id));

  const outputs = [];
  for (let i = 0; i < count; i++) {
    if (isMini && count >= 2) {
      const usbIndex = count - 1; // la dernière sortie d'un Mini est l'USB/Webcam
      if (i < usbIndex) {
        // Sortie(s) HDMI : tout sauf les "Direct" des AUTRES entrées (garde le sien : 11001 + i)
        const ownDirect = 11001 + i;
        const allowed = allIds.filter(id => !isDirect(id) || id === ownDirect);
        const label = (count === 2) ? 'Sortie HDMI' : `Sortie HDMI ${i + 1}`;
        outputs.push({ label, allowed });
      } else if (count === 2) {
        // Mini Pro : sortie USB restreinte à Multi View / Program / Preview
        const allowed = [9001, 10010, 10011].filter(id => allIds.includes(id));
        outputs.push({ label: 'Sortie USB (Webcam)', allowed });
      } else {
        // Mini Extreme : sortie USB = tout sauf tous les "Direct"
        outputs.push({ label: 'Sortie USB (Webcam)', allowed: nonDirect });
      }
    } else if (isMini) {
      outputs.push({ label: 'Sortie HDMI / Webcam', allowed: null });
    } else {
      outputs.push({ label: `AUX ${i + 1}`, allowed: null });
    }
  }

  res.json({ count, model: modelName, isMini, connected: atemStatus === 'connected', outputs });
});

// route de diagnostic : expose les champs bruts utiles (à ouvrir dans le navigateur)
app.get('/auxDebug', (req, res) => {
  const s = atem.state;
  res.json({
    connected: atemStatus,
    model: s?.info?.model,
    modelName: (Enums?.Model && s?.info?.model != null) ? Enums.Model[s.info.model] : null,
    capabilities: s?.info?.capabilities ?? null,
    auxilliaries: s?.video?.auxilliaries ?? null,
    inputsSample: s?.inputs
      ? Object.values(s.inputs).slice(0, 5).map(i => ({
          id: i.inputId, name: i.longName,
          sourceAvailability: i.sourceAvailability, meAvailability: i.meAvailability
        }))
      : null
  });
});




// route pour recuperer les sources assignees aux 6 sorties aux
app.get('/getAuxSources', (req, res) => {
  const state = atem.state;
  if (!state || !state.video || !state.video.auxilliaries) {
    return res.status(500).json({ error: 'État AUX non disponible' });
  }

  let count = state?.info?.capabilities?.auxilliaries ?? 0;
  if (!count) count = Object.keys(state.video.auxilliaries).length;

  const sources = [];
  for (let i = 0; i < count; i++) {
    sources[i] = state.video.auxilliaries[i] ?? 0;
  }

  res.json({ sources });
});


// route pour modifier dynamiquement la source d une sortie AUX
app.get('/setAuxSource', async (req, res) => {
  const auxIndex = parseInt(req.query.aux, 10);
  const sourceId = parseInt(req.query.source, 10);

  let auxCount = atem.state?.info?.capabilities?.auxilliaries ?? 0;
  if (!auxCount) auxCount = Object.keys(atem.state?.video?.auxilliaries ?? {}).length;
  if (!auxCount) auxCount = 6;
  if (isNaN(auxIndex) || isNaN(sourceId) || auxIndex < 0 || auxIndex >= auxCount) {
    return res.status(400).json({ error: 'Paramètres AUX invalides' });
  }

  try {
    const command = new AuxSourceCommand(auxIndex, sourceId);
    await atem.sendCommand(command);
	
//	console.log('🎯 AUX routes après action:', atem.state.video.auxilliaries);
	
    res.json({ status: '✅ Source AUX modifiée', aux: auxIndex, source: sourceId });
  } catch (err) {
    console.error(`❌ Erreur setAuxSource AUX${auxIndex}:`, err.message);
    res.status(500).json({ error: 'Échec changement source AUX' });
  }
});



// POST /transition/:style?me=0|1 : définit le style de la prochaine transition du ME (0=Mix,1=Dip,2=Wipe,3=DVE,4=Sting)
app.post('/transition/:style', async (req, res) => {
  const style = parseInt(req.params.style, 10);
  const me = parseInt(req.query.me ?? '0', 10); // ← valeur par défaut : 0

  if (isNaN(style) || style < 0 || style > 4) {
    return res.status(400).json({ error: 'Style de transition invalide' });
  }

  if (isNaN(me) || me < 0 || me > 1) {
    return res.status(400).json({ error: 'ME invalide' });
  }

  try {
    const cmd = new TransitionPropertiesCommand(me); // ← utilise le bon ME
    cmd.properties.nextStyle = style;
    cmd.properties.nextSelection = [1]; // tu peux l’adapter si besoin
    cmd.flag = TransitionPropertiesCommand.MaskFlags.nextStyle | TransitionPropertiesCommand.MaskFlags.nextSelection;

    await atem.sendCommand(cmd);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur transition:', err.message);
    res.status(500).json({ error: 'Échec changement transition' });
  }
});


// Route GET /state prenant en compte le ME actif
app.get('/state', (req, res) => {
  const meIndex = parseInt(req.query.me ?? '0', 10);
  const me = atem.state?.video?.mixEffects?.[meIndex];

  if (!me) {
    return res.status(400).json({ error: 'ME invalide ou inexistant' });
  }

  const inTransition = me.transitionPosition?.inTransition || false;
  const nextStyle = me.transitionProperties?.nextStyle ?? null;
  const position = me.transitionPosition?.handlePosition ?? 0;

  // Si une transition commence pour ce ME, on mémorise le style actif
  if (inTransition && currentTransitionStyles[meIndex] == null) {
    currentTransitionStyles[meIndex] = nextStyle;
  }

  // Si la transition est finie, on efface pour ce ME
  if (!inTransition) {
    currentTransitionStyles[meIndex] = null;
  }

  res.json({
    inTransition,
    currentStyle: nextStyle,                        // Style sélectionné pour la prochaine transition
    activeStyle: currentTransitionStyles[meIndex],  // Style en cours (si en transition)
    position,
  });
});


// super source ci dessous

// 🔍 Récupération de l’état complet de la SuperSource
app.get('/getSuperSource', (req, res) => {
  const state = atem.state;
  const ssrc = state?.video?.superSources?.[0]; // Index 0 pour SuperSource 1

  if (!ssrc || !ssrc.boxes) {
    return res.status(500).json({ error: 'SuperSource non disponible' });
  }

  const boxes = Object.entries(ssrc.boxes).map(([index, box]) => ({
    box: parseInt(index),
    enabled: box.enabled,
    source: box.source,
    x: box.x,
    y: box.y,
    width: box.size,
    height: box.size, // ATEM ne fournit pas hauteur séparément
    cropped: box.cropped,
	top: box.cropTop,
    bottom: box.cropBottom,
    left: box.cropLeft,
    right: box.cropRight,
  }));

  res.json({ boxes });
});



// GET /setSuperSourceBox?index=0..3&... : modifie une fenêtre (box) de la SuperSource (enabled, source, x, y, width, crop top/bottom/left/right)
app.get('/setSuperSourceBox', async (req, res) => {
  const boxIndex = parseInt(req.query.index, 10);
  if (isNaN(boxIndex) || boxIndex < 0 || boxIndex > 3) {
    return res.status(400).json({ error: 'Index de fenêtre invalide' });
  }

  const props = {};
  const flags = SuperSourceBoxParametersCommand.MaskFlags;
  let cmdFlag = 0;

  // 🎛️ Paramètres généraux
  if ('enabled' in req.query) {
    props.enabled = req.query.enabled === 'true';
    cmdFlag |= flags.enabled;
  }
  if ('source' in req.query) {
    props.source = parseInt(req.query.source, 10);
    cmdFlag |= flags.source;
  }
  if ('x' in req.query) {
    props.x = parseInt(req.query.x, 10);
    cmdFlag |= flags.x;
  }
  if ('y' in req.query) {
    props.y = parseInt(req.query.y, 10);
    cmdFlag |= flags.y;
  }
  if ('width' in req.query) {
    props.size = parseInt(req.query.width, 10); // conversion en size ATEM
    cmdFlag |= flags.size;
  }

  // ✂️ Gestion du Crop
  const cropFields = ['top', 'bottom', 'left', 'right'];
  let cropEnabled = false;

  for (const field of cropFields) {
    if (field in req.query) {
      const val = parseInt(req.query[field], 10);
      props[`crop${field.charAt(0).toUpperCase() + field.slice(1)}`] = val;
      cmdFlag |= flags[`crop${field.charAt(0).toUpperCase() + field.slice(1)}`];
      cropEnabled = true;
    }
  }

  if ('cropped' in req.query) {
  const isCropped = req.query.cropped === 'true';
  props.cropEnable = isCropped;
  props.cropped = isCropped;
  cmdFlag |= flags.cropEnable;
  cmdFlag |= flags.cropped;

  if (isCropped) {
    for (const field of ['top', 'bottom', 'left', 'right']) {
      if (field in req.query) {
        const val = parseInt(req.query[field], 10);
        props[`crop${field.charAt(0).toUpperCase() + field.slice(1)}`] = val;
        cmdFlag |= flags[`crop${field.charAt(0).toUpperCase() + field.slice(1)}`];
      }
    }
  }
}


  // 🚀 Envoi à l’ATEM
  try {
    const cmd = new SuperSourceBoxParametersCommand(0, boxIndex);
    Object.assign(cmd.properties, props);
    cmd.flag = cmdFlag;

    await atem.sendCommand(cmd);

    res.json({
      status: '✅ Fenêtre mise à jour',
      box: boxIndex,
      properties: props
    });
  } catch (err) {
    console.error(`❌ Erreur setSuperSourceBox ${boxIndex}:`, err.message);
    res.status(500).json({ error: 'Échec modification fenêtre SuperSource' });
  }
});


//pour les presets de supersource
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

app.get('/applySuperSourcePreset', async (req, res) => {
//  console.log("🎯 Requête preset reçue :", req.query.preset);
  const presetIndex = parseInt(req.query.preset, 10);

  const presets = [
    [
  { index: 0, enabled: true, source: 1, x: -758, y: 425, width: 420, cropped: false },
  { index: 1, enabled: true, source: 2, x: 758,  y: 425, width: 420, cropped: false },
  { index: 2, enabled: true, source: 3, x: -758, y: -425, width: 420, cropped: false },
  { index: 3, enabled: true, source: 4, x: 758,  y: -425, width: 420, cropped: false }
],
    [
  { index: 0, enabled: true, source: 1, x: -716, y: 400, width: 440, cropped: false, top: 0, bottom: 0, left: 0, right: 0  },
  { index: 1, enabled: true, source: 2, x: 716, y: -400, width: 440, cropped: false, top: 0, bottom: 0, left: 0, right: 0  },
  { index: 2, enabled: true, source: 3, x: 716, y: 400, width: 300, cropped: false, top: 0, bottom: 0, left: 0, right: 0  },
  { index: 3, enabled: true, source: 4, x: -716, y: -400, width: 300, cropped: false, top: 0, bottom: 0, left: 0, right: 0  }
],
    [
  { index: 0, enabled: true, source: 1, x: -632, y: 350, width: 500, cropped: false, top: 0, bottom: 0, left: 0, right: 0  },
  { index: 1, enabled: true, source: 2, x: 632, y: -350, width: 500, cropped: false, top: 0, bottom: 0, left: 0, right: 0  },
  { index: 2, enabled: false, top: 0, bottom: 0, left: 0, right: 0  },
  { index: 3, enabled: false, top: 0, bottom: 0, left: 0, right: 0  }
],
    [
  { index: 0, enabled: true, source: 1, x: -533, y: 0, width: 690, cropped: true, top: 0, bottom: 0, left: 822, right:822 },
  { index: 1, enabled: true, source: 2, x: 800, y: 425, width: 400, cropped: false, top: 0, bottom: 0, left: 0, right: 0  },
  { index: 2, enabled: true, source: 3, x: 800, y: -425, width: 400, cropped: false, top: 0, bottom: 0, left: 0, right: 0  },
  { index: 3, enabled: false, top: 0, bottom: 0, left: 0, right: 0  }
]
  ];

  if (!presets[presetIndex - 1]) {
    return res.status(400).json({ error: 'Preset inconnu' });
  }

  const preset = presets[presetIndex - 1];
  
if ('cropped' in req.query) {
  props.cropEnable = req.query.cropped === 'true';
  cmdFlag |= flags.cropEnable;
  cmdFlag |= flags.cropped;

  if (req.query.cropped === 'true') {
    if ('top' in req.query) {
      props.cropTop = parseInt(req.query.top, 10);
      cmdFlag |= flags.cropTop;
    }
    if ('bottom' in req.query) {
      props.cropBottom = parseInt(req.query.bottom, 10);
      cmdFlag |= flags.cropBottom;
    }
    if ('left' in req.query) {
      props.cropLeft = parseInt(req.query.left, 10);
      cmdFlag |= flags.cropLeft;
    }
    if ('right' in req.query) {
      props.cropRight = parseInt(req.query.right, 10);
      cmdFlag |= flags.cropRight;
    }
  }
}

  
  try {
    for (const box of preset) {
      if (typeof box.index !== 'number') continue;

      const query = [];
      if ('enabled' in box) query.push(`enabled=${box.enabled}`);
      if ('source' in box)  query.push(`source=${box.source}`);
      if ('x' in box)       query.push(`x=${box.x}`);
      if ('y' in box)       query.push(`y=${box.y}`);
      if ('width' in box)   query.push(`width=${box.width}`);
	  if ('cropped' in box) query.push(`cropped=${box.cropped}`);
      if ('top' in box)     query.push(`top=${box.top}`);
      if ('bottom' in box)  query.push(`bottom=${box.bottom}`);
      if ('left' in box)    query.push(`left=${box.left}`);
      if ('right' in box)   query.push(`right=${box.right}`);


      const url = `http://localhost:3000/setSuperSourceBox?index=${box.index}&${query.join('&')}`;
//      console.log("🔗 Appel fetch URL :", url);

      const response = await fetch(url);
      const data = await response.json();
//      console.log(`📦 Réponse pour box ${box.index} :`, data);
    }

    res.json({ status: '✅ Preset appliqué', preset: presetIndex });
  } catch (err) {
    console.error('❌ Erreur preset SuperSource :', err);
    res.status(500).json({ error: 'Échec application preset', details: err.message });
  }
});


// Middleware
app.use(express.json());



// 📦 Lecture complète des réglages Wipe
app.get('/getWipeSettings', (req, res) => {
  try {
    const meIndex = parseInt(req.query.me, 10) || 0;
    const wipe = atem.state?.video?.mixEffects?.[meIndex]?.transitionSettings?.wipe;
    if (!wipe) {
      return res.status(500).json({ error: 'Impossible de lire les réglages Wipe du ME' + meIndex });
    }

    res.json({
      wipe: {
        pattern: wipe.pattern,
        rate: wipe.rate,
        symmetry: wipe.symmetry,
        xPosition: wipe.xPosition,
        yPosition: wipe.yPosition,
        softness: wipe.borderSoftness,
        borderWidth: wipe.borderWidth,
        reverseDirection: wipe.reverseDirection,
        flipFlop: wipe.flipFlop,
        fillSource: wipe.borderInput
      }
    });
  } catch (e) {
    console.error('❌ Erreur getWipeSettings:', e.message);
    res.status(500).json({ error: 'Erreur lecture état Wipe' });
  }
});

// 🔘 Changer le motif Wipe
app.get('/setWipePattern', async (req, res) => {
  const pattern = parseInt(req.query.pattern, 10);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(pattern) || pattern < 0 || pattern > 17) {
    return res.status(400).json({ error: 'Pattern invalide' });
  }

  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.pattern = pattern;
  cmd.flag = TransitionWipeCommand.MaskFlags.pattern;

  try {
    await atem.sendCommand(cmd);
    res.json({ success: true, pattern });
  } catch (e) {
    console.error('❌ Erreur setWipePattern:', e.message);
    res.status(500).json({ error: 'Échec de l’envoi à l’ATEM' });
  }
});

// GET /setWipeSoftness?value=N&me=0|1 : règle l'adoucissement (flou) de la bordure du Wipe
app.get('/setWipeSoftness', async (req, res) => {
  let v = parseFloat(req.query.value);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(v)) return res.status(400).json({ error: 'softness invalide' });
  v = Math.round(v);
  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.borderSoftness = v;
  cmd.flag = TransitionWipeCommand.MaskFlags.borderSoftness;

  try {
    await atem.sendCommand(cmd);
    res.json({ softness: v });
  } catch (e) {
    console.error('❌ Erreur envoi softness → ATEM', e);
    res.status(500).json({ error: 'Échec softness' });
  }
});

// GET /setWipeWidth?value=N&me=0|1 : règle la largeur de la bordure du Wipe
app.get('/setWipeWidth', async (req, res) => {
  let v = parseFloat(req.query.value);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(v)) return res.status(400).json({ error: 'Width invalide' });
  v = Math.round(v);
  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.borderWidth = v;
  cmd.flag = TransitionWipeCommand.MaskFlags.borderWidth;

  try {
    await atem.sendCommand(cmd);
    res.json({ width: v });
  } catch (e) {
    res.status(500).json({ error: 'Échec width' });
  }
});

// GET /setWipeInverse?value=true|false&me=0|1 : active/désactive le FlipFlop (alternance de sens à chaque transition) du Wipe
app.get('/setWipeInverse', async (req, res) => {
  const flip = req.query.value === 'true';
  const meIndex = parseInt(req.query.me, 10) || 0;

  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.flipFlop = flip;
  cmd.flag = TransitionWipeCommand.MaskFlags.flipFlop;

  try {
    await atem.sendCommand(cmd);
    res.json({ status: '✅ FlipFlop appliqué', flip });
  } catch (e) {
    console.error('❌ Erreur inverse → ATEM', e.message);
    res.status(500).json({ error: 'Échec inverse' });
  }
});

// GET /setWipeFill?source=ID&me=0|1 : choisit la source de remplissage de la bordure du Wipe
app.get('/setWipeFill', async (req, res) => {
  const value = parseInt(req.query.source, 10);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(value)) return res.status(400).json({ error: 'Source invalide' });

  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.borderInput = value;
  cmd.flag = TransitionWipeCommand.MaskFlags.borderInput;

  try {
    await atem.sendCommand(cmd);
    res.json({ status: 'Source bordure appliquée', value });
  } catch (err) {
    console.error('❌ Erreur setWipeFill:', err.message);
    res.status(500).json({ error: 'Échec application source' });
  }
});

// GET /setWipeSymmetry?value=N&me=0|1 : règle la symétrie/proportion du motif de Wipe
app.get('/setWipeSymmetry', async (req, res) => {
  let val = parseFloat(req.query.value);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(val)) return res.status(400).json({ error: 'Symétrie invalide' });
  val = Math.round(val);
  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.symmetry = val;
  cmd.flag = TransitionWipeCommand.MaskFlags.symmetry;

  try {
    await atem.sendCommand(cmd);
    res.json({ status: 'OK', symmetry: val });
  } catch (e) {
    res.status(500).json({ error: 'Échec symétrie' });
  }
});

// GET /setWipePosX?value=N&me=0|1 : règle la position horizontale du centre du Wipe
app.get('/setWipePosX', async (req, res) => {
  const v = parseFloat(req.query.value);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(v)) return res.status(400).json({ error: 'PosX invalide' });

  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.xPosition = v;
  cmd.flag = TransitionWipeCommand.MaskFlags.xPosition;

  try {
    await atem.sendCommand(cmd);
    res.json({ posX: v });
  } catch (e) {
    res.status(500).json({ error: 'Échec posX' });
  }
});

// GET /setWipePosY?value=N&me=0|1 : règle la position verticale du centre du Wipe
app.get('/setWipePosY', async (req, res) => {
  const value = parseFloat(req.query.value);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(value)) return res.status(400).json({ error: 'Position Y invalide' });

  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.yPosition = value;
  cmd.flag = TransitionWipeCommand.MaskFlags.yPosition;

  try {
    await atem.sendCommand(cmd);
    res.json({ status: 'Position Y appliquée', value });
  } catch (err) {
    console.error('❌ Erreur setWipePosY:', err.message);
    res.status(500).json({ error: 'Échec position Y' });
  }
});

// GET /setWipeDirection?value=0|1&me=0|1 : règle le sens du Wipe (0=normal, 1=inversé)
app.get('/setWipeDirection', async (req, res) => {
  const direction = parseInt(req.query.value, 10);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(direction) || (direction !== 0 && direction !== 1)) {
    return res.status(400).json({ error: 'Direction invalide' });
  }

  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.reverseDirection = direction === 1;
  cmd.flag = TransitionWipeCommand.MaskFlags.reverseDirection;

  try {
    await atem.sendCommand(cmd);
    res.json({ status: '✅ Direction appliquée', direction });
  } catch (e) {
    console.error('❌ Erreur direction → ATEM', e.message);
    res.status(500).json({ error: 'Échec direction' });
  }
});

// GET /setWipeDuration?value=frames&me=0|1 : règle la durée de la transition Wipe (en frames, bornée 1–250)
app.get('/setWipeDuration', async (req, res) => {
  const frames = parseInt(req.query.value, 10);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(frames)) {
    return res.status(400).json({ error: 'Durée (frames) invalide' });
  }

  const rate = Math.max(1, Math.min(250, frames));
  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.rate = rate;
  cmd.flag = TransitionWipeCommand.MaskFlags.rate;

  try {
    await atem.sendCommand(cmd);
    res.json({ success: true, duration: rate });
  } catch (err) {
    console.error('❌ Erreur setWipeDuration → ATEM', err.message);
    res.status(500).json({ error: 'Échec application durée' });
  }
});

// (Optionnel) ancienne route générique
app.get('/setWipeSettings', async (req, res) => {
  const pattern = parseInt(req.query.pattern, 10);
  const meIndex = parseInt(req.query.me, 10) || 0;
  if (isNaN(pattern) || pattern < 0 || pattern > 17) {
    return res.status(400).json({ error: 'Pattern invalide' });
  }

  const cmd = new TransitionWipeCommand(meIndex);
  cmd.properties.pattern = pattern;
  cmd.flag = TransitionWipeCommand.MaskFlags.pattern;

  try {
    await atem.sendCommand(cmd);
    res.json({ success: true, pattern });
  } catch (err) {
    console.error('❌ Erreur setWipeSettings:', err.message);
    res.status(500).json({ error: 'Échec envoi pattern' });
  }
});



// Route pour récupérer dynamiquement le framerate ATEM
app.get('/getVideoSettings', (req, res) => {
  try {
    // lit directement settings.videoMode depuis atem.state
    const vm = atem.state?.settings?.videoMode;
//    console.log('🔍 ATEM videoMode code =', vm);

    if (typeof vm !== 'number') {
      throw new Error('videoMode ATEM indisponible');
    }

    const fps = modeToFps[vm] || DEFAULT_FPS;
    return res.json({ fps });
  } catch (err) {
    console.warn('⚠️ /getVideoSettings fallback →', err.message);
    return res.json({ fps: DEFAULT_FPS, warning: err.message });
  }
});

//server local pour recevoir update ME previewprogram depuis le rpi
app.use(express.json());

let currentRemoteME = 0; // facultatif, utile si tu veux en faire quelque chose plus tard

app.post('/me-update', (req, res) => {
  const me = req.body?.activeME;
  if (me === 0 || me === 1) {
    currentRemoteME = me;
//    console.log(`📥 ME actif reçu du RPi via mDNS: ME${me + 1}`);
    res.sendStatus(200);
  } else {
    res.status(400).send('Valeur ME invalide');
  }
});


// Retourne uniquement l'info ME active reçue du RPi (via /me-update)
app.get('/me-current', (req, res) => {
  res.json({ activeME: currentRemoteME ?? 0 });
});



function resetAllMediaPlayersToStill() {
  const maxRetries = 10;
  let retries = 0;

  const tryReset = () => {
    const players = atem.state?.media?.players;
    if (!players || players.length < 1) {
      if (retries < maxRetries) {
        retries++;
 //       console.log(`⏳ Attente initialisation MediaPlayers... tentative ${retries}`);
        return setTimeout(tryReset, 300);
      } else {
        console.warn('⚠️ Impossible de réinitialiser les MediaPlayers (non disponibles après plusieurs tentatives)');
        return;
      }
    }

    // Une fois que les players sont bien chargés : on boucle sur le nombre réel (1 sur un Mini, 2 sur d'autres)
    for (let i = 0; i < players.length; i++) {
      const cmd = new MediaPlayerSourceCommand(i);
      cmd.properties.sourceType = 1; // Still (MediaSourceType.Still = 1)
      cmd.properties.stillIndex = 0; // Image fixe 1
      cmd.flag = MediaPlayerSourceCommand.MaskFlags.sourceType | MediaPlayerSourceCommand.MaskFlags.stillIndex;

      atem.sendCommand(cmd)
        .then(() => {
//          console.log(`✅ MP${i + 1} forcé sur image fixe 1 au démarrage`);
        })
        .catch(err => {
          console.error(`❌ Erreur initialisation MP${i + 1}:`, err.message);
        });
    }
  };

  tryReset();
}


// GET /ping : sonde de disponibilité du serveur (renvoie HTTP 200, sans corps)
app.get('/ping', (req, res) => {
  res.sendStatus(200);
});



app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, () => {
  console.log('🚀 Serveur lancé sur http://localhost:3000');
});