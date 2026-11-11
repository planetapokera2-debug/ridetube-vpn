#!/usr/bin/env python3
"""VPN build: the app package from JustAnotherPU's published one (jap_ridetube@0.3.8.tgz, already without
oap-sdk), patched: the version of apps/jap_ridetube/app.json, the kit's fonts.js and the Cyrillic atlases
(kit/runtime/fonts/cyrillic*.json: the published build is English and draws no Cyrillic titles) and the
settings' defaults of app.json (the 12 V battery pause off: the car reports a low charging condition while the
engine runs). Sorted, owner 0:0, one mtime, as release.py's strip_sdk.

    python3 tools/patch_app.py <published jap_ridetube@0.3.8.tgz>     -> dist/jap_ridetube@<version>.tgz
    python3 tools/release.py --app-package dist/jap_ridetube@<version>.tgz
"""
import gzip, io, json, os, sys, tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'kit', 'runtime', 'fonts')
VERSIONED = ('package/package.json', 'package/npm-shrinkwrap.json', 'package/rhmiData/application.json',
             'package/javascript/kit/app-spec.json')


def main():
    src = sys.argv[1]
    app = json.load(open(os.path.join(ROOT, 'apps', 'jap_ridetube', 'app.json')))
    v, mtime = app['version'], int(os.environ.get('SOURCE_DATE_EPOCH', '0'))
    defaults = {s['key']: s.get('default') for s in app.get('settings', [])}
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
    for s in spec.get('settings', []):
        if s.get('key') in defaults:
            s['default'] = defaults[s['key']]
    put('package/javascript/kit/app-spec.json', json.dumps(spec, indent=1).encode('utf-8'))
    # the app's and the kit's code from this repository (identical to the published 0.3.8 but for the VPN build's changes)
    kr = os.path.join(ROOT, 'kit', 'runtime')
    for f in sorted(os.listdir(kr)):
        if f.endswith('.js'):
            assert 'package/javascript/kit/' + f in members, f
            put('package/javascript/kit/' + f, open(os.path.join(kr, f), 'rb').read())
    for f, to in (('main.js', 'app.js'), ('yt.js', 'yt.js'), ('speller.js', 'speller.js')):
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
