import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { config } from './config.js';

const execFileAsync = promisify(execFile);

/**
 * Reel do cliente: zoom/pan na arte (ffmpeg). Sem API, sem custo.
 * A arte de feed é 4:5 — vira 9:16 com faixa da cor do próprio card.
 */

const LARGURA = 1080;
const ALTURA = 1920;
const DURACAO = 8;
const FPS = 30;

export async function ffmpegDisponivel() {
  try {
    await execFileAsync(config.ffmpeg, ['-version'], { timeout: 8000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function hexFundo(amostra) {
  const r = amostra?.r ?? 244;
  const g = amostra?.g ?? 241;
  const b = amostra?.b ?? 234;
  return { r, g, b };
}

async function corDaBorda(bytes) {
  try {
    const sharp = (await import('sharp')).default;
    const { data } = await sharp(bytes)
      .extract({ left: 4, top: 4, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { r: data[0], g: data[1], b: data[2] };
  } catch {
    return { r: 244, g: 241, b: 234 };
  }
}

async function still9x16(bytes, fundo) {
  const sharp = (await import('sharp')).default;
  const cor = hexFundo(fundo);
  return sharp(bytes)
    .resize(LARGURA, ALTURA, {
      fit: 'contain',
      background: cor,
    })
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

function filtroKenBurns(variante) {
  const frames = DURACAO * FPS;
  // zoompan precisa da imagem já em 9:16. Variantes leves para o lote
  // não ficar com o mesmo movimento em todo post.
  if (variante % 3 === 1) {
    return `zoompan=z=1.12:x='(iw-iw/zoom)*on/${frames}':y='(ih-ih/zoom)*on/${frames}':d=${frames}:s=${LARGURA}x${ALTURA}:fps=${FPS},format=yuv420p`;
  }
  if (variante % 3 === 2) {
    return `zoompan=z=1.12:x='(iw-iw/zoom)*(1-on/${frames})':y='(ih-ih/zoom)*(1-on/${frames})':d=${frames}:s=${LARGURA}x${ALTURA}:fps=${FPS},format=yuv420p`;
  }
  return `zoompan=z='min(1+0.0007*on,1.10)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${LARGURA}x${ALTURA}:fps=${FPS},format=yuv420p`;
}

export async function gerarKenBurns({ imagemBytes, variante = 0 }) {
  if (!imagemBytes || imagemBytes.length < 500) {
    const e = new Error('Este post não tem arte para animar.');
    e.codigo = 400;
    throw e;
  }
  if (!(await ffmpegDisponivel())) {
    const e = new Error('ffmpeg não está no servidor. Sem ele o Reel do cliente não roda.');
    e.codigo = 503;
    throw e;
  }

  const fundo = await corDaBorda(imagemBytes);
  const still = await still9x16(imagemBytes, fundo);

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'postei-kb-'));
  const stillPath = path.join(tmp, 'still.jpg');
  const outPath = path.join(tmp, 'reel.mp4');
  await fs.writeFile(stillPath, still);

  try {
    await execFileAsync(
      config.ffmpeg,
      [
        '-y',
        '-loop',
        '1',
        '-i',
        stillPath,
        '-vf',
        filtroKenBurns(variante),
        '-t',
        String(DURACAO),
        '-r',
        String(FPS),
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-an',
        outPath,
      ],
      { timeout: 90000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
    );
    const bytes = await fs.readFile(outPath);
    if (bytes.length < 1000) {
      throw new Error('ffmpeg devolveu um MP4 vazio.');
    }
    return bytes;
  } catch (erro) {
    if (erro.codigo) throw erro;
    const detalhe = String(erro.stderr || erro.message || '').slice(0, 220);
    const e = new Error(`Não consegui montar o Reel: ${detalhe || 'ffmpeg falhou'}`);
    e.codigo = 500;
    throw e;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
