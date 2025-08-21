import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface DeactivateRequest {
  user_id: string
  action: 'deactivate' | 'reactivate'
  reason?: string
  changed_by: string
}

serve(async (req) => {
  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const body: DeactivateRequest = await req.json()
    const { user_id, action, reason, changed_by } = body

    // Validate required fields
    if (!user_id || !action || !changed_by) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: user_id, action, changed_by' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create admin client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    if (action === 'deactivate') {
      // Check if we can deactivate this user (not last admin)
      const { data: canDeactivate } = await supabase.rpc('can_deactivate_user', {
        p_user_id: user_id
      })

      if (!canDeactivate) {
        return new Response(JSON.stringify({ 
          error: 'Cannot deactivate the last admin user' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Update user_accounts status
      const { data: deactivateResult, error: deactivateError } = await supabase.rpc('deactivate_user', {
        p_user_id: user_id,
        p_reason: reason,
        p_changed_by: changed_by
      })

      if (deactivateError) {
        throw deactivateError
      }

      // Use Admin API to update user metadata (marks as deactivated)
      const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
        app_metadata: { deactivated: true, deactivated_at: new Date().toISOString() },
        ban_duration: '87600h' // 10 years effectively permanent
      })

      if (updateError) {
        console.error('Failed to ban user via admin API:', updateError)
        // Continue anyway - database status is updated
      }

      // Sign out all sessions for this user
      await supabase.auth.admin.signOut(user_id, 'global')

      return new Response(JSON.stringify({ 
        success: true,
        message: 'User deactivated successfully',
        data: deactivateResult
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else if (action === 'reactivate') {
      // Update user_accounts status
      const { data: reactivateResult, error: reactivateError } = await supabase.rpc('reactivate_user', {
        p_user_id: user_id,
        p_reason: reason,
        p_changed_by: changed_by
      })

      if (reactivateError) {
        throw reactivateError
      }

      // Remove ban and update metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
        app_metadata: { 
          deactivated: false, 
          reactivated_at: new Date().toISOString() 
        },
        ban_duration: 'none'
      })

      if (updateError) {
        console.error('Failed to unban user via admin API:', updateError)
        // Continue anyway - database status is updated
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'User reactivated successfully',
        data: reactivateResult
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else {
      return new Response(JSON.stringify({ 
        error: 'Invalid action. Must be "deactivate" or "reactivate"' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error: any) {
    console.error('Error in admin-users function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})