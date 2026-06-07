-- InkReach Schema — run this in Supabase SQL Editor

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free','pro','cancelled','expired')),
  subscription_id TEXT,
  pro_expires_at TIMESTAMPTZ,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  daily_gen_count INTEGER NOT NULL DEFAULT 0,
  last_gen_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO profiles (id, email, name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Books
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Novel',
  author_name TEXT NOT NULL DEFAULT 'Your Name',
  book_cover_url TEXT DEFAULT '',
  book_blurb TEXT DEFAULT '',
  book_genre TEXT DEFAULT '',
  protagonist_name TEXT DEFAULT '',
  protagonist_persona TEXT DEFAULT '',
  book_tropes TEXT DEFAULT '',
  target_reader TEXT DEFAULT '',
  marketing_tone TEXT DEFAULT '',
  manuscript_status TEXT DEFAULT 'none' CHECK (manuscript_status IN ('none','uploading','analyzing','ready')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own books" ON books;
CREATE POLICY "Users can CRUD own books"
  ON books FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Manuscript Analyses
CREATE TABLE IF NOT EXISTS manuscript_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL DEFAULT '{}',
  raw_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE manuscript_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own analyses" ON manuscript_analyses;
CREATE POLICY "Users can CRUD own analyses"
  ON manuscript_analyses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Generated Content
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('hooks','email','pitch','social','ad','video')),
  label TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own generated content" ON generated_content;
CREATE POLICY "Users can CRUD own generated content"
  ON generated_content FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Contacts (email sequence)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own contacts" ON contacts;
CREATE POLICY "Users can CRUD own contacts"
  ON contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Outreach
CREATE TABLE IF NOT EXISTS outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  platform TEXT DEFAULT '',
  follower_count TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','opened','replied','booked','declined')),
  pitch TEXT DEFAULT '',
  follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE outreach_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own outreach" ON outreach_contacts;
CREATE POLICY "Users can CRUD own outreach"
  ON outreach_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Scheduled Posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  content TEXT DEFAULT '',
  visual_concept TEXT DEFAULT '',
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','posted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users can CRUD own scheduled posts"
  ON scheduled_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Giveaways
CREATE TABLE IF NOT EXISTS giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  prize TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','ended')),
  entries JSONB DEFAULT '[]',
  winner JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own giveaways" ON giveaways;
CREATE POLICY "Users can CRUD own giveaways"
  ON giveaways FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. Ad Campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT '',
  headline TEXT DEFAULT '',
  copy TEXT DEFAULT '',
  cta TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  audience TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','paused','ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own ads" ON ad_campaigns;
CREATE POLICY "Users can CRUD own ads"
  ON ad_campaigns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 10. Usage Logs (for analytics & rate limiting)
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own logs" ON usage_logs;
CREATE POLICY "Users can insert own logs"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own logs" ON usage_logs;
CREATE POLICY "Users can read own logs"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 11. Campaign (launch campaign data)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  title TEXT DEFAULT '',
  tasks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own campaigns" ON campaigns;
CREATE POLICY "Users can CRUD own campaigns"
  ON campaigns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 12. Landing Pages (saved inside app)
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own landing pages" ON landing_pages;
CREATE POLICY "Users can CRUD own landing pages"
  ON landing_pages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 13. ARC Reviewers
CREATE TABLE IF NOT EXISTS arc_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','received')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE arc_reviewers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own ARC reviewers" ON arc_reviewers;
CREATE POLICY "Users can CRUD own ARC reviewers"
  ON arc_reviewers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_analyses_book_id ON manuscript_analyses(book_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_book_id ON generated_content(book_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);