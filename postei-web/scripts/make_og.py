"""Capa Open Graph 1200x630 — Postei (texto em código)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MOSTRA = ROOT / "public" / "mostra" / "01-receitas.jpg"
OUT = ROOT / "public" / "og.jpg"
W, H = 1200, 630
PAPEL = (18, 20, 26)
LIMAO = (159, 232, 112)
TINTA = (242, 244, 238)
CINZA = (155, 155, 147)
INK = (16, 16, 16)


def font(paths: list[str], size: int):
    for p in paths:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (W, H), PAPEL)
    draw = ImageDraw.Draw(img)

    # Bloco limão à esquerda
    draw.rectangle([0, 0, 10, H], fill=LIMAO)

    if MOSTRA.exists():
        card = Image.open(MOSTRA).convert("RGB")
        cw, ch = 280, 350
        scale = max(cw / card.width, ch / card.height)
        card = card.resize((int(card.width * scale), int(card.height * scale)), Image.Resampling.LANCZOS)
        left = (card.width - cw) // 2
        top = (card.height - ch) // 2
        card = card.crop((left, top, left + cw, top + ch))
        mask = Image.new("L", (cw, ch), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, cw - 1, ch - 1], radius=18, fill=255)
        img.paste(card, (W - cw - 72, (H - ch) // 2), mask)

    serif = [r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf"]
    sans = [r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"]

    draw.rounded_rectangle([56, 52, 168, 100], radius=20, fill=LIMAO)
    draw.text((112, 76), "Postei", font=font(serif, 22), fill=INK, anchor="mm")

    draw.text((56, 250), "Seu mês no Instagram,", font=font(serif, 46), fill=TINTA)
    draw.text((56, 314), "pronto.", font=font(serif, 46), fill=LIMAO)
    draw.text(
        (56, 400),
        "30 posts. Você revisa e publica. Sem cartão para testar.",
        font=font(sans, 20),
        fill=CINZA,
    )
    draw.text((56, 548), "postei.amconsultoria.tech", font=font(serif, 20), fill=LIMAO)

    img.save(OUT, "JPEG", quality=88, optimize=True)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
