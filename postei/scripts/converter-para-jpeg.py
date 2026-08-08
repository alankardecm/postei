# -*- coding: utf-8 -*-
"""
Converte para JPEG os criativos PNG de lotes já gerados e atualiza o
pacote.json.

Motivo: a API do Instagram só publica JPEG. Os criativos tipográficos saíam
em PNG, então 1 em cada 3 posts do pacote não podia ser publicado.

Uso:
    python3 scripts/converter-para-jpeg.py saida            # todos os lotes
    python3 scripts/converter-para-jpeg.py saida/<lote>     # um lote
"""
import io
import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    print("Precisa do Pillow: apt-get install -y python3-pil")
    sys.exit(1)

RAIZ = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "saida")


def converter_lote(pasta):
    caminho_pacote = os.path.join(pasta, "pacote.json")
    if not os.path.isfile(caminho_pacote):
        return None

    pacote = json.load(io.open(caminho_pacote, encoding="utf-8"))
    convertidos = 0

    for post in pacote.get("posts", []):
        nome = post.get("imagem", "")
        if not nome.lower().endswith(".png"):
            continue

        origem = os.path.join(pasta, nome)
        if not os.path.isfile(origem):
            print("   aviso: %s nao encontrado" % nome)
            continue

        novo_nome = nome[:-4] + ".jpg"
        destino = os.path.join(pasta, novo_nome)

        im = Image.open(origem).convert("RGB")
        # 95 + 4:4:4 mantém a letra nítida: JPEG cria franja em volta de texto
        # sobre cor chapada, e o padrão 4:2:0 borra justamente as bordas.
        im.save(destino, "JPEG", quality=95, optimize=True, subsampling=0)

        os.remove(origem)
        post["imagem"] = novo_nome
        convertidos += 1

    if convertidos:
        io.open(caminho_pacote, "w", encoding="utf-8").write(
            json.dumps(pacote, ensure_ascii=False, indent=2)
        )
    return convertidos


if os.path.isfile(os.path.join(RAIZ, "pacote.json")):
    pastas = [RAIZ]
else:
    pastas = []
    for atual, dirs, arquivos in os.walk(RAIZ):
        if "pacote.json" in arquivos:
            pastas.append(atual)

total = 0
for pasta in sorted(pastas):
    n = converter_lote(pasta)
    if n:
        print("%-58s %d convertido(s)" % (os.path.basename(pasta)[:56], n))
        total += n

print("\ntotal: %d imagens agora em JPEG" % total)
