import {
  clearSessionCookie,
  getCookie,
  methodNotAllowed,
  noStore,
  sessions
} from './_utils.js';

export default async function handler(request, response) {
  noStore(response);

  if (request.method !== 'POST') {
    return methodNotAllowed(response, ['POST']);
  }

  const sessionId = getCookie(request, 'sessionId');
  if (sessionId) sessions.delete(sessionId);
  clearSessionCookie(response);

  return response.status(200).json({ success: true });
}
