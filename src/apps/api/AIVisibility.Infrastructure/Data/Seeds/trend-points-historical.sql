-- Phase 4 Slice 6: synthetic historical scans for the india Consultancy tracker.
-- Seeds 6 scan_runs spanning 30 days with synthetic trend points so the
-- Visibility Tracker dashboard has interesting drift data to visualize.
-- Local-dev only. Idempotent via ON CONFLICT DO NOTHING + deterministic UUIDs.
--
-- The real 2 scans (Slice 0 + Slice 1 verify-e2e) remain in place; this
-- script adds 6 older ones to fill out the 30-day window. To run:
--   docker exec -i src-postgres-1 psql -U lumina -d lumina < trend-points-historical.sql

DO $$
DECLARE
    tracker_id uuid := '33b28ae4-a9fc-440d-8c4e-71356ca9ef30';
    -- Deterministic UUIDs for the 6 synthetic scans + their analysis_jobs.
    -- Each is the tracker_id with the 13th hex digit replaced — readable, stable.
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
    -- Days-ago values: scan 1 is the oldest, scan 6 is the most recent
    -- (still older than the real scans, which are < 24h old).
    days_ago int[] := ARRAY[30, 25, 20, 15, 10, 7];
    -- Synthetic drift: brand visibility trending up over the window.
    mention_rate float[]    := ARRAY[0.25, 0.28, 0.30, 0.32, 0.35, 0.38];
    rec_rate float[]        := ARRAY[0.08, 0.10, 0.12, 0.13, 0.15, 0.18];
    sov float[]             := ARRAY[0.30, 0.32, 0.35, 0.40, 0.45, 0.50];
    owned_share float[]     := ARRAY[0.18, 0.20, 0.22, 0.24, 0.25, 0.28];
    avg_rank float[]        := ARRAY[3.2, 3.0, 2.8, 2.5, 2.3, 2.1];
    sentiment text[]        := ARRAY['Neutral', 'Neutral', 'Positive', 'Positive', 'Positive', 'Positive'];
    i int;
    scan_started timestamptz;
    scan_completed timestamptz;
BEGIN
    FOR i IN 1..6 LOOP
        scan_started := now() - (days_ago[i] || ' days')::interval;
        scan_completed := scan_started + interval '8 minutes';

        -- ScanRun (Completed). All synthetic scans share a Manual trigger
        -- type so the existing reporting paths render them.
        INSERT INTO scan_runs (id, tracker_configuration_id, trigger_type, status,
            prompt_count, platform_count, scan_check_count, completed_count, failed_count,
            started_at, completed_at)
        VALUES (
            scan_ids[i], tracker_id, 'Manual', 'Completed',
            30, 1, 30, 30, 0,
            scan_started, scan_completed
        )
        ON CONFLICT (id) DO NOTHING;

        -- AnalysisJob (Completed).
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

        -- 6 trend points per scan. ON CONFLICT keys the unique index
        -- (tracker_configuration_id, scan_run_id, metric_name).
        INSERT INTO trend_points (id, tracker_configuration_id, scan_run_id,
            metric_name, numeric_value, categorical_value, captured_at, created_at)
        VALUES
            (gen_random_uuid(), tracker_id, scan_ids[i], 'BrandMentionRate',         mention_rate[i], NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'BrandRecommendationRate',  rec_rate[i],     NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'BrandShareOfVoice',        sov[i],          NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'AverageBrandRank',         avg_rank[i],     NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'OwnedCitationShare',       owned_share[i],  NULL, scan_completed, now()),
            (gen_random_uuid(), tracker_id, scan_ids[i], 'OverallSentiment',         NULL,            sentiment[i], scan_completed, now())
        ON CONFLICT (tracker_configuration_id, scan_run_id, metric_name) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Seeded 6 historical scans + 36 trend points for tracker %', tracker_id;
END $$;
