import { gerarPacote } from './gerador.js';
import { listarNichos } from './nichos.js';

/**
 * Uso: node src/cli.js <nicho> "<marca>" [quantidade]
 * Existe para testar o nucleo sem subir servidor nem depender do WhatsApp.
 */
const [, , nichoId, marca, quantidade] = process.argv;

if (!nichoId || !marca) {
  const nichos = await listarNichos();
  console.log('Uso: node src/cli.js <nicho> "<marca>" [quantidade]\n');
  console.log('Nichos disponiveis:');
  for (const n of nichos) console.log(`  ${n.id.padEnd(20)} ${n.nome}`);
  process.exit(1);
}

console.log(`[postei] gerando ${quantidade || 5} post(s) de "${nichoId}" para "${marca}"...`);

try {
  const p = await gerarPacote({
    nichoId,
    marca,
    quantidade: quantidade || 5,
    assinanteId: 'teste-local',
  });

  console.log(`\nOK - ${p.posts.length} posts em ${(p.duracaoMs / 1000).toFixed(1)}s`);
  console.log(`Pasta: ${p.diretorio}`);
  if (p.usoTokens) console.log(`Tokens: ${p.usoTokens.total_tokens}`);

  for (const [i, post] of p.posts.entries()) {
    console.log(`\n--- ${i + 1}. [${post.formato}] ${post.titulo}`);
    console.log(`    ${post.legenda}`);
    console.log(`    CTA: ${post.cta || '(sem)'}`);
    console.log(`    #: ${post.hashtags.slice(0, 5).join(' ')}`);
    console.log(`    img: ${post.imagem}`);
  }
} catch (erro) {
  console.error(`\nFALHOU: ${erro.message}`);
  process.exit(1);
}
