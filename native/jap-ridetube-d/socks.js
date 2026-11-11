'use strict';
// SPDX-License-Identifier: GPL-3.0-or-later
// socks.js - the way out through a local SOCKS5 proxy (RideTube VPN). The head unit's kernel has neither NAT nor
// a TUN device, so a VPN on the car (bmw-vpn: Hysteria2, jap-wireproxy: WireGuard) can only offer a SOCKS5 proxy
// on 127.0.0.1, and a program goes through it only by asking. Here: CONNECT by name (RFC 1928, no auth): the
// proxy resolves the name, so the car's own DNS is not asked. Node 8 (ytd.js on /usr/bin/node) and Node 22 (thumb.js).
const net = require('net');
const tls = require('tls');

const DEFAULT = '127.0.0.1:1065';   // bmw-vpn and jap-wireproxy listen here (as Moonride's relay.js looks for)

// "host:port" -> {host, port}; null: not one
function parse(s) {
    const m = /^\s*([^\s:]+|\[[0-9a-fA-F:.]+\]):(\d{1,5})\s*$/.exec(String(s || ''));
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 65535) return null;
    return { host: m[1].replace(/^\[|\]$/g, ''), port: Number(m[2]) };
}

const REP = ['ok', 'general failure', 'not allowed', 'network unreachable', 'host unreachable', 'connection refused',
    'TTL expired', 'command not supported', 'address type not supported'];
function socksError(msg) { const e = new Error('socks: ' + msg); e.socks = true; return e; }

// a TCP connection to host:port through the proxy (a string "host:port"): Promise<net.Socket>, ready for data
// (the caller listens for its 'error' from then on)
function connect(proxy, host, port, timeoutMs) {
    return new Promise(function (resolve, reject) {
        const p = parse(proxy);
        if (!p) return reject(socksError('bad proxy address ' + proxy));
        const name = Buffer.from(String(host), 'utf8');
        if (!name.length || name.length > 255) return reject(socksError('bad host ' + host));
        let buf = Buffer.alloc(0), step = 0, done = false;
        const s = net.connect(p.port, p.host);
        const fail = function (e) {
            if (done) return;
            done = true; clearTimeout(timer);
            s.destroy();
            reject(e.socks ? e : socksError((e && e.code) || (e && e.message) || String(e)));
        };
        const timer = setTimeout(function () { fail(socksError('timeout')); }, timeoutMs || 10000);
        s.on('error', fail);
        s.on('close', function () { fail(socksError('proxy closed the connection')); });
        s.on('connect', function () { s.write(Buffer.from([5, 1, 0])); });
        const onData = function (d) {
            buf = Buffer.concat([buf, d]);
            if (step === 0) {
                if (buf.length < 2) return;
                if (buf[0] !== 5 || buf[1] !== 0) return fail(socksError('the proxy wants a password or is not SOCKS5'));
                buf = buf.slice(2);
                step = 1;
                const req = Buffer.alloc(7 + name.length);
                req[0] = 5; req[1] = 1; req[2] = 0; req[3] = 3; req[4] = name.length;
                name.copy(req, 5);
                req.writeUInt16BE(Number(port), 5 + name.length);
                s.write(req);
            }
            if (step === 1) {
                if (buf.length < 5) return;
                if (buf[0] !== 5) return fail(socksError('bad reply'));
                if (buf[1] !== 0) return fail(socksError(REP[buf[1]] || 'error ' + buf[1]));
                const len = buf[3] === 1 ? 10 : buf[3] === 4 ? 22 : buf[3] === 3 ? 7 + buf[4] : -1;
                if (len < 0) return fail(socksError('bad address type ' + buf[3]));
                if (buf.length < len) return;
                const rest = buf.slice(len);
                done = true; clearTimeout(timer);
                s.removeListener('data', onData);
                s.removeListener('error', fail);
                s.removeAllListeners('close');
                if (rest.length) s.unshift(rest);
                resolve(s);
            }
        };
        s.on('data', onData);
    });
}

// TLS to host:port through the proxy (servername host): Promise<tls.TLSSocket>; the handshake finishes in the
// background, as with a direct tls.connect, so the caller can write a request at once
function connectTls(proxy, host, port, timeoutMs) {
    return connect(proxy, host, port || 443, timeoutMs).then(function (raw) {
        const t = tls.connect({ socket: raw, servername: host });
        raw.on('error', function (e) { t.destroy(e); });   // the proxy's connection breaks: the request sees it
        return t;
    });
}

// is anything listening on the proxy address? cb(bool) within timeoutMs; nothing listening is quick (refused)
function listening(proxy, timeoutMs, cb) {
    const p = parse(proxy);
    if (!p) return cb(false);
    let done = false;
    const s = net.connect(p.port, p.host);
    const end = function (ok) { if (done) return; done = true; clearTimeout(timer); s.destroy(); cb(ok); };
    const timer = setTimeout(function () { end(false); }, timeoutMs || 500);
    s.on('connect', function () { end(true); });
    s.on('error', function () { end(false); });
}

module.exports = { DEFAULT: DEFAULT, parse: parse, connect: connect, connectTls: connectTls, listening: listening };
