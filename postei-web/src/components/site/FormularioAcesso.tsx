"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

type Modo = "entrar" | "criar";

/**
 * Mensagens de erro em portugues e uteis. O Supabase devolve texto em ingles
 * e generico demais ("Invalid login credentials"), que nao ajuda ninguem a
 * resolver o proprio problema.
 */
function traduzirErro(mensagem: string, modo: Modo) {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha não conferem.";
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Já existe uma conta com esse e-mail. Tente entrar.";
  }
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Esse e-mail não parece válido.";
  }
  if (m.includes("email rate limit") || m.includes("over_request_rate_limit")) {
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror")) {
    return "Não consegui falar com o servidor. Verifique sua conexão.";
  }
  return modo === "criar"
    ? `Não consegui criar a conta: ${mensagem}`
    : `Não consegui entrar: ${mensagem}`;
}

export function FormularioAcesso({ modo, destino }: { modo: Modo; destino?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const criando = modo === "criar";

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOcupado(true);

    const supabase = criarClienteNavegador();
    const { error } = criando
      ? await supabase.auth.signUp({ email, password: senha })
      : await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setErro(traduzirErro(error.message, modo));
      setOcupado(false);
      return;
    }

    router.push(destino || "/painel");
    router.refresh();
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

      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Senha</span>
        <input
          type="password"
          required
          minLength={6}
          autoComplete={criando ? "new-password" : "current-password"}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="rounded-xl border border-linha bg-branco px-4 py-3 outline-none transition-colors focus:border-folha focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-folha"
          placeholder={criando ? "pelo menos 6 caracteres" : "sua senha"}
        />
      </label>

      {erro && (
        <p role="alert" className="rounded-xl bg-tinta px-4 py-3 text-sm text-papel">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={ocupado}
        className="mt-1 rounded-full bg-tinta px-5 py-3.5 font-medium text-papel transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-folha"
      >
        {ocupado ? "Um instante…" : criando ? "Criar conta" : "Entrar"}
      </button>

      {!criando && (
        <p className="text-center text-sm">
          <a href="/esqueci-senha" className="text-cinza underline underline-offset-4 hover:text-tinta">
            Esqueci minha senha
          </a>
        </p>
      )}

      <p className="text-center text-sm text-cinza">
        {criando ? "Já tem conta? " : "Ainda não tem conta? "}
        <Link
          href={criando ? "/entrar" : "/criar-conta"}
          className="text-folha underline underline-offset-4"
        >
          {criando ? "Entrar" : "Criar agora"}
        </Link>
      </p>
    </form>
  );
}
