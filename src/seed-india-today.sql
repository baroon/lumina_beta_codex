-- ============================================================================
-- Seed: India Today brand with 30 days of historical AI visibility data
-- ============================================================================
-- Idempotent — wipes existing India Today brand-side data (profile + entities +
-- discovery + every downstream scan) and rebuilds. Safe to re-run.
-- Brand row itself is preserved (already wired into the workspace + tracker).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Constants
-- ---------------------------------------------------------------------------

\set brand_id            '\'72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d\''
\set workspace_id        '\'00000000-0000-0000-0000-000000000000\''

-- Seeded lens IDs (from LensConfiguration.cs)
\set lens_discovery      '\'c0000000-0000-0000-0000-000000000001\''
\set lens_buying         '\'c0000000-0000-0000-0000-000000000002\''
\set lens_competitor     '\'c0000000-0000-0000-0000-000000000003\''
\set lens_sentiment      '\'c0000000-0000-0000-0000-000000000004\''
\set lens_citation       '\'c0000000-0000-0000-0000-000000000005\''
\set lens_contentgap     '\'c0000000-0000-0000-0000-000000000006\''

-- Seeded platform IDs (from ai_platforms seed)
\set plat_chatgpt        '\'a0000000-0000-0000-0000-000000000001\''
\set plat_gemini         '\'a0000000-0000-0000-0000-000000000003\''
\set plat_claude         '\'a0000000-0000-0000-0000-000000000004\''
\set plat_perplexity     '\'a0000000-0000-0000-0000-000000000006\''

-- ---------------------------------------------------------------------------
-- 1. Wipe existing India Today brand-side data
-- ---------------------------------------------------------------------------

DELETE FROM trust_signals  WHERE brand_id = :brand_id;
DELETE FROM topics         WHERE brand_id = :brand_id;
DELETE FROM competitors    WHERE brand_id = :brand_id;
DELETE FROM audiences      WHERE brand_id = :brand_id;
DELETE FROM markets        WHERE brand_id = :brand_id;
DELETE FROM products       WHERE brand_id = :brand_id;
DELETE FROM brand_profiles WHERE brand_id = :brand_id;

-- Wipe existing scans for this brand's tracker (cascades to prompt_runs,
-- ai_answers, mentions, attributes, risk flags, comparisons, claims, pairs,
-- trend_points, scan_metrics).
DELETE FROM scan_runs WHERE tracker_configuration_id IN (
    SELECT id FROM tracker_configurations WHERE brand_id = :brand_id
);

-- Wipe existing prompts on the tracker (cascades through the 5 M:N tables).
DELETE FROM prompts WHERE tracker_configuration_id IN (
    SELECT id FROM tracker_configurations WHERE brand_id = :brand_id
);

-- Wipe tracker coverage so we can re-derive it cleanly.
DELETE FROM tracker_topics      WHERE tracker_configuration_id IN (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id);
DELETE FROM tracker_competitors WHERE tracker_configuration_id IN (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id);
DELETE FROM tracker_products    WHERE tracker_configuration_id IN (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id);
DELETE FROM tracker_audiences   WHERE tracker_configuration_id IN (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id);
DELETE FROM tracker_markets     WHERE tracker_configuration_id IN (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id);
DELETE FROM tracker_platforms   WHERE tracker_configuration_id IN (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id);
DELETE FROM tracker_lenses      WHERE tracker_configuration_id IN (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id);

-- Wipe the old discovery_run so the FKs can repopulate cleanly.
DELETE FROM discovery_runs WHERE brand_id = :brand_id;

-- ---------------------------------------------------------------------------
-- 2. Discovery run (completed snapshot)
-- ---------------------------------------------------------------------------

INSERT INTO discovery_runs (id, brand_id, status, started_at, extracted_at, confirmed_at, completed_at, pages_crawled)
VALUES (
    gen_random_uuid(), :brand_id, 'Completed',
    NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '34 days', NOW() - INTERVAL '34 days',
    8
);

-- ---------------------------------------------------------------------------
-- 3. Brand profile
-- ---------------------------------------------------------------------------

INSERT INTO brand_profiles (
    id, brand_id, short_description, industry, category, positioning,
    confidence, source, discovery_run_id, created_at, updated_at
)
SELECT
    gen_random_uuid(), :brand_id,
    'India Today is one of India''s leading multimedia news organizations covering politics, business, sports, entertainment, and global affairs across digital, print, and television.',
    'Media & Publishing', 'News & Current Affairs',
    'Trusted source of independent journalism with deep India coverage and a strong regional and international news network.',
    0.95, 'WebsiteCrawl', dr.id, NOW() - INTERVAL '34 days', NOW() - INTERVAL '1 day'
FROM discovery_runs dr WHERE dr.brand_id = :brand_id;

-- ---------------------------------------------------------------------------
-- 4. Products / Services
-- ---------------------------------------------------------------------------

INSERT INTO products (id, brand_id, name, description, product_type, confidence, source, discovery_run_id, created_at, aliases)
SELECT gen_random_uuid(), :brand_id, p.name, p.description, p.ptype, p.confidence,
       'WebsiteCrawl', dr.id, NOW() - INTERVAL '34 days', '[]'::jsonb
FROM discovery_runs dr,
LATERAL (VALUES
    ('India Today Digital',  'Flagship news website with breaking news, analysis, and multimedia coverage.', 'Product', 0.97),
    ('India Today Magazine', 'Weekly print magazine covering politics, business, and society.',              'Product', 0.94),
    ('India Today TV',       'English-language news television channel.',                                    'Service', 0.96),
    ('Aaj Tak',              'Hindi-language news television channel under the India Today Group umbrella.', 'Service', 0.93),
    ('India Today Conclave', 'Annual flagship conference featuring global leaders.',                         'Service', 0.85)
) AS p(name, description, ptype, confidence)
WHERE dr.brand_id = :brand_id;

-- ---------------------------------------------------------------------------
-- 5. Audiences
-- ---------------------------------------------------------------------------

INSERT INTO audiences (id, brand_id, name, description, confidence, source, discovery_run_id, created_at)
SELECT gen_random_uuid(), :brand_id, a.name, a.description, a.confidence,
       'LLMSuggested', dr.id, NOW() - INTERVAL '34 days'
FROM discovery_runs dr,
LATERAL (VALUES
    ('Politically engaged Indian readers',  'Urban professionals tracking national policy and elections.',     0.92),
    ('Business decision makers',            'Executives, founders, and investors following economic news.',    0.88),
    ('NRI and diaspora readers',            'Indians abroad following news from home.',                        0.85),
    ('Young digital news consumers',        'Under-35 audience consuming news via mobile + social.',           0.90)
) AS a(name, description, confidence)
WHERE dr.brand_id = :brand_id;

-- ---------------------------------------------------------------------------
-- 6. Markets
-- ---------------------------------------------------------------------------

INSERT INTO markets (id, brand_id, name, country_code, confidence, source, discovery_run_id, created_at)
SELECT gen_random_uuid(), :brand_id, m.name, m.cc, m.confidence,
       'WebsiteCrawl', dr.id, NOW() - INTERVAL '34 days'
FROM discovery_runs dr,
LATERAL (VALUES
    ('India',           'IN', 0.99),
    ('United States',   'US', 0.78),
    ('United Kingdom',  'GB', 0.72),
    ('United Arab Emirates', 'AE', 0.70)
) AS m(name, cc, confidence)
WHERE dr.brand_id = :brand_id;

-- ---------------------------------------------------------------------------
-- 7. Topics
-- ---------------------------------------------------------------------------

INSERT INTO topics (id, brand_id, name, confidence, source, discovery_run_id, created_at)
SELECT gen_random_uuid(), :brand_id, t.name, t.confidence,
       'LLMSuggested', dr.id, NOW() - INTERVAL '34 days'
FROM discovery_runs dr,
LATERAL (VALUES
    ('Indian Politics',           0.96),
    ('Business & Economy',        0.94),
    ('Sports & Cricket',          0.93),
    ('Entertainment & Bollywood', 0.91),
    ('Technology & Startups',     0.89),
    ('Global Affairs',            0.87),
    ('Lifestyle & Culture',       0.83),
    ('Health & Science',          0.81)
) AS t(name, confidence)
WHERE dr.brand_id = :brand_id;

-- ---------------------------------------------------------------------------
-- 8. Competitors
-- ---------------------------------------------------------------------------

INSERT INTO competitors (id, brand_id, name, aliases, domain, description, confidence, source, discovery_run_id, created_at)
SELECT gen_random_uuid(), :brand_id, c.name, c.aliases::jsonb, c.domain, c.description, c.confidence,
       'LLMSuggested', dr.id, NOW() - INTERVAL '34 days'
FROM discovery_runs dr,
LATERAL (VALUES
    ('Times of India',     '["TOI"]',           'timesofindia.indiatimes.com', 'Largest English-language daily newspaper in India.', 0.96),
    ('NDTV',               '["New Delhi Television"]', 'ndtv.com',              'Television news channel and digital news platform.', 0.95),
    ('The Hindu',          '[]',                'thehindu.com',                'English-language daily newspaper with national readership.', 0.94),
    ('Hindustan Times',    '["HT"]',            'hindustantimes.com',          'English-language daily newspaper and digital outlet.', 0.93),
    ('Republic TV',        '["Republic"]',      'republicworld.com',           'English-language news television channel.', 0.88),
    ('CNN-News18',         '["News18"]',        'news18.com',                  'English-language news television channel and digital news platform.', 0.87)
) AS c(name, aliases, domain, description, confidence)
WHERE dr.brand_id = :brand_id;

-- ---------------------------------------------------------------------------
-- 9. Trust signals
-- ---------------------------------------------------------------------------

INSERT INTO trust_signals (id, brand_id, signal_type, name, description, confidence, source, discovery_run_id, created_at)
SELECT gen_random_uuid(), :brand_id, ts.signal_type, ts.name, ts.description, ts.confidence,
       'WebsiteCrawl', dr.id, NOW() - INTERVAL '34 days'
FROM discovery_runs dr,
LATERAL (VALUES
    ('AwardsAndRecognitions',     'Multiple Ramnath Goenka Excellence in Journalism Awards', 'Won several Ramnath Goenka awards across investigative and political reporting.', 0.85),
    ('PressAndMediaMentions',     'Cited by Reuters and BBC',                                'Regularly cited by international news organizations.',                              0.82),
    ('CaseStudiesAndSuccessMetrics', '50+ years of operations',                              'India Today magazine launched in 1975, longest-running English news weekly.',       0.90)
) AS ts(signal_type, name, description, confidence)
WHERE dr.brand_id = :brand_id;

-- ---------------------------------------------------------------------------
-- 10. Wire up tracker coverage + lenses + platforms
-- ---------------------------------------------------------------------------

WITH t AS (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id LIMIT 1)
INSERT INTO tracker_topics (tracker_configuration_id, topic_id)
SELECT t.id, topics.id FROM t CROSS JOIN topics WHERE topics.brand_id = :brand_id;

WITH t AS (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id LIMIT 1)
INSERT INTO tracker_competitors (tracker_configuration_id, competitor_id)
SELECT t.id, competitors.id FROM t CROSS JOIN competitors WHERE competitors.brand_id = :brand_id;

WITH t AS (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id LIMIT 1)
INSERT INTO tracker_products (tracker_configuration_id, product_id)
SELECT t.id, products.id FROM t CROSS JOIN products WHERE products.brand_id = :brand_id;

WITH t AS (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id LIMIT 1)
INSERT INTO tracker_audiences (tracker_configuration_id, audience_id)
SELECT t.id, audiences.id FROM t CROSS JOIN audiences WHERE audiences.brand_id = :brand_id;

WITH t AS (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id LIMIT 1)
INSERT INTO tracker_markets (tracker_configuration_id, market_id)
SELECT t.id, markets.id FROM t CROSS JOIN markets WHERE markets.brand_id = :brand_id;

WITH t AS (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id LIMIT 1)
INSERT INTO tracker_lenses (tracker_configuration_id, lens_id)
SELECT t.id, lenses.id FROM t CROSS JOIN lenses;

WITH t AS (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id LIMIT 1)
INSERT INTO tracker_platforms (tracker_configuration_id, ai_platform_id)
SELECT t.id, p.id FROM t CROSS JOIN ai_platforms p
WHERE p.code IN ('ChatGpt', 'Claude', 'Perplexity', 'Gemini');

-- ---------------------------------------------------------------------------
-- 11. Prompts (10 prompts across 4 lenses, all Active)
-- ---------------------------------------------------------------------------

WITH t AS (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id LIMIT 1)
INSERT INTO prompts (id, tracker_configuration_id, prompt_text, lens_id, status, source, created_at, updated_at)
SELECT gen_random_uuid(), t.id, p.text, p.lens, 'Active', 'Generated',
       NOW() - INTERVAL '33 days', NOW() - INTERVAL '33 days'
FROM t, LATERAL (VALUES
    ('What are the most trusted English-language news outlets in India?',                          :lens_discovery::uuid),
    ('Recommend a news source for following Indian politics and policy.',                          :lens_discovery::uuid),
    ('Where do business decision-makers in India get their daily news?',                           :lens_buying::uuid),
    ('Which Indian news brand should I subscribe to for in-depth analysis?',                       :lens_buying::uuid),
    ('Compare India Today and Times of India for political coverage.',                             :lens_competitor::uuid),
    ('How does India Today compare to NDTV for breaking news?',                                    :lens_competitor::uuid),
    ('Is India Today considered reliable and unbiased?',                                           :lens_sentiment::uuid),
    ('What do readers say about the quality of India Today journalism?',                           :lens_sentiment::uuid),
    ('Which Indian news outlets are most frequently cited by global media?',                       :lens_citation::uuid),
    ('What gaps exist in India Today coverage of regional issues?',                                :lens_contentgap::uuid)
) AS p(text, lens);

-- ---------------------------------------------------------------------------
-- 12. 30 daily scan runs (status=Completed)
-- ---------------------------------------------------------------------------

WITH t AS (SELECT id FROM tracker_configurations WHERE brand_id = :brand_id LIMIT 1),
    prompt_count_cte AS (SELECT COUNT(*)::int AS n FROM prompts WHERE tracker_configuration_id = (SELECT id FROM t)),
    platform_count_cte AS (SELECT 4 AS n)
INSERT INTO scan_runs (id, tracker_configuration_id, trigger_type, status, prompt_count, platform_count, scan_check_count, completed_count, failed_count, started_at, completed_at)
SELECT
    gen_random_uuid(),
    (SELECT id FROM t),
    'Scheduled',
    'Completed',
    (SELECT n FROM prompt_count_cte),
    (SELECT n FROM platform_count_cte),
    (SELECT n FROM prompt_count_cte) * (SELECT n FROM platform_count_cte),
    (SELECT n FROM prompt_count_cte) * (SELECT n FROM platform_count_cte),
    0,
    (NOW() - (d || ' days')::INTERVAL),
    (NOW() - (d || ' days')::INTERVAL + INTERVAL '8 minutes')
FROM generate_series(0, 29) AS d;

-- ---------------------------------------------------------------------------
-- 13. Prompt runs (1 per prompt × platform × scan)
-- ---------------------------------------------------------------------------

INSERT INTO prompt_runs (id, scan_run_id, prompt_id, ai_platform_id, status, started_at, completed_at)
SELECT gen_random_uuid(), sr.id, p.id, plat.id, 'Completed',
       sr.started_at, sr.started_at + INTERVAL '6 minutes'
FROM scan_runs sr
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
JOIN prompts p ON p.tracker_configuration_id = tc.id
JOIN ai_platforms plat ON plat.code IN ('ChatGpt', 'Claude', 'Perplexity', 'Gemini')
WHERE tc.brand_id = :brand_id;

-- ---------------------------------------------------------------------------
-- 14. AI answers (1 per prompt run) — minimal text, valid JSON envelope
-- ---------------------------------------------------------------------------

INSERT INTO ai_answers (id, prompt_run_id, answer_text, raw_response, created_at)
SELECT gen_random_uuid(), pr.id,
    'India Today is among the leading English-language news outlets in India, alongside Times of India and NDTV. It is known for its political analysis and weekly magazine.',
    '{"finish_reason":"stop","model":"seeded"}',
    sr.started_at + INTERVAL '5 minutes'
FROM prompt_runs pr
JOIN scan_runs sr ON sr.id = pr.scan_run_id
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
WHERE tc.brand_id = :brand_id;

COMMIT;

-- ---------------------------------------------------------------------------
-- Phase B (separate transaction so this can be re-run incrementally)
-- ---------------------------------------------------------------------------

BEGIN;

\set brand_id '\'72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d\''

-- 15. Answer signals (1 per answer) — drives hero KPIs
-- Each per-row pseudo-random value is deterministic from the answer id +
-- a salt, so the LATERAL planner can't collapse the subquery to a
-- single value for all rows (which is what bites you with random()).
INSERT INTO answer_signals (
    id, ai_answer_id, brand_mentioned, brand_recommended, brand_rank, brand_rank_universe_size,
    brand_sentiment, brand_sentiment_score, brand_recommendation_strength, brand_recommendation_score,
    answer_certainty, answer_has_ranking, answer_has_comparison, answer_has_citations,
    owned_source_count, competitor_source_count, confidence_score, created_at
)
SELECT
    gen_random_uuid(),
    a.id,
    h1 < 0.62                                                       AS brand_mentioned,
    (h1 < 0.62) AND (h2 < 0.72)                                     AS brand_recommended,
    CASE WHEN h1 < 0.62 THEN 1 + (h3 * 4)::int ELSE NULL END        AS brand_rank,
    CASE WHEN h1 < 0.62 THEN 6 ELSE NULL END                        AS brand_rank_universe_size,
    CASE
        WHEN h4 < 0.55 THEN 'Positive'
        WHEN h4 < 0.85 THEN 'Neutral'
        ELSE 'Negative'
    END                                                             AS brand_sentiment,
    GREATEST(-1.0, LEAST(1.0, (h5 * 1.4 - 0.3)))::double precision  AS brand_sentiment_score,
    CASE
        WHEN h6 < 0.40 THEN 'Strong'
        WHEN h6 < 0.75 THEN 'Moderate'
        ELSE 'Weak'
    END                                                             AS brand_recommendation_strength,
    GREATEST(-1.0, LEAST(1.0, (h7 * 0.9 - 0.05)))::double precision AS brand_recommendation_score,
    GREATEST(0.0, LEAST(1.0, (0.7 + h8 * 0.2)))                     AS answer_certainty,
    h9 < 0.7                                                        AS answer_has_ranking,
    h10 < 0.4                                                       AS answer_has_comparison,
    h11 < 0.65                                                      AS answer_has_citations,
    (h12 * 3)::int                                                  AS owned_source_count,
    (h13 * 5)::int                                                  AS competitor_source_count,
    GREATEST(0.0, LEAST(1.0, (0.8 + h14 * 0.15)))                   AS confidence_score,
    a.created_at
FROM ai_answers a
JOIN prompt_runs pr ON pr.id = a.prompt_run_id
JOIN scan_runs sr ON sr.id = pr.scan_run_id
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
CROSS JOIN LATERAL (
    SELECT
        ((abs(hashtext(a.id::text || 's1'))  % 1000)::float / 1000) AS h1,
        ((abs(hashtext(a.id::text || 's2'))  % 1000)::float / 1000) AS h2,
        ((abs(hashtext(a.id::text || 's3'))  % 1000)::float / 1000) AS h3,
        ((abs(hashtext(a.id::text || 's4'))  % 1000)::float / 1000) AS h4,
        ((abs(hashtext(a.id::text || 's5'))  % 1000)::float / 1000) AS h5,
        ((abs(hashtext(a.id::text || 's6'))  % 1000)::float / 1000) AS h6,
        ((abs(hashtext(a.id::text || 's7'))  % 1000)::float / 1000) AS h7,
        ((abs(hashtext(a.id::text || 's8'))  % 1000)::float / 1000) AS h8,
        ((abs(hashtext(a.id::text || 's9'))  % 1000)::float / 1000) AS h9,
        ((abs(hashtext(a.id::text || 's10')) % 1000)::float / 1000) AS h10,
        ((abs(hashtext(a.id::text || 's11')) % 1000)::float / 1000) AS h11,
        ((abs(hashtext(a.id::text || 's12')) % 1000)::float / 1000) AS h12,
        ((abs(hashtext(a.id::text || 's13')) % 1000)::float / 1000) AS h13,
        ((abs(hashtext(a.id::text || 's14')) % 1000)::float / 1000) AS h14
) AS h
WHERE tc.brand_id = :brand_id;

-- 16. Mentions — one Brand mention when brand_mentioned, plus 1-3 competitor mentions
-- Brand mentions:
INSERT INTO mentions (
    id, ai_answer_id, entity_type, entity_id, normalized_name,
    is_recommended, recommendation_strength, recommendation_score,
    sentiment, sentiment_score, confidence_score, evidence_snippet,
    mention_count, first_mention_position, created_at
)
SELECT
    gen_random_uuid(),
    a.id,
    'Brand',
    :brand_id,
    'india today',
    asig.brand_recommended,
    asig.brand_recommendation_strength,
    asig.brand_recommendation_score,
    asig.brand_sentiment,
    asig.brand_sentiment_score,
    0.85 + (random() * 0.1),
    'India Today provides comprehensive coverage of national and international news with a strong editorial team.',
    1,
    GREATEST(0.0, LEAST(1.0, (random() * 0.6)))::double precision,
    a.created_at
FROM ai_answers a
JOIN answer_signals asig ON asig.ai_answer_id = a.id
JOIN prompt_runs pr ON pr.id = a.prompt_run_id
JOIN scan_runs sr ON sr.id = pr.scan_run_id
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
WHERE tc.brand_id = :brand_id AND asig.brand_mentioned;

-- Competitor mentions: each answer gets 2-3 competitor mentions, drawn from the
-- brand's competitor pool. Hash-based per-(answer, competitor) selection so
-- the LATERAL doesn't collapse.
INSERT INTO mentions (
    id, ai_answer_id, entity_type, entity_id, normalized_name,
    is_recommended, recommendation_strength, recommendation_score,
    sentiment, sentiment_score, confidence_score, evidence_snippet,
    mention_count, first_mention_position, created_at
)
SELECT
    gen_random_uuid(),
    a.id,
    'Competitor',
    c.id,
    lower(c.name),
    h.h1 < 0.55,
    CASE WHEN h.h2 < 0.4 THEN 'Strong' WHEN h.h2 < 0.7 THEN 'Moderate' ELSE 'Weak' END,
    GREATEST(-1.0, LEAST(1.0, (h.h3 * 0.9 - 0.05)))::double precision,
    CASE WHEN h.h4 < 0.45 THEN 'Positive' WHEN h.h4 < 0.85 THEN 'Neutral' ELSE 'Negative' END,
    GREATEST(-1.0, LEAST(1.0, (h.h5 * 1.4 - 0.3)))::double precision,
    GREATEST(0.0, LEAST(1.0, (0.8 + h.h6 * 0.15))),
    'The outlet is frequently mentioned alongside other leading Indian news brands.',
    1,
    GREATEST(0.0, LEAST(1.0, (h.h7 * 0.8)))::double precision,
    a.created_at
FROM ai_answers a
JOIN prompt_runs pr ON pr.id = a.prompt_run_id
JOIN scan_runs sr ON sr.id = pr.scan_run_id
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
JOIN competitors c ON c.brand_id = tc.brand_id
CROSS JOIN LATERAL (
    SELECT
        ((abs(hashtext(a.id::text || c.id::text || 'c1')) % 1000)::float / 1000) AS h1,
        ((abs(hashtext(a.id::text || c.id::text || 'c2')) % 1000)::float / 1000) AS h2,
        ((abs(hashtext(a.id::text || c.id::text || 'c3')) % 1000)::float / 1000) AS h3,
        ((abs(hashtext(a.id::text || c.id::text || 'c4')) % 1000)::float / 1000) AS h4,
        ((abs(hashtext(a.id::text || c.id::text || 'c5')) % 1000)::float / 1000) AS h5,
        ((abs(hashtext(a.id::text || c.id::text || 'c6')) % 1000)::float / 1000) AS h6,
        ((abs(hashtext(a.id::text || c.id::text || 'c7')) % 1000)::float / 1000) AS h7,
        ((abs(hashtext(a.id::text || c.id::text || 'cs')) % 1000)::float / 1000) AS hs
) AS h
WHERE tc.brand_id = :brand_id
  AND h.hs < 0.45;  -- ~45% chance each competitor appears in each answer

-- 17. Mention attributes (only on Brand mentions) — drives Top Brand Attributes card
INSERT INTO mention_attributes (id, mention_id, name, polarity, evidence_snippet, confidence_score, created_at)
SELECT gen_random_uuid(), m.id, attr.name, attr.polarity, attr.evidence, 0.8 + random()*0.15, m.created_at
FROM mentions m
JOIN ai_answers a ON a.id = m.ai_answer_id
JOIN prompt_runs pr ON pr.id = a.prompt_run_id
JOIN scan_runs sr ON sr.id = pr.scan_run_id
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
CROSS JOIN LATERAL (
    SELECT * FROM (VALUES
        ('credible',     'Positive', 'Credible reporting backed by experienced journalists.'),
        ('in-depth',     'Positive', 'In-depth analysis on political and business stories.'),
        ('reliable',     'Positive', 'A reliable source for breaking news.'),
        ('comprehensive','Positive', 'Comprehensive multimedia coverage.'),
        ('biased',       'Negative', 'Some readers view coverage as biased on political issues.'),
        ('sensational',  'Negative', 'Occasional sensationalism in headlines.')
    ) AS v(name, polarity, evidence)
    ORDER BY random()
    LIMIT 2
) AS attr
WHERE tc.brand_id = :brand_id
  AND m.entity_type = 'Brand'
  AND random() < 0.35;  -- attribute every ~35% of Brand mentions

-- 18. Mention risk flags (Brand mentions only) — drives Top Risk Flags card
INSERT INTO mention_risk_flags (id, mention_id, flag_type, severity, evidence_snippet, created_at)
SELECT gen_random_uuid(), m.id, rf.flag_type, rf.severity, rf.evidence, m.created_at
FROM mentions m
JOIN ai_answers a ON a.id = m.ai_answer_id
JOIN prompt_runs pr ON pr.id = a.prompt_run_id
JOIN scan_runs sr ON sr.id = pr.scan_run_id
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
CROSS JOIN LATERAL (
    SELECT * FROM (VALUES
        ('editorial_bias',   'Medium', 'Concerns raised about political alignment.'),
        ('paywall_friction', 'Low',    'Some premium content behind a paywall.'),
        ('fact_check_dispute','Medium','Recent fact-check correction issued.'),
        ('regulatory_inquiry','High',  'Mention of a government inquiry.')
    ) AS v(flag_type, severity, evidence)
    ORDER BY random()
    LIMIT 1
) AS rf
WHERE tc.brand_id = :brand_id
  AND m.entity_type = 'Brand'
  AND random() < 0.12;  -- ~12% of Brand mentions

-- 19. Mention comparisons (Brand mentions only) — drives Head-to-head card
INSERT INTO mention_comparisons (id, mention_id, vs_entity_name, vs_entity_normalized, on_aspect, winner_is_this_mention, evidence_snippet, created_at)
SELECT gen_random_uuid(), m.id, cmp.vs_name, cmp.vs_normalized, cmp.aspect, cmp.winner, cmp.evidence, m.created_at
FROM mentions m
JOIN ai_answers a ON a.id = m.ai_answer_id
JOIN prompt_runs pr ON pr.id = a.prompt_run_id
JOIN scan_runs sr ON sr.id = pr.scan_run_id
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
CROSS JOIN LATERAL (
    SELECT * FROM (VALUES
        ('Times of India',  'times of india',  'political_depth',  true,  'India Today offers deeper political analysis than Times of India.'),
        ('NDTV',            'ndtv',            'breaking_news',    false, 'NDTV tends to be faster on breaking news.'),
        ('The Hindu',       'the hindu',       'editorial_quality',false, 'The Hindu maintains stronger editorial standards.'),
        ('Hindustan Times', 'hindustan times', 'business_coverage',true,  'India Today has stronger business coverage than Hindustan Times.'),
        ('Republic TV',     'republic tv',     'tone',             true,  'India Today reads as more measured in tone.'),
        ('Times of India',  'times of india',  'breaking_news',    false, 'Times of India has a wider reporter network for breaking stories.')
    ) AS v(vs_name, vs_normalized, aspect, winner, evidence)
    ORDER BY random()
    LIMIT 1
) AS cmp
WHERE tc.brand_id = :brand_id
  AND m.entity_type = 'Brand'
  AND random() < 0.30;

-- 20. Factual claims (Brand mentions only) — drives Factual Claims feed
INSERT INTO factual_claims (id, mention_id, claim_text, subject, asserted_value, evidence_snippet, verifiability, review_status, confidence_score, created_at)
SELECT gen_random_uuid(), m.id, fc.claim_text, fc.subject, fc.asserted_value, fc.evidence, fc.verifiability, fc.status, 0.75 + random()*0.2, m.created_at
FROM mentions m
JOIN ai_answers a ON a.id = m.ai_answer_id
JOIN prompt_runs pr ON pr.id = a.prompt_run_id
JOIN scan_runs sr ON sr.id = pr.scan_run_id
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
CROSS JOIN LATERAL (
    SELECT * FROM (VALUES
        ('India Today was founded in 1975.',                        'founding_year',  '1975',                 'Founded in 1975 by the Living Media India Group.',          'Verifiable',  'Verified'),
        ('India Today is headquartered in Noida.',                  'headquarters',   'Noida',                'India Today Group HQ is in Noida, Uttar Pradesh.',          'Verifiable',  'Verified'),
        ('India Today reaches over 50 million digital readers monthly.','digital_reach','50 million monthly', 'Recent traffic estimate.',                                  'Verifiable',  'Pending'),
        ('India Today owns the Aaj Tak Hindi channel.',             'ownership',      'Aaj Tak',              'Both brands belong to the India Today Group.',              'Verifiable',  'Verified'),
        ('India Today is the oldest English news weekly in India.', 'historical_claim','oldest English news weekly','Magazine has been published since 1975.',           'Verifiable',  'Disputed')
    ) AS v(claim_text, subject, asserted_value, evidence, verifiability, status)
    ORDER BY random()
    LIMIT 1
) AS fc
WHERE tc.brand_id = :brand_id
  AND m.entity_type = 'Brand'
  AND random() < 0.10;

-- 21. Mention pairs (co-mentions) — drives Co-mention Landscape
-- Pairs each Brand mention with each Competitor mention in the same answer.
INSERT INTO mention_pairs (id, ai_answer_id, mention_a_id, mention_b_id, created_at)
SELECT gen_random_uuid(), mb.ai_answer_id, mb.id, mc.id, mb.created_at
FROM mentions mb
JOIN mentions mc ON mc.ai_answer_id = mb.ai_answer_id AND mc.entity_type = 'Competitor'
JOIN ai_answers a ON a.id = mb.ai_answer_id
JOIN prompt_runs pr ON pr.id = a.prompt_run_id
JOIN scan_runs sr ON sr.id = pr.scan_run_id
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
WHERE tc.brand_id = :brand_id
  AND mb.entity_type = 'Brand'
  AND mb.id <> mc.id;

COMMIT;

-- ---------------------------------------------------------------------------
-- Phase C: TrendPoints — denormalized per-entity per-scan metrics
-- ---------------------------------------------------------------------------

BEGIN;

\set brand_id '\'72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d\''

-- Brand BrandMentionRate per scan
INSERT INTO trend_points (id, tracker_configuration_id, scan_run_id, entity_type, entity_id, metric_name, numeric_value, captured_at, created_at)
SELECT
    gen_random_uuid(), sr.tracker_configuration_id, sr.id, 'Brand', :brand_id, 'BrandMentionRate',
    COALESCE(
        (SELECT COUNT(*) FILTER (WHERE asig.brand_mentioned)::float
         / NULLIF(COUNT(*), 0)
         FROM ai_answers a2
         JOIN prompt_runs pr2 ON pr2.id = a2.prompt_run_id
         JOIN answer_signals asig ON asig.ai_answer_id = a2.id
         WHERE pr2.scan_run_id = sr.id),
        0
    ),
    sr.completed_at, sr.completed_at
FROM scan_runs sr
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
WHERE tc.brand_id = :brand_id;

-- Brand BrandShareOfVoice per scan — brand mentions / all mentions
INSERT INTO trend_points (id, tracker_configuration_id, scan_run_id, entity_type, entity_id, metric_name, numeric_value, captured_at, created_at)
SELECT
    gen_random_uuid(), sr.tracker_configuration_id, sr.id, 'Brand', :brand_id, 'BrandShareOfVoice',
    COALESCE(
        (SELECT COUNT(*) FILTER (WHERE m.entity_type = 'Brand')::float
         / NULLIF(COUNT(*), 0)
         FROM mentions m
         JOIN ai_answers a2 ON a2.id = m.ai_answer_id
         JOIN prompt_runs pr2 ON pr2.id = a2.prompt_run_id
         WHERE pr2.scan_run_id = sr.id),
        0
    ),
    sr.completed_at, sr.completed_at
FROM scan_runs sr
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
WHERE tc.brand_id = :brand_id;

-- Brand OwnedCitationShare per scan — synthetic, slow upward trend
INSERT INTO trend_points (id, tracker_configuration_id, scan_run_id, entity_type, entity_id, metric_name, numeric_value, captured_at, created_at)
SELECT
    gen_random_uuid(), sr.tracker_configuration_id, sr.id, 'Brand', :brand_id, 'OwnedCitationShare',
    0.25 + 0.15 * EXTRACT(EPOCH FROM (sr.completed_at - (NOW() - INTERVAL '30 days'))) / EXTRACT(EPOCH FROM INTERVAL '30 days')
        + (random() * 0.1 - 0.05),
    sr.completed_at, sr.completed_at
FROM scan_runs sr
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
WHERE tc.brand_id = :brand_id;

-- Brand AverageBrandRank per scan — synthetic, mostly 2-3
INSERT INTO trend_points (id, tracker_configuration_id, scan_run_id, entity_type, entity_id, metric_name, numeric_value, captured_at, created_at)
SELECT
    gen_random_uuid(), sr.tracker_configuration_id, sr.id, 'Brand', :brand_id, 'AverageBrandRank',
    COALESCE(
        (SELECT AVG(asig.brand_rank)
         FROM ai_answers a2
         JOIN prompt_runs pr2 ON pr2.id = a2.prompt_run_id
         JOIN answer_signals asig ON asig.ai_answer_id = a2.id
         WHERE pr2.scan_run_id = sr.id AND asig.brand_rank IS NOT NULL),
        2.5
    ),
    sr.completed_at, sr.completed_at
FROM scan_runs sr
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
WHERE tc.brand_id = :brand_id;

-- Brand OverallSentiment per scan (categorical)
INSERT INTO trend_points (id, tracker_configuration_id, scan_run_id, entity_type, entity_id, metric_name, categorical_value, captured_at, created_at)
SELECT
    gen_random_uuid(), sr.tracker_configuration_id, sr.id, 'Brand', :brand_id, 'OverallSentiment',
    COALESCE(
        (SELECT asig.brand_sentiment
         FROM ai_answers a2
         JOIN prompt_runs pr2 ON pr2.id = a2.prompt_run_id
         JOIN answer_signals asig ON asig.ai_answer_id = a2.id
         WHERE pr2.scan_run_id = sr.id AND asig.brand_mentioned
         GROUP BY asig.brand_sentiment
         ORDER BY COUNT(*) DESC LIMIT 1),
        'Neutral'
    ),
    sr.completed_at, sr.completed_at
FROM scan_runs sr
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
WHERE tc.brand_id = :brand_id;

-- Per-competitor MentionRate per scan
INSERT INTO trend_points (id, tracker_configuration_id, scan_run_id, entity_type, entity_id, metric_name, numeric_value, captured_at, created_at)
SELECT
    gen_random_uuid(), sr.tracker_configuration_id, sr.id, 'Competitor', c.id, 'MentionRate',
    COALESCE(
        (SELECT COUNT(DISTINCT a2.id) FILTER (WHERE EXISTS (
            SELECT 1 FROM mentions m
            WHERE m.ai_answer_id = a2.id AND m.entity_type = 'Competitor' AND m.entity_id = c.id
        ))::float / NULLIF(COUNT(DISTINCT a2.id), 0)
         FROM ai_answers a2
         JOIN prompt_runs pr2 ON pr2.id = a2.prompt_run_id
         WHERE pr2.scan_run_id = sr.id),
        0
    ),
    sr.completed_at, sr.completed_at
FROM scan_runs sr
JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
JOIN competitors c ON c.brand_id = tc.brand_id
WHERE tc.brand_id = :brand_id;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

SELECT 'scan_runs'         AS what, COUNT(*) FROM scan_runs WHERE tracker_configuration_id IN (SELECT id FROM tracker_configurations WHERE brand_id = '72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d')
UNION ALL SELECT 'prompt_runs', COUNT(*) FROM prompt_runs pr JOIN scan_runs sr ON sr.id = pr.scan_run_id JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id WHERE tc.brand_id = '72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d'
UNION ALL SELECT 'ai_answers', COUNT(*) FROM ai_answers a JOIN prompt_runs pr ON pr.id = a.prompt_run_id JOIN scan_runs sr ON sr.id = pr.scan_run_id JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id WHERE tc.brand_id = '72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d'
UNION ALL SELECT 'mentions',   COUNT(*) FROM mentions m JOIN ai_answers a ON a.id = m.ai_answer_id JOIN prompt_runs pr ON pr.id = a.prompt_run_id JOIN scan_runs sr ON sr.id = pr.scan_run_id JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id WHERE tc.brand_id = '72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d'
UNION ALL SELECT 'trend_points', COUNT(*) FROM trend_points WHERE tracker_configuration_id IN (SELECT id FROM tracker_configurations WHERE brand_id = '72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d');
