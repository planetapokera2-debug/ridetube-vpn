'use strict';
/**
 * tr.js - the app's own words in the VPN build's language (ru.json next to it, put in by tools/patch_app.py;
 * none: English). Keys are the English text with %s for each value, filled in order:
 *
 *   tr('Loading %s...', name)
 *
 * Only the app's words go through here: video titles and channel names are drawn as they come.
 */
let dict = {};
try { dict = require('./ru.json'); } catch (e) { /* English */ }

function tr(s) {
    const a = Array.prototype.slice.call(arguments, 1);
    const d = Object.prototype.hasOwnProperty.call(dict, s) ? dict[s] : s;
    let k = 0;
    return a.length ? d.replace(/%s/g, () => String(a[k++])) : d;
}

/** a short form where the room is small (the rail): 'short:<text>' when there is one, else tr(s) */
function short(s) { return Object.prototype.hasOwnProperty.call(dict, 'short:' + s) ? dict['short:' + s] : tr(s); }

module.exports = { tr, short, dict: () => dict };
