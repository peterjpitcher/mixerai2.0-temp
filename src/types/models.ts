export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// --- Core Application Models ---

export interface Brand {
  id: string;
  name: string;
  website_url?: string | null;
  country?: string | null;
  language?: string | null;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
  content_vetting_agencies?: string | null; 
  brand_color?: string | null;
  brand_summary?: string | null;
  brand_admin_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Optional fields often joined or calculated in APIs:
  contentCount?: number;
  workflowCount?: number;
}

export interface UserProfile {
  id: string; 
  full_name?: string | null;
  email?: string | null; 
  avatar_url?: string | null;
  company?: string | null;
  job_title?: string | null;
  job_description?: string | null;
  role?: string | null; // Global role from user_metadata
  created_at?: string | null; 
  updated_at?: string | null; 
}

export interface WorkflowAssignee {
  id?: string; // User ID
  email: string;
  name?: string; // User's full name
  invitation_status?: string; 
}

export interface WorkflowStep {
  id: number | string; // Can be number (array index) or string (if uuids are used in future)
  name: string;
  description?: string;
  role: string; 
  approvalRequired?: boolean;
  assignees?: WorkflowAssignee[];
}

export interface Workflow {
  id: string;
  name: string;
  brand_id?: string | null;
  brand_name?: string | null; 
  brand_color?: string | null; 
  steps: WorkflowStep[]; 
  steps_count?: number; 
  template_id?: string | null;
  status?: 'active' | 'draft' | 'archived' | string;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Notification {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: string; 
  is_read?: boolean | null;
  action_url?: string | null;
  action_label?: string | null;
  created_at?: string | null;
}

// Re-export FieldType and Field for template structures from template.ts if it exists,
// or define them here if they are broadly used beyond just templates.
// For now, assuming they are in src/types/template.ts as per Issue #44 notes.

// It can also be beneficial to re-export types from supabase.ts if they are frequently used directly,
// or create more user-friendly aliases.
// Example:
// export type ContentStatus = Database['public']['Enums']['content_status']; 