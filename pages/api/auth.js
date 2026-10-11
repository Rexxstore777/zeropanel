const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const users = global.users || (global.users = new Map());
const sessions = global.sessions || (global.sessions = new Map());
const attuneKeys = global.attuneKeys || (global.attuneKeys = new Map());

const SECRET = process.env.SESSION_SECRET || 'zerobot-ultimate-v1';
const DEFAULT_ATTUNE = process.env.ATTUNE_KEY || 'sukisuki';

function parseCookies(req) {
    const cookies = {};
    (req.headers.cookie || '').split(';').forEach(c => {
        const [k, v] = c.trim().split('=');
        if (k) cookies[k] = v;
    });
    return cookies;
}

function genFingerprint(req) {
    return crypto.createHash('sha256').update(
        (req.headers['user-agent'] || '') +
        (req.headers['accept-language'] || '') +
        (req.headers['x-forwarded-for'] || '')
    ).digest('hex').slice(0, 16);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Bypass-Token');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action } = req.query;
    const cookies = parseCookies(req);

    // ═══ BYPASS CAPTCHA — auto-generate token ═══
    if (action === 'captcha') {
        const id = crypto.randomBytes(16).toString('hex');
        const bypassToken = crypto.createHash('sha256').update(id + SECRET + 'bypass').digest('hex');
        return res.json({ id, bypassToken, bypass: true, mode: 'auto' });
    }

    // ═══ REGISTER ═══
    if (action === 'register' && req.method === 'POST') {
        const { username, password } = req.body;
        if (!username || !password) return res.json({ ok: false, msg: 'Isi semua field' });
        if (username.length < 3) return res.json({ ok: false, msg: 'Username min 3 char' });
        if (password.length < 3) return res.json({ ok: false, msg: 'Password min 3 char' });
        if (users.has(username)) return res.json({ ok: false, msg: 'Username udah ada' });
        users.set(username, {
            password: await bcrypt.hash(password, 10),
            attuned: false,
            attuneKey: DEFAULT_ATTUNE,
            created: Date.now(),
            requests: 0,
        });
        return res.json({ ok: true, msg: '✅ Register berhasil' });
    }

    // ═══ LOGIN — BYPASS CAPTCHA ═══
    if (action === 'login' && req.method === 'POST') {
        const { username, password, captchaId, captchaAnswer, bypassToken } = req.body;
        if (!users.has(username)) return res.json({ ok: false, msg: 'User gak ada' });
        const u = users.get(username);
        if (!(await bcrypt.compare(password, u.password)))
            return res.json({ ok: false, msg: 'Password salah' });

        // ═══ BYPASS CAPTCHA — selalu lolos ═══
        let captchaOK = true;
        if (captchaId && bypassToken) {
            const expected = crypto.createHash('sha256').update(captchaId + SECRET + 'bypass').digest('hex');
            // Bypass: apapun input, selalu lolos kalau bypassToken valid
            captchaOK = (bypassToken === expected) || (captchaAnswer === 'auto') || true; // force true
        }

        const token = crypto.randomBytes(32).toString('hex');
        const fp = genFingerprint(req);
        sessions.set(token, {
            username,
            attuned: u.attuned || false,
            fingerprint: fp,
            created: Date.now(),
            lastSeen: Date.now(),
        });
        res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);
        return res.json({ ok: true, msg: '✅ Login berhasil', attuned: u.attuned });
    }

    // ═══ LOGOUT ═══
    if (action === 'logout') {
        if (cookies.session) sessions.delete(cookies.session);
        res.setHeader('Set-Cookie', 'session=; Max-Age=0; Path=/');
        return res.json({ ok: true });
    }

    // ═══ STATUS — VALIDASI FINGERPRINT ═══
    if (action === 'status') {
        const s = sessions.get(cookies.session);
        if (!s) return res.json({ loggedIn: false });

        // ═══ BYPASS: kalau fingerprint beda, tetap lolos (buat dev) ═══
        // Aktifkan strict kalau mau secure:
        // const fp = genFingerprint(req);
        // if (s.fingerprint !== fp) return res.json({ loggedIn: false });

        s.lastSeen = Date.now();
        sessions.set(cookies.session, s);
        return res.json({ loggedIn: true, username: s.username, attuned: s.attuned });
    }

    // ═══ ATTUNE — BYPASS MULTIPLE KEY ═══
    if (action === 'attune' && req.method === 'POST') {
        const s = sessions.get(cookies.session);
        if (!s) return res.json({ ok: false, msg: 'Belum login' });
        const { key } = req.body;
        const u = users.get(s.username);

        // ═══ BYPASS: terima multiple key ═══
        const VALID_KEYS = [
            u.attuneKey,
            DEFAULT_ATTUNE,
            'sukisuki',
            'zero',
            'admin',
            'root',
            'bypass',
            'unlock',
        ];
        if (!VALID_KEYS.includes(key)) {
            return res.json({ ok: false, msg: 'Key salah' });
        }

        s.attuned = true;
        u.attuned = true;
        sessions.set(cookies.session, s);
        users.set(s.username, u);
        return res.json({ ok: true, msg: '✅ Attune berhasil' });
    }

    // ═══ CHANGE ATTUNE KEY ═══
    if (action === 'set-attune' && req.method === 'POST') {
        const s = sessions.get(cookies.session);
        if (!s) return res.json({ ok: false, msg: 'Belum login' });
        const { newKey } = req.body;
        if (!newKey || newKey.length < 3) return res.json({ ok: false, msg: 'Key min 3 char' });
        const u = users.get(s.username);
        u.attuneKey = newKey;
        users.set(s.username, u);
        return res.json({ ok: true, msg: 'Key diganti' });
    }

    // ═══ RESET ATTUNE — buat testing ═══
    if (action === 'reset-attune') {
        const s = sessions.get(cookies.session);
        if (!s) return res.json({ ok: false, msg: 'Belum login' });
        s.attuned = false;
        const u = users.get(s.username);
        u.attuned = false;
        sessions.set(cookies.session, s);
        users.set(s.username, u);
        return res.json({ ok: true, msg: 'Reset attune' });
    }

    res.status(404).json({ ok: false, msg: 'Not found' });
}