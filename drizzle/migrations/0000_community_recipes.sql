CREATE TABLE public.community_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL CHECK (char_length(btrim(author)) BETWEEN 1 AND 12),
  avatar text NOT NULL DEFAULT '👤' CHECK (char_length(avatar) BETWEEN 1 AND 16),
  emoji text NOT NULL DEFAULT '🍽️' CHECK (char_length(emoji) BETWEEN 1 AND 16),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  ingredients text[] NOT NULL DEFAULT '{}' CHECK (cardinality(ingredients) <= 30 AND char_length(array_to_string(ingredients, ',')) <= 600),
  steps text[] NOT NULL DEFAULT '{}' CHECK (cardinality(steps) <= 15 AND char_length(array_to_string(steps, ',')) <= 3000),
  tip text NOT NULL CHECK (char_length(btrim(tip)) BETWEEN 1 AND 80),
  likes integer NOT NULL DEFAULT 0 CHECK (likes >= 0),
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.community_recipes TO anon, authenticated;
GRANT ALL ON public.community_recipes TO service_role;

ALTER TABLE public.community_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community recipes"
  ON public.community_recipes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can share a community recipe"
  ON public.community_recipes FOR INSERT TO anon, authenticated
  WITH CHECK (likes = 0 AND views = 0);

CREATE INDEX community_recipes_created_at_idx ON public.community_recipes (created_at DESC);
CREATE INDEX community_recipes_likes_idx ON public.community_recipes (likes DESC);
CREATE INDEX community_recipes_views_idx ON public.community_recipes (views DESC);

-- Seed example recipes (inserted before the trigger so their dates are kept)
INSERT INTO public.community_recipes (author, avatar, emoji, name, ingredients, steps, tip, likes, views, created_at) VALUES
('자취9단', '👤', '🍳', '간장버터 계란밥', ARRAY['계란','밥','버터','간장'], ARRAY['따뜻한 밥을 그릇에 담아요.','버터 한 조각을 밥 위에 올려 녹여요.','반숙 계란 프라이를 올리고 간장을 한 바퀴 둘러요.','잘 비벼서 먹어요.'], '참기름 몇 방울 + 김가루 뿌리면 식당 맛이에요!', 248, 3120, '2026-10-12T09:00:00Z'),
('파스타장인', '🧑‍🍳', '🍝', '냉장고털이 알리오올리오', ARRAY['파스타면','마늘','올리브유','페페론치노'], ARRAY['면을 소금물에 7분 삶아요.','올리브유에 편마늘을 약불로 노릇하게 볶아요.','페페론치노와 면수 한 국자를 넣어요.','면을 넣고 1분간 빠르게 섞어요.'], '면수가 소스의 핵심! 버리지 말고 꼭 남겨두세요.', 312, 2890, '2026-10-28T12:30:00Z'),
('야식요정', '🦊', '🧀', '치즈 듬뿍 김치전', ARRAY['김치','부침가루','모짜렐라치즈','양파'], ARRAY['김치와 양파를 잘게 썰어요.','부침가루와 물을 섞어 반죽해요.','팬에 얇게 펴서 굽다가 치즈를 올려요.','뚜껑을 덮고 치즈가 녹으면 완성!'], '김치 국물을 한 숟갈 넣으면 색도 맛도 진해져요.', 189, 4210, '2026-09-30T20:00:00Z'),
('두부러버', '🐰', '🥘', '5분 두부 조림', ARRAY['두부','간장','고춧가루','파'], ARRAY['두부를 도톰하게 썰어 앞뒤로 구워요.','간장, 고춧가루, 설탕, 물로 양념을 만들어요.','양념을 붓고 졸이다가 파를 올려요.'], '두부 물기를 키친타월로 꼭 빼야 안 부서져요.', 156, 1780, '2026-11-05T08:10:00Z'),
('혼술러', '🐻', '🍢', '어묵 꼬치 볶음', ARRAY['어묵','양파','케첩','고추장'], ARRAY['어묵을 한입 크기로 잘라요.','양파와 함께 기름에 볶아요.','케첩 2 : 고추장 1 : 올리고당 1 양념을 넣고 볶아요.'], '맥주 안주로 최고, 깨 솔솔 뿌려주세요.', 97, 1320, '2026-11-07T22:45:00Z'),
('아침형인간', '🐧', '🥪', '베이컨 에그 토스트', ARRAY['식빵','베이컨','계란','치즈'], ARRAY['베이컨을 바삭하게 구워요.','같은 팬에 계란 프라이를 해요.','식빵에 치즈, 베이컨, 계란 순으로 올려요.','반으로 접어 꾹 눌러 구워요.'], '베이컨 기름에 식빵을 구우면 풍미가 두 배!', 274, 2450, '2026-10-20T07:00:00Z');

-- New shares always start at 0 likes/views with the server's time
CREATE OR REPLACE FUNCTION public.community_recipes_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.likes := 0;
  NEW.views := 0;
  NEW.created_at := now();
  NEW.author := btrim(NEW.author);
  NEW.name := btrim(NEW.name);
  NEW.tip := btrim(NEW.tip);
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_recipes_before_insert
  BEFORE INSERT ON public.community_recipes
  FOR EACH ROW EXECUTE FUNCTION public.community_recipes_before_insert();

-- Like (+1) / unlike (-1), never below 0
CREATE OR REPLACE FUNCTION public.like_community_recipe(_id uuid, _delta integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_likes integer;
BEGIN
  IF _delta NOT IN (1, -1) THEN
    RAISE EXCEPTION 'delta must be 1 or -1';
  END IF;
  UPDATE public.community_recipes SET likes = GREATEST(0, likes + _delta)
  WHERE id = _id RETURNING likes INTO new_likes;
  RETURN new_likes;
END;
$$;

CREATE OR REPLACE FUNCTION public.view_community_recipe(_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_views integer;
BEGIN
  UPDATE public.community_recipes SET views = views + 1
  WHERE id = _id RETURNING views INTO new_views;
  RETURN new_views;
END;
$$;

REVOKE ALL ON FUNCTION public.like_community_recipe(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.view_community_recipe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.like_community_recipe(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.view_community_recipe(uuid) TO anon, authenticated;