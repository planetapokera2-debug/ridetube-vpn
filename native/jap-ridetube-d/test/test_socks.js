'use strict';
// node test/test_socks.js: RideTube VPN - requests through a local SOCKS5 proxy (a fake one here, in front of a local
// HTTPS server with a self-signed certificate) by name, and directly while nothing listens on the proxy address.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const https = require('https');
const { execFileSync, spawn } = require('child_process');
const socks = require('../socks.js');
const { ytRequest, fetchRequest, Daemon } = require('../ytd.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'socks-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(tmp, 'k.pem'), '-out', path.join(tmp, 'c.pem'),
    '-days', '2', '-subj', '/CN=www.youtube.com'], { stdio: 'ignore' });

// the "internet": one HTTPS server, whatever name was asked for
const web = https.createServer({ key: fs.readFileSync(path.join(tmp, 'k.pem')), cert: fs.readFileSync(path.join(tmp, 'c.pem')) }, (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ path: req.url, host: req.headers.host, method: req.method }));
});

// a SOCKS5 proxy: no auth, CONNECT; mode 'ok' pipes to web, 'refuse' answers 5 (connection refused)
const seen = [];
let mode = 'ok';
const proxy = net.createServer((c) => {
    let buf = Buffer.alloc(0), step = 0;
    c.on('error', () => {});
    c.on('data', function onData(d) {
        buf = Buffer.concat([buf, d]);
        if (step === 0 && buf.length >= 3) { c.write(Buffer.from([5, 0])); buf = buf.slice(2 + buf[1]); step = 1; }
        if (step === 1 && buf.length >= 5) {
            const atyp = buf[3], len = atyp === 3 ? 7 + buf[4] : atyp === 1 ? 10 : 22;
            if (buf.length < len) return;
            const host = atyp === 3 ? buf.slice(5, 5 + buf[4]).toString() : buf.slice(4, len - 2).join('.');
            seen.push({ atyp: atyp, host: host, port: buf.readUInt16BE(len - 2) });
            c.removeListener('data', onData);
            if (mode === 'refuse') { c.end(Buffer.from([5, 5, 0, 1, 0, 0, 0, 0, 0, 0])); return; }
            const up = net.connect(web.address().port, '127.0.0.1', () => {
                c.write(Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0]));
                const rest = buf.slice(len);
                if (rest.length) up.write(rest);
                c.pipe(up); up.pipe(c);
            });
            up.on('error', () => c.destroy());
        }
    });
});

const results = [];
async function t(name, fn) {
    try { await fn(); results.push('ok   ' + name); } catch (e) { results.push('FAIL ' + name + '\n' + (e.stack || e)); }
}
const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', r));
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

async function main() {
    await listen(web); await listen(proxy);
    const P = '127.0.0.1:' + proxy.address().port;
    const dead = '127.0.0.1:' + await freePort();

    await t('parse: host:port, [v6]:port; anything else is not an address', async () => {
        assert.deepStrictEqual(socks.parse('127.0.0.1:1065'), { host: '127.0.0.1', port: 1065 });
        assert.deepStrictEqual(socks.parse('[::1]:1080'), { host: '::1', port: 1080 });
        assert.strictEqual(socks.parse(''), null);
        assert.strictEqual(socks.parse('127.0.0.1'), null);
        assert.strictEqual(socks.parse('127.0.0.1:70000'), null);
        assert.strictEqual(socks.DEFAULT, '127.0.0.1:1065');
    });

    await t('listening: the proxy yes, a closed port no (quickly)', async () => {
        assert.strictEqual(await new Promise((r) => socks.listening(P, 500, r)), true);
        const t0 = Date.now();
        assert.strictEqual(await new Promise((r) => socks.listening(dead, 500, r)), false);
        assert.ok(Date.now() - t0 < 400, 'refused should not wait for the timeout');
    });

    await t('ytRequest through the proxy: CONNECT by name (the proxy resolves it), no lookup on the car', async () => {
        seen.length = 0; mode = 'ok';
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';   // the test server's certificate is self-signed
        let looked = 0;
        const lookup = (h, o, cb) => { looked++; (cb || o)(new Error('no DNS here')); };
        const r = await ytRequest('POST', 'https://www.youtube.com/youtubei/v1/browse?x=1', { A: 'b' }, { q: 1 }, 5000, lookup, P);
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        assert.strictEqual(r.status, 200);
        const b = JSON.parse(r.body);
        assert.strictEqual(b.path, '/youtubei/v1/browse?x=1');
        assert.strictEqual(b.method, 'POST');
        assert.strictEqual(b.host, 'www.youtube.com');
        assert.deepStrictEqual(seen, [{ atyp: 3, host: 'www.youtube.com', port: 443 }]);
        assert.strictEqual(looked, 0);
    });

    await t('the proxy refuses: a socks error, not a hang', async () => {
        mode = 'refuse';
        await assert.rejects(ytRequest('GET', 'https://www.youtube.com/', null, null, 3000, undefined, P), /socks: connection refused/);
        await assert.rejects(ytRequest('GET', 'https://www.youtube.com/', null, null, 3000, undefined, dead), /socks: ECONNREFUSED/);
        mode = 'ok';
    });

    await t('the fetch helper (ytd.js --fetch, env {}) goes through the proxy it is given', async () => {
        seen.length = 0; mode = 'ok';
        const o = { fetchCmd: [process.execPath, path.join(__dirname, '..', 'ytd.js'), '--fetch'], noSetuid: true };
        // its environment is empty: the self-signed certificate fails there, after the CONNECT by name - which is the point
        await assert.rejects(fetchRequest(o, 0, { method: 'GET', url: 'https://www.youtube.com/robots.txt', timeoutMs: 4000, socks: P }),
            /self[- ]signed|certificate/i);
        assert.deepStrictEqual(seen, [{ atyp: 3, host: 'www.youtube.com', port: 443 }]);
    });

    // the daemon and its fetch helper run on the head unit's /usr/bin/node (Node 8): NODE8=<its binary> checks a whole
    // request through the proxy there (the agent that hands out the proxied socket)
    if (process.env.NODE8) await t('Node 8: ytRequest through the proxy, answer read', async () => {
        seen.length = 0; mode = 'ok';
        const js = "require(" + JSON.stringify(path.join(__dirname, '..', 'ytd.js')) + ").ytRequest('GET', 'https://www.youtube.com/x?y=1', null, null, 5000, undefined, " +
            JSON.stringify(P) + ").then((r) => console.log(process.version + ' ' + r.status + ' ' + r.body), (e) => { console.log('ERR ' + e.message); process.exit(1); })";
        const out = await new Promise((resolve) => {
            const c = spawn(process.env.NODE8, ['-e', js], { env: { NODE_TLS_REJECT_UNAUTHORIZED: '0' } });
            const o = [];
            c.stdout.on('data', (x) => o.push(x));
            c.on('close', (code) => resolve({ code: code, text: Buffer.concat(o).toString() }));
        });
        assert.strictEqual(out.code, 0, out.text);
        assert.ok(/^v8\.\d+\.\d+ 200 /.test(out.text), out.text);
        assert.strictEqual(JSON.parse(out.text.replace(/^\S+ 200 /, '')).path, '/x?y=1');
        assert.deepStrictEqual(seen, [{ atyp: 3, host: 'www.youtube.com', port: 443 }]);
    });

    await t('thumb.js --socks: i.ytimg.com through the proxy', async () => {
        seen.length = 0; mode = 'refuse';
        // async: the fake proxy lives in this process (spawnSync would block it)
        const r = await new Promise((resolve) => {
            const c = spawn(process.execPath, [path.join(__dirname, '..', 'thumb.js'), 'dQw4w9WgXcQ', '--socks', P], { env: {} });
            const err = [];
            c.stderr.on('data', (x) => err.push(x));
            c.on('close', (code) => resolve({ status: code, stderr: Buffer.concat(err) }));
        });
        assert.strictEqual(r.status, 1);
        assert.ok(/socks: connection refused/.test(String(r.stderr)), String(r.stderr));
        assert.deepStrictEqual(seen, [{ atyp: 3, host: 'i.ytimg.com', port: 443 }]);
        mode = 'ok';
    });

    await t('daemon: the proxy while it listens (yt-dlp jobs get --proxy, stream lookups are kept apart), else directly', async () => {
        const logs = [];
        const d = new Daemon({ socks: P, cacheDir: path.join(tmp, 'cache'), logDir: tmp, sock: path.join(tmp, 'ctl.sock'), noSetuid: true,
            log: (m) => logs.push(m) });
        const jobs = [];
        d.spawnFetchUid = (cmd, args) => { jobs.push(args); return {}; };
        assert.strictEqual(d.socks(), null, 'before the first probe');
        assert.strictEqual(await d.probeSocks(), true);
        assert.strictEqual(d.socks(), P);
        d.spawnJob(['extract', '--cache-dir', 'C', '--', 'dQw4w9WgXcQ', 'F']);
        assert.deepStrictEqual(jobs[0], ['extract', '--proxy', 'socks5h://' + P, '--cache-dir', 'C', '--', 'dQw4w9WgXcQ', 'F']);
        assert.ok(/dQw4w9WgXcQ\.vpn\.json$/.test(d.infoFile('dQw4w9WgXcQ')));
        assert.ok(logs.some((l) => /SOCKS5 .* listens/.test(l)), logs.join('\n'));
        d.opts.socks = dead;
        assert.strictEqual(await d.probeSocks(), false);
        assert.strictEqual(d.socks(), null);
        d.spawnJob(['fetch', '--cache-dir', 'C', '--', 'dQw4w9WgXcQ', 'D']);
        assert.deepStrictEqual(jobs[1], ['fetch', '--cache-dir', 'C', '--', 'dQw4w9WgXcQ', 'D']);
        assert.ok(/dQw4w9WgXcQ\.json$/.test(d.infoFile('dQw4w9WgXcQ')));
        assert.ok(logs.some((l) => /not listening: directly/.test(l)));
        d.opts.socks = '';
        assert.strictEqual(await d.probeSocks(), false, "'' turns the proxy off");
    });

    web.close(); proxy.close();
    results.forEach((r) => console.log(r));
    const bad = results.filter((r) => /^FAIL/.test(r)).length;
    console.log(bad ? bad + ' failed' : 'test_socks: all ok');
    await sleep(50);
    process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
