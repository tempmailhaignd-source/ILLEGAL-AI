 import {
  getCookie,
  methodNotAllowed,
  newSessionId,
  noStore,
  readJsonBody,
  sessions,
  setSessionCookie
} from './_utils.js';

export default async function handler(request, response) {
  noStore(response);

  if (request.method === 'GET') {
    const sessionId = getCookie(request, 'sessionId');
    const session = sessionId ? sessions.get(sessionId) : null;

    if (session && session.expiresAt > Date.now()) {
      return response.status(200).json({
        authenticated: true,
        name: session.name
      });
    }

    if (sessionId) sessions.delete(sessionId);
    return response.status(200).json({ authenticated: false });
  }

  if (request.method === 'POST') {
    const body = await readJsonBody(request);
    const name = String(body.name || '').trim().slice(0, 80);

    if (!name) {
      return response.status(400).json({ error: 'Name required' });
    }

    const sessionId = newSessionId();
    sessions.set(sessionId, {
      name,
      expiresAt: Date.now() + 31536000000
    });
    setSessionCookie(response, sessionId);

    return response.status(200).json({ success: true, name });
  }

  return methodNotAllowed(response, ['GET', 'POST']);
}
