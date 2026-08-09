import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { listarNichos } from './nichos.js';
import { pastaDoAssinante } from './gerador.js';
import { criarTarefa, verTarefa } from './tarefas.js';

const app = express();
app.use(express.json());

/**
 * O motor nao conhece usuario: quem autentica a pessoa e o painel (Next +
 * Supabase). Aqui a confianca e uma chave compartilhada entre os dois, e o
 * painel so envia `assinanteId` depois de validar a sessao.
 *
 * Sem isso, qualquer um que alcance a porta queima a cota do provedor.
 */
function exigirChave(req, res, next) {
  if (!config.chaveApi) {
    return res.status(500).json({ erro: 'POSTEI_API_KEY não configurada no servidor.' });
  }
  const enviada = req.get('x-postei-chave');
  if (enviada !== config.chaveApi) {
    return res.status(401).json({ erro: 'Chave inválida.' });
  }
  next();
}

/** O id do assinante vem do painel, que ja validou a sessao no Supabase. */
function exigirAssinante(req, res, next) {
  const id = req.get('x-postei-assinante') || req.body?.assinanteId;
  try {
    req.assinante = pastaDoAssinante(id);
    next();
  } catch {
    res.status(400).json({ erro: 'Identificação do assinante ausente ou inválida.' });
  }
}

app.get('/saude', (_req, res) => res.json({ ok: true, versao: '0.2.0' }));

app.get('/nichos', async (_req, res) => {
  try {
    const nichos = await listarNichos();
    res.json(nichos.map(({ id, nome, publico, produtoFim }) => ({ id, nome, publico, produtoFim })));
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// Enfileira a geracao e devolve o id na hora. Nao espera os ~3 minutos.
app.post('/tarefas', exigirChave, exigirAssinante, (req, res) => {
  const { nicho, marca, quantidade } = req.body || {};
  if (!nicho || !marca) {
    return res.status(400).json({ erro: "Campos obrigatórios: 'nicho' e 'marca'." });
  }
  try {
    const tarefa = criarTarefa({
      nichoId: nicho,
      marca,
      quantidade,
      assinanteId: req.assinante,
    });
    res.status(202).json({ id: tarefa.id, situacao: tarefa.situacao });
  } catch (erro) {
    res.status(erro.codigo === 'ja_em_andamento' ? 409 : 400).json({ erro: erro.message });
  }
});

app.get('/tarefas/:id', exigirChave, exigirAssinante, (req, res) => {
  const tarefa = verTarefa(req.params.id, req.assinante);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  res.json({
    id: tarefa.id,
    situacao: tarefa.situacao,
    resultado: tarefa.resultado,
    erro: tarefa.erro,
    criadaEm: tarefa.criadaEm,
  });
});

// Lotes do assinante, lidos do disco.
app.get('/lotes', exigirChave, exigirAssinante, async (req, res) => {
  const base = path.join(config.saida, req.assinante);
  try {
    const pastas = await fs.readdir(base);
    const lotes = [];
    for (const p of pastas) {
      try {
        const bruto = await fs.readFile(path.join(base, p, 'pacote.json'), 'utf8');
        const pacote = JSON.parse(bruto);
        lotes.push({
          loteId: pacote.loteId,
          nicho: pacote.nicho,
          marca: pacote.marca,
          geradoEm: pacote.geradoEm,
          posts: pacote.posts.length,
          parcial: Boolean(pacote.parcial),
          capa: pacote.posts[0]?.imagem || null,
        });
      } catch {
        // Pasta sem pacote.json = geracao interrompida. Ignorar em vez de
        // derrubar a listagem inteira.
      }
    }
    lotes.sort((a, b) => (a.geradoEm < b.geradoEm ? 1 : -1));
    res.json(lotes);
  } catch (erro) {
    if (erro.code === 'ENOENT') return res.json([]);
    res.status(500).json({ erro: erro.message });
  }
});

app.get('/lotes/:loteId', exigirChave, exigirAssinante, async (req, res) => {
  const loteId = String(req.params.loteId).replace(/[^a-zA-Z0-9._-]/g, '');
  try {
    const bruto = await fs.readFile(
      path.join(config.saida, req.assinante, loteId, 'pacote.json'),
      'utf8',
    );
    res.json(JSON.parse(bruto));
  } catch {
    res.status(404).json({ erro: 'Lote não encontrado.' });
  }
});

// Entrega a imagem de um post. Caminho montado a partir de partes ja
// higienizadas, para nao virar leitura de arquivo arbitraria.
app.get('/lotes/:loteId/imagem/:arquivo', exigirChave, exigirAssinante, async (req, res) => {
  const loteId = String(req.params.loteId).replace(/[^a-zA-Z0-9._-]/g, '');
  const arquivo = String(req.params.arquivo).replace(/[^a-zA-Z0-9._-]/g, '');
  if (!/\.(png|jpg|jpeg)$/i.test(arquivo)) {
    return res.status(400).json({ erro: 'Arquivo inválido.' });
  }
  const alvo = path.join(config.saida, req.assinante, loteId, arquivo);
  res.sendFile(alvo, (erro) => {
    if (erro && !res.headersSent) res.status(404).json({ erro: 'Imagem não encontrada.' });
  });
});

/**
 * Apaga TODOS os pacotes do assinante.
 *
 * Existe para a exclusao de conta valer de verdade: sem isto, apagar o
 * cadastro deixaria as imagens e os textos no disco, e a LGPD trata isso
 * como dado ainda em tratamento.
 */
app.delete('/assinante', exigirChave, exigirAssinante, async (req, res) => {
  const base = path.join(config.saida, req.assinante);
  try {
    const pastas = await fs.readdir(base).catch(() => []);
    await fs.rm(base, { recursive: true, force: true });
    res.json({ ok: true, lotesRemovidos: pastas.length });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

/**
 * Edita o texto de um post do pacote.
 *
 * So o texto: legenda, chamada e hashtags. O TITULO nao entra porque ele
 * esta impresso na arte -- mudar exigiria renderizar de novo, e num
 * carrossel seriam todos os slides.
 */
app.patch('/lotes/:loteId/posts/:indice', exigirChave, exigirAssinante, async (req, res) => {
  const loteId = String(req.params.loteId).replace(/[^a-zA-Z0-9._-]/g, '');
  const indice = Number(req.params.indice);
  const alvo = path.join(config.saida, req.assinante, loteId, 'pacote.json');

  try {
    const pacote = JSON.parse(await fs.readFile(alvo, 'utf8'));
    const post = pacote.posts?.[indice];
    if (!post) return res.status(404).json({ erro: 'Post não encontrado.' });

    const { legenda, cta, hashtags } = req.body || {};

    if (typeof legenda === 'string') {
      if (legenda.trim().length < 10) {
        return res.status(400).json({ erro: 'A legenda ficou curta demais.' });
      }
      // O Instagram corta a legenda em 2.200 caracteres.
      post.legenda = legenda.trim().slice(0, 2000);
    }
    if (typeof cta === 'string') post.cta = cta.trim().slice(0, 200) || null;

    if (Array.isArray(hashtags)) {
      post.hashtags = hashtags
        .map((h) => String(h).replace(/^#/, '').replace(/[^a-zA-Z0-9À-ÿ]/g, '').toLowerCase())
        .filter((h) => h.length >= 3)
        .slice(0, 30);
    }

    // O texto pronto para colar precisa refletir a edicao.
    post.textoParaColar = [
      post.legenda,
      post.cta,
      post.fonte &&
        `Fonte: ${post.fonte.titulo} (${post.fonte.revista}, ${post.fonte.ano}) - ${post.fonte.url}`,
      post.hashtags.map((h) => `#${h}`).join(' '),
    ]
      .filter(Boolean)
      .join('\n\n');

    post.editadoEm = new Date().toISOString();

    await fs.writeFile(alvo, JSON.stringify(pacote, null, 2), 'utf8');
    res.json({ ok: true, post });
  } catch (erro) {
    if (erro.code === 'ENOENT') return res.status(404).json({ erro: 'Lote não encontrado.' });
    res.status(500).json({ erro: erro.message });
  }
});

app.listen(config.porta, '127.0.0.1', () => {
  console.log(`[postei] motor no ar em http://127.0.0.1:${config.porta}`);
  console.log(`[postei] chave de API: ${config.chaveApi ? 'configurada' : 'AUSENTE'}`);
});
