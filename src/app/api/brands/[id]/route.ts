import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';

// GET a single brand by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdminClient();
    const { id } = params;
    
    // Get the brand
    const { data: brand, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      brand 
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching brand');
  }
}

// DELETE a brand by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdminClient();
    const { id } = params;
    
    // First check if the brand exists
    const { data: brand, error: fetchError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }
    
    // Check if there's any content associated with this brand
    const { count: contentCount, error: countError } = await supabase
      .from('content')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', id);
    
    if (countError) throw countError;
    
    if (contentCount && contentCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete brand. It has ${contentCount} piece${contentCount === 1 ? '' : 's'} of content associated with it.` 
        },
        { status: 400 }
      );
    }
    
    // Proceed with deletion
    const { error: deleteError } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ 
      success: true, 
      message: `Brand "${brand.name}" has been deleted successfully` 
    });
  } catch (error) {
    return handleApiError(error, 'Error deleting brand');
  }
} 