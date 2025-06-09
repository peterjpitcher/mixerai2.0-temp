create or replace function get_brand_details_by_id(p_brand_id uuid)
returns jsonb as $$
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
            'created_at', b.created_at,
            'updated_at', b.updated_at,
            'master_claim_brand_name', mcb.name,
            'contentCount', (select count(*) from public.content where brand_id = b.id),
            'workflowCount', (select count(*) from public.workflows where brand_id = b.id),
            'admins', (
                select coalesce(jsonb_agg(jsonb_build_object(
                    'id', p.id,
                    'full_name', p.full_name,
                    'email', u.email,
                    'avatar_url', p.avatar_url,
                    'job_title', p.job_title
                )), '[]'::jsonb)
                from public.user_brand_permissions ubp
                join public.profiles p on ubp.user_id = p.id
                join auth.users u on p.id = u.id
                where ubp.brand_id = b.id and ubp.role = 'admin'
            ),
            'selected_vetting_agencies', (
                select coalesce(jsonb_agg(jsonb_build_object(
                    'id', cva.id,
                    'name', cva.name,
                    'description', cva.description,
                    'country_code', cva.country_code,
                    'priority', 
                        case cva.priority
                            when 'High' then 1
                            when 'Medium' then 2
                            when 'Low' then 3
                            else 99
                        end
                ) order by 
                    case cva.priority
                        when 'High' then 1
                        when 'Medium' then 2
                        when 'Low' then 3
                        else 99
                    end, cva.name), '[]'::jsonb)
                from public.brand_selected_agencies bsa
                join public.content_vetting_agencies cva on bsa.agency_id = cva.id
                where bsa.brand_id = b.id
            )
        )
    into brand_details
    from
        public.brands b
    left join
        public.master_claim_brands mcb on b.master_claim_brand_id = mcb.id
    where
        b.id = p_brand_id;

    return brand_details;
end;
$$ language plpgsql stable; 