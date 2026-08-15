import { Venda } from "@/components/site/Venda";
import { Rodape } from "@/components/site/Secoes";
import { Documento, Secao } from "@/components/site/Documento";
import { CONTROLADOR, ATUALIZADO_EM } from "@/lib/juridico";

export const metadata = {
  title: "Termos de Uso — Postei",
  description: "As regras de uso do Postei: o que entregamos, o que é seu e o que é sua responsabilidade.",
};

export default function Termos() {
  return (
    <Venda>
      <Documento titulo="Termos de Uso" atualizado={ATUALIZADO_EM}>
        <p>
          O Postei é um produto da <strong>{CONTROLADOR.nome}</strong>, nome fantasia de{" "}
          {CONTROLADOR.razaoSocial}, CNPJ {CONTROLADOR.cnpj}. Ao criar uma conta você concorda
          com estas regras. Elas são curtas de propósito.
        </p>

        <Secao titulo="O que o Postei faz">
          <p>
            O Postei gera pacotes de conteúdo para redes sociais — textos e imagens — a partir
            do ramo e do nome de perfil que você informa. A entrega é o material pronto para
            você revisar e publicar.
          </p>
          <p>
            Se você conectar sua conta do Instagram, o Postei pode publicar nela{" "}
            <strong>a seu pedido, post a post</strong>. A autorização acontece no próprio
            Instagram, nunca pedimos sua senha, e você pode desconectar quando quiser — o que
            revoga nosso acesso na hora. <strong>Nada é publicado sem você mandar.</strong>
          </p>
        </Secao>

        <Secao titulo="O conteúdo gerado é seu">
          <p>
            Os textos e as artes que você gera são seus, para usar como quiser, inclusive
            comercialmente. Não reivindicamos direito sobre eles.
          </p>
          <p>
            As fotos vêm de bancos de imagem com licença livre para uso comercial. Elas seguem
            a licença do banco de origem, que permite uso e modificação sem exigir crédito, mas
            não permite revender a foto isolada, fora da arte.
          </p>
        </Secao>

        <Secao titulo="Revisar antes de publicar é sua responsabilidade">
          <p>
            O conteúdo é produzido por inteligência artificial e{" "}
            <strong>pode conter erro, imprecisão ou afirmação inadequada</strong>. Configuramos
            travas para reduzir isso, mas elas não substituem sua revisão.
          </p>
          <p>
            Isso vale em dobro em profissões reguladas — saúde, nutrição, direito, finanças —
            onde publicar informação incorreta pode gerar consequência junto ao seu conselho de
            classe. Você é quem assina o post, e a responsabilidade pelo que publica é sua.
          </p>
        </Secao>

        <Secao titulo="Os contatos captados pelos seus links">
          <p>
            Ao usar o link de captação, você recolhe dados de outras pessoas. Nessa relação{" "}
            <strong>você é o controlador desses dados e o Postei é apenas o operador</strong>:
            guardamos e mostramos para você, e não usamos para finalidade própria.
          </p>
          <p>Cabe a você, perante a LGPD:</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>Deixar claro para a pessoa por que está pedindo o contato.</li>
            <li>Usar o contato apenas para o que foi informado.</li>
            <li>Atender quem pedir acesso, correção ou exclusão.</li>
            <li>Não usar os contatos para disparo em massa não solicitado.</li>
          </ul>
          <p>
            Se recebermos um pedido de exclusão de alguém que preencheu um link seu, apagamos o
            registro dos nossos sistemas e avisamos você.
          </p>
        </Secao>

        <Secao titulo="Uso aceitável">
          <p>Você concorda em não usar o Postei para:</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>Conteúdo ilegal, enganoso, discriminatório ou que incite violência.</li>
            <li>Se passar por outra pessoa, empresa ou profissional.</li>
            <li>Promessa de cura, de resultado garantido ou de ganho financeiro.</li>
            <li>Automatizar acesso além do que o painel oferece, ou sobrecarregar o serviço.</li>
          </ul>
          <p>
            Podemos suspender contas que descumpram isso, avisando o motivo sempre que
            possível.
          </p>
        </Secao>

        <Secao titulo="Disponibilidade e limites">
          <p>
            O Postei depende de serviços de terceiros para gerar texto e buscar imagens. Esses
            serviços têm limites de uso, e em momentos de pico o seu pacote pode sair menor que
            o pedido — quando isso acontece, avisamos na tela e o restante fica disponível
            depois.
          </p>
          <p>
            Fazemos o possível para manter tudo no ar, mas não prometemos funcionamento
            ininterrupto.
          </p>
        </Secao>

        <Secao titulo="Encerrar">
          <p>
            Você pode apagar sua conta a qualquer momento pela página de{" "}
            <a href="/exclusao-de-dados">exclusão de dados</a>, sem precisar justificar. A
            exclusão é imediata e definitiva.
          </p>
        </Secao>

        <Secao titulo="Mudanças e contato">
          <p>
            Se estas regras mudarem de forma relevante, avisamos por e-mail antes de valerem.
            Dúvidas: <a href={`mailto:${CONTROLADOR.email}`}>{CONTROLADOR.email}</a>.
          </p>
          <p>
            Aplica-se a legislação brasileira. Veja também a{" "}
            <a href="/privacidade">Política de Privacidade</a>.
          </p>
        </Secao>
      </Documento>
      <Rodape />
    </Venda>
  );
}
