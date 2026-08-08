# -*- coding: utf-8 -*-
"""
Monta a folha de aprovacao de um lote em um HTML unico, com as imagens
embutidas em base64 -- arquivo autocontido, abre offline, nao depende de nada.

Uso:
    python scripts/montar-galeria.py <pasta-do-lote> [saida.html]

Exemplo (no servidor):
    python3 scripts/montar-galeria.py saida/nutricao-estudante_-nutri-exemplo_1786199387166
"""
import base64
import html
import io
import json
import os
import sys

if len(sys.argv) < 2:
    print(__doc__)
    sys.exit(1)

LOTE = os.path.abspath(sys.argv[1])
SAIDA = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(LOTE, "galeria.html")

caminho_pacote = os.path.join(LOTE, "pacote.json")
if not os.path.isfile(caminho_pacote):
    print("Nao achei pacote.json em %s" % LOTE)
    sys.exit(1)

pacote = json.load(io.open(caminho_pacote, encoding="utf-8"))
posts = pacote["posts"]

# Preco publicado do gemini-2.5-flash-lite pago: US$0,10/1M entrada e
# US$0,40/1M saida. Usamos o teto (tudo como saida) e cambio 5,40.
PRECO_SAIDA_USD_POR_MILHAO = 0.40
CAMBIO = 5.40


try:
    from PIL import Image
except ImportError:
    Image = None

# Criativo com fotografia pesa ~800 KB em PNG; 30 deles fariam uma galeria de
# 32 MB, que trava para abrir. A folha de aprovacao so precisa de miniatura.
LARGURA_MINIATURA = 620


def img64(nome):
    caminho = os.path.join(LOTE, nome)

    if Image is not None:
        try:
            im = Image.open(caminho).convert("RGB")
            if im.width > LARGURA_MINIATURA:
                altura = round(im.height * LARGURA_MINIATURA / im.width)
                im = im.resize((LARGURA_MINIATURA, altura), Image.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, "JPEG", quality=82, optimize=True)
            return "jpeg", base64.b64encode(buf.getvalue()).decode("ascii")
        except Exception as erro:  # miniatura e otimizacao, nunca bloqueio
            print("aviso: nao consegui redimensionar %s (%s)" % (nome, erro))

    with open(caminho, "rb") as f:
        return "png", base64.b64encode(f.read()).decode("ascii")


def esc(t):
    return html.escape(t or "")


cards = []
for i, p in enumerate(posts, 1):
    mime, b64 = img64(p["imagem"])  # uma unica leitura/redimensionamento por post
    itens = ""
    if p.get("itens"):
        itens = '<ul class="itens">%s</ul>' % "".join("<li>%s</li>" % esc(x) for x in p["itens"])
    cards.append(
        """
<article class="post">
  <div class="arte">
    <img src="data:image/{mime};base64,{b64}" alt="Criativo do post {i}: {titulo}" loading="lazy" width="1080" height="1350">
  </div>
  <div class="texto">
    <header class="cabeca">
      <span class="idx">{i:02d}</span>
      <span class="chip">{formato}</span>
    </header>
    <h3>{titulo}</h3>
    {sub}
    {itens}
    <div class="bloco"><span class="rot">Legenda</span><p>{legenda}</p></div>
    <div class="bloco"><span class="rot">Chamada</span><p class="cta">{cta}</p></div>
    <div class="bloco">
      <span class="rot">Hashtags <em>{n} tags</em></span>
      <ul class="tags">{tags}</ul>
    </div>
  </div>
</article>""".format(
            mime=mime,
            b64=b64,
            i=i,
            formato=esc(p["formato"]),
            titulo=esc(p["titulo"]),
            sub=('<p class="sub">%s</p>' % esc(p["subtitulo"])) if p.get("subtitulo") else "",
            itens=itens,
            legenda=esc(p["legenda"]),
            cta=esc(p["cta"]) or "&mdash;",
            tags="".join("<li>#%s</li>" % esc(t) for t in p["hashtags"]),
            n=len(p["hashtags"]),
        )
    )

segundos = pacote["duracaoMs"] / 1000.0
tokens = pacote.get("usoTokens", {}).get("total_tokens", 0)
custo = tokens / 1000000.0 * PRECO_SAIDA_USD_POR_MILHAO * CAMBIO

MODELO = u"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Postei &mdash; lote {nicho}</title>
<style>
  :root {{
    color-scheme: light dark;
    --paper:#F6F7F4; --surface:#FFFFFF; --ink:#141C18; --muted:#5F6B64;
    --line:#DFE4DC; --accent:#2E6B4F;
    --sombra: 0 1px 2px rgba(20,28,24,.06), 0 8px 24px -12px rgba(20,28,24,.18);
  }}
  @media (prefers-color-scheme: dark) {{
    :root {{
      --paper:#0E1411; --surface:#151D18; --ink:#E7EDE6; --muted:#93A099;
      --line:#253029; --accent:#7FC79C;
      --sombra: 0 1px 2px rgba(0,0,0,.4), 0 10px 30px -14px rgba(0,0,0,.7);
    }}
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin:0; background:var(--paper); color:var(--ink); line-height:1.55;
    font-family:'Segoe UI Variable Text','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif;
    -webkit-font-smoothing:antialiased;
  }}
  .wrap {{ max-width:1080px; margin:0 auto; padding:48px 24px 96px; }}
  .sobre {{
    font-family:ui-monospace,'Cascadia Mono','SF Mono',Menlo,monospace;
    font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--muted);
    margin:0 0 14px;
  }}
  h1 {{ margin:0 0 14px; font-size:clamp(1.9rem,4.5vw,2.7rem); line-height:1.12;
       letter-spacing:-.02em; text-wrap:balance; font-weight:650; }}
  .intro {{ margin:0; max-width:62ch; color:var(--muted); font-size:1.02rem; }}
  .fatos {{
    display:grid; gap:1px; margin:30px 0 0;
    grid-template-columns:repeat(auto-fit,minmax(132px,1fr));
    background:var(--line); border:1px solid var(--line); border-radius:10px; overflow:hidden;
  }}
  .fato {{ background:var(--surface); padding:14px 16px; }}
  .fato dt {{ font-family:ui-monospace,'Cascadia Mono','SF Mono',Menlo,monospace;
    font-size:.66rem; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin:0 0 4px; }}
  .fato dd {{ margin:0; font-size:1.15rem; font-weight:620;
    font-variant-numeric:tabular-nums; letter-spacing:-.01em; }}
  .fato dd small {{ font-weight:400; font-size:.8rem; color:var(--muted); }}
  .lista {{ display:flex; flex-direction:column; gap:26px; margin-top:44px; }}
  .post {{ display:grid; grid-template-columns:300px 1fr; gap:26px; background:var(--surface);
    border:1px solid var(--line); border-radius:12px; padding:20px; box-shadow:var(--sombra); }}
  .arte img {{ display:block; width:100%; height:auto; border-radius:6px; border:1px solid var(--line); }}
  .texto {{ display:flex; flex-direction:column; gap:14px; min-width:0; }}
  .cabeca {{ display:flex; align-items:center; gap:10px; }}
  .idx {{ font-family:ui-monospace,'Cascadia Mono','SF Mono',Menlo,monospace;
    font-size:.8rem; color:var(--muted); font-variant-numeric:tabular-nums; }}
  .chip {{ font-family:ui-monospace,'Cascadia Mono','SF Mono',Menlo,monospace;
    font-size:.66rem; letter-spacing:.1em; text-transform:uppercase; padding:3px 9px;
    border-radius:20px; border:1px solid var(--line); color:var(--muted); }}
  .post h3 {{ margin:0; font-size:1.28rem; line-height:1.25; letter-spacing:-.015em;
    text-wrap:balance; font-weight:640; }}
  .sub {{ margin:-6px 0 0; color:var(--muted); font-size:.96rem; }}
  .itens {{ margin:0; padding-left:20px; font-size:.95rem; display:flex;
    flex-direction:column; gap:3px; }}
  .bloco {{ display:flex; flex-direction:column; gap:5px; }}
  .rot {{ font-family:ui-monospace,'Cascadia Mono','SF Mono',Menlo,monospace;
    font-size:.64rem; letter-spacing:.13em; text-transform:uppercase; color:var(--muted); }}
  .rot em {{ font-style:normal; opacity:.7; }}
  .bloco p {{ margin:0; font-size:.97rem; }}
  .cta {{ color:var(--accent); font-weight:560; }}
  .tags {{ list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:6px;
    font-family:ui-monospace,'Cascadia Mono','SF Mono',Menlo,monospace; font-size:.78rem; }}
  .tags li {{ background:var(--paper); border:1px solid var(--line); padding:2px 8px;
    border-radius:5px; color:var(--muted); }}
  footer {{ margin-top:56px; padding-top:22px; border-top:1px solid var(--line);
    color:var(--muted); font-size:.9rem; max-width:70ch; }}
  footer p {{ margin:0 0 8px; }}
  @media (max-width:720px) {{
    .wrap {{ padding:32px 16px 64px; }}
    .post {{ grid-template-columns:1fr; gap:18px; }}
    .arte {{ max-width:320px; }}
  }}
</style>
</head>
<body>
<div class="wrap">
  <p class="sobre">Postei &middot; lote de valida&ccedil;&atilde;o &middot; {data}</p>
  <h1>{n} posts &mdash; {nicho}</h1>
  <p class="intro">Marca: <code>{marca}</code>. Arquivo autocontido: as imagens est&atilde;o
  embutidas, abre offline e n&atilde;o depende de servidor nenhum.</p>

  <dl class="fatos">
    <div class="fato"><dt>Posts</dt><dd>{n}</dd></div>
    <div class="fato"><dt>Tempo</dt><dd>{seg:.0f}<small>s</small></dd></div>
    <div class="fato"><dt>Tokens</dt><dd>{tok}</dd></div>
    <div class="fato"><dt>Custo estimado</dt><dd>R$ {custo:.2f}</dd></div>
    <div class="fato"><dt>Por post</dt><dd>R$ {porpost:.3f}</dd></div>
    <div class="fato"><dt>Imagem</dt><dd>R$ 0,00</dd></div>
  </dl>

  <div class="lista">{cards}
  </div>

  <footer>
    <p>Custo pelo pre&ccedil;o pago do <code>gemini-2.5-flash-lite</code>, contando tudo como
    sa&iacute;da (teto) e c&acirc;mbio de R$ 5,40. Serve para dimensionar margem, n&atilde;o para fechar pre&ccedil;o.</p>
    <p>A imagem custa R$ 0,00 porque &eacute; template program&aacute;tico, n&atilde;o IA de imagem.</p>
  </footer>
</div>
</body>
</html>
"""

io.open(SAIDA, "w", encoding="utf-8").write(
    MODELO.format(
        n=len(posts),
        nicho=esc(pacote["nicho"]["nome"]),
        marca=esc(pacote["marca"]),
        seg=segundos,
        tok="{:,}".format(tokens).replace(",", "."),
        custo=custo,
        porpost=custo / len(posts) if posts else 0,
        data=pacote["geradoEm"][:10].replace("-", "/"),
        cards="".join(cards),
    )
)
print("gerado: %s (%.0f KB)" % (SAIDA, os.path.getsize(SAIDA) / 1024.0))
