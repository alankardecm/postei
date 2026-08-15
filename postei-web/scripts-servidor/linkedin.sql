CREATE TABLE IF NOT EXISTS public.contas_linkedin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_urn text NOT NULL,
  nome text,
  token text NOT NULL,
  refresh_token text,
  expira_em timestamptz NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id)
);
CREATE INDEX IF NOT EXISTS contas_li_usuario_idx ON public.contas_linkedin (usuario_id);
ALTER TABLE public.contas_linkedin ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contas_linkedin' AND policyname = 'dono le suas contas li'
  ) THEN
    CREATE POLICY "dono le suas contas li" ON public.contas_linkedin
      FOR SELECT USING (auth.uid() = usuario_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.publicacoes_linkedin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id uuid NOT NULL REFERENCES public.contas_linkedin(id) ON DELETE CASCADE,
  lote_id text NOT NULL,
  indice integer,
  arquivo text NOT NULL DEFAULT '',
  legenda text NOT NULL DEFAULT '',
  agendada_para timestamptz NOT NULL,
  situacao text NOT NULL DEFAULT 'rascunho',
  li_post_urn text,
  erro text,
  tentativas integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT publicacoes_li_situacao_check CHECK (
    situacao = ANY (ARRAY['rascunho','agendada','publicando','publicada','falhou'])
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS publicacoes_li_agendada_unica
  ON public.publicacoes_linkedin (usuario_id, lote_id, indice)
  WHERE situacao = ANY (ARRAY['agendada','publicando']);
CREATE INDEX IF NOT EXISTS publicacoes_li_fila_idx
  ON public.publicacoes_linkedin (situacao, agendada_para);
ALTER TABLE public.publicacoes_linkedin ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'publicacoes_linkedin' AND policyname = 'dono le suas publicacoes li'
  ) THEN
    CREATE POLICY "dono le suas publicacoes li" ON public.publicacoes_linkedin
      FOR SELECT USING (auth.uid() = usuario_id);
  END IF;
END $$;

GRANT ALL ON public.contas_linkedin TO service_role;
GRANT ALL ON public.publicacoes_linkedin TO service_role;
GRANT SELECT ON public.contas_linkedin TO authenticated;
GRANT SELECT ON public.publicacoes_linkedin TO authenticated;
