-- Phase 4 v2 Slice A: synthetic historical scans for the india Consultancy tracker.
-- Seeds 6 scan_runs spanning 30 days with per-entity trend points so the
-- v2 dashboard's multi-line chart + top brands table have interesting data.
-- Local-dev only. Idempotent via ON CONFLICT DO NOTHING + deterministic UUIDs.
--
-- Each scan emits trend rows for the tracked brand (Nostri) + each tracked
-- competitor (Gensler, HOK, Studio 804, Design Workshop). v1 trend rows are
-- wiped by the ExtendTrendPointWithEntity migration before this runs.
--
-- To run:
--   docker exec -i src-postgres-1 psql -U lumina -d lumina < trend-points-historical.sql

DO $$
DECLARE
    tracker_id uuid := '33b28ae4-a9fc-440d-8c4e-71356ca9ef30';

    -- Entity IDs (looked up against the live DB at script-write time).
    -- If the tracker is reseeded with different IDs, update these.
    brand_id uuid := '5f26b6a3-114c-44fc-aa14-49df23c7aedb';                    -- Nostri
    comp_gensler   uuid := '07a50bba-e1ad-41f6-80a9-c5f8696935d3';
    comp_hok       uuid := '2875f0ce-9726-4f0b-9041-f05941e0ff17';
    comp_studio    uuid := '40ff3b66-93f4-4b1a-b454-7f99fca7c220';              -- Studio 804
    comp_design    uuid := '863dfac5-2e1f-46e9-a8e0-080a5ac076a6';              -- Design Workshop

    -- Deterministic UUIDs for the 6 synthetic scans + their analysis_jobs.
    scan_ids uuid[] := ARRAY[
        '33b28ae4-a9fc-1d8c-8e01-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8e02-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8e03-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8e04-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8e05-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8e06-71356ca9ef30'
    ];
    job_ids uuid[] := ARRAY[
        '33b28ae4-a9fc-1d8c-8f01-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8f02-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8f03-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8f04-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8f05-71356ca9ef30',
        '33b28ae4-a9fc-1d8c-8f06-71356ca9ef30'
    ];

    -- Days-ago values: scan 1 is the oldest, scan 6 the most recent
    -- (still older than the real verify-e2e scans which are < 24h old).
    days_ago int[] := ARRAY[30, 25, 20, 15, 10, 7];

    -- Brand trend: Nostri visibility rising over the window.
    brand_mention_rate float[]      := ARRAY[0.25, 0.28, 0.30, 0.32, 0.35, 0.38];
    brand_rec_rate float[]          := ARRAY[0.08, 0.10, 0.12, 0.13, 0.15, 0.18];
    brand_sov float[]               := ARRAY[0.30, 0.32, 0.35, 0.40, 0.45, 0.50];
    brand_avg_rank float[]          := ARRAY[3.2, 3.0, 2.8, 2.5, 2.3, 2.1];
    brand_owned_share float[]       := ARRAY[0.18, 0.20, 0.22, 0.24, 0.25, 0.28];
    brand_sentiment text[]          := ARRAY['Neutral', 'Neutral', 'Positive', 'Positive', 'Positive', 'Positive'];

    -- Competitor trend (mention counts out of ~30 answers/scan). Gensler is
    -- the dominant competitor, HOK second, Studio 804 + Design Workshop minor.
    -- Gensler + HOK both declining slightly as Nostri rises.
    g_mentions int[] := ARRAY[8, 7, 7, 6, 5, 5];
    g_recs int[]     := ARRAY[2, 2, 1, 1, 1, 1];
    h_mentions int[] := ARRAY[6, 6, 5, 5, 5, 4];
    h_recs int[]     := ARRAY[1, 1, 1, 1, 1, 0];
    s_mentions int[] := ARRAY[3, 3, 3, 2, 2, 2];
    s_recs int[]     := ARRAY[0, 0, 0, 0, 0, 0];
    d_mentions int[] := ARRAY[2, 2, 1, 1, 1, 1];
    d_recs int[]     := ARRAY[0, 0, 0, 0, 0, 0];

    -- Each synthetic scan represents 30 answers — used as MentionRate denominator.
    answer_count int := 30;

    i int;
    scan_started timestamptz;
    scan_completed timestamptz;
BEGIN
    FOR i IN 1..6 LOOP
        scan_started := now() - (days_ago[i] || ' days')::interval;
        scan_completed := scan_started + interval '8 minutes';

        INSERT INTO scan_runs (id, tracker_configuration_id, trigger_type, status,
            prompt_count, platform_count, scan_check_count, completed_count, failed_count,
            started_at, completed_at)
        VALUES (
            scan_ids[i], tracker_id, 'Manual', 'Completed',
            30, 1, 30, 30, 0,
            scan_started, scan_completed
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO analysis_jobs (id, scan_run_id, status,
            extract_started_at, extract_completed_at,
            aggregate_started_at, aggregate_completed_at,
            created_at)
        VALUES (
            job_ids[i], scan_ids[i], 'Completed',
            scan_completed, scan_completed + interval '1 minute',
            scan_completed + interval '1 minute', scan_completed + interval '2 minutes',
            scan_completed
        )
        ON CONFLICT (id) DO NOTHING;

        -- Brand trend rows (6 metrics).
        INSERT INTO trend_points (id, tracker_configuration_id, scan_run_id,
            entity_type, entity_id,
            metric_name, numeric_value, categorical_value, captured_at, created_at)
        VALUES
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Brand', brand_id, 'BrandMentionRate',         brand_mention_rate[i], NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Brand', brand_id, 'BrandRecommendationRate',  brand_rec_rate[i],     NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Brand', brand_id, 'BrandShareOfVoice',        brand_sov[i],          NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Brand', brand_id, 'AverageBrandRank',         brand_avg_rank[i],     NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Brand', brand_id, 'OwnedCitationShare',       brand_owned_share[i],  NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Brand', brand_id, 'OverallSentiment',         NULL,                  brand_sentiment[i], scan_completed, now())
        ON CONFLICT (tracker_configuration_id, scan_run_id, entity_type, entity_id, metric_name) DO NOTHING;

        -- Competitor trend rows: 4 metrics per competitor.
        -- Helper expressions avoid duplicating the rate math.
        INSERT INTO trend_points (id, tracker_configuration_id, scan_run_id,
            entity_type, entity_id,
            metric_name, numeric_value, categorical_value, captured_at, created_at)
        VALUES
            -- Gensler
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_gensler, 'MentionCount',        g_mentions[i],                        NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_gensler, 'RecommendationCount', g_recs[i],                            NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_gensler, 'MentionRate',         (g_mentions[i]::float / answer_count), NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_gensler, 'RecommendationRate',  CASE WHEN g_mentions[i] > 0 THEN (g_recs[i]::float / g_mentions[i]) ELSE NULL END, NULL, scan_completed, now()),
            -- HOK
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_hok, 'MentionCount',            h_mentions[i],                        NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_hok, 'RecommendationCount',     h_recs[i],                            NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_hok, 'MentionRate',             (h_mentions[i]::float / answer_count), NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_hok, 'RecommendationRate',      CASE WHEN h_mentions[i] > 0 THEN (h_recs[i]::float / h_mentions[i]) ELSE NULL END, NULL, scan_completed, now()),
            -- Studio 804
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_studio, 'MentionCount',         s_mentions[i],                        NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_studio, 'RecommendationCount',  s_recs[i],                            NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_studio, 'MentionRate',          (s_mentions[i]::float / answer_count), NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_studio, 'RecommendationRate',   CASE WHEN s_mentions[i] > 0 THEN (s_recs[i]::float / s_mentions[i]) ELSE NULL END, NULL, scan_completed, now()),
            -- Design Workshop
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_design, 'MentionCount',         d_mentions[i],                        NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_design, 'RecommendationCount',  d_recs[i],                            NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_design, 'MentionRate',          (d_mentions[i]::float / answer_count), NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'Competitor', comp_design, 'RecommendationRate',   CASE WHEN d_mentions[i] > 0 THEN (d_recs[i]::float / d_mentions[i]) ELSE NULL END, NULL, scan_completed, now())
        ON CONFLICT (tracker_configuration_id, scan_run_id, entity_type, entity_id, metric_name) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Seeded 6 historical scans + 132 per-entity trend points for tracker %', tracker_id;
END $$;
