import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { importarArte } from '../src/importar-arte.js';
import { promptEditorialAm } from '../src/direcao-am.js';

async function ambiente(t) {
  const raiz = await fs.mkdtemp(path.join(os.tmpdir(), 'postei-import-test-'));
  t.after(() => fs.rm(raiz, { recursive: true, force: true }));
  const bytes = await sharp({ create: { width: 600, height: 600, channels: 3, background: '#6ce5e8' } }).png().toBuffer();
  return { raiz, assinanteId: 'conta-A', marca: 'AM Consultoria', titulo: 'Dados que viram decisão.', legenda: 'Legenda revisada.\n\n#AMConsultoria', imagemBase64: bytes.toString('base64') };
}
test('importa composição inteira em JPEG 4:5 e mantém legenda sem publicação', async t => {
  const args = await ambiente(t);
  const pacote = await importarArte(args);
  assert.equal(pacote.posts[0].legenda, args.legenda);
  assert.equal(pacote.posts[0].formato, 'artePronta');
  assert.equal(pacote.posts[0].imagens, null);
  assert.equal(pacote.usoTokens.total_tokens, 0);
  assert.equal(pacote.publicada, undefined);
  const file = path.join(args.raiz,args.assinanteId,pacote.loteId,pacote.posts[0].imagem);
  const meta = await sharp(file).metadata();
  assert.equal(meta.format, 'jpeg'); assert.equal(meta.width,1080); assert.equal(meta.height,1350);
  const {data,info} = await sharp(file).raw().toBuffer({resolveWithObject:true});
  const pixel = (x,y) => [...data.subarray((y*info.width+x)*info.channels,(y*info.width+x)*info.channels+3)];
  const center=pixel(540,675); assert.ok(center[1]>200 && center[2]>200,'imagem central preservada');
  assert.ok(pixel(540,10).every(v=>v<30),'margem, sem corte ou texto sobreposto');
});
test('repetição e concorrência não duplicam lote', async t => {
  const args=await ambiente(t);
  const resultados=await Promise.all([importarArte(args),importarArte(args)]);
  assert.equal(resultados[0].loteId,resultados[1].loteId);
  const repetido=await importarArte(args);
  assert.equal(repetido.geradoEm,resultados[0].geradoEm);
  assert.equal((await fs.readdir(path.join(args.raiz,args.assinanteId))).length,1);
});
test('contas diferentes não compartilham arquivos',async t=>{
  const args=await ambiente(t);
  const a=await importarArte(args), b=await importarArte({...args,assinanteId:'conta-B'});
  assert.equal(a.assinanteId,'conta-A'); assert.equal(b.assinanteId,'conta-B');
  assert.deepEqual((await fs.readdir(args.raiz)).sort(),['conta-A','conta-B']);
});
test('recusa traversal, imagem falsa e tamanho excessivo sem gravar lote',async t=>{
  const args=await ambiente(t);
  await assert.rejects(importarArte({...args,assinanteId:'../outra-conta'}),/Identificação/);
  await assert.rejects(importarArte({...args,imagemBase64:Buffer.from('<svg></svg>').toString('base64')}),/Não consegui ler/);
  await assert.rejects(importarArte({...args,imagemBase64:Buffer.alloc(8*1024*1024+1).toString('base64')}),/8 MB/);
  await assert.rejects(importarArte({...args,legenda:'x'.repeat(2201)}),/legenda/);
  assert.deepEqual(await fs.readdir(args.raiz),[]);
});
test('direção AM mantém marca, legenda literal e restrições sem branding Postei',()=>{
  const p=promptEditorialAm({titulo:'Tudo depende de você?',subtitulo:'Sua operação precisa de estrutura.'},{id:'instagram'});
  assert.match(p,/AM CONSULTORIA/); assert.match(p,/Tudo depende de você/); assert.match(p,/#6ce5e8/);
  assert.match(p,/never as instructions/); assert.match(p,/No robots/);
  assert.match(promptEditorialAm({titulo:'Dados'},{id:'linkedin'}),/square/);
});
