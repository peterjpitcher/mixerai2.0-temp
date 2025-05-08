export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          name: string
          website_url: string | null
          country: string | null
          language: string | null
          brand_identity: string | null
          tone_of_voice: string | null
          guardrails: string | null
          content_vetting_agencies: string | null
          brand_color: string | null
          approved_content_types: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          website_url?: string | null
          country?: string | null
          language?: string | null
          brand_identity?: string | null
          tone_of_voice?: string | null
          guardrails?: string | null
          content_vetting_agencies?: string | null
          brand_color?: string | null
          approved_content_types?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          website_url?: string | null
          country?: string | null
          language?: string | null
          brand_identity?: string | null
          tone_of_voice?: string | null
          guardrails?: string | null
          content_vetting_agencies?: string | null
          brand_color?: string | null
          approved_content_types?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          id: string
          brand_id: string
          content_type_id: string
          workflow_id: string | null
          created_by: string | null
          title: string
          body: string
          meta_title: string | null
          meta_description: string | null
          status: "draft" | "pending_review" | "approved" | "published" | "rejected"
          current_step: number | null
          created_at: string
          updated_at: string
          template_id: string | null
          content_data: Json | null
          version: number | null
          published_version: number | null
        }
        Insert: {
          id?: string
          brand_id: string
          content_type_id: string
          workflow_id?: string | null
          created_by?: string | null
          title: string
          body: string
          meta_title?: string | null
          meta_description?: string | null
          status?: "draft" | "pending_review" | "approved" | "published" | "rejected"
          current_step?: number | null
          created_at?: string
          updated_at?: string
          template_id?: string | null
          content_data?: Json | null
          version?: number | null
          published_version?: number | null
        }
        Update: {
          id?: string
          brand_id?: string
          content_type_id?: string
          workflow_id?: string | null
          created_by?: string | null
          title?: string
          body?: string
          meta_title?: string | null
          meta_description?: string | null
          status?: "draft" | "pending_review" | "approved" | "published" | "rejected"
          current_step?: number | null
          created_at?: string
          updated_at?: string
          template_id?: string | null
          content_data?: Json | null
          version?: number | null
          published_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_content_type_id_fkey"
            columns: ["content_type_id"]
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_workflow_id_fkey"
            columns: ["workflow_id"]
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_template_id_fkey"
            columns: ["template_id"]
            referencedRelation: "content_templates"
            referencedColumns: ["id"]
          }
        ]
      }
      content_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          fields: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          fields: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          fields?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_templates_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      content_types: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_brand_permissions: {
        Row: {
          id: string
          user_id: string
          brand_id: string
          role: "admin" | "editor" | "viewer"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand_id: string
          role?: "admin" | "editor" | "viewer"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand_id?: string
          role?: "admin" | "editor" | "viewer"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_brand_permissions_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_brand_permissions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      workflows: {
        Row: {
          id: string
          brand_id: string
          content_type_id: string
          name: string
          steps: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          content_type_id: string
          name: string
          steps?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          content_type_id?: string
          name?: string
          steps?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_content_type_id_fkey"
            columns: ["content_type_id"]
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          }
        ]
      }
      workflow_invitations: {
        Row: {
          id: string
          workflow_id: string
          step_id: number
          email: string
          role: string
          invite_token: string
          status: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          step_id: number
          email: string
          role: string
          invite_token: string
          status?: string
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          workflow_id?: string
          step_id?: number
          email?: string
          role?: string
          invite_token?: string
          status?: string
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "admin" | "editor" | "viewer"
      content_status: "draft" | "pending_review" | "approved" | "published" | "rejected"
    }
  }
} 