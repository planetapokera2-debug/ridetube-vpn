'use strict';
// VPN build: the Russian words. Every tr() text of the app has a translation with the same %s, every setting of
// app.json its label and options in the kit's dictionary, every letter a glyph in the Cyrillic atlases.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..'), APP = path.join(ROOT, 'apps', 'jap_ridetube');
const words = JSON.parse(fs.readFileSync(path.join(APP, 'locale-ru.json'), 'utf8'));
const kit = JSON.parse(fs.readFileSync(path.join(APP, 'locale-kit-ru.json'), 'utf8'));

// the string literals inside each tr( ... ) / short( ... ) call's first argument (a text, or a ? : of texts)
function keys(src) {
    const out = [];
    const re = /\b(?:tr|short)\(/g;
    let m;
    while ((m = re.exec(src))) {
        let i = m.index + m[0].length, depth = 1, j = i, top = '';
        while (depth && j < src.length) {
            const c = src[j];
            if (c === '\'' || c === '"') {
                const q = c, a = j;
                for (j++; src[j] !== q; j++) if (src[j] === '\\') j++;
                if (depth === 1) top += src.slice(a, j + 1);
            } else if (c === '(') depth++;
            else if (c === ')') depth--;
            else if (c === ',' && depth === 1) break;
            else if (depth === 1) top += c;
            j++;
        }
        const lits = top.match(/'(?:[^'\\]|\\.)*'/g) || [];
        // a ? b : c - the condition's literals (a state name) are no texts
        const parts = top.indexOf('?') >= 0 ? top.slice(top.indexOf('?')) : top;
        lits.filter((l) => parts.indexOf(l) >= 0).forEach((l) => out.push(l.slice(1, -1).replace(/\\'/g, '\'')));
    }
    return out;
}
const src = ['main.js', 'yt.js'].map((f) => fs.readFileSync(path.join(APP, f), 'utf8')).join('\n');
const used = keys(src).concat(['Music', 'News', 'Cars', 'Podcasts', 'Comedy', 'Trailers', 'Search', 'Home', 'Subs', 'Watch later', 'Playing',
    'sponsor', 'self-promotion', 'subscribe reminder', 'intro', 'end cards', 'non-music part', 'like & subscribe reminder']);
const missing = used.filter((k) => !Object.prototype.hasOwnProperty.call(words, k));
assert.deepStrictEqual(missing, [], 'tr() texts without a translation');
Object.keys(words).forEach((k) => assert.strictEqual((words[k].match(/%s/g) || []).length, (k.match(/%s/g) || []).length, 'the %s of ' + k));
console.log('ok   ' + used.length + ' app texts translated, each with its %s');

const app = JSON.parse(fs.readFileSync(path.join(APP, 'app.json'), 'utf8'));
const labels = [];
app.settings.forEach((s) => { labels.push(s.label); (s.options || []).forEach((o) => labels.push(o[1])); });
assert.deepStrictEqual(labels.filter((l) => !kit[l]), [], 'settings without a translation');
console.log('ok   the settings (' + app.settings.length + ') and their options translated');

// tr() with the dictionary next to it (as the package has it), without: English
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-'));
fs.copyFileSync(path.join(APP, 'tr.js'), path.join(dir, 'tr.js'));
const en = require(path.join(dir, 'tr.js'));
assert.strictEqual(en.tr('Loading %s...', 'Home'), 'Loading Home...');
const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-'));   // (a second folder: a miss is remembered)
fs.copyFileSync(path.join(APP, 'tr.js'), path.join(dir2, 'tr.js'));
fs.writeFileSync(path.join(dir2, 'ru.json'), JSON.stringify(words));
const ru = require(path.join(dir2, 'tr.js'));
assert.strictEqual(ru.tr('Loading %s...', ru.tr('Home')), 'Загрузка: Главная...');
assert.strictEqual(ru.tr('Up next in %s s: %s', 5, 'Видео'), 'Далее через 5 с: Видео');
assert.strictEqual(ru.short('Watch later'), 'Позже');
assert.strictEqual(ru.tr('no such text'), 'no such text');
[dir, dir2].forEach((d) => { fs.readdirSync(d).forEach((n) => fs.unlinkSync(path.join(d, n))); fs.rmdirSync(d); });
console.log('ok   tr(): Russian with ru.json, English without; %s in order; short forms');

// every letter drawn: the Cyrillic atlases (regular and bold) hold it at every size
const fonts = path.join(ROOT, 'kit', 'runtime', 'fonts');
const all = Object.keys(words).map((k) => words[k]).concat(Object.keys(kit).map((k) => kit[k])).join('');
['cyrillic', 'cyrillic-bold'].forEach((f) => {
    const j = JSON.parse(fs.readFileSync(path.join(fonts, f + '.json'), 'utf8'));
    j.sizes.forEach((s) => {
        const lack = Array.from(new Set(Array.from(all))).filter((ch) => ch !== '\n' && !s.glyphs[ch.codePointAt(0)]);
        assert.deepStrictEqual(lack, [], f + ' ' + s.size + ' lacks');
    });
});
console.log('ok   every letter of the translations is in the Cyrillic atlases');
