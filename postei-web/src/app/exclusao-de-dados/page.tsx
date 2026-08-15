import { Venda } from "@/components/site/Venda";
import { Rodape } from "@/components/site/Secoes";
import { Documento, Secao } from "@/components/site/Documento";
import { ExcluirConta } from "@/components/site/ExcluirConta";
import { usuarioAtual } from "@/lib/motor";
import { CONTROLADOR, ATUALIZADO_EM } from "@/lib/juridico";

export const metadata = {
  title: "Exclusão de dados — Postei",
  description: "Como apagar sua conta e todos os dados guardados pelo Postei.",
};

export const dynamic = "force-dynamic";

export default async function ExclusaoDeDados() {
  const user = await usuarioAtual();

  return (
    <Venda>
      <Documento titulo="Exclusão de dados" atualizado={ATUALIZADO_EM}>
        <p>
          Você pode apagar sua conta e tudo que guardamos, a qualquer momento e sem precisar
          justificar. A exclusão é imediata e definitiva.
        </p>

        <Secao titulo="O que é apagado">
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>Seu cadastro e e-mail.</li>
            <li>Todos os pacotes gerados: textos e imagens, no servidor.</li>
            <li>Seus links de captação, os cliques e os contatos recebidos por eles.</li>
          </ul>
          <p>
            Não guardamos cópia. Depois de confirmar, <strong>não há como recuperar</strong> —
            se quiser manter algum pacote, baixe antes.
          </p>
        </Secao>

        <Secao titulo="Apagar agora">
          {user ? (
            <ExcluirConta email={user.email ?? ""} />
          ) : (
            <p>
              <a href="/entrar?de=/exclusao-de-dados">Entre na sua conta</a> para apagar tudo
              com um clique. Se não consegue mais acessar, escreva para{" "}
              <a href={`mailto:${CONTROLADOR.email}`}>{CONTROLADOR.email}</a> do e-mail
              cadastrado e fazemos por você em até 15 dias.
            </p>
          )}
        </Secao>

        <Secao titulo="Você deixou seu contato em um link e quer sair">
          <p>
            Se você preencheu um formulário de alguém que usa o Postei, esses dados pertencem a
            quem publicou o link — nós apenas guardamos para essa pessoa. O caminho mais rápido
            é falar diretamente com ela.
          </p>
          <p>
            Se preferir, escreva para{" "}
            <a href={`mailto:${CONTROLADOR.email}`}>{CONTROLADOR.email}</a> informando o
            endereço do link onde deixou seus dados. Apagamos o registro dos nossos sistemas e
            encaminhamos o pedido a quem é responsável.
          </p>
        </Secao>
      </Documento>
      <Rodape />
    </Venda>
  );
}
