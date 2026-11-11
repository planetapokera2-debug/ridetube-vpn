#!/usr/bin/env python3
"""VPN build: a new jap-ridetube-d tool kit from the last one packed (the MGU Store's packer and the ytdec/yt-dlp
build are not needed for a change to the service's scripts): the kit's files taken again from the sources named
in native/jap-ridetube-d/component.json ("from") where they are text sources here (ytd.js, socks.js, thumb.js,
ytfetch.py, check.sh), each sha256 in the packed component.json updated, the version of the source
component.json. ytdec and ytdlp.pyz stay as packed. Sorted, owner 0:0, one mtime.

    python3 tools/repack_tool.py native/jap-ridetube-d/dist/jap-ridetube-d@<old>.tgz   -> dist/...@<new>.tgz
"""
import gzip, hashlib, io, json, os, sys, tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOL = os.path.join(ROOT, 'native', 'jap-ridetube-d')
FROM_SOURCE = ('ytd.js', 'socks.js', 'thumb.js', 'ytfetch.py', 'check.sh')


def main():
    src = sys.argv[1]
    spec = json.load(open(os.path.join(TOOL, 'component.json')))
    mtime = int(os.environ.get('SOURCE_DATE_EPOCH', '0'))
    with tarfile.open(src, 'r:gz') as t:
        members = {m.name: (m, t.extractfile(m).read() if m.isfile() else None) for m in t.getmembers()}
    packed = json.loads(members['component.json'][1])
    old = packed['version']
    froms = {f['path']: f.get('from') for f in spec.get('files', []) if isinstance(f, dict)}
    for f in packed.get('files', []):
        name = froms.get(f['path'])
        if name not in FROM_SOURCE:
            continue
        data = open(os.path.join(TOOL, name), 'rb').read()
        m = members['files/' + f['path']][0]
        m.size = len(data)
        members['files/' + f['path']] = (m, data)
        f['sha256'] = hashlib.sha256(data).hexdigest()
    packed['version'] = spec['version']
    body = (json.dumps(packed, indent=2) + '\n').encode('utf-8')
    m = members['component.json'][0]
    m.size = len(body)
    members['component.json'] = (m, body)
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w', format=tarfile.USTAR_FORMAT) as out:
        for name in sorted(members):
            m, d = members[name]
            m.uid = m.gid = 0
            m.uname = m.gname = ''
            m.mtime = mtime
            out.addfile(m, io.BytesIO(d) if d is not None else None)
    dst = os.path.join(TOOL, 'dist', 'jap-ridetube-d@%s.tgz' % spec['version'])
    with open(dst, 'wb') as f, gzip.GzipFile(fileobj=f, mode='wb', mtime=mtime, filename='') as g:
        g.write(buf.getvalue())
    print('%s -> %s' % (old, dst))


if __name__ == '__main__':
    main()
