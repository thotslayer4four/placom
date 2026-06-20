const crypto = require('crypto');

const COOKIE_NAME = 'placom_admin_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

function getSecret() {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
        throw new Error('ADMIN_SESSION_SECRET is not configured on the server.');
    }
    return secret;
}

function sign(value) {
    return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function createSessionToken() {
    const expires = String(Date.now() + SESSION_DURATION_SECONDS * 1000);
    return `${expires}.${sign(expires)}`;
}

function verifySessionToken(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return false;

    const [expires, signature] = token.split('.');
    if (!expires || !signature) return false;

    let expected;
    try {
        expected = sign(expires);
    } catch {
        return false;
    }

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

    return Number(expires) > Date.now();
}

// Fixed-length HMAC digests avoid leaking password length via timingSafeEqual's size check.
function safeCompare(a, b) {
    const key = process.env.ADMIN_SESSION_SECRET || 'placom-fallback-compare-key';
    const ha = crypto.createHmac('sha256', key).update(String(a)).digest();
    const hb = crypto.createHmac('sha256', key).update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

function parseCookies(req) {
    const header = req.headers.cookie;
    const cookies = {};
    if (!header) return cookies;

    header.split(';').forEach((pair) => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        cookies[key] = decodeURIComponent(value);
    });

    return cookies;
}

function isAuthenticated(req) {
    const cookies = parseCookies(req);
    return verifySessionToken(cookies[COOKIE_NAME]);
}

function setSessionCookie(req, res, token) {
    const isHttps = req.headers['x-forwarded-proto'] === 'https';
    const parts = [
        `${COOKIE_NAME}=${token}`,
        'HttpOnly',
        'Path=/',
        'SameSite=Strict',
        `Max-Age=${SESSION_DURATION_SECONDS}`,
    ];
    if (isHttps) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req, res) {
    const isHttps = req.headers['x-forwarded-proto'] === 'https';
    const parts = [`${COOKIE_NAME}=`, 'HttpOnly', 'Path=/', 'SameSite=Strict', 'Max-Age=0'];
    if (isHttps) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
}

module.exports = {
    createSessionToken,
    isAuthenticated,
    setSessionCookie,
    clearSessionCookie,
    safeCompare,
};
