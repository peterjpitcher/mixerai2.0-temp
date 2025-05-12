export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          likes: number | null
          shares: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          likes?: number | null
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          likes?: number | null
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          brand_admin_id: string | null
          brand_color: string | null
          brand_identity: string | null
          brand_summary: string | null
          content_vetting_agencies: string | null
          country: string | null
          created_at: string | null
          guardrails: string | null
          id: string
          language: string | null
          name: string
          tone_of_voice: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          brand_admin_id?: string | null
          brand_color?: string | null
          brand_identity?: string | null
          brand_summary?: string | null
          content_vetting_agencies?: string | null
          country?: string | null
          created_at?: string | null
          guardrails?: string | null
          id?: string
          language?: string | null
          name: string
          tone_of_voice?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          brand_admin_id?: string | null
          brand_color?: string | null
          brand_identity?: string | null
          brand_summary?: string | null
          content_vetting_agencies?: string | null
          country?: string | null
          created_at?: string | null
          guardrails?: string | null
          id?: string
          language?: string | null
          name?: string
          tone_of_voice?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_brand_admin_id_fkey"
            columns: ["brand_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_brand_admin_id_fkey"
            columns: ["brand_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          body: string
          brand_id: string | null
          content_data: Json | null
          content_type_id: string | null
          created_at: string | null
          created_by: string | null
          current_step: number | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_version: number | null
          status: Database["public"]["Enums"]["content_status"]
          template_id: string | null
          title: string
          updated_at: string | null
          version: number | null
          workflow_id: string | null
        }
        Insert: {
          body: string
          brand_id?: string | null
          content_data?: Json | null
          content_type_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step?: number | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_version?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          template_id?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
          workflow_id?: string | null
        }
        Update: {
          body?: string
          brand_id?: string | null
          content_data?: Json | null
          content_type_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step?: number | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_version?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          template_id?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "content_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      content_ownership_history: {
        Row: {
          changed_by: string | null
          content_id: string | null
          created_at: string | null
          id: string
          new_owner: string | null
          previous_owner: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          new_owner?: string | null
          previous_owner?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          new_owner?: string | null
          previous_owner?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_ownership_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ownership_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ownership_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ownership_history_new_owner_fkey"
            columns: ["new_owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ownership_history_new_owner_fkey"
            columns: ["new_owner"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ownership_history_previous_owner_fkey"
            columns: ["previous_owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ownership_history_previous_owner_fkey"
            columns: ["previous_owner"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      content_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          fields: Json
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fields: Json
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fields?: Json
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      content_types: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          action_status: string
          content_id: string
          content_json: Json | null
          created_at: string
          feedback: string | null
          id: string
          reviewer_id: string | null
          step_name: string | null
          version_number: number
          workflow_step_identifier: string
        }
        Insert: {
          action_status: string
          content_id: string
          content_json?: Json | null
          created_at?: string
          feedback?: string | null
          id?: string
          reviewer_id?: string | null
          step_name?: string | null
          version_number: number
          workflow_step_identifier: string
        }
        Update: {
          action_status?: string
          content_id?: string
          content_json?: Json | null
          created_at?: string
          feedback?: string | null
          id?: string
          reviewer_id?: string | null
          step_name?: string | null
          version_number?: number
          workflow_step_identifier?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_versions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_versions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_logs: {
        Row: {
          brand_id: string | null
          created_at: string | null
          email: string
          error_message: string | null
          id: string
          invited_by: string | null
          success: boolean
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          invited_by?: string | null
          success: boolean
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          invited_by?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invitation_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_logs_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_logs_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          job_description: string | null
          job_title: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          job_description?: string | null
          job_title?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_brand_permissions: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_brand_permissions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_brand_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_brand_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_source: string
          invite_token: string
          invited_by: string | null
          last_reminder_at: string | null
          reminder_count: number | null
          role: string
          source_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_source: string
          invite_token: string
          invited_by?: string | null
          last_reminder_at?: string | null
          reminder_count?: number | null
          role: string
          source_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_source?: string
          invite_token?: string
          invited_by?: string | null
          last_reminder_at?: string | null
          reminder_count?: number | null
          role?: string
          source_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_system_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_system_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_system_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string
          role: string
          status: string | null
          step_id: number
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invite_token: string
          role: string
          status?: string | null
          step_id: number
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          role?: string
          status?: string | null
          step_id?: number
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_invitations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_user_assignments: {
        Row: {
          created_at: string | null
          id: string
          step_id: number
          updated_at: string | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          step_id: number
          updated_at?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          step_id?: number
          updated_at?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_user_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_user_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_user_assignments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          brand_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          steps: Json
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          steps?: Json
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          steps?: Json
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "content_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_view: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_brand_and_dependents: {
        Args: {
          brand_id_to_delete: string
        }
        Returns: undefined
      }
    }
    Enums: {
      content_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "published"
        | "rejected"
      user_role: "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      content_status: [
        "draft",
        "pending_review",
        "approved",
        "published",
        "rejected",
      ],
      user_role: ["admin", "editor", "viewer"],
    },
  },
} as const
