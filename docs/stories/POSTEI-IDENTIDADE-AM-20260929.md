# Postei — identidade AM e artes prontas

Status: Ready for Review.

## Solicitação
Alan solicitou remodelar o Postei com a identidade visual dos três posts AM recém-criados, para poder publicar peças com esse padrão pelo produto.

## Critérios de aceite
- [x] Inspecionar site publicado e código, preservar mudanças locais preexistentes em backup.
- [x] Aplicar grafite, prata e ciano à vitrine e painel, mantendo nichos e planos existentes.
- [x] Permitir importar uma arte completa com legenda para revisão e publicação pelos fluxos existentes, sem sobrepor título ou recortar seu conteúdo.
- [x] Atualizar a direção editorial e visual do nicho interno AM para geração de imagens com o provedor existente; manter isolamento das outras marcas e autorização interna.
- [x] Explicar que a campanha de referência veio de IA externa e que a geração do produto usa o provedor configurado.
- [x] Validar importação, isolamento, imagens inválidas e prompts; executar lint, typecheck, testes e build aplicáveis.
- [x] Registrar evidência visual, limitações de ambiente e checklist final.

## Preservação
Backup dos arquivos rastreados e não ignorados em `_sync-backups/postei-20260929-before` na raiz do workspace. Branch inicial `prototipo-site`, HEAD `f7760a3`. Mudanças anteriores na vitrine, demo, conteúdo e arquivos de telecom/3D preservadas nesse backup.

## Validação

- `postei/npm test`: 6 testes aprovados, incluindo rota HTTP real, autorização, isolamento, edição de legenda e bloqueio de troca de arte final.
- `postei-web/npm run typecheck`: aprovado.
- `postei-web/npm run build`: aprovado localmente.
- `postei-web/npm run lint`: zero erros; um aviso preexistente em ExcluirConta, fora do fluxo alterado.
- QA: PASS no escopo de importação e publicação; problema de truncamento de legenda encontrado e corrigido.
- Visual: [desktop](postei-am-desktop.png) e [celular](postei-am-mobile.png).
- A geração por provedor externo não foi acionada; o fluxo de publicação real depende da conta conectada e não foi usado durante os testes.
- Produção: [postei.amconsultoria.tech](https://postei.amconsultoria.tech/) mostra a nova identidade e os dois serviços estão online. Importação sem sessão retorna HTTP 401; imagem de referência retorna HTTP 200. [Captura publicada](postei-am-publicado.png).
- Versão anterior preservada na VPS em `/opt/postei-am-before-20260929` e `/opt/postei-web-am-before-20260929`; código anterior também em `_sync-backups/postei-production-source-20260929`.

## File list

- `postei-web/src/app/globals.css`, `src/components/site/Heroi.tsx`, `src/components/site/Cabecalho.tsx`, `src/components/site/Secoes.tsx`: nova identidade visual e apresentação.
- `postei-web/public/campanha-am/`, `src/lib/campanha-am.ts`: campanha AM de referência.
- `postei-web/src/components/painel/ImportarArte.tsx`, `src/app/api/importacoes/route.ts`: estúdio para importar arte pronta.
- `postei-web/src/app/painel/page.tsx`, `src/app/painel/lote/[loteId]/page.tsx`, `src/components/painel/Gerador.tsx`: painel, revisão e geração AM.
- `postei/src/importar-arte.js`, `src/index.js`, `src/refazer-arte.js`: importação preservando composição, limites e edição sem truncamento.
- `postei/src/direcao-am.js`, `src/imagem-ia.js`, `src/criativo.js`, `src/gerador.js`, `nichos/am-consultoria.json`: direção AM com o provedor atual.
- `postei/src/llm.js`: ajuste encontrado em produção, integrado à cópia local sem perder a cascata original para os demais assinantes.
- `postei/tests/*.test.js`: testes de importação e integração HTTP.
- `postei-web/package.json`, `postei/package.json`: comandos de validação.
- Alterações locais anteriores em demo, conteúdo, vitrine e exemplos de telecom foram preservadas e incluídas no conjunto testado.
