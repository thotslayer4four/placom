const API_BASE = 'https://api.airtable.com/v0';

function getConfig(tableEnvVar, fallbackTable) {
    const baseId = process.env.AIRTABLE_BASE_ID;
    const token = process.env.AIRTABLE_TOKEN;
    const table = process.env[tableEnvVar] || fallbackTable;

    if (!baseId || !token) {
        throw new Error('Airtable is not configured on the server (missing AIRTABLE_BASE_ID or AIRTABLE_TOKEN).');
    }

    return { baseId, token, table };
}

async function airtableFetch(config, path, options = {}) {
    const url = `${API_BASE}/${config.baseId}/${encodeURIComponent(config.table)}${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = body?.error?.message || body?.error?.type || `Airtable request failed (${response.status})`;
        throw new Error(message);
    }

    return body;
}

async function listRecords(config, { sort } = {}) {
    const records = [];
    let offset;

    do {
        const params = new URLSearchParams();
        params.set('pageSize', '100');
        if (offset) params.set('offset', offset);
        (sort || []).forEach((entry, index) => {
            params.set(`sort[${index}][field]`, entry.field);
            params.set(`sort[${index}][direction]`, entry.direction || 'asc');
        });

        const body = await airtableFetch(config, `?${params.toString()}`, { method: 'GET' });
        records.push(...(body.records || []));
        offset = body.offset;
    } while (offset);

    return records;
}

async function createRecord(config, fields) {
    return airtableFetch(config, '', {
        method: 'POST',
        body: JSON.stringify({ fields, typecast: true }),
    });
}

async function updateRecord(config, id, fields) {
    return airtableFetch(config, `/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields, typecast: true }),
    });
}

async function deleteRecord(config, id) {
    await airtableFetch(config, `/${id}`, { method: 'DELETE' });
}

module.exports = { getConfig, listRecords, createRecord, updateRecord, deleteRecord };
