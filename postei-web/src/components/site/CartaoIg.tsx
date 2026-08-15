import Image from "next/image";

/** Moldura de post no feed — o comprador precisa ver o Instagram, não um mural. */
export function CartaoIg({
  arquivo,
  titulo,
  marca = "suamarca",
  className = "",
}: {
  arquivo: string;
  titulo: string;
  marca?: string;
  className?: string;
}) {
  return (
    <figure className={`cartao-ig ${className}`}>
      <div className="cartao-ig-topo">
        <span className="cartao-ig-avatar" aria-hidden="true">
          {marca.slice(0, 1).toUpperCase()}
        </span>
        <span className="cartao-ig-user">@{marca}</span>
      </div>
      <Image
        src={`/mostra/${arquivo}`}
        alt={titulo}
        width={1080}
        height={1350}
        className="block h-auto w-full"
        sizes="(max-width: 640px) 70vw, 280px"
      />
      <figcaption className="cartao-ig-rodape">
        <span aria-hidden="true">♡ 💬 ➤</span>
        <span className="sr-only">Post de exemplo no formato do Instagram</span>
      </figcaption>
    </figure>
  );
}
