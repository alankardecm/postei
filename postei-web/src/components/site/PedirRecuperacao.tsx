"use client";

import { useState } from "react";
import Link from "next/link";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

export function PedirRecuperacao() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setOcupado(true);
    setErro(null);

    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    });

    setOcupado(false);

    if (error) {
      // Limite de envio é o único erro que vale mostrar: os demais podem
      // revelar se o e-mail existe, e isso ajuda quem está sondando contas.
      setErro(
        /rate limit|too many/i.test(error.message)
          ? "Muitas tentativas seguidas. Espere alguns minutos."
          : "Não consegui enviar agora. Tente de novo em instantes.",
      );
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="rounded-2xl bg-limao px-5 py-6 text-ink">
        <strong className="fonte-display block text-lg">Link enviado</strong>
        <p className="mt-1 text-sm text-ink/80">
          Se existir uma conta com <strong>{email}</strong>, o link chega em instantes. Vale
          conferir a caixa de spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="rotulo">E-mail</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-linha bg-branco px-4 py-3 outline-none transition-colors focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
          placeholder="voce@exemplo.com.br"
        />
      </label>

      {erro && (
        <p role="alert" className="rounded-xl bg-ink px-4 py-3 text-sm text-tinta">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={ocupado}
        className="mt-1 rounded-full bg-limao px-5 py-3.5 font-medium text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
      >
        {ocupado ? "Enviando…" : "Enviar link"}
      </button>

      <p className="text-center text-sm text-cinza">
        Lembrou?{" "}
        <Link href="/entrar" className="text-folha underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
