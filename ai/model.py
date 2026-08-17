import os

import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title='NEBULA AI', version='1.0.0')

DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '').strip()
DEEPSEEK_MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat')
SYSTEM_PROMPT = os.getenv(
    'SYSTEM_PROMPT',
    'You are NEBULA, a helpful AI assistant. Answer clearly, accurately, and safely.'
)


class PromptRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    name: str = Field(default='User', max_length=80)


@app.get('/')
def root():
    return {'service': 'nebula-ai', 'status': 'ok'}


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'provider_configured': bool(DEEPSEEK_API_KEY)
    }


@app.post('/generate')
def generate(request: PromptRequest):
    if not DEEPSEEK_API_KEY:
        raise HTTPException(
            status_code=503,
            detail='DEEPSEEK_API_KEY is not configured'
        )

    try:
        response = requests.post(
            'https://api.deepseek.com/chat/completions',
            headers={
                'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': DEEPSEEK_MODEL,
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': request.prompt}
                ],
                'temperature': 0.7,
                'max_tokens': 1000
            },
            timeout=45
        )
    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail='AI provider is unavailable'
        ) from error

    if not response.ok:
        raise HTTPException(
            status_code=502,
            detail='AI provider returned an error'
        )

    try:
        payload = response.json()
        answer = payload['choices'][0]['message']['content']
    except (KeyError, IndexError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail='Invalid response from AI provider'
        ) from error

    return {'response': str(answer), 'name': request.name}


if __name__ == '__main__':
    port = int(os.getenv('PORT', '8000'))
    uvicorn.run(app, host='0.0.0.0', port=port)
