/*
 * Music player for Academic Pages.
 *
 * A thin wrapper around APlayer (self-hosted in assets/js/aplayer/) that adds:
 *  - playback starts from a user gesture: on the homepage the door's OPEN
 *    button is that gesture (via window.musicPlayer.play(), see door.js);
 *    elsewhere the APlayer bar's own play button works as usual
 *  - after the visitor has played once on this domain, we try to auto-resume
 *    on later page loads (browsers unlock autoplay-with-sound post-interaction)
 *  - cross-page continuity: play state is saved to sessionStorage so the music
 *    continues where it left off after navigating between pages
 *  - default volume of 10% (requirement), persisted across pages
 *
 * Playlist is read from /music/playlist.json (site-root-relative because
 * baseurl is "").
 */
(function () {
  'use strict';

  var PLAYLIST_URL = '/music/playlist.json';
  var DEFAULT_VOLUME = 0.1;
  var SAVE_KEY = 'musicPlayerState';        // sessionStorage: survives page navigations, clears on tab close
  var INTERACT_KEY = 'musicHasInteracted';  // localStorage: visitor played once on this domain before

  var ap = null;
  var pendingPlay = false; // a caller asked to play before APlayer was ready

  function readState() {
    try {
      var raw = sessionStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeState() {
    if (!ap || !ap.audio) { return; }
    try {
      var data = {
        trackIndex: ap.list.index,
        currentTime: ap.audio.currentTime,
        volume: ap.audio.volume,
        playing: !ap.audio.paused
      };
      sessionStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* storage full/unavailable: ignore */ }
  }

  /* ---- play entry point ----------------------------------------------------
   * The play button overlay is gone; on the homepage the door's OPEN button is
   * the playback gesture (see assets/js/door.js). We expose a global hook so
   * any page element can start playback; the APlayer bar's own play button is
   * always available too.
   */
  function play() {
    if (!ap) { pendingPlay = true; return; } // start once APlayer is ready
    pendingPlay = false;
    return ap.play();
  }

  /* ---- restore saved state, then (maybe) auto-resume ---------------------- */

  function restoreState() {
    var s = readState();
    if (!s || !ap.list || !ap.list.audios || !ap.list.audios.length) { return; }

    var len = ap.list.audios.length;
    var idx = Math.min(Math.max(parseInt(s.trackIndex, 10) || 0, 0), len - 1);

    // Apply volume before any playback so the 10% default is honoured.
    ap.audio.volume = (typeof s.volume === 'number' && isFinite(s.volume))
      ? Math.min(Math.max(s.volume, 0), 1)
      : DEFAULT_VOLUME;

    ap.list.switch(idx);

    // seek() only works once metadata has loaded; currentTime is ignored before that.
    var seekOnce = function () {
      try { ap.seek(s.currentTime || 0); } catch (e) { /* ignore */ }
      ap.audio.removeEventListener('loadedmetadata', seekOnce);
    };
    ap.audio.addEventListener('loadedmetadata', seekOnce);
    if (ap.audio.readyState >= 1) { seekOnce(); }
  }

  function attemptAutoResume() {
    var s = readState();
    if (!s || !s.playing) { return; } // first visit / was paused → nothing to resume

    var interacted = false;
    try { interacted = localStorage.getItem(INTERACT_KEY) === '1'; } catch (e) {}
    if (interacted) {
      // The visitor has played on this domain before, so Chrome/Safari usually
      // permit autoplay-with-sound here. If the browser still rejects it, the
      // APlayer bar's own play button remains available.
      play();
    }
  }

  /* ---- persistence -------------------------------------------------------- */

  function bindSavers() {
    ap.on('play', function () {
      // First successful playback marks this domain as "interacted", which is
      // what unlocks autoplay-with-sound for later page loads.
      try { localStorage.setItem(INTERACT_KEY, '1'); } catch (e) {}
      writeState();
    });
    ap.on('pause', writeState);
    ap.on('volumechange', writeState);
    ap.on('listswitch', writeState);
    ap.on('ended', writeState);
    setInterval(writeState, 1000);                       // cheap throttled timeupdate
    window.addEventListener('pagehide', writeState);     // final flush before navigation
    window.addEventListener('unload', writeState);       // belt and braces
  }

  /* ---- init --------------------------------------------------------------- */

  function init() {
    fetch(PLAYLIST_URL)
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (list) {
        if (typeof APlayer === 'undefined') {
          console.error('Music player: APlayer failed to load.');
          return;
        }
        if (!Array.isArray(list) || !list.length) {
          console.warn('Music player: playlist is empty.');
          return;
        }

        var root = document.getElementById('music-player-root');
        ap = new APlayer({
          container: root,
          fixed: true,          // bottom-anchored player (pinned to the right via CSS)
          order: 'list',        // sequential playback, in playlist order
          loop: 'all',          // wrap around at the end of the playlist
          preload: 'metadata',  // don't download whole mp3s on page load
          volume: DEFAULT_VOLUME,
          autoplay: false,      // we control playback; no unmuted autoplay on first visit
          listFolded: true,     // collapsed playlist by default
          listMaxHeight: 320,
          audio: list.map(function (t) {
            return {
              name: t.name,
              artist: t.artist || '',
              url: t.url,
              cover: t.cover || '',
              theme: '#0057a8'
            };
          })
        });

        if (pendingPlay) { pendingPlay = false; ap.play(); } // OPEN clicked before init finished
        restoreState();
        bindSavers();
        attemptAutoResume();
      })
      .catch(function (err) {
        console.warn('Music player init failed:', err);
      });
  }

  /* Expose the playback entry for other scripts (the homepage door's OPEN
   * button, loaded after this file, calls window.musicPlayer.play()).
   * APlayer's ap.play() returns undefined in 1.10.1, so callers must not
   * inspect the return value; rely on the 'play' event instead. */
  window.musicPlayer = { play: play };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
