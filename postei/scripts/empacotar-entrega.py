# -*- coding: utf-8 -*-
"""
Monta o pacote que vai para as MAOS do assinante: imagens numeradas em JPEG
e um arquivo de legendas pronto para copiar e colar.

Converte criativo com foto de PNG para JPEG (corta ~89% do peso, o que
importa na hora de mandar pelo WhatsApp). Nao regera conteudo nenhum -- so
reempacota o lote que ja foi aprovado.

Uso:
    python3 scripts/empacotar-entrega.py <pasta-do-lote> [pasta-de-saida]
"""
import io
import json
import os
import shutil
import sys

try:
    from PIL import Image
except ImportError:
    print("Este script precisa do Pillow: apt-get install -y python3-pil")
    sys.exit(1)

if len(sys.argv) < 2:
    print(__doc__)
    sys.exit(1)

LOTE = os.path.abspath(sys.argv[1])
DESTINO = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(LOTE, "entrega")

pacote = json.load(io.open(os.path.join(LOTE, "pacote.json"), encoding="utf-8"))
posts = pacote["posts"]

if os.path.isdir(DESTINO):
    shutil.rmtree(DESTINO)
os.makedirs(DESTINO)

linhas = [
    u"LEGENDAS — %s" % pacote["nicho"]["nome"],
    u"Perfil: %s" % pacote["marca"],
    u"Gerado em %s" % pacote["geradoEm"][:10],
    u"",
    u"Cada bloco abaixo corresponde ao arquivo de imagem de mesmo numero.",
    u"Copie do 'Legenda' ate a ultima hashtag e cole direto no Instagram.",
    u"=" * 68,
    u"",
]

economia = 0
for i, p in enumerate(posts, 1):
    origem = os.path.join(LOTE, p["imagem"])
    if not os.path.isfile(origem):
        print("aviso: imagem ausente para o post %d (%s)" % (i, p["imagem"]))
        continue

    destino = os.path.join(DESTINO, "%02d.jpg" % i)
    antes = os.path.getsize(origem)

    im = Image.open(origem).convert("RGB")
    im.save(destino, "JPEG", quality=90, optimize=True, progressive=True)
    economia += antes - os.path.getsize(destino)

    linhas.append(u"%02d.jpg  [%s]" % (i, p["formato"]))
    linhas.append(u"-" * 68)
    linhas.append(p["legenda"])
    if p.get("cta"):
        linhas.append(u"")
        linhas.append(p["cta"])
    linhas.append(u"")
    linhas.append(u" ".join(u"#" + t for t in p["hashtags"]))
    # So credita quando o criativo realmente usou a foto: lotes antigos
    # gravaram a foto mesmo em layout tipografico, e creditar ali seria
    # informacao falsa.
    if p["formato"] == "foto" and p.get("foto") and p["foto"].get("autor"):
        # Nao e exigido pela licenca do Pexels, mas registra a origem caso
        # ela queira creditar o fotografo.
        linhas.append(u"")
        linhas.append(u"[foto: %s / Pexels]" % p["foto"]["autor"])
    linhas.append(u"")
    linhas.append(u"")

io.open(os.path.join(DESTINO, "LEGENDAS.txt"), "w", encoding="utf-8").write(u"\n".join(linhas))

total = sum(
    os.path.getsize(os.path.join(DESTINO, f)) for f in os.listdir(DESTINO)
)
print("pacote em: %s" % DESTINO)
print("%d imagens + LEGENDAS.txt | %.1f MB (economia de %.1f MB)" % (
    len(posts), total / 1048576.0, economia / 1048576.0))
