import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase, isDatabaseConnectionError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { Pool } from 'pg'; // Import Pool for direct DB access

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Configure the connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Type for priority as it comes from Supabase (enum string values)
type SupabaseVettingAgencyPriority = "High" | "Medium" | "Low" | null;

// Interface for vetting agency as it comes from Supabase
interface SupabaseVettingAgency {
  id: string;
  name: string;
  description: string | null;
  country_code: string;
  priority: SupabaseVettingAgencyPriority; // String-based priority
}

// Interface for vetting agency (TARGET type for FormattedBrand, with numeric priority)
interface VettingAgency {
  id: string;
  name: string;
  description: string | null;
  country_code: string;
  priority: number; // Numeric priority
}

// Interface for brand data as it comes from Supabase
interface BrandFromSupabase {
  id: string;
  name: string;
  website_url?: string | null;
  country?: string | null;
  language?: string | null;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  brand_summary?: string | null;
  brand_color?: string | null;
  approved_content_types?: any; 
  created_at: string | null;
  updated_at: string | null;
  content_count?: { count: number }[] | null; 
  // Updated to use SupabaseVettingAgency for the raw data
  selected_vetting_agencies?: { agency_id: string; content_vetting_agencies: SupabaseVettingAgency | null }[] | null; 
  [key: string]: any; 
}

// Helper function to map Supabase priority strings to numbers
function mapSupabasePriorityToNumber(priority: SupabaseVettingAgencyPriority): number {
  switch (priority) {
    case "High": return 1;
    case "Medium": return 2;
    case "Low": return 3;
    default: return Number.MAX_SAFE_INTEGER; // Default for null or unexpected values
  }
}

interface FormattedBrand {
  id: string;
  name: string;
  website_url?: string | null;
  country?: string | null;
  language?: string | null;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  brand_summary?: string | null;
  brand_color?: string | null;
  approved_content_types?: any;
  created_at?: string | null;
  updated_at?: string | null;
  content_count: number;
  selected_vetting_agencies: VettingAgency[]; // Uses VettingAgency with numeric priority
  [key: string]: any;
}

// Sample fallback data for when DB connection fails
const getFallbackBrands = (): FormattedBrand[] => {
  return [
    {
      id: '1',
      name: 'Sample Brand',
      website_url: 'https://example.com',
      country: 'United States',
      language: 'English',
      brand_identity: 'Modern and innovative',
      tone_of_voice: 'Professional but friendly',
      brand_summary: 'Modern and innovative brand with a professional but friendly tone.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content_count: 5,
      brand_color: '#3498db',
      selected_vetting_agencies: [] as VettingAgency[] 
    },
    {
      id: '2',
      name: 'Another Brand',
      website_url: 'https://another-example.com',
      country: 'United Kingdom',
      language: 'English',
      brand_identity: 'Traditional and trusted',
      tone_of_voice: 'Formal and authoritative',
      brand_summary: 'Traditional and trusted brand with a formal and authoritative tone.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content_count: 3,
      brand_color: '#e74c3c',
      selected_vetting_agencies: [] as VettingAgency[] 
    }
  ];
};

// Authenticated GET handler for brands
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    if (isBuildPhase()) {
      console.log('Returning mock brands during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        data: getFallbackBrands()
      });
    }
    
    console.log('Attempting to fetch brands from database');
    const supabase = createSupabaseAdminClient();
    
    const { data: brandsData, error } = await supabase
      .from('brands')
      .select('*, content_count:content(count), selected_vetting_agencies:brand_selected_agencies(agency_id, content_vetting_agencies(id, name, description, country_code, priority))')
      .order('name');
    
    if (error) throw error;
    
    const brandsDataCast = brandsData as BrandFromSupabase[] | null; // This cast should now be correct

    const formattedBrands: FormattedBrand[] = (brandsDataCast || []).map((brand: BrandFromSupabase) => {
      let agencies: VettingAgency[] = []; 
      if (brand.selected_vetting_agencies && Array.isArray(brand.selected_vetting_agencies)) {
        agencies = brand.selected_vetting_agencies
          .map(item => {
            const supabaseAgency = item.content_vetting_agencies; // Type: SupabaseVettingAgency | null
            if (supabaseAgency) {
              return { // Convert to VettingAgency with numeric priority
                id: supabaseAgency.id,
                name: supabaseAgency.name,
                description: supabaseAgency.description,
                country_code: supabaseAgency.country_code,
                priority: mapSupabasePriorityToNumber(supabaseAgency.priority),
              } as VettingAgency;
            }
            return null;
          })
          .filter((agency): agency is VettingAgency => agency !== null) // Type guard and filter nulls
          .sort((a, b) => { // Sort by numeric priority, then name
            if (a.priority !== b.priority) {
              return a.priority - b.priority;
            }
            return (a.name || '').localeCompare(b.name || '');
          });
      }
      return {
        id: brand.id,
        name: brand.name,
        website_url: brand.website_url,
        country: brand.country,
        language: brand.language,
        brand_identity: brand.brand_identity,
        tone_of_voice: brand.tone_of_voice,
        brand_summary: brand.brand_summary,
        brand_color: brand.brand_color,
        approved_content_types: brand.approved_content_types,
        created_at: brand.created_at,
        updated_at: brand.updated_at,
        content_count: brand.content_count && brand.content_count[0] ? brand.content_count[0].count : 0,
        selected_vetting_agencies: agencies, // Now correctly typed and sorted
      };
    });

    console.log(`Successfully fetched ${formattedBrands.length} brands`);
    
    return NextResponse.json({ 
      success: true, 
      data: formattedBrands 
    });
  } catch (error: any) {
    console.error('Error fetching brands:', error);
    
    if (isDatabaseConnectionError(error)) {
      console.error('Database connection error, using fallback brands data:', error);
      return NextResponse.json({ 
        success: true, 
        isFallback: true,
        data: getFallbackBrands()
      });
    }
    
    return handleApiError(error, 'Error fetching brands');
  }
});

// Authenticated POST handler for creating brands
export const POST = withAuth(async (req: NextRequest, user) => {
  const supabase = createSupabaseAdminClient(); 
  const dbClient = await pool.connect(); 
  try {
    await dbClient.query('BEGIN'); 
    const body = await req.json();
    
    if (!body.name) {
      await dbClient.query('ROLLBACK');
      dbClient.release();
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    let formattedGuardrails = body.guardrails || null;
    if (formattedGuardrails) {
      if (Array.isArray(formattedGuardrails)) {
        formattedGuardrails = formattedGuardrails.map((item:string) => `- ${item}`).join('\\n');
      } 
      else if (typeof formattedGuardrails === 'string' && 
              formattedGuardrails.trim().startsWith('[') && 
              formattedGuardrails.trim().endsWith(']')) {
        try {
          const guardrailsArray = JSON.parse(formattedGuardrails);
          if (Array.isArray(guardrailsArray)) {
            formattedGuardrails = guardrailsArray.map((item:string) => `- ${item}`).join('\\n');
          }
        } catch (e) { /* ignore */ }
      }
    }

    const rpcParams = {
      creator_user_id: user.id,
      brand_name: body.name,
      brand_website_url: body.website_url || null,
      brand_country: body.country || null,
      brand_language: body.language || null,
      brand_identity_text: body.brand_identity || null,
      brand_tone_of_voice: body.tone_of_voice || null,
      brand_guardrails: formattedGuardrails,
      brand_content_vetting_agencies: null, 
      brand_color: body.brand_color || null, 
      approved_content_types: body.approved_content_types || null 
    };

    const { data: newBrandId, error: rpcError } = await supabase.rpc(
      'create_brand_and_set_admin' as any,
      rpcParams
    );

    if (rpcError) {
      console.error('RPC Error creating brand:', rpcError);
      throw new Error(`Failed to create brand: ${rpcError.message}`);
    }

    if (!newBrandId) {
      throw new Error('Failed to create brand, no ID returned from function.');
    }
    
    if (body.selected_agency_ids && Array.isArray(body.selected_agency_ids) && body.selected_agency_ids.length > 0) {
      const agencyInsertQuery = 'INSERT INTO brand_selected_agencies (brand_id, agency_id) VALUES ($1, $2) ON CONFLICT (brand_id, agency_id) DO NOTHING';
      for (const agencyId of body.selected_agency_ids) {
        await dbClient.query(agencyInsertQuery, [newBrandId, agencyId]);
      }
    }

    const additionalAdminIds = (body.brand_admin_ids || []).filter((id: string) => id !== user.id);

    if (Array.isArray(additionalAdminIds) && additionalAdminIds.length > 0) {
      const permissionUpserts = additionalAdminIds.map((adminId: string) => ({
        user_id: adminId,
        brand_id: newBrandId as string,
        role: 'admin' as 'admin'
      }));

      const { error: permissionError } = await supabase.from('user_brand_permissions').upsert(permissionUpserts);

      if (permissionError) {
        console.error('Error setting additional brand admin permissions:', permissionError);
      }
    }

    await dbClient.query('COMMIT'); 

    // Fetch the newly created brand data
    const { rows: newBrandRows } = await dbClient.query(
        `SELECT b.* 
         FROM brands b 
         WHERE b.id = $1`,
        [newBrandId]
    );
    if (newBrandRows.length === 0) {
        throw new Error('Failed to fetch newly created brand after commit.');
    }
    // Cast to a base type, selected_vetting_agencies will be added/transformed
    const newBrandDataFromDB = newBrandRows[0] as Omit<BrandFromSupabase, 'selected_vetting_agencies' | 'content_count'>;


    // Fetch selected agencies; their 'priority' will be string-based from the DB.
    const { rows: finalSelectedSupabaseAgencies } = await dbClient.query(
        `SELECT cva.id, cva.name, cva.description, cva.country_code, cva.priority
         FROM content_vetting_agencies cva
         JOIN brand_selected_agencies bsa ON cva.id = bsa.agency_id
         WHERE bsa.brand_id = $1
         ORDER BY cva.priority ASC, cva.name ASC`, // DB might sort by string priority; we'll re-sort after conversion
        [newBrandId]
    );
    
    // Convert fetched agencies to VettingAgency[] with numeric priority
    const finalSelectedVettingAgencies: VettingAgency[] = (finalSelectedSupabaseAgencies as SupabaseVettingAgency[])
        .map(sa => ({
            id: sa.id,
            name: sa.name,
            description: sa.description,
            country_code: sa.country_code,
            priority: mapSupabasePriorityToNumber(sa.priority),
        }))
        .sort((a, b) => { // Ensure sorting by numeric priority
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return (a.name || '').localeCompare(b.name || '');
        });
    
    const finalResponseData: FormattedBrand = {
        id: newBrandDataFromDB.id!,
        name: newBrandDataFromDB.name!,
        website_url: newBrandDataFromDB.website_url,
        country: newBrandDataFromDB.country,
        language: newBrandDataFromDB.language,
        brand_identity: newBrandDataFromDB.brand_identity,
        tone_of_voice: newBrandDataFromDB.tone_of_voice,
        brand_summary: newBrandDataFromDB.brand_summary,
        brand_color: newBrandDataFromDB.brand_color,
        approved_content_types: newBrandDataFromDB.approved_content_types,
        created_at: newBrandDataFromDB.created_at,
        updated_at: newBrandDataFromDB.updated_at,
        content_count: 0, 
        selected_vetting_agencies: finalSelectedVettingAgencies,
    };

    return NextResponse.json({ 
      success: true, 
      data: finalResponseData 
    });
  } catch (error) {
    await dbClient.query('ROLLBACK');
    return handleApiError(error, 'Error creating brand');
  } finally {
    dbClient.release();
  }
}); 