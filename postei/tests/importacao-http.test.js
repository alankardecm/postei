import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

test('HTTP: autenticação, isolamento e revisão sem truncar legenda', { timeout: 30000 }, async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'postei-http-'));
  const processo = spawn(process.execPath, ['src/index.js'], { cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT: '4731', HOST: '127.0.0.1', DIR_SAIDA: dir, LITELLM_API_KEY: 'teste',
      POSTEI_API_KEY: 'teste-importacao', SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', XAI_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => {
    if (processo.exitCode === null) await new Promise(resolve => { processo.once('exit', resolve); processo.kill(); });
    await fs.rm(dir, { recursive: true, force: true });
  });
  let erros = '';
  processo.stderr.on('data', b => { erros += b.toString(); });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Motor não iniciou')), 10000);
    processo.stdout.on('data', b => { if (b.toString().includes('motor no ar')) { clearTimeout(timer); resolve(); } });
    processo.once('exit', code => { clearTimeout(timer); reject(new Error('Motor terminou: ' + code + ' ' + erros)); });
    processo.once('error', reject);
  });
  const base = 'http://127.0.0.1:4731';
  const headers = { 'content-type': 'application/json', 'x-postei-chave': 'teste-importacao', 'x-postei-assinante': 'qa-owner', 'x-postei-internos': '1' };
  assert.equal((await fetch(base + '/importacoes', { method: 'POST' })).status, 401);
  assert.equal((await fetch(base + '/importacoes', { method: 'POST', headers: { ...headers, 'x-postei-internos': '0' }, body: '{}' })).status, 403);
  const bytes = await sharp({ create: { width: 80, height: 100, channels: 3, background: '#55dce3' } }).png().toBuffer();
  const legenda = 'a'.repeat(2090) + ' FIM DA LEGENDA';
  const resposta = await fetch(base + '/importacoes', { method: 'POST', headers, body: JSON.stringify({ marca: 'AM', titulo: 'Teste', legenda, imagemBase64: bytes.toString('base64') }) });
  assert.equal(resposta.status, 201);
  const { loteId } = await resposta.json();
  const url = base + '/lotes/' + loteId;
  assert.equal((await fetch(url, { headers: { ...headers, 'x-postei-assinante': 'outra-conta' } })).status, 404);
  assert.equal((await fetch(url + '/posts/0', { method: 'PATCH', headers, body: JSON.stringify({ legenda: legenda + '!' }) })).status, 200);
  assert.equal((await (await fetch(url, { headers })).json()).posts[0].legenda, legenda + '!');
  assert.equal((await fetch(url + '/posts/0', { method: 'PATCH', headers, body: JSON.stringify({ legenda: 'a'.repeat(2200), cta: 'Excesso' }) })).status, 400);
  assert.equal((await (await fetch(url, { headers })).json()).posts[0].legenda, legenda + '!');
  assert.equal((await fetch(url + '/posts/0/arte', { method: 'POST', headers, body: JSON.stringify({ fonte: 'pexels' }) })).status, 400);
});
