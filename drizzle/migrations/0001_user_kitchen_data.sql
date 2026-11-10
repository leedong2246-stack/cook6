-- Signed-in users' own kitchen data, synced across devices. Each row belongs to one user (auth.uid()).
CREATE TABLE public.user_ingredients (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  urgent boolean NOT NULL DEFAULT false,
  seq bigint GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, name)
);

CREATE TABLE public.user_favorites (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  recipe jsonb NOT NULL CHECK (jsonb_typeof(recipe) = 'object' AND octet_length(recipe::text) <= 20000),
  seq bigint GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, name)
);

CREATE TABLE public.user_regulars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  ingredients text[] NOT NULL DEFAULT '{}' CHECK (cardinality(ingredients) <= 40 AND char_length(array_to_string(ingredients, ',')) <= 1000),
  tip text NOT NULL DEFAULT '' CHECK (char_length(tip) <= 300),
  seq bigint GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ingredients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_regulars TO authenticated;
GRANT ALL ON public.user_ingredients TO service_role;
GRANT ALL ON public.user_favorites TO service_role;
GRANT ALL ON public.user_regulars TO service_role;

ALTER TABLE public.user_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_regulars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ingredients" ON public.user_ingredients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own ingredients" ON public.user_ingredients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ingredients" ON public.user_ingredients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ingredients" ON public.user_ingredients FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users read own favorites" ON public.user_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own favorites" ON public.user_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own favorites" ON public.user_favorites FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own favorites" ON public.user_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users read own regulars" ON public.user_regulars FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own regulars" ON public.user_regulars FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own regulars" ON public.user_regulars FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own regulars" ON public.user_regulars FOR DELETE TO authenticated USING (auth.uid() = user_id);