-- ============================================================================
-- CHRIST UNIVERSITY IQAC PLATFORM
-- CITATION DATA REPAIR PLAN & SCRIPT (CONTROLLED ADMIN CORRECTION)
-- Target 1: Suresh K (Emp ID: 3489)
--   Paper: 'Effects of particle diameter and position on hydrodynamics around a confined sphere'
--   Publication Year: 2011, ISSN: '08885885'
--   Source: '3489_Suresh K.csv', Row 85
--   Correct Scopus Citation Total: 18 (NOT 3, NOT 36!)
--   Breakdown: 2011: 0, 2012: 2, 2013: 2, 2014: 3, 2015: 1, 2016: 0, 2017: 1,
--              2018: 0, 2019: 0, 2020: 3, 2021: 1, 2022: 1, 2023: 1, 2024: 1,
--              2025: 1, 2026: 1, Subtotal: 18, Total: 18.
--
-- Target 2: Suresh K (Emp ID: 3489)
--   Paper: 'A high-efficient multi-port bidirectional converter for renewable energy and hybrid electric vehicle applications'
--   Publication Year: 2026, ISSN: '2045-2322'
--   Source: '3489_Suresh K.csv', Row 8
--   Correct Scopus Citation Total: 3 (2026: 3, Subtotal: 3, Total: 3)
--
-- Provenance: Fully preserved; transactional rollback on any error
-- DO NOT EXECUTE ON PRODUCTION WITHOUT EXPLICIT USER AUTHORIZATION
-- ============================================================================

BEGIN;

-- Part 1: Correction for Target Publication 1 (Effects of particle diameter...)
DO $$
DECLARE
    v_pub_id UUID;
    v_snapshot_id UUID;
    v_current_count INTEGER;
BEGIN
    SELECT id, "citationCount" INTO v_pub_id, v_current_count
    FROM publications
    WHERE title ILIKE '%confined sphere%' OR title ILIKE '%hydrodynamics around a confined sphere%'
    LIMIT 1;

    IF v_pub_id IS NULL THEN
        RAISE NOTICE 'Target publication 1 (confined sphere) not found in database.';
    ELSE
        RAISE NOTICE 'Found publication 1: % (Current citation count: %)', v_pub_id, v_current_count;

        -- Locate snapshot
        SELECT id INTO v_snapshot_id
        FROM publication_citation_snapshots
        WHERE "publicationId" = v_pub_id
        ORDER BY "createdAt" DESC
        LIMIT 1;

        IF v_snapshot_id IS NOT NULL THEN
            -- Delete old corrupt details (e.g. 1526, 1528 or previous erroneous 2026-only)
            DELETE FROM citation_yearly_details
            WHERE "snapshotId" = v_snapshot_id;

            -- Insert genuine 2011-2026 Scopus yearly breakdown (Row 85)
            INSERT INTO citation_yearly_details ("id", "snapshotId", "period", "citationCount", "periodType", "status", "createdAt", "updatedAt")
            VALUES
                (gen_random_uuid(), v_snapshot_id, '<2001', 0, 'grouped', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2011', 0, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2012', 2, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2013', 2, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2014', 3, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2015', 1, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2016', 0, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2017', 1, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2018', 0, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2019', 0, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2020', 3, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2021', 1, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2022', 1, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2023', 1, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2024', 1, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2025', 1, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2026', 1, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, 'Subtotal', 18, 'subtotal', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '>2026', 0, 'grouped', 'known', NOW(), NOW())
            ON CONFLICT DO NOTHING;

            -- Update snapshot
            UPDATE publication_citation_snapshots
            SET "reportedTotal" = 18,
                "previousTotal" = v_current_count,
                "reconciliationStatus" = 'reconciled',
                "updatedAt" = NOW()
            WHERE id = v_snapshot_id;
        END IF;

        -- Update Publication citation count to 18
        UPDATE publications
        SET "citationCount" = 18,
            "updatedAt" = NOW()
        WHERE id = v_pub_id;

        RAISE NOTICE 'Successfully reconciled publication 1 to citationCount = 18.';
    END IF;
END $$;

-- Part 2: Correction for Target Publication 2 (Bidirectional Converter)
DO $$
DECLARE
    v_pub_id UUID;
    v_snapshot_id UUID;
    v_current_count INTEGER;
BEGIN
    SELECT id, "citationCount" INTO v_pub_id, v_current_count
    FROM publications
    WHERE title ILIKE '%bidirectional converter%' AND title ILIKE '%renewable energy%'
    LIMIT 1;

    IF v_pub_id IS NULL THEN
        RAISE NOTICE 'Target publication 2 (bidirectional converter) not found in database.';
    ELSE
        RAISE NOTICE 'Found target publication 2: % (Current citation count: %)', v_pub_id, v_current_count;

        SELECT id INTO v_snapshot_id
        FROM publication_citation_snapshots
        WHERE "publicationId" = v_pub_id
        ORDER BY "createdAt" DESC
        LIMIT 1;

        IF v_snapshot_id IS NOT NULL THEN
            DELETE FROM citation_yearly_details
            WHERE "snapshotId" = v_snapshot_id
              AND period IN ('1526', '1528');

            INSERT INTO citation_yearly_details ("id", "snapshotId", "period", "citationCount", "periodType", "status", "createdAt", "updatedAt")
            VALUES
                (gen_random_uuid(), v_snapshot_id, '<2022', 0, 'grouped', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2022', 0, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2023', 0, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2024', 0, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2025', 0, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '2026', 3, 'year', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, 'Subtotal', 3, 'subtotal', 'known', NOW(), NOW()),
                (gen_random_uuid(), v_snapshot_id, '>2026', 0, 'grouped', 'known', NOW(), NOW())
            ON CONFLICT DO NOTHING;

            UPDATE publication_citation_snapshots
            SET "reportedTotal" = 3,
                "previousTotal" = v_current_count,
                "reconciliationStatus" = 'reconciled',
                "updatedAt" = NOW()
            WHERE id = v_snapshot_id;
        END IF;

        UPDATE publications
        SET "citationCount" = 3,
            "updatedAt" = NOW()
        WHERE id = v_pub_id;

        RAISE NOTICE 'Successfully reconciled publication 2 to citationCount = 3.';
    END IF;
END $$;

COMMIT;

