const { getConfig, listRecords, createRecord, updateRecord } = require('./_lib/airtable');
const { isAuthenticated } = require('./_lib/auth');

const REGISTRATION_TYPES = ['Individual Farmer', 'Cooperative / Group'];
const STATUSES = ['New', 'Reviewed', 'Contacted', 'Approved'];

module.exports = async function handler(req, res) {
    let config;
    try {
        config = getConfig('AIRTABLE_REGISTRATIONS_TABLE', 'Registrations');
    } catch (err) {
        res.status(503).json({ error: err.message });
        return;
    }

    if (req.method === 'POST') {
        await handleCreate(req, res, config);
        return;
    }

    if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    if (req.method === 'GET') {
        await handleList(req, res, config);
        return;
    }

    if (req.method === 'PATCH') {
        await handleUpdateStatus(req, res, config);
        return;
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    res.status(405).json({ error: 'Method not allowed' });
};

async function handleCreate(req, res, config) {
    const body = req.body || {};

    // Honeypot field: bots fill hidden fields, humans never see them. Pretend success without writing.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
        res.status(200).json({ ok: true });
        return;
    }

    const fields = sanitizeRegistration(body);
    if (!fields) {
        res.status(400).json({ error: 'Please complete all required fields.' });
        return;
    }

    try {
        const record = await createRecord(config, fields);
        res.status(201).json({ data: formatRegistration(record) });
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
}

async function handleList(req, res, config) {
    try {
        const records = await listRecords(config, {});
        const data = records
            .map(formatRegistration)
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        res.status(200).json({ data });
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
}

async function handleUpdateStatus(req, res, config) {
    const { id, status } = req.body || {};
    if (!id || !STATUSES.includes(status)) {
        res.status(400).json({ error: 'Invalid id or status.' });
        return;
    }

    try {
        const record = await updateRecord(config, id, { Status: status });
        res.status(200).json({ data: formatRegistration(record) });
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
}

function cleanString(value, maxLen) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLen);
}

function sanitizeRegistration(body) {
    const fullName = cleanString(body.fullName, 120);
    const registrationType = body.registrationType;
    const phone = cleanString(body.phone, 40);
    const lga = cleanString(body.lga, 60);
    const primaryCommodities = cleanString(body.primaryCommodities, 300);
    const cooperativeName = cleanString(body.cooperativeName, 120);

    if (!fullName || !phone || !lga || !primaryCommodities) return null;
    if (!REGISTRATION_TYPES.includes(registrationType)) return null;
    if (registrationType === 'Cooperative / Group' && !cooperativeName) return null;

    const fields = {
        'Full Name': fullName,
        'Registration Type': registrationType,
        Phone: phone,
        LGA: lga,
        'Primary Commodities': primaryCommodities,
        Status: 'New',
    };

    if (cooperativeName) fields['Cooperative Name'] = cooperativeName;

    const email = cleanString(body.email, 120);
    if (email) fields.Email = email;

    const farmGroupSize = cleanString(body.farmGroupSize, 60);
    if (farmGroupSize) fields['Farm/Group Size'] = farmGroupSize;

    const yearsActive = Number(body.yearsActive);
    if (Number.isFinite(yearsActive) && yearsActive >= 0) fields['Years Active'] = yearsActive;

    const notes = cleanString(body.notes, 2000);
    if (notes) fields.Notes = notes;

    return fields;
}

function formatRegistration(record) {
    const f = record.fields || {};
    return {
        id: record.id,
        fullName: f['Full Name'] || '',
        registrationType: f['Registration Type'] || '',
        cooperativeName: f['Cooperative Name'] || '',
        phone: f.Phone || '',
        email: f.Email || '',
        lga: f.LGA || '',
        primaryCommodities: f['Primary Commodities'] || '',
        farmGroupSize: f['Farm/Group Size'] || '',
        yearsActive: typeof f['Years Active'] === 'number' ? f['Years Active'] : null,
        notes: f.Notes || '',
        status: f.Status || 'New',
        submittedAt: record.createdTime,
    };
}
