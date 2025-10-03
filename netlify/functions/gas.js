// netlify/functions/gas.js
export const handler = async event => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const GAS_URL = process.env.GAS_WEBAPP_URL ||
    'https://script.google.com/macros/s/AKfycby69Ngv7yflRCqkOOtRznWOtzcJDMLltSFGkdWMZmTyYYiYvBNZrIkmffXpcdQTrVqk/exec';

  try {
    const incomingCT = event.headers['content-type'] || event.headers['Content-Type'] || 'application/json';
    const bodyToSend = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '');

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'content-type': incomingCT },
      body: bodyToSend
    });

    const text = await res.text();
    const passthroughCT = res.headers.get('content-type') || 'application/json';

    return {
      statusCode: res.status,
      headers: { ...cors, 'content-type': passthroughCT },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ status: 'error', error: String(err) })
    };
  }
};
