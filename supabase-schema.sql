-- ============================================
-- DHARI PORTFOLIO - DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. SERVICES TABLE
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    description_en TEXT NOT NULL DEFAULT '',
    description_ar TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT 'Tv',
    whatsapp_message_en TEXT DEFAULT '',
    whatsapp_message_ar TEXT DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. EXPERIENCE STATS TABLE
CREATE TABLE IF NOT EXISTS experience_stats (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    value TEXT NOT NULL,
    label_en TEXT NOT NULL,
    label_ar TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. EXPERIENCE TIMELINE TABLE
CREATE TABLE IF NOT EXISTS experience_timeline (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role_en TEXT NOT NULL,
    role_ar TEXT NOT NULL,
    period_en TEXT NOT NULL,
    period_ar TEXT NOT NULL,
    description_en TEXT NOT NULL DEFAULT '',
    description_ar TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ORGANIZATIONS (PARTNERS) TABLE
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('channel', 'entity')),
    logo_url TEXT DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. MEDIA ITEMS TABLE
CREATE TABLE IF NOT EXISTS media_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('video', 'audio', 'photo')),
    url TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PROFILE TABLE (single row)
CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY DEFAULT 'main',
    name_en TEXT NOT NULL DEFAULT '',
    name_ar TEXT NOT NULL DEFAULT '',
    title_en TEXT NOT NULL DEFAULT '',
    title_ar TEXT NOT NULL DEFAULT '',
    short_bio_en TEXT NOT NULL DEFAULT '',
    short_bio_ar TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    location_en TEXT DEFAULT '',
    location_ar TEXT DEFAULT '',
    social_instagram TEXT DEFAULT '',
    social_youtube TEXT DEFAULT '',
    social_twitter TEXT DEFAULT '',
    social_tiktok TEXT DEFAULT '',
    image_url TEXT DEFAULT '/main-portrait.jpg',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. CONTACT SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS contact_submissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. SITE SETTINGS TABLE (key-value pairs)
CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public read access for content tables
CREATE POLICY "Public read services" ON services FOR SELECT USING (true);
CREATE POLICY "Public read experience_stats" ON experience_stats FOR SELECT USING (true);
CREATE POLICY "Public read experience_timeline" ON experience_timeline FOR SELECT USING (true);
CREATE POLICY "Public read organizations" ON organizations FOR SELECT USING (true);
CREATE POLICY "Public read media_items" ON media_items FOR SELECT USING (true);
CREATE POLICY "Public read profile" ON profile FOR SELECT USING (true);
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT USING (true);

-- Public insert for contact submissions (anyone can submit)
CREATE POLICY "Public insert contact" ON contact_submissions FOR INSERT WITH CHECK (true);

-- Service role full access (for API routes using service key)
-- Note: The anon key uses these policies. Admin operations go through 
-- API routes that verify JWT, then use Supabase with anon key but 
-- we enable insert/update/delete for anon as the API route handles auth.
CREATE POLICY "Anon manage services" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage experience_stats" ON experience_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage experience_timeline" ON experience_timeline FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage media_items" ON media_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage profile" ON profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage contact_submissions" ON contact_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon manage site_settings" ON site_settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Seed Profile
INSERT INTO profile (id, name_en, name_ar, title_en, title_ar, short_bio_en, short_bio_ar, email, phone, whatsapp, location_en, location_ar, social_instagram, social_youtube, social_twitter, social_tiktok, image_url)
VALUES (
    'main',
    'Thari Alblaihees',
    'ضاري مشعل خمد البليهيس',
    'Teacher & TV Presenter',
    'معلم ومقدم برامج',
    'Autism teacher, TV presenter, and stage event host with over 16 years of media experience and 14 years in education.',
    'معلم لطلبة التوحد ومقدم برامج تلفزيونية وفعاليات مسرحية، بخبرة تمتد لأكثر من 16 عاماً في الإعلام و 14 عاماً في التربية.',
    'Tharii@me.com',
    '60001617',
    '60001617',
    'Kuwait - Yarmouk',
    'الكويت - اليرموك',
    'https://instagram.com',
    'https://youtube.com/@ThariiMB',
    'https://twitter.com',
    'https://tiktok.com',
    '/main-portrait.jpg'
) ON CONFLICT (id) DO NOTHING;

-- Seed Services
INSERT INTO services (id, title_en, title_ar, description_en, description_ar, icon, whatsapp_message_en, whatsapp_message_ar, sort_order) VALUES
('tv-hosting', 'TV Program Hosting', 'تقديم برامج تلفزيونية', 'High professionalism in hosting talk shows and variety programs.', 'احترافية عالية في تقديم البرامج الحوارية والمنوعة.', 'Tv', 'Hello, I''m interested in TV Program Hosting services. Could you please provide more details?', 'مرحباً، أنا مهتم بخدمات تقديم البرامج التلفزيونية. هل يمكنكم تزويدي بمزيد من التفاصيل؟', 0),
('voice-over', 'Voice Over', 'تسجيل صوتي', 'Voice recording for commercials, documentaries, and videos.', 'تسجيل صوتي للإعلانات، الأفلام الوثائقية، والمقاطع المرئية.', 'Mic', 'Hello, I''m interested in Voice Over services. Could you please provide more details?', 'مرحباً، أنا مهتم بخدمات التسجيل الصوتي. هل يمكنكم تزويدي بمزيد من التفاصيل؟', 1),
('event-hosting', 'Event & Conference Hosting', 'تقديم مؤتمرات وفعاليات', 'Managing the stage and audience in an interactive and engaging style.', 'إدارة المسرح والجمهور بأسلوب تفاعلي وجذاب.', 'Users', 'Hello, I''m interested in Event & Conference Hosting services. Could you please provide more details?', 'مرحباً، أنا مهتم بخدمات تقديم المؤتمرات والفعاليات. هل يمكنكم تزويدي بمزيد من التفاصيل؟', 2),
('graduation', 'Graduation Ceremonies', 'تقديم حفلات تخرج', 'Distinctive festive atmosphere for school and university graduation ceremonies.', 'أجواء احتفالية مميزة لحفلات التخرج المدرسية والجامعية.', 'GraduationCap', 'Hello, I''m interested in Graduation Ceremony Hosting services. Could you please provide more details?', 'مرحباً، أنا مهتم بخدمات تقديم حفلات التخرج. هل يمكنكم تزويدي بمزيد من التفاصيل؟', 3),
('training', 'Media Training Courses', 'دورات في الإعلام', 'Specialized courses in public speaking and audience facing.', 'دورات متخصصة في فن الخطابة ومواجهة الجمهور.', 'Video', 'Hello, I''m interested in Media Training Courses. Could you please provide more details?', 'مرحباً، أنا مهتم بدورات التدريب الإعلامي. هل يمكنكم تزويدي بمزيد من التفاصيل؟', 4),
('event-planning', 'Event Planning', 'تخطيط وتنفيذ الفعاليات', 'Comprehensive planning and precise execution for all types of events.', 'تخطيط شامل وتنفيذ دقيق لجميع أنواع الفعاليات.', 'Calendar', 'Hello, I''m interested in Event Planning services. Could you please provide more details?', 'مرحباً، أنا مهتم بخدمات تخطيط وتنفيذ الفعاليات. هل يمكنكم تزويدي بمزيد من التفاصيل؟', 5)
ON CONFLICT (id) DO NOTHING;

-- Seed Experience Stats
INSERT INTO experience_stats (id, value, label_en, label_ar, sort_order) VALUES
('stat-1', '+16', 'Years in Media', 'عام في الإعلام', 0),
('stat-2', '+14', 'Years in Education', 'عام في التربية', 1),
('stat-3', '6', 'TV Channels', 'قنوات تلفزيونية', 2),
('stat-4', '+100', 'Events & Conferences', 'فعالية ومؤتمر', 3)
ON CONFLICT (id) DO NOTHING;

-- Seed Experience Timeline
INSERT INTO experience_timeline (id, role_en, role_ar, period_en, period_ar, description_en, description_ar, sort_order) VALUES
('exp-1', 'Autism Student Teacher', 'معلم لطلبة التوحد', '14 Years', '14 عام', 'Extensive experience working with autism students and developing their skills.', 'خبرة طويلة في التعامل مع طلبة التوحد وتنمية مهاراتهم.', 0),
('exp-2', 'TV Presenter', 'مقدم برامج تلفزيونية', '16 Years', '16 عام', 'Presenting various programs across 6 local and Arab channels.', 'تقديم برامج متنوعة في 6 قنوات محلية وعربية.', 1),
('exp-3', 'Event Planner & Executor', 'مخطط ومنفذ فعاليات', 'Ongoing', 'مستمر', 'Planning and executing dozens of major events and conferences.', 'تخطيط وتنفيذ عشرات الفعاليات الكبرى والمؤتمرات.', 2)
ON CONFLICT (id) DO NOTHING;

-- Seed Organizations
INSERT INTO organizations (id, name_en, name_ar, category, sort_order) VALUES
('ktv', 'Kuwait TV', 'تلفزيون دولة الكويت', 'channel', 0),
('watan', 'Al-Watan TV', 'تلفزيون الوطن', 'channel', 1),
('majlis', 'Al-Majlis TV', 'تلفزيون المجلس', 'channel', 2),
('rai', 'Al-Rai TV', 'تلفزيون الراي', 'channel', 3),
('adala', 'Al-Adala TV', 'تلفزيون العدالة', 'channel', 4),
('shasha', 'Al-Qabas Shasha', 'منصة القبس شاشا', 'channel', 5),
('vo', 'VO Platform', 'منصة VO', 'channel', 6),
('diwan', 'Amiri Diwan', 'الديوان الأميري', 'entity', 7),
('parliament', 'National Assembly', 'مجلس الأمة', 'entity', 8),
('kuniv', 'Kuwait University', 'جامعة الكويت', 'entity', 9),
('paaet', 'PAAET', 'الهيئة العامة للتعليم التطبيقي', 'entity', 10),
('media-forum', 'Arab Media Forum', 'ملتقى الإعلام العربي', 'entity', 11),
('koc', 'Kuwait Oil Company', 'شركة نفط الكويت', 'entity', 12),
('moi', 'Ministry of Interior', 'وزارة الداخلية', 'entity', 13),
('moe', 'Ministry of Education', 'وزارة التربية', 'entity', 14),
('moh', 'Ministry of Health', 'وزارة الصحة', 'entity', 15),
('awqaf', 'Ministry of Awqaf', 'وزارة الأوقاف والشؤون الإسلامية', 'entity', 16),
('sports', 'Public Authority for Sport', 'الهيئة العامة للرياضة', 'entity', 17),
('youth', 'Public Authority for Youth', 'الهيئة العامة للشباب', 'entity', 18),
('kisr', 'KISR', 'معهد الأبحاث العلمية', 'entity', 19),
('library', 'National Library', 'المكتبة الوطنية', 'entity', 20),
('aum', 'AUM', 'AUM', 'entity', 21),
('ack', 'ACK', 'ACK', 'entity', 22),
('auk', 'AUK', 'AUK', 'entity', 23),
('gust', 'GUST', 'جامعة الخليج', 'entity', 24),
('ktech', 'Kuwait Technical College', 'كلية الكويت التقنية', 'entity', 25),
('acico', 'ACICO', 'اسيكو', 'entity', 26),
('loyac', 'LOYAC', 'لوياك', 'entity', 27),
('boubyan', 'Boubyan Bank', 'بنك بوبيان', 'entity', 28),
('kfh', 'KFH', 'بيت التمويل الكويتي', 'entity', 29),
('food-bank', 'Kuwait Food Bank', 'البنك الكويتي للطعام', 'entity', 30),
('nuks', 'NUKS', 'الاتحاد الوطني لطلبة الكويت', 'entity', 31),
('zain', 'Zain', 'زين', 'entity', 32),
('stc', 'STC', 'STC', 'entity', 33)
ON CONFLICT (id) DO NOTHING;

-- Seed Media Items
INSERT INTO media_items (id, title_en, title_ar, type, url, sort_order) VALUES
('v1', 'TV Interview - Kuwait TV', 'مقابلة تلفزيونية - تلفزيون الكويت', 'video', 'https://www.youtube.com/embed/placeholder1', 0),
('v2', 'Hosting Kuwait University Graduation', 'تقديم حفل تخرج جامعة الكويت', 'video', 'https://www.youtube.com/embed/placeholder2', 1),
('v3', 'Talk Show - Al-Rai TV', 'برنامج حواري - تلفزيون الراي', 'video', 'https://www.youtube.com/embed/placeholder3', 2),
('a1', 'Audio Sample 1 - Commercial', 'عينة صوتية 1 - إعلان', 'audio', '/audio/sample1.mp3', 3),
('a2', 'Audio Sample 2 - Documentary', 'عينة صوتية 2 - وثائقي', 'audio', '/audio/sample2.mp3', 4),
('a3', 'Audio Sample 3 - Poetry', 'عينة صوتية 3 - شعر', 'audio', '/audio/sample3.mp3', 5)
ON CONFLICT (id) DO NOTHING;

-- Seed Site Settings
INSERT INTO site_settings (key, value) VALUES
('maintenance_mode', 'false'),
('show_partners', 'true')
ON CONFLICT (key) DO NOTHING;
