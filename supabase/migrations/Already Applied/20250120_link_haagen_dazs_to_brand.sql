-- Migration to create a regular brand for Häagen-Dazs and link it to the master claim brand
-- This fixes permission issues where users cannot access Häagen-Dazs products

DO $$
DECLARE
    v_brand_id UUID;
    v_master_brand_id UUID;
    v_user_id UUID;
BEGIN
    -- Get the Häagen-Dazs master claim brand ID
    SELECT id INTO v_master_brand_id
    FROM master_claim_brands
    WHERE name = 'Häagen-Dazs';

    IF v_master_brand_id IS NULL THEN
        RAISE EXCEPTION 'Häagen-Dazs master claim brand not found';
    END IF;

    -- Check if a regular Häagen-Dazs brand already exists
    SELECT id INTO v_brand_id
    FROM brands
    WHERE name = 'Häagen-Dazs';

    -- Create the regular brand if it doesn't exist
    IF v_brand_id IS NULL THEN
        INSERT INTO brands (
            name,
            master_claim_brand_id
        ) VALUES (
            'Häagen-Dazs',
            v_master_brand_id
        )
        RETURNING id INTO v_brand_id;
    ELSE
        -- Update existing brand to link to master claim brand if not already linked
        UPDATE brands
        SET master_claim_brand_id = v_master_brand_id
        WHERE id = v_brand_id
        AND master_claim_brand_id IS NULL;
    END IF;

    -- Link the master claim brand to the regular brand
    UPDATE master_claim_brands
    SET mixerai_brand_id = v_brand_id
    WHERE id = v_master_brand_id
    AND mixerai_brand_id IS NULL;

    -- Grant admin access to all admin users for this brand
    -- This ensures admin users can manage Häagen-Dazs
    FOR v_user_id IN 
        SELECT id 
        FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'admin'
    LOOP
        INSERT INTO user_brand_permissions (
            user_id,
            brand_id,
            role
        ) VALUES (
            v_user_id,
            v_brand_id,
            'admin'
        )
        ON CONFLICT (user_id, brand_id) DO NOTHING;
    END LOOP;

    -- Also grant access to any users who already have permissions on other brands
    -- This helps ensure existing users can access Häagen-Dazs
    FOR v_user_id IN 
        SELECT DISTINCT user_id 
        FROM user_brand_permissions
        WHERE role = 'admin'
    LOOP
        INSERT INTO user_brand_permissions (
            user_id,
            brand_id,
            role
        ) VALUES (
            v_user_id,
            v_brand_id,
            'admin'
        )
        ON CONFLICT (user_id, brand_id) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Successfully linked Häagen-Dazs master claim brand to regular brand';
END $$;