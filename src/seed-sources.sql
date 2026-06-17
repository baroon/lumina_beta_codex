-- ============================================================================
-- Seed: dummy citation sources for /sources
-- ============================================================================
-- Inserts ~12 Sources (mix of editorial, UGC, official-blog, marketplace,
-- reference), ~30 SourceUrls, BrandSourceClassifications for India Today,
-- and one Citation per AIAnswer drawn from India Today's in-window scans.
--
-- Idempotent: re-running first wipes the citations + classifications + URLs
-- + sources it owns (matched by domain), then re-inserts. Safe to re-run.
-- Run AFTER seed-india-today.sql so AIAnswers exist to cite.
-- ============================================================================

BEGIN;

\set brand_id  '\'72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d\''

-- ---------------------------------------------------------------------------
-- 0. Domain catalogue. The (domain, source_type, authority) triples we
-- want to seed. Materialised as a CTE-ready temp table so the inserts
-- below can reference it without repeating literals.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _seed_domains ON COMMIT DROP AS
SELECT * FROM (VALUES
    ('thehindu.com',       'The Hindu',                 'Editorial',    92.0::float8),
    ('timesofindia.indiatimes.com', 'Times of India',   'Editorial',    88.0),
    ('ndtv.com',           'NDTV',                      'Editorial',    85.0),
    ('reuters.com',        'Reuters',                   'Editorial',    96.0),
    ('bbc.com',            'BBC News',                  'Editorial',    94.0),
    ('en.wikipedia.org',   'Wikipedia',                 'Reference',    78.0),
    ('reddit.com',         'Reddit',                    'UGC',          35.0),
    ('twitter.com',        'X (Twitter)',               'Social',       28.0),
    ('blog.indiatoday.in', 'India Today Blog',          'Owned',        45.0),
    ('indiatoday.in',      'India Today',               'Owned',        82.0),
    ('news18.com',         'News18',                    'Competitor',   72.0),
    ('quora.com',          'Quora',                     'UGC',          40.0)
) AS d(domain, source_name, source_type, authority);

-- ---------------------------------------------------------------------------
-- 1. Wipe everything we own (idempotent). Restrict deletes from
-- cascading into sources owned by other seeders by matching the domain
-- catalogue above.
-- ---------------------------------------------------------------------------

DELETE FROM citations WHERE source_id IN (
    SELECT s.id FROM sources s JOIN _seed_domains d ON d.domain = s.normalized_domain
);
DELETE FROM brand_source_classifications WHERE source_id IN (
    SELECT s.id FROM sources s JOIN _seed_domains d ON d.domain = s.normalized_domain
);
DELETE FROM source_urls WHERE source_id IN (
    SELECT s.id FROM sources s JOIN _seed_domains d ON d.domain = s.normalized_domain
);
DELETE FROM sources WHERE normalized_domain IN (SELECT domain FROM _seed_domains);

-- ---------------------------------------------------------------------------
-- 2. Sources — one per domain.
-- ---------------------------------------------------------------------------

INSERT INTO sources (id, source_name, normalized_domain, authority_score, created_at)
SELECT gen_random_uuid(), source_name, domain, authority, NOW()
FROM _seed_domains;

-- ---------------------------------------------------------------------------
-- 3. SourceUrls — 2-3 per Source, deterministic from the domain so
-- re-running stays idempotent at the URL level too.
-- ---------------------------------------------------------------------------

INSERT INTO source_urls (id, source_id, url, normalized_url, title, created_at)
SELECT
    gen_random_uuid(),
    s.id,
    'https://' || s.normalized_domain || '/' || slug,
    s.normalized_domain || '/' || slug,
    title,
    NOW()
FROM sources s
JOIN _seed_domains d ON d.domain = s.normalized_domain
CROSS JOIN LATERAL (VALUES
    ('news/2026/india-today-coverage',         d.source_name || ' — India Today coverage'),
    ('analysis/media-landscape-india',         d.source_name || ' — Media landscape analysis'),
    ('opinion/digital-news-india-2026',        d.source_name || ' — Digital news in India 2026')
) AS u(slug, title);

-- ---------------------------------------------------------------------------
-- 4. BrandSourceClassifications — one row per (India Today brand,
-- source) so the dominant SourceType resolves cleanly on the page.
-- ---------------------------------------------------------------------------

INSERT INTO brand_source_classifications (
    id, brand_id, source_id, source_url_id,
    source_type, confidence_score, provenance_source, status,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),
    :brand_id,
    s.id,
    NULL,
    d.source_type,
    0.9,
    'RuleBased',
    'Active',
    NOW(),
    NOW()
FROM sources s
JOIN _seed_domains d ON d.domain = s.normalized_domain;

-- ---------------------------------------------------------------------------
-- 5. Citations — for every AI answer of India Today's tracker, attach
-- 1-3 citations to a deterministic spread of sources + URLs. The
-- distribution favours editorial sources (more citations per answer)
-- so the page Hero KPIs land in a believable range.
--
-- Strategy: for each (answer, source) where the answer's hash modulo
-- a per-source threshold is below the source's citation weight, emit a
-- citation pointing at a random URL belonging to that source. Yields a
-- power-law-ish distribution: top editorial sources cited ~60% of
-- answers, mid-tier ~30%, fringe ~10%.
-- ---------------------------------------------------------------------------

WITH per_source_weights AS (
    -- Per-source share of citations, normalised so the top editorial
    -- domains get cited ~6× as often as the fringe ones.
    SELECT s.id AS source_id, s.normalized_domain,
        CASE s.normalized_domain
            WHEN 'reuters.com'                  THEN 0.62
            WHEN 'thehindu.com'                 THEN 0.58
            WHEN 'bbc.com'                      THEN 0.55
            WHEN 'timesofindia.indiatimes.com'  THEN 0.50
            WHEN 'ndtv.com'                     THEN 0.46
            WHEN 'indiatoday.in'                THEN 0.42
            WHEN 'en.wikipedia.org'             THEN 0.30
            WHEN 'blog.indiatoday.in'           THEN 0.22
            WHEN 'news18.com'                   THEN 0.25
            WHEN 'reddit.com'                   THEN 0.18
            WHEN 'quora.com'                    THEN 0.12
            WHEN 'twitter.com'                  THEN 0.10
            ELSE 0.0
        END AS weight
    FROM sources s
    WHERE s.normalized_domain IN (SELECT domain FROM _seed_domains)
),
answer_pool AS (
    SELECT a.id AS answer_id, a.created_at
    FROM ai_answers a
    JOIN prompt_runs pr ON pr.id = a.prompt_run_id
    JOIN scan_runs sr   ON sr.id = pr.scan_run_id
    JOIN tracker_configurations tc ON tc.id = sr.tracker_configuration_id
    WHERE tc.brand_id = :brand_id
),
candidate_url AS (
    -- Stable URL choice per (answer, source): first URL by stable id sort.
    SELECT DISTINCT ON (su.source_id) su.source_id, su.id AS url_id
    FROM source_urls su
    ORDER BY su.source_id, su.id
)
INSERT INTO citations (
    id, ai_answer_id, source_id, source_url_id,
    citation_type, citation_position, citation_text, evidence_snippet,
    confidence_score, created_at
)
SELECT
    gen_random_uuid(),
    a.answer_id,
    w.source_id,
    cu.url_id,
    'ExplicitUrl',
    1 + ((abs(hashtext(a.answer_id::text || w.source_id::text)) % 10))::int,
    'According to ' || w.normalized_domain,
    'Cited in the AI answer with surrounding context …',
    0.85,
    a.created_at
FROM answer_pool a
CROSS JOIN per_source_weights w
LEFT JOIN candidate_url cu ON cu.source_id = w.source_id
WHERE
    -- Deterministic gate per (answer, source) pair — modulo 100 gives
    -- a uniform 0-99 spread that we compare to the per-source weight.
    ((abs(hashtext(a.answer_id::text || w.source_id::text)) % 100)::float / 100) < w.weight;

COMMIT;

-- Sanity-check counts after running:
--   SELECT count(*) FROM sources WHERE normalized_domain IN (
--       'thehindu.com','timesofindia.indiatimes.com','ndtv.com','reuters.com',
--       'bbc.com','en.wikipedia.org','reddit.com','twitter.com',
--       'blog.indiatoday.in','indiatoday.in','news18.com','quora.com'
--   );
--   SELECT count(*) FROM source_urls;
--   SELECT count(*) FROM brand_source_classifications
--   WHERE brand_id = '72d9393e-a7e2-4bc1-b8bb-3d795cf73b2d';
--   SELECT count(*) FROM citations;
