import server from '../.output/server/index.mjs';

function toNodeHeaders(headers) {
  const nodeHeaders = {};
  for (const [key, value] of headers.entries()) {
    if (typeof value === 'string') {
      nodeHeaders[key] = value;
    } else {
      nodeHeaders[key] = value;
    }
  }
  return nodeHeaders;
}

function setResponseHeaders(res, headers) {
  for (const [key, value] of headers.entries()) {
    if (key.toLowerCase() === 'transfer-encoding') continue;
    res.setHeader(key, value);
  }
}

export default async function handler(req, res) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
  });

  const response = await server.fetch(request);
  setResponseHeaders(res, response.headers);
  res.statusCode = response.status;
  res.statusMessage = response.statusText || '';

  if (response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } else {
    res.end();
  }
}
