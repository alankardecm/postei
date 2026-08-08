import { Cabecalho } from "@/components/site/Cabecalho";
import { Rodape } from "@/components/site/Secoes";
import { Documento, Secao, Tabela } from "@/components/site/Documento";
import { CONTROLADOR, ATUALIZADO_EM } from "@/lib/juridico";

export const metadata = {
  title: "Política de Privacidade — Postei",
  description: "Quais dados o Postei coleta, por quê, com quem compartilha e como excluir.",
};

export default function Privacidade() {
  return (
    <>
      <Cabecalho />
      <Documento titulo="Política de Privacidade" atualizado={ATUALIZADO_EM}>
        <p>
          Esta política explica quais dados o Postei coleta, para que usa, com quem compartilha
          e como você pede a exclusão. Ela segue a Lei Geral de Proteção de Dados
          (Lei 13.709/2018).
        </p>

        <Secao titulo="Quem trata os seus dados">
          <p>
            O controlador é <strong>{CONTROLADOR.nome}</strong>
            {CONTROLADOR.cnpj && <>, inscrito no CNPJ {CONTROLADOR.cnpj}</>}. Para qualquer
            assunto de privacidade, incluindo pedidos de acesso ou exclusão, escreva para{" "}
            <a href={`mailto:${CONTROLADOR.email}`}>{CONTROLADOR.email}</a>.
          </p>
        </Secao>

        <Secao titulo="O que coletamos e por quê">
          <Tabela
            colunas={["Dado", "Para quê", "Base legal"]}
            linhas={[
              [
                "E-mail e senha",
                "Identificar você e proteger o acesso à sua conta.",
                "Execução do contrato",
              ],
              [
                "Nome do perfil e ramo escolhido",
                "Gerar os posts com a sua assinatura e no tom do seu público.",
                "Execução do contrato",
              ],
              [
                "Os posts gerados (textos e imagens)",
                "Entregar o seu pacote e manter o histórico no painel.",
                "Execução do contrato",
              ],
              [
                "Cliques nos seus links de captação",
                "Mostrar quantas pessoas acessaram. Guardamos data e hora, sem identificar quem clicou.",
                "Legítimo interesse",
              ],
              [
                "Contatos deixados nos seus links",
                "Entregar a você quem demonstrou interesse. Veja a seção específica abaixo.",
                "Execução do contrato",
              ],
            ]}
          />
          <p>
            <strong>Não coletamos</strong> dados sensíveis, não usamos cookies de publicidade,
            não rastreamos você em outros sites e não vendemos dado nenhum.
          </p>
        </Secao>

        <Secao titulo="Os contatos captados pelos seus links">
          <p>
            Quando alguém preenche o formulário de um link seu, esses dados são{" "}
            <strong>seus, não nossos</strong>. Nessa relação você é o controlador e o Postei é
            apenas o operador: guardamos e mostramos os contatos para você, e não os usamos
            para nenhuma finalidade própria.
          </p>
          <p>
            Isso significa que <strong>a responsabilidade por essas pessoas é sua</strong>:
            informar por que está pedindo o contato, usar apenas para o que prometeu e atender
            quem pedir exclusão. Se alguém nos procurar diretamente, encaminhamos o pedido a
            você e apagamos o registro dos nossos sistemas.
          </p>
        </Secao>

        <Secao titulo="Com quem compartilhamos">
          <p>
            Só com quem é necessário para o serviço funcionar. Nenhum deles recebe seu e-mail
            ou sua senha.
          </p>
          <Tabela
            colunas={["Serviço", "O que recebe", "Onde fica"]}
            linhas={[
              [
                "Google (Gemini)",
                "O ramo escolhido, os temas e o nome do seu perfil — para escrever os textos.",
                "Estados Unidos",
              ],
              [
                "Pexels",
                "Apenas as palavras de busca da foto, em inglês. Nada sobre você.",
                "Estados Unidos",
              ],
              [
                "Hostinger",
                "Hospeda o servidor onde tudo roda.",
                "Servidor contratado pelo Postei",
              ],
            ]}
          />
          <p>
            Os dois primeiros ficam fora do Brasil, o que a LGPD chama de transferência
            internacional. Ela acontece porque é indispensável para executar o serviço que você
            contratou.
          </p>
        </Secao>

        <Secao titulo="Por quanto tempo guardamos">
          <p>
            Os pacotes gerados e os contatos captados ficam disponíveis enquanto a sua conta
            existir — é o histórico que você usa. Ao excluir a conta, apagamos tudo: cadastro,
            posts, links, cliques e contatos. Não mantemos cópia de cortesia.
          </p>
          <p>
            Registros técnicos do servidor (como erros e acessos) são mantidos por até seis
            meses, sem ligação com o conteúdo dos seus pacotes.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            A LGPD garante a você confirmar se tratamos seus dados, acessá-los, corrigi-los,
            pedir a exclusão, saber com quem compartilhamos e revogar consentimento. Para
            exercer qualquer um deles, escreva para{" "}
            <a href={`mailto:${CONTROLADOR.email}`}>{CONTROLADOR.email}</a> — respondemos em
            até 15 dias.
          </p>
          <p>
            A exclusão você também faz sozinho, na hora, pelo painel ou pela página de{" "}
            <a href="/exclusao-de-dados">exclusão de dados</a>.
          </p>
        </Secao>

        <Secao titulo="Segurança">
          <p>
            O acesso é protegido por senha, que guardamos apenas de forma cifrada — nem nós
            conseguimos lê-la. O tráfego do site é criptografado. Os pacotes de cada assinante
            ficam separados, e o banco de dados é configurado para que ninguém acesse dados de
            outra conta.
          </p>
          <p>
            Nenhum sistema é imune a incidentes. Se acontecer algum que possa te afetar,
            avisamos você e a Autoridade Nacional de Proteção de Dados, como a lei exige.
          </p>
        </Secao>

        <Secao titulo="Conteúdo gerado por inteligência artificial">
          <p>
            Os textos e imagens são gerados automaticamente e podem conter erros. Você é
            responsável por revisar antes de publicar, especialmente em áreas reguladas como
            saúde, direito e finanças. O Postei não se responsabiliza por conteúdo publicado
            sem revisão.
          </p>
        </Secao>

        <Secao titulo="Mudanças nesta política">
          <p>
            Se algo mudar de forma relevante, avisamos por e-mail antes de valer. A data no
            topo indica a última atualização.
          </p>
        </Secao>
      </Documento>
      <Rodape />
    </>
  );
}
