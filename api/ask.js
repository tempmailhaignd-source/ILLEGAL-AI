import {
  getCookie,
  methodNotAllowed,
  noStore,
  readJsonBody,
  sessions
} from './_utils.js';

export default async function handler(request, response) {
  noStore(response);

  if (request.method !== 'POST') {
    return methodNotAllowed(response, ['POST']);
  }

  const sessionId = getCookie(request, 'sessionId');
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session || session.expiresAt <= Date.now()) {
    if (sessionId) sessions.delete(sessionId);
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const body = await readJsonBody(request);
  const prompt = String(body.prompt || '').trim().slice(0, 4000);

  if (!prompt) {
    return response.status(400).json({ error: 'No prompt provided' });
  }

  const aiUrl = String(process.env.AI_URL || '').replace(/\/+$/, '');
  if (!aiUrl) {
    return response.status(500).json({
      error: 'AI_URL is not configured on the server'
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const aiResponse = await fetch(`${aiUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, name: session.name }),
      signal: controller.signal
    });

    const text = await aiResponse.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: 'AI service returned invalid JSON' };
    }

    if (!aiResponse.ok) {
      return response.status(502).json({
        error: data.error || data.detail || 'AI service request failed'
      });
    }

    return response.status(200).json({
      response: String(data.response || 'No response returned.')
    });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'AI service timed out'
      : 'AI service unavailable';
    return response.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}
