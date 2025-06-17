-- Migration: Update get_brand_details_by_id function to include logo_url
-- Description: Adds logo_url to the brand details returned by the RPC function
-- Date: 2025-01-17

CREATE OR REPLACE FUNCTION "public"."get_brand_details_by_id"("p_brand_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
    brand_details jsonb;
begin
    select
        jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'website_url', b.website_url,
            'country', b.country,
            'language', b.language,
            'brand_identity', b.brand_identity,
            'tone_of_voice', b.tone_of_voice,
            'brand_summary', b.brand_summary,
            'brand_color', b.brand_color,
            'logo_url', b.logo_url,  -- Added logo_url
            'created_at', b.created_at,
            'updated_at', b.updated_at,
            'master_claim_brand_name', mcb.name,
            'contentCount', (select count(*) from public.content where brand_id = b.id),
            'workflowCount', (select count(*) from public.workflows where brand_id = b.id),
            'admins', (
                select coalesce(jsonb_agg(jsonb_build_object(
                    'id', p.id,
                    'full_name', p.full_name,
                    'email', p.email,
                    'avatar_url', p.avatar_url,
                    'job_title', p.job_title
                )), '[]'::jsonb)
                from public.user_brand_permissions ubp
                join public.profiles p on p.id = ubp.user_id
                where ubp.brand_id = b.id and ubp.role = 'admin'
            )
        ) into brand_details
    from
        public.brands b
        left join public.brands mcb on b.master_claim_brand_id = mcb.id
    where
        b.id = p_brand_id;

    return brand_details;
end;
$$;