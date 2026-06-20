const { createSessionToken, setSessionCookie, safeCompare } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
        res.status(500).json({ error: 'Admin password is not configured on the server.' });
        return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!password || !safeCompare(password, expected)) {
        res.status(401).json({ error: 'Incorrect password.' });
        return;
    }

    try {
        const token = createSessionToken();
        setSessionCookie(req, res, token);
        res.status(200).json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
