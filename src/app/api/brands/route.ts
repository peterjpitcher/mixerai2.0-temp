import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';

// import { Pool } from 'pg'; // Removed - using Supabase instead
import { getUserAuthByEmail, inviteNewUserWithAppMetadata } from '@/lib/auth/user-management';
 // Added import
import { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/api/validation';
import { CompensatingTransaction } from '@/lib/db/transactions';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Removed PostgreSQL pool configuration - using Supabase instead

// Validation schema for creating a brand
const createBrandSchema = z.object({
  name: commonSchemas.nonEmptyString,
  website_url: commonSchemas.url.optional().nullable(),
  additional_website_urls: z.array(z.string()).optional().nullable(), // Add missing field
  country: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  brand_identity: z.string().optional().nullable(),
  tone_of_voice: z.string().optional().nullable(),
  guardrails: z.union([
    z.string(),
    z.array(z.string())
  ]).optional().nullable(),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
  logo_url: commonSchemas.url.optional().nullable(),
  master_claim_brand_id: commonSchemas.uuid.optional().nullable(),
  master_claim_brand_ids: z.array(commonSchemas.uuid).optional().nullable(), // NEW: Array for multiple master claim brands
  selected_agency_ids: z.array(commonSchemas.uuid).optional().nullable(),
  approved_content_types: z.array(z.string()).optional().nullable(),
  admin_users: z.array(z.object({
    email: commonSchemas.email,
    role: z.literal('admin')
  })).optional()
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
  guardrails?: string | null;
  brand_summary?: string | null;
  brand_color?: string | null;
  logo_url?: string | null;
  approved_content_types?: unknown; 
  created_at: string | null;
  updated_at: string | null;
  content_count?: { count: number }[] | null; 
  // Updated to use SupabaseVettingAgency for the raw data
  selected_vetting_agencies?: { agency_id: string; content_vetting_agencies: SupabaseVettingAgency | null }[] | null; 
  [key: string]: unknown; 
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

function normalizeWebsiteDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    if (!host.includes('.')) {
      return null;
    }
    return host;
  } catch {
    return null;
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
  guardrails?: string | null;
  brand_summary?: string | null;
  brand_color?: string | null;
  logo_url?: string | null;
  approved_content_types?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  content_count: number;
  selected_vetting_agencies: VettingAgency[]; // Uses VettingAgency with numeric priority
  [key: string]: unknown;
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
      // console.log('Returning mock brands during build');
      return NextResponse.json({ 
        success: true, 
        isMockData: true,
        data: getFallbackBrands()
      });
    }
    
    // Parse pagination parameters from query string
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    
    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
    const offset = (validatedPage - 1) * validatedLimit;
    
    // console.log('Attempting to fetch brands from database');
    const supabase = createSupabaseAdminClient();
    
    const globalRole = user?.user_metadata?.role;
    // console.log('User global role:', globalRole); 

    let brandsQuery = supabase
      .from('brands')
      .select('*, content_count:content(count), selected_vetting_agencies:brand_selected_agencies(agency_id, content_vetting_agencies(id, name, description, country_code, priority))');

    if (globalRole !== 'admin') {
      // Fetch brand_permissions directly for the user if they are not a global admin
      // console.log(`User ${user.id} is not a global admin. Fetching specific brand permissions.`);
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_brand_permissions')
        .select('brand_id')
        .eq('user_id', user.id);

      if (permissionsError) {
        // console.error(`[API Brands GET] Error fetching brand permissions for user ${user.id}:`, permissionsError);
        // Potentially return error or handle appropriately, for now, let it fall through to an empty list if query fails this way
        // but ideally, this should be a hard error.
        return handleApiError(permissionsError, 'Failed to fetch user brand permissions');
      }

      if (!permissionsData || permissionsData.length === 0) {
        // console.log(`[API Brands GET] Non-admin user ${user.id} has no brand permissions in user_brand_permissions table. Returning empty array.`);
        return NextResponse.json({ success: true, data: [] });
      }
      
      const permittedBrandIds = permissionsData.map(p => p.brand_id).filter(id => id != null);
      
      if (permittedBrandIds.length === 0) {
        // console.log(`[API Brands GET] Non-admin user ${user.id} has no valid brand IDs after fetching permissions. Returning empty array.`);
        return NextResponse.json({ success: true, data: [] });
      }
      
      // console.log(`[API Brands GET] User ${user.id} (role: ${globalRole}) has permitted brand IDs: ${permittedBrandIds.join(', ')}. Applying filter.`);
      brandsQuery = brandsQuery.in('id', permittedBrandIds);
    } else {
      // console.log(`User ${user.id} is a global admin. Fetching all brands.`);
    }
    
    // Add search filter if provided
    if (search) {
      // Escape special characters and use filter to prevent SQL injection
      const escapedSearch = search.replace(/[%_]/g, '\\$&');
      brandsQuery = brandsQuery.or(`name.ilike.%${escapedSearch}%,brand_summary.ilike.%${escapedSearch}%`);
    }
    
    // Apply ordering and pagination
    brandsQuery = brandsQuery.order('name').range(offset, offset + validatedLimit - 1);
    
    const { data: brandsData, error, count } = await brandsQuery;
    
    if (error) {
      // console.error('Error executing brands query:', error);
      throw error;
    }
    
    // console.log('Brands data fetched from database:', brandsData); // Log the raw data fetched
    
    const brandsDataCast = brandsData as BrandFromSupabase[] | null;

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
        guardrails: brand.guardrails,
        brand_summary: brand.brand_summary,
        brand_color: brand.brand_color,
        logo_url: brand.logo_url,
        approved_content_types: brand.approved_content_types,
        created_at: brand.created_at,
        updated_at: brand.updated_at,
        content_count: (brand.content_count && Array.isArray(brand.content_count) && brand.content_count.length > 0) ? (brand.content_count[0]?.count ?? 0) : 0,
        selected_vetting_agencies: agencies, // Now correctly typed and sorted
      };
    });

    // console.log(`Successfully fetched ${formattedBrands.length} brands`);
    
    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / validatedLimit) : 0;
    const hasNextPage = validatedPage < totalPages;
    const hasPreviousPage = validatedPage > 1;
    
    return NextResponse.json({ 
      success: true, 
      data: formattedBrands,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });
  } catch (error: unknown) {
    // console.error('Error fetching brands:', error);
    return handleApiError(error, 'Error fetching brands');
  }
});

// Authenticated POST handler for creating brands
export const POST = withAuthAndCSRF(async (req: NextRequest, user) => {
  // Role check: Only Global Admins can create new brands
  if (user.user_metadata?.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: You do not have permission to create this resource.' },
      { status: 403 }
    );
  }

  const supabase = createSupabaseAdminClient(); 
  try {
    // Validate request body
    const validation = await validateRequest(req, createBrandSchema);
    if (!validation.success) {
      return validation.response;
    }
    
    const body = validation.data;
    console.log('[API POST /brands] Received body:', body);
    console.log('[API POST /brands] Logo URL:', body.logo_url);
    
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
        } catch { /* ignore */ }
      }
    }

    const uniqueAdditionalUrls =
      body.additional_website_urls && Array.isArray(body.additional_website_urls)
        ? Array.from(new Set(body.additional_website_urls.filter((url: string) => typeof url === 'string' && url.trim() !== '')))
        : null;

    const normalizedDomain = normalizeWebsiteDomain(body.website_url);

    const insertPayload = {
      name: body.name,
      website_url: body.website_url || null,
      country: body.country || null,
      language: body.language || null,
      brand_identity: body.brand_identity || null,
      tone_of_voice: body.tone_of_voice || null,
      guardrails: formattedGuardrails,
      brand_color: body.brand_color || null,
      logo_url: body.logo_url || null,
      approved_content_types: body.approved_content_types || null,
      master_claim_brand_id: body.master_claim_brand_id || null,
      additional_website_urls: uniqueAdditionalUrls && uniqueAdditionalUrls.length ? uniqueAdditionalUrls : null,
      normalized_website_domain: normalizedDomain,
    };

    const { data: insertedBrand, error: insertError } = await supabase
      .from('brands')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError || !insertedBrand) {
      console.error('[API /api/brands POST] Brand insert failed:', insertError);
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Failed to create brand' },
        { status: 500 }
      );
    }

    const newBrandId = insertedBrand.id as string;

    const compensatingTransaction = new CompensatingTransaction();
    compensatingTransaction.addRollback(async () => {
      const { error: rollbackDeleteError } = await supabase
        .from('brands')
        .delete()
        .eq('id', newBrandId);
      if (rollbackDeleteError) {
        console.error('[API /api/brands POST] Rollback brand delete failed:', rollbackDeleteError);
      }
    });

    const abortWithCleanup = async (message: string, status = 500, detail?: string) => {
      try {
        await compensatingTransaction.rollback();
      } catch (rollbackError) {
        console.error('[API /api/brands POST] Rollback operation failed:', rollbackError);
      }
      const errorMessage = detail ? `${message} (${detail})` : message;
      return NextResponse.json({ success: false, error: errorMessage }, { status });
    };
    
    const { error: creatorPermissionError } = await supabase
      .from('user_brand_permissions')
      .upsert(
        { user_id: user.id, brand_id: newBrandId, role: 'admin' },
        { onConflict: 'user_id,brand_id' }
      );

    if (creatorPermissionError) {
      console.error('[API /api/brands POST] Error assigning creator brand admin permission:', creatorPermissionError);
      return abortWithCleanup('Failed to assign creator brand permissions.', 500, creatorPermissionError.message);
    }
    
    // --- Process Additional Brand Admins ---
    const adminUsers = body.admin_users || [];
    const resolvedAdminUserIds: string[] = []; // To store IDs of existing or successfully invited new admins

    for (const adminUserInfo of adminUsers) {
      const identifier = adminUserInfo.email;
      if (identifier === user.email) continue; // Skip creator, already handled by RPC

      let adminUser: User | null = null;
      let isNewAdmin = false;

      // Process the admin user email
      if (identifier) { 
        adminUser = await getUserAuthByEmail(identifier, supabase);
        if (!adminUser) {
          // User does not exist, invite them
          // console.log(`[API /api/brands POST] Admin email ${identifier} not found. Inviting as new user for brand ${newBrandId}.`);
          const appMetadata = { 
            intended_role: 'admin', 
            assigned_as_brand_admin_for_brand_id: newBrandId,
            inviter_id: user.id, 
            invite_type: 'brand_admin_invite',
            invited_to_brand_id: newBrandId,
          };
          const userMetadata = { email_for_invite: identifier }; // Minimal user metadata

          const { user: invitedAdmin, error: inviteError } = await inviteNewUserWithAppMetadata(
            identifier, 
            appMetadata, 
            supabase,
            userMetadata
          );

          if (inviteError || !invitedAdmin) {
            console.error(
              `[API /api/brands POST] Failed to invite new admin ${identifier} for brand ${newBrandId}.`,
              inviteError
            );
            return abortWithCleanup(
              `Failed to invite ${identifier} as a brand admin. Please try again.`,
              500,
              inviteError?.message
            );
          }
          adminUser = invitedAdmin;
          isNewAdmin = true;
          // console.log(`[API /api/brands POST] Successfully invited new admin ${identifier} (ID: ${adminUser.id}) for brand ${newBrandId}.`);
        }
      } else {
        // Identifier is assumed to be an existing user ID
        // Fetch user to confirm existence (optional, but good practice if ID source isn't guaranteed)
        // For now, assume valid ID if not email
        adminUser = { id: identifier } as User; // Partial User object, sufficient if just using ID
      }

      if (adminUser && adminUser.id) {
        if (!isNewAdmin) { // For existing users, add their ID directly for permission upsert
          resolvedAdminUserIds.push(adminUser.id);
        }
        // For new admins, permissions will be set via complete-invite using app_metadata.
        // No immediate permission upsert here for newly invited users.
      }
    }

    if (resolvedAdminUserIds.length > 0) {
      const uniqueAdminIds = Array.from(new Set(resolvedAdminUserIds));
      const permissionUpserts = uniqueAdminIds.map((adminId: string) => ({
        user_id: adminId,
        brand_id: newBrandId as string,
        role: 'admin' as const
      }));

      const { error: permissionError } = await supabase.from('user_brand_permissions').upsert(permissionUpserts, { onConflict: 'user_id,brand_id' });

      if (permissionError) {
        console.error('[API /api/brands POST] Error setting brand admin permissions for existing users:', permissionError);
        return abortWithCleanup('Failed to assign brand admin permissions.', 500, permissionError.message);
      }
    }
    // --- End Process Additional Brand Admins ---

    if (body.selected_agency_ids && Array.isArray(body.selected_agency_ids) && body.selected_agency_ids.length > 0) {
      // Fetch existing agency links for this brand to avoid duplicate inserts
      const { data: existingLinks, error: fetchLinksError } = await supabase
        .from('brand_selected_agencies')
        .select('agency_id')
        .eq('brand_id', newBrandId);

      if (fetchLinksError) {
        console.error(
          `[API /api/brands POST] Error fetching existing agency links for brand ${newBrandId}:`,
          fetchLinksError
        );
        return abortWithCleanup('Failed to verify existing agency relationships.', 500, fetchLinksError.message);
      }

      const existingAgencyIds = existingLinks ? existingLinks.map(link => link.agency_id) : [];
      const newAgencyIdsToInsert = body.selected_agency_ids.filter((agencyId: string) => !existingAgencyIds.includes(agencyId));

      if (newAgencyIdsToInsert.length > 0) {
        const agencyInserts = newAgencyIdsToInsert.map((agencyId: string) => ({
          brand_id: newBrandId,
          agency_id: agencyId
        }));
        
        const { error: agencyError } = await supabase
          .from('brand_selected_agencies')
          .insert(agencyInserts);

        if (agencyError) {
          console.error('[API /api/brands POST] Error linking new agencies to brand:', agencyError);
          return abortWithCleanup('Failed to associate vetting agencies with the brand.', 500, agencyError.message);
        }
      }
    }

    // Handle master_claim_brand_ids array if provided using the new junction table
    if (body.master_claim_brand_ids !== undefined && Array.isArray(body.master_claim_brand_ids)) {
      if (body.master_claim_brand_ids.length > 0) {
        const newLinks = body.master_claim_brand_ids.map((masterClaimBrandId: string) => ({
          brand_id: newBrandId,
          master_claim_brand_id: masterClaimBrandId,
          created_by: user.id
        }));
        
        const { error: insertError } = await supabase
          .from('brand_master_claim_brands')
          .insert(newLinks);
        
        if (insertError) {
          console.error(`[API /api/brands POST] Error inserting master claim brand links for brand ${newBrandId}:`, insertError);
          return abortWithCleanup('Failed to link selected Product Claims Brands.', 500, insertError.message);
        }
      }
    }

    // Fetch the newly created brand data using Supabase client
    const { data: newBrandDataFromDB, error: fetchBrandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', newBrandId)
      .single();

    if (fetchBrandError || !newBrandDataFromDB) {
      console.error(`[API /api/brands POST] Failed to fetch newly created brand ${newBrandId}:`, fetchBrandError);
      return abortWithCleanup('Brand was created but could not be retrieved. Please try again.', 500, fetchBrandError?.message);
    }

    // Fetch selected agencies with Supabase client
    const { data: finalSelectedSupabaseAgencies, error: fetchAgenciesError } = await supabase
      .from('brand_selected_agencies')
      .select(`agency_id, content_vetting_agencies (id, name, description, country_code, priority)`)
      .eq('brand_id', newBrandId);
    
    if (fetchAgenciesError) {
        console.error('[API /api/brands POST] Error fetching agencies for new brand:', fetchAgenciesError);
        return abortWithCleanup('Brand was created but agency details could not be retrieved. Please try again.', 500, fetchAgenciesError.message);
    }

    const finalSelectedVettingAgencies: VettingAgency[] = (finalSelectedSupabaseAgencies || [])
      .map((item: unknown) => {
        const itemTyped = item as { content_vetting_agencies?: SupabaseVettingAgency | null };
        const sa = itemTyped.content_vetting_agencies;
        if (!sa) return null;
        return {
          id: sa.id,
          name: sa.name,
          description: sa.description,
          country_code: sa.country_code,
          priority: mapSupabasePriorityToNumber(sa.priority as SupabaseVettingAgencyPriority),
        };
      })
      .filter((agency): agency is VettingAgency => agency !== null)
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return (a.name || '').localeCompare(b.name || '');
      });

    const finalResponseData: FormattedBrand = {
      ...(newBrandDataFromDB as unknown as FormattedBrand), // Cast after ensuring all fields match
      id: newBrandDataFromDB.id!,
      name: newBrandDataFromDB.name!,
      content_count: 0, 
      selected_vetting_agencies: finalSelectedVettingAgencies,
    };

    compensatingTransaction.clear();

    return NextResponse.json({ 
      success: true, 
      data: finalResponseData 
    });

  } catch (error) {
    return handleApiError(error, 'Error creating brand');
  }
}); 
