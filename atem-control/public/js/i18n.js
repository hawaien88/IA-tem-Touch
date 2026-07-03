/* =====================================================================
   i18n.js — Traduction FR / EN pour le pupitre ATEM (IAtem)
   ---------------------------------------------------------------------
   - La langue est mémorisée dans localStorage ('lang'). FR par défaut.
   - Textes statiques : ajouter un attribut sur l'élément HTML :
       data-i18n="cle"            -> remplace textContent
       data-i18n-title="cle"      -> remplace l'attribut title
       data-i18n-placeholder="cle"-> remplace l'attribut placeholder
   - Textes dynamiques (générés en JS) : utiliser t('cle', { var: valeur })
       où la chaîne peut contenir des jetons {var}.
   - Un petit sélecteur FR|EN est injecté en bas à gauche de chaque page.
     Changer de langue enregistre le choix puis recharge la page :
     tout se ré-affiche proprement dans la nouvelle langue.
   ===================================================================== */
(function () {
  'use strict';

  // ------- Dictionnaire -------
  const DICT = {
    fr: {
      // Commun
      back: '← Accueil',
      loading: 'Chargement...',
      loading2: 'Chargement…',

      // index.html
      settings_dmw: 'Réglages DIP MIX WIPE',
      fs_toggle_title: 'Plein écran / Fenêtré',
      menu_ip: 'IP ATEM',
      transition: 'Transition',
      atem_offline: 'ATEM non connecté',
      waiting_update: 'En attente de mise à jour…',
      transition_running: 'Transition en cours…',

      // mix.html
      mix_title: 'Réglage Mix',
      mix_duration: 'Durée : {v}',

      // dip.html
      dip_title: 'Réglages DIP',
      source_label: 'Source :',
      no_source: 'Aucune source disponible',
      dip_duration: 'Durée dip : {v}',

      // wipe.html
      wipe_title: 'Réglages Wipe',
      wipe_duration_h: 'Durée',
      wipe_symmetry_h: 'Symétrie',
      wipe_posx_h: 'Position X',
      wipe_posy_h: 'Position Y',
      wipe_direction_h: 'Direction',
      wipe_play: '▶ Play',
      wipe_reverse: '◀ Retour',
      wipe_invert: 'Inverser',
      wipe_border_h: 'Bordure',
      wipe_softness_h: 'Adoucissement',
      wipe_width_h: 'Largeur',
      wipe_fill_h: 'Remplissage',
      wipe_duration_init: 'Durée : 00:01',
      wipe_symmetry_init: 'Symétrie : 0%',
      wipe_posx_init: 'X : 0.0000',
      wipe_posy_init: 'Y : 0.0000',
      wipe_softness_init: 'Adoucissement : 0%',
      wipe_width_init: 'Largeur : 0%',
      wipe_symmetry: 'Symétrie : {v}%',
      wipe_softness: 'Adoucissement : {v}%',
      wipe_width: 'Largeur : {v}%',
      wipe_posx: 'X : {v}',
      wipe_posy: 'Y : {v}',
      wipe_duration: 'Durée : {v}',

      // macro.html
      macro_hint: 'Glisser pour parcourir plus de macros',

      // mediaplayer.html
      mp_still: 'Image fixe {i}',
      mp_beginning: 'Début',
      mp_prev: 'Image précédente',
      mp_playpause: 'Lecture / Pause',
      mp_next: 'Image suivante',
      mp_loop: 'Boucle',
      mp_error: 'Erreur lors de la sélection du média !',

      // auxatem.html
      aux_hdmi_webcam: 'Sortie HDMI / Webcam',
      aux_hdmi: 'Sortie HDMI',
      aux_usb: 'Sortie USB (Webcam)',
      aux_none: "Ce modèle ne dispose d'aucune sortie AUX.",
      aux_offline: 'ATEM non connecté.',

      // supersource.html
      ss_title: '🖥️ Réglages SuperSource',
      ss_enable: 'Activer Source:',
      ss_width: 'Largeur :',
      ss_box: 'Fenêtre {n}',

      // atem-ip.html
      ip_title: 'Réglages IP ATEM',
      ip_loading: 'Chargement IP actuelle...',
      ip_other: 'Autre',
      ip_custom: 'Adresse personnalisée',
      ip_placeholder: 'ex : 192.168.12.110',
      ip_save: 'Enregistrer',
      ip_current: 'IP actuelle : {ip}',
      ip_fetch_error: "❌ Impossible de récupérer l'IP actuelle",
      ip_select_warn: '⚠️ Sélectionne un ATEM ou saisis une adresse.',
      ip_connecting: "⏳ Connexion à l'ATEM en cours...",
      ip_saved: '✅ IP enregistrée ({ip}). Reconnexion en cours...',
      ip_save_failed: "Échec de l'enregistrement",
      ip_save_error: "❌ Erreur lors de l'enregistrement de l'IP"
    },

    en: {
      // Common
      back: '← Home',
      loading: 'Loading...',
      loading2: 'Loading…',

      // index.html
      settings_dmw: 'DIP MIX WIPE Settings',
      fs_toggle_title: 'Fullscreen / Windowed',
      menu_ip: 'ATEM IP',
      transition: 'Transition',
      atem_offline: 'ATEM not connected',
      waiting_update: 'Waiting for update…',
      transition_running: 'Transition in progress…',

      // mix.html
      mix_title: 'Mix Settings',
      mix_duration: 'Duration: {v}',

      // dip.html
      dip_title: 'DIP Settings',
      source_label: 'Source:',
      no_source: 'No source available',
      dip_duration: 'Dip duration: {v}',

      // wipe.html
      wipe_title: 'Wipe Settings',
      wipe_duration_h: 'Duration',
      wipe_symmetry_h: 'Symmetry',
      wipe_posx_h: 'Position X',
      wipe_posy_h: 'Position Y',
      wipe_direction_h: 'Direction',
      wipe_play: '▶ Play',
      wipe_reverse: '◀ Reverse',
      wipe_invert: 'Invert',
      wipe_border_h: 'Border',
      wipe_softness_h: 'Softness',
      wipe_width_h: 'Width',
      wipe_fill_h: 'Fill',
      wipe_duration_init: 'Duration: 00:01',
      wipe_symmetry_init: 'Symmetry: 0%',
      wipe_posx_init: 'X: 0.0000',
      wipe_posy_init: 'Y: 0.0000',
      wipe_softness_init: 'Softness: 0%',
      wipe_width_init: 'Width: 0%',
      wipe_symmetry: 'Symmetry: {v}%',
      wipe_softness: 'Softness: {v}%',
      wipe_width: 'Width: {v}%',
      wipe_posx: 'X: {v}',
      wipe_posy: 'Y: {v}',
      wipe_duration: 'Duration: {v}',

      // macro.html
      macro_hint: 'Swipe to browse more macros',

      // mediaplayer.html
      mp_still: 'Still image {i}',
      mp_beginning: 'Beginning',
      mp_prev: 'Previous frame',
      mp_playpause: 'Play / Pause',
      mp_next: 'Next frame',
      mp_loop: 'Loop',
      mp_error: 'Error selecting media!',

      // auxatem.html
      aux_hdmi_webcam: 'HDMI / Webcam output',
      aux_hdmi: 'HDMI output',
      aux_usb: 'USB output (Webcam)',
      aux_none: 'This model has no AUX output.',
      aux_offline: 'ATEM not connected.',

      // supersource.html
      ss_title: '🖥️ SuperSource Settings',
      ss_enable: 'Enable Source:',
      ss_width: 'Width:',
      ss_box: 'Box {n}',

      // atem-ip.html
      ip_title: 'ATEM IP Settings',
      ip_loading: 'Loading current IP...',
      ip_other: 'Other',
      ip_custom: 'Custom address',
      ip_placeholder: 'e.g. 192.168.12.110',
      ip_save: 'Save',
      ip_current: 'Current IP: {ip}',
      ip_fetch_error: '❌ Unable to fetch current IP',
      ip_select_warn: '⚠️ Select an ATEM or enter an address.',
      ip_connecting: '⏳ Connecting to ATEM...',
      ip_saved: '✅ IP saved ({ip}). Reconnecting...',
      ip_save_failed: 'Save failed',
      ip_save_error: '❌ Error saving IP'
    }
  };

  // ------- Cœur i18n -------
  function getLang() {
    const l = localStorage.getItem('lang');
    return l === 'en' ? 'en' : 'fr'; // FR par défaut
  }

  function setLang(lang) {
    localStorage.setItem('lang', lang === 'en' ? 'en' : 'fr');
    location.reload(); // recharge : tout se ré-affiche dans la nouvelle langue
  }

  function t(key, params) {
    const lang = getLang();
    let s = (DICT[lang] && DICT[lang][key]);
    if (s == null) s = DICT.fr[key];   // repli sur le FR
    if (s == null) s = key;            // repli ultime : la clé brute
    if (params) {
      for (const k in params) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      }
    }
    return s;
  }

  // Applique les traductions aux éléments porteurs d'attributs data-i18n*
  function applyStatic(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
  }

  // ------- Sélecteur de langue (pastille FR|EN, bas à gauche) -------
  function injectSelector() {
    if (document.getElementById('langSwitch')) return;
    const lang = getLang();

    const box = document.createElement('div');
    box.id = 'langSwitch';
    box.style.cssText =
      'position:fixed;bottom:12px;left:12px;z-index:99999;display:flex;' +
      'border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.6);' +
      'font-family:sans-serif;font-size:16px;user-select:none;';

    [['fr', 'FR'], ['en', 'EN']].forEach(([code, label]) => {
      const b = document.createElement('button');
      b.textContent = label;
      const active = code === lang;
      b.style.cssText =
        'border:none;cursor:pointer;padding:8px 14px;font-size:16px;font-weight:bold;' +
        'color:' + (active ? '#111' : '#ddd') + ';' +
        'background:' + (active ? '#f5c518' : '#333') + ';';
      b.addEventListener('click', () => { if (code !== getLang()) setLang(code); });
      box.appendChild(b);
    });

    document.body.appendChild(box);
  }

  // ------- Initialisation -------
  // Langue transmise par une autre page/origine (ex. retour depuis la page RPi) via ?lang=fr|en
  (function readLangFromURL() {
    try {
      const u = new URL(location.href);
      const p = u.searchParams.get('lang');
      if (p === 'fr' || p === 'en') {
        localStorage.setItem('lang', p);
        // On retire ?lang= de l'URL, sinon un rechargement (via le sélecteur)
        // relirait ce paramètre et réécraserait le choix manuel.
        u.searchParams.delete('lang');
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      }
    } catch (e) {}
  })();

  document.documentElement.setAttribute('lang', getLang());
  document.addEventListener('DOMContentLoaded', () => {
    applyStatic();
    injectSelector();
  });

  // API publique
  window.i18n = { t, getLang, setLang, applyStatic };
  window.t = t;
})();
