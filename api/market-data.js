const { getConfig, listRecords, createRecord, updateRecord, deleteRecord } = require('./_lib/airtable');
const { isAuthenticated } = require('./_lib/auth');

const CATEGORIES = ['Agricultural', 'Mineral', 'Livestock'];

module.exports = async function handler(req, res) {
    let config;
    try {
        config = getConfig('AIRTABLE_MARKET_TABLE', 'Market Prices');
    } catch (err) {
        res.status(503).json({ error: err.message });
        return;
    }

    if (req.method === 'GET') {
        try {
            const records = await listRecords(config, {
                sort: [
                    { field: 'Category', direction: 'asc' },
                    { field: 'Commodity', direction: 'asc' },
                ],
            });
            res.status(200).json({ data: records.map(formatCommodity) });
        } catch (err) {
            res.status(502).json({ error: err.message });
        }
        return;
    }

    if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    if (req.method === 'POST') {
        const fields = sanitizeCommodity(req.body);
        if (!fields) {
            res.status(400).json({ error: 'Please complete all required fields.' });
            return;
        }
        try {
            const record = await createRecord(config, fields);
            res.status(201).json({ data: formatCommodity(record) });
        } catch (err) {
            res.status(502).json({ error: err.message });
        }
        return;
    }

    if (req.method === 'PUT') {
        const { id, ...rest } = req.body || {};
        const fields = sanitizeCommodity(rest);
        if (!id || !fields) {
            res.status(400).json({ error: 'Please complete all required fields.' });
            return;
        }
        try {
            const record = await updateRecord(config, id, fields);
            res.status(200).json({ data: formatCommodity(record) });
        } catch (err) {
            res.status(502).json({ error: err.message });
        }
        return;
    }

    if (req.method === 'DELETE') {
        const id = req.query.id;
        if (!id) {
            res.status(400).json({ error: 'Missing record id.' });
            return;
        }
        try {
            await deleteRecord(config, id);
            res.status(200).json({ ok: true });
        } catch (err) {
            res.status(502).json({ error: err.message });
        }
        return;
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
};

function cleanString(value, maxLen) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLen);
}

function sanitizeCommodity(body) {
    if (!body) return null;

    const commodity = cleanString(body.commodity, 80);
    const category = body.category;
    const market = cleanString(body.market, 80);
    const unit = cleanString(body.unit, 40);
    const price = Number(body.price);

    if (!commodity || !market || !unit) return null;
    if (!CATEGORIES.includes(category)) return null;
    if (!Number.isFinite(price) || price < 0) return null;

    const fields = {
        Commodity: commodity,
        Category: category,
        Market: market,
        Unit: unit,
        'Price (NGN)': price,
    };

    const changePercent = Number(body.changePercent);
    if (Number.isFinite(changePercent)) {
        fields['Change (%)'] = changePercent;
    }

    const notes = cleanString(body.notes, 500);
    if (notes) fields.Notes = notes;

    return fields;
}

function formatCommodity(record) {
    const f = record.fields || {};
    return {
        id: record.id,
        commodity: f.Commodity || '',
        category: f.Category || '',
        market: f.Market || '',
        unit: f.Unit || '',
        price: typeof f['Price (NGN)'] === 'number' ? f['Price (NGN)'] : null,
        changePercent: typeof f['Change (%)'] === 'number' ? f['Change (%)'] : null,
        notes: f.Notes || '',
        lastUpdated: f['Last Updated'] || record.createdTime,
    };
}
