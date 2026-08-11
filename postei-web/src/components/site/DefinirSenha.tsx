"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

export function DefinirSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    // O link do e-mail traz o token no fragmento da URL. O cliente do
    // Supabase troca isso por sessão sozinho, mas leva um instante — por
    // isso a tela só habilita depois de confirmar que há sessão.
    const supabase = criarClienteNavegador();
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") setPronta(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPronta(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setOcupado(true);
    setErro(null);

    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: senha });

    setOcupado(false);
    if (error) {
      setErro(
        /at least/i.test(error.message)
          ? "A senha precisa ter pelo menos 6 caracteres."
          : "Não consegui trocar a senha. Peça um link novo.",
      );
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  if (!pronta) {
    return (
      <div className="rounded-2xl border border-linha bg-branco p-6 text-cinza">
        <p>
          Este link não parece válido ou já expirou.{" "}
          <Link href="/esqueci-senha" className="text-folha underline underline-offset-4">
            Peça um novo
          </Link>
          .
        </p>
        <p className="mt-3 text-sm">
          Se você acabou de clicar no e-mail, aguarde um instante — a página está confirmando.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Nova senha</span>
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="rounded-xl border border-linha bg-branco px-4 py-3 outline-none transition-colors focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
          placeholder="pelo menos 6 caracteres"
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
        {ocupado ? "Salvando…" : "Salvar e entrar"}
      </button>
    </form>
  );
}
