import crypto from 'node:crypto';

// Demo-only in-memory session store. For production, use a database or Redis.
export const sessions = globalThis.__nebulaSessions || new Map();
globalThis.__nebulaSessions = sessions;

export function getCookie(request, name) {
  const cookieHeader = request.headers.cookie || '';
  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const item = cookies.find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export function setSessionCookie(response, sessionId) {
  response.setHeader(
    'Set-Cookie',
    `sessionId=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
  );
}

export function clearSessionCookie(response) {
  response.setHeader(
    'Set-Cookie',
    'sessionId=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
  );
}

export async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  return await new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1000000) request.destroy();
    });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    request.on('error', () => resolve({}));
  });
}

export function newSessionId() {
  return crypto.randomUUID();
}

export function methodNotAllowed(response, allowed) {
  response.setHeader('Allow', allowed.join(', '));
  return response.status(405).json({ error: 'Method not allowed' });
}

export function noStore(response) {
  response.setHeader('Cache-Control', 'no-store');
}
