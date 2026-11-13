#!/usr/bin/env python3
"""VPN build: the app package from JustAnotherPU's published one (jap_ridetube@0.3.8.tgz, already without
oap-sdk), patched: the version of apps/jap_ridetube/app.json and its settings (the VPN build's defaults: the 12 V
battery pause off; its additions: Pause when leaving the app, a check box added to the HMI's menu), the app's and
the kit's code (main.js as app.js, tr.js, kit/runtime/*.js), the Cyrillic atlases (the published build is English
and draws no Cyrillic), Russian: the app's words (locale-ru.json as ru.json), the kit's (locale-kit-ru.json as
kit/locale.json, whole texts only) and the HMI's static texts. Sorted, owner 0:0, one mtime, as release.py's
strip_sdk.

    python3 tools/patch_app.py <published jap_ridetube@0.3.8.tgz>     -> dist/jap_ridetube@<version>.tgz
    python3 tools/release.py --app-package dist/jap_ridetube@<version>.tgz
"""
import gzip, io, json, os, re, sys, tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'kit', 'runtime', 'fonts')
APP = os.path.join(ROOT, 'apps', 'jap_ridetube')
VERSIONED = ('package/package.json', 'package/npm-shrinkwrap.json', 'package/rhmiData/application.json',
             'package/javascript/kit/app-spec.json')


def main():
    src = sys.argv[1]
    app = json.load(open(os.path.join(ROOT, 'apps', 'jap_ridetube', 'app.json')))
    v, mtime = app['version'], int(os.environ.get('SOURCE_DATE_EPOCH', '0'))
    with tarfile.open(src, 'r:gz') as t:
        members = {m.name: (m, t.extractfile(m).read() if m.isfile() else None) for m in t.getmembers()}
    old = json.loads(members['package/package.json'][1])['version']

    def put(name, data):
        m = members[name][0] if name in members else tarfile.TarInfo(name)
        m.size = len(data)
        members[name] = (m, data)

    for n in VERSIONED:
        s = members[n][1].decode('utf-8')
        assert s.count('"%s"' % old) == 1, n
        put(n, s.replace('"%s"' % old, '"%s"' % v).encode('utf-8'))
    spec = json.loads(members['package/javascript/kit/app-spec.json'][1])
    spec['settings'] = app['settings']      # (the published ones, with the VPN build's defaults and additions)
    put('package/javascript/kit/app-spec.json', json.dumps(spec, indent=1).encode('utf-8'))
    # Russian (VPN build): the app's words (tr.js + ru.json), the kit's (locale.json: the settings, the sheets;
    # whole texts only), the HMI's static texts in every language file
    words = json.load(open(os.path.join(APP, 'locale-ru.json'), encoding='utf-8'))
    kit = json.load(open(os.path.join(APP, 'locale-kit-ru.json'), encoding='utf-8'))
    put('package/javascript/ru.json', json.dumps(words, ensure_ascii=False).encode('utf-8'))
    put('package/javascript/kit/locale.json', json.dumps({'language': 'ru', 'exact': True, 'strings': kit}, ensure_ascii=False).encode('utf-8'))
    # the settings the published HMI description lacks: a check box each in the menu's list, after the last one
    ui_n, xml_n = 'package/rhmiData/uiDescriptions/ID7/uiDescription.json', 'package/rhmiData/uiDescriptions/ID7/application.xml'
    ui = json.loads(members[ui_n][1])
    xml = members[xml_n][1].decode('utf-8')
    names = {c['name']: (cid, k) for k, st in ui['containers'].items() for cid, c in st.get('components', {}).items()}
    used = [int(x) for x in re.findall(r' id="(\d+)"', xml)]
    texts = {}
    for st in app['settings']:
        n = 'SET_' + st['key'].upper()
        if n in names or st.get('type') != 'bool':
            continue
        after, cont = names['SET_MEMBERS']
        cid = str(max(used) + 1)
        used.append(int(cid))
        sid = 'SID_JAP_RIDETUBE_' + n
        comps = ui['containers'][cont]['components']
        new = {}
        for k, c in comps.items():
            new[k] = c
            if k == after:
                new[cid] = {'type': 'checkBox', 'name': n, 'properties': {'Visible': {'value': 1, 'type': 'UInt'}, 'Focusable': {'value': 2, 'type': 'UInt'}},
                            'rows': [{'Text': {'value': sid, 'type': 'StringId'}}]}
        ui['containers'][cont]['components'] = new
        block = re.search(r'( *)<component id="%s" type="checkBox"[^>]*>.*?</component>\n' % after, xml, re.S)
        xml = xml[:block.end()] + block.group(0).replace('id="%s"' % after, 'id="%s"' % cid, 1) + xml[block.end():]
        texts[sid] = st['label']
        names[n] = (cid, cont)
    # the menu's buttons the published HMI description lacks (Exit): a button each, after the one before it in app.json
    for scr in app['screens']:
        prev = None
        for it in scr.get('items', []):
            if it[0] == 'button' and it[1] not in names:
                after, cont = names[prev]
                cid = str(max(used) + 1)
                used.append(int(cid))
                sid = 'SID_JAP_RIDETUBE_' + it[1]
                comps = ui['containers'][cont]['components']
                new = {}
                for k, c in comps.items():
                    new[k] = c
                    if k == after:
                        new[cid] = {'type': 'button', 'name': it[1], 'properties': {'Visible': {'value': 1, 'type': 'UInt'}, 'Focusable': {'value': 2, 'type': 'UInt'}},
                                    'rows': [{'Text': {'value': sid, 'type': 'StringId'}}]}
                ui['containers'][cont]['components'] = new
                block = re.search(r'( *)<component id="%s" type="button"[^>]*>.*?</component>\n' % after, xml, re.S)
                xml = xml[:block.end()] + block.group(0).replace('id="%s"' % after, 'id="%s"' % cid, 1) + xml[block.end():]
                texts[sid] = it[2]
                names[it[1]] = (cid, cont)
            if len(it) > 1:
                prev = it[1]
    put(ui_n, json.dumps(ui, ensure_ascii=False).encode('utf-8'))
    put(xml_n, xml.encode('utf-8'))
    both = dict(words, **kit)
    for n in [x for x in members if x.startswith('package/rhmiData/variantGroups/Common/texts/') and x.endswith('.json')]:
        t = json.loads(members[n][1])
        t.update(texts)
        t = {k: both.get(v, v) for k, v in t.items()}
        put(n, json.dumps(t, ensure_ascii=False).encode('utf-8'))
    # the app's and the kit's code from this repository (identical to the published 0.3.8 but for the VPN build's changes)
    kr = os.path.join(ROOT, 'kit', 'runtime')
    for f in sorted(os.listdir(kr)):
        if f.endswith('.js'):
            assert 'package/javascript/kit/' + f in members, f
            put('package/javascript/kit/' + f, open(os.path.join(kr, f), 'rb').read())
    for f, to in (('main.js', 'app.js'), ('yt.js', 'yt.js'), ('speller.js', 'speller.js'), ('tr.js', 'tr.js')):
        put('package/javascript/' + to, open(os.path.join(ROOT, 'apps', 'jap_ridetube', f), 'rb').read())
    for f in ('cyrillic.json', 'cyrillic-bold.json'):
        put('package/javascript/kit/fonts/' + f, open(os.path.join(FONTS, f), 'rb').read())

    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w', format=tarfile.USTAR_FORMAT) as out:
        for name in sorted(members):
            m, d = members[name]
            m.uid = m.gid = 0
            m.uname = m.gname = ''
            m.mtime = mtime
            if d is not None:
                m.mode = m.mode or 0o644
            out.addfile(m, io.BytesIO(d) if d is not None else None)
    dst = os.path.join(ROOT, 'dist', 'jap_ridetube@%s.tgz' % v)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'wb') as f, gzip.GzipFile(fileobj=f, mode='wb', mtime=mtime, filename='') as g:
        g.write(buf.getvalue())
    print('%s -> %s' % (old, dst))


if __name__ == '__main__':
    main()
