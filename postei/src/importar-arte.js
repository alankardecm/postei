import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';

const falha = (mensagem, codigo = 400) => Object.assign(new Error(mensagem), { codigo });
export function validarIdentidade(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw falha('Identificação inválida.');
  return id;
}

/** Importa um post completo, sem texto sobreposto. Não usa IA nem publica. */
export async function importarArte({ raiz, assinanteId, marca, titulo, legenda, imagemBase64 }) {
  validarIdentidade(assinanteId);
  for (const [valor, limite, nome] of [[marca, 40, 'marca'], [titulo, 120, 'título'], [legenda, 2200, 'legenda']]) {
    if (typeof valor !== 'string' || !valor.trim() || valor.length > limite) throw falha(`Confira o campo ${nome} (máximo ${limite} caracteres).`);
  }
  if (typeof imagemBase64 !== 'string' || imagemBase64.length > 12 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imagemBase64)) throw falha('Imagem inválida.');
  const original = Buffer.from(imagemBase64, 'base64');
  if (!original.length || original.length > 8 * 1024 * 1024) throw falha('Envie uma imagem de até 8 MB.');
  let imagem;
  try {
    const meta = await sharp(original, { limitInputPixels: 24000000 }).metadata();
    if (!['png','jpeg','webp'].includes(meta.format) || (meta.pages || 1) > 1) throw new Error('formato');
    imagem = await sharp(original, { limitInputPixels: 24000000 }).rotate()
      .resize(1080, 1350, { fit: 'contain', background: '#080c10' })
      .flatten({ background: '#080c10' }).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
  } catch { throw falha('Não consegui ler essa arte. Use uma imagem estática JPEG, PNG ou WebP de até 24 megapixels.'); }
  // Repetir o mesmo envio é seguro: o hash evita lotes duplicados após perda de conexão.
  const assinatura = createHash('sha256').update(original).update(JSON.stringify([marca.trim(), titulo.trim(), legenda.trim()])).digest('hex').slice(0, 32);
  const loteId = `importado-am-${assinatura}`;
  const base = path.join(raiz, assinanteId);
  const destino = path.join(base, loteId);
  const existente = await fs.readFile(path.join(destino, 'pacote.json'), 'utf8').catch(() => null);
  if (existente) return JSON.parse(existente);
  const post = { formato: 'artePronta', titulo: titulo.trim(), subtitulo: null, legenda: legenda.trim(), cta: null,
    hashtags: [], fonte: null, imagem: 'post-01.jpg', imagens: null, imagemLinkedin: null,
    textoParaColar: legenda.trim(), origemArte: 'importacao' };
  const pacote = { loteId, assinanteId, marca: marca.trim(), nicho: { id: 'am-consultoria', nome: 'AM · arte importada' },
    rede: 'instagram', geradoEm: new Date().toISOString(), solicitados: 1, parcial: false, origem: 'importacao',
    usoTokens: { total_tokens: 0 }, posts: [post] };
  await fs.mkdir(base, { recursive: true });
  const temporaria = path.join(base, `.import-${randomUUID()}`);
  await fs.mkdir(temporaria);
  try {
    await fs.writeFile(path.join(temporaria, 'post-01.jpg'), imagem);
    await fs.writeFile(path.join(temporaria, 'pacote.json'), JSON.stringify(pacote, null, 2));
    await fs.rename(temporaria, destino);
  } catch (erro) {
    const concorrente = await fs.readFile(path.join(destino, 'pacote.json'), 'utf8').catch(() => null);
    if (!concorrente) throw erro;
    return JSON.parse(concorrente);
  } finally { await fs.rm(temporaria, { recursive: true, force: true }); }
  return pacote;
}
