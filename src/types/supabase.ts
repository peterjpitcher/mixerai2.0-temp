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
      brand_master_claim_brands: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          id: string
          master_claim_brand_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          master_claim_brand_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          master_claim_brand_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_master_claim_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_master_claim_brands_master_claim_brand_id_fkey"
            columns: ["master_claim_brand_id"]
            isOneToOne: false
            referencedRelation: "master_claim_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_selected_agencies: {
        Row: {
          agency_id: string
          brand_id: string
          created_at: string | null
        }
        Insert: {
          agency_id: string
          brand_id: string
          created_at?: string | null
        }
        Update: {
          agency_id?: string
          brand_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_selected_agencies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "content_vetting_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_selected_agencies_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          additional_website_urls: string[] | null
          approved_content_types: Json | null
          brand_admin_id: string | null
          brand_color: string | null
          brand_identity: string | null
          brand_summary: string | null
          content_vetting_agencies: string[] | null
          country: string | null
          created_at: string | null
          guardrails: string | null
          id: string
          language: string | null
          logo_url: string | null
          master_claim_brand_id: string | null
          name: string
          normalized_website_domain: string | null
          tone_of_voice: string | null
          updated_at: string | null
          website_url: string | null
          website_urls: Json | null
        }
        Insert: {
          additional_website_urls?: string[] | null
          approved_content_types?: Json | null
          brand_admin_id?: string | null
          brand_color?: string | null
          brand_identity?: string | null
          brand_summary?: string | null
          content_vetting_agencies?: string[] | null
          country?: string | null
          created_at?: string | null
          guardrails?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          master_claim_brand_id?: string | null
          name: string
          normalized_website_domain?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          website_url?: string | null
          website_urls?: Json | null
        }
        Update: {
          additional_website_urls?: string[] | null
          approved_content_types?: Json | null
          brand_admin_id?: string | null
          brand_color?: string | null
          brand_identity?: string | null
          brand_summary?: string | null
          content_vetting_agencies?: string[] | null
          country?: string | null
          created_at?: string | null
          guardrails?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          master_claim_brand_id?: string | null
          name?: string
          normalized_website_domain?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          website_url?: string | null
          website_urls?: Json | null
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
          {
            foreignKeyName: "brands_brand_admin_id_fkey"
            columns: ["brand_admin_id"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_brands_master_claim_brand"
            columns: ["master_claim_brand_id"]
            isOneToOne: false
            referencedRelation: "master_claim_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_master_claim_brand"
            columns: ["master_claim_brand_id"]
            isOneToOne: false
            referencedRelation: "master_claim_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_countries: {
        Row: {
          claim_id: string
          country_code: string
          created_at: string | null
        }
        Insert: {
          claim_id: string
          country_code: string
          created_at?: string | null
        }
        Update: {
          claim_id?: string
          country_code?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_countries_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_countries_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_pending_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_countries_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_arrays"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_ingredients: {
        Row: {
          claim_id: string
          created_at: string | null
          ingredient_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string | null
          ingredient_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string | null
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_ingredients_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_ingredients_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_pending_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_ingredients_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_arrays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_products: {
        Row: {
          claim_id: string
          created_at: string | null
          product_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string | null
          product_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_products_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_products_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_pending_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_products_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_arrays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_reviews: {
        Row: {
          country_code: string
          created_at: string | null
          id: string
          master_claim_brand_id: string
          review_data: Json
          reviewed_at: string
          reviewed_by: string
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          id?: string
          master_claim_brand_id: string
          review_data: Json
          reviewed_at?: string
          reviewed_by: string
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          id?: string
          master_claim_brand_id?: string
          review_data?: Json
          reviewed_at?: string
          reviewed_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_reviews_master_claim_brand_id_fkey"
            columns: ["master_claim_brand_id"]
            isOneToOne: false
            referencedRelation: "master_claim_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_workflow_history: {
        Row: {
          action_status: string
          claim_id: string
          comment: string | null
          created_at: string
          feedback: string | null
          id: string
          reviewer_id: string | null
          step_name: string | null
          updated_claim_text: string | null
          workflow_step_id: string | null
        }
        Insert: {
          action_status: string
          claim_id: string
          comment?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          reviewer_id?: string | null
          step_name?: string | null
          updated_claim_text?: string | null
          workflow_step_id?: string | null
        }
        Update: {
          action_status?: string
          claim_id?: string
          comment?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          reviewer_id?: string | null
          step_name?: string | null
          updated_claim_text?: string | null
          workflow_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_workflow_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_workflow_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_pending_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_workflow_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_arrays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_workflow_history_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_workflow_history_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_workflow_history_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_workflow_history_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "claims_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          claim_text: string
          claim_type: Database["public"]["Enums"]["claim_type_enum"]
          completed_workflow_steps: string[] | null
          country_code: string | null
          created_at: string | null
          created_by: string | null
          current_workflow_step: string | null
          description: string | null
          id: string
          ingredient_id: string | null
          level: Database["public"]["Enums"]["claim_level_enum"]
          master_brand_id: string | null
          product_id: string | null
          updated_at: string | null
          updated_by: string | null
          workflow_id: string | null
          workflow_status: Database["public"]["Enums"]["content_status"] | null
        }
        Insert: {
          claim_text: string
          claim_type: Database["public"]["Enums"]["claim_type_enum"]
          completed_workflow_steps?: string[] | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          current_workflow_step?: string | null
          description?: string | null
          id?: string
          ingredient_id?: string | null
          level: Database["public"]["Enums"]["claim_level_enum"]
          master_brand_id?: string | null
          product_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_id?: string | null
          workflow_status?: Database["public"]["Enums"]["content_status"] | null
        }
        Update: {
          claim_text?: string
          claim_type?: Database["public"]["Enums"]["claim_type_enum"]
          completed_workflow_steps?: string[] | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          current_workflow_step?: string | null
          description?: string | null
          id?: string
          ingredient_id?: string | null
          level?: Database["public"]["Enums"]["claim_level_enum"]
          master_brand_id?: string | null
          product_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_id?: string | null
          workflow_status?: Database["public"]["Enums"]["content_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_current_workflow_step_fkey"
            columns: ["current_workflow_step"]
            isOneToOne: false
            referencedRelation: "claims_workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_master_brand_id_fkey"
            columns: ["master_brand_id"]
            isOneToOne: false
            referencedRelation: "master_claim_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "claims_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      claims_workflow_steps: {
        Row: {
          approval_required: boolean
          assigned_user_ids: string[] | null
          created_at: string
          description: string | null
          id: string
          name: string
          role: string
          step_order: number
          updated_at: string
          workflow_id: string
        }
        Insert: {
          approval_required?: boolean
          assigned_user_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          role: string
          step_order: number
          updated_at?: string
          workflow_id: string
        }
        Update: {
          approval_required?: boolean
          assigned_user_ids?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          role?: string
          step_order?: number
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "claims_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      claims_workflows: {
        Row: {
          brand_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_workflows_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          assigned_to: string[] | null
          body: string
          brand_id: string | null
          content_data: Json | null
          content_type_id: string | null
          created_at: string | null
          created_by: string | null
          current_step: string | null
          due_date: string | null
          fields: Json
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
          assigned_to?: string[] | null
          body: string
          brand_id?: string | null
          content_data?: Json | null
          content_type_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step?: string | null
          due_date?: string | null
          fields?: Json
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
          assigned_to?: string[] | null
          body?: string
          brand_id?: string | null
          content_data?: Json | null
          content_type_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step?: string | null
          due_date?: string | null
          fields?: Json
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
            foreignKeyName: "content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_current_step_fkey"
            columns: ["current_step"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
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
            foreignKeyName: "content_ownership_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
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
            foreignKeyName: "content_ownership_history_new_owner_fkey"
            columns: ["new_owner"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
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
          {
            foreignKeyName: "content_ownership_history_previous_owner_fkey"
            columns: ["previous_owner"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
        ]
      }
      content_templates: {
        Row: {
          brand_id: string | null
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
          brand_id?: string | null
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
          brand_id?: string | null
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
            foreignKeyName: "content_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "content_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
        ]
      }
      content_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
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
          {
            foreignKeyName: "content_versions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
        ]
      }
      content_vetting_agencies: {
        Row: {
          country_code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          priority:
            | Database["public"]["Enums"]["vetting_agency_priority_level"]
            | null
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          priority?:
            | Database["public"]["Enums"]["vetting_agency_priority_level"]
            | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          priority?:
            | Database["public"]["Enums"]["vetting_agency_priority_level"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_items: {
        Row: {
          actual_behavior: string | null
          affected_area: string | null
          app_version: string | null
          assigned_to: string | null
          attachments_metadata: Json | null
          browser_info: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expected_behavior: string | null
          id: string
          os_info: string | null
          priority: Database["public"]["Enums"]["feedback_priority"]
          resolution_details: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          steps_to_reproduce: string | null
          title: string | null
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at: string | null
          updated_by: string | null
          url: string | null
          user_impact_details: string | null
        }
        Insert: {
          actual_behavior?: string | null
          affected_area?: string | null
          app_version?: string | null
          assigned_to?: string | null
          attachments_metadata?: Json | null
          browser_info?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_behavior?: string | null
          id?: string
          os_info?: string | null
          priority: Database["public"]["Enums"]["feedback_priority"]
          resolution_details?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          steps_to_reproduce?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
          user_impact_details?: string | null
        }
        Update: {
          actual_behavior?: string | null
          affected_area?: string | null
          app_version?: string | null
          assigned_to?: string | null
          attachments_metadata?: Json | null
          browser_info?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_behavior?: string | null
          id?: string
          os_info?: string | null
          priority?: Database["public"]["Enums"]["feedback_priority"]
          resolution_details?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          steps_to_reproduce?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
          user_impact_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "invitation_logs_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
        ]
      }
      market_claim_overrides: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_blocked: boolean
          market_country_code: string
          master_claim_id: string
          replacement_claim_id: string | null
          target_product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_blocked?: boolean
          market_country_code: string
          master_claim_id: string
          replacement_claim_id?: string | null
          target_product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_blocked?: boolean
          market_country_code?: string
          master_claim_id?: string
          replacement_claim_id?: string | null
          target_product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_claim_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_claim_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_claim_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_claim_overrides_master_claim_id_fkey"
            columns: ["master_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_claim_overrides_master_claim_id_fkey"
            columns: ["master_claim_id"]
            isOneToOne: false
            referencedRelation: "claims_pending_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_claim_overrides_master_claim_id_fkey"
            columns: ["master_claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_arrays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_claim_overrides_replacement_claim_id_fkey"
            columns: ["replacement_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_claim_overrides_replacement_claim_id_fkey"
            columns: ["replacement_claim_id"]
            isOneToOne: false
            referencedRelation: "claims_pending_approval"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_claim_overrides_replacement_claim_id_fkey"
            columns: ["replacement_claim_id"]
            isOneToOne: false
            referencedRelation: "claims_with_arrays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_claim_overrides_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      master_claim_brands: {
        Row: {
          created_at: string
          id: string
          mixerai_brand_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mixerai_brand_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mixerai_brand_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_claim_brands_mixerai_brand_id_fkey"
            columns: ["mixerai_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          archived_at: string | null
          created_at: string | null
          id: string
          is_archived: boolean
          is_read: boolean | null
          message: string
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          archived_at?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean | null
          message: string
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          archived_at?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          updated_at?: string | null
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
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          created_at: string | null
          ingredient_id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          ingredient_id: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          ingredient_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          master_brand_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          master_brand_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          master_brand_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_master_brand_id_fkey"
            columns: ["master_brand_id"]
            isOneToOne: false
            referencedRelation: "master_claim_brands"
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
          email_frequency: string | null
          email_notifications_enabled: boolean | null
          email_preferences: Json | null
          full_name: string | null
          id: string
          job_title: string | null
          notification_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          email_frequency?: string | null
          email_notifications_enabled?: boolean | null
          email_preferences?: Json | null
          full_name?: string | null
          id: string
          job_title?: string | null
          notification_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          email_frequency?: string | null
          email_notifications_enabled?: boolean | null
          email_preferences?: Json | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          notification_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tool_run_history: {
        Row: {
          batch_id: string | null
          batch_sequence: number | null
          brand_id: string | null
          error_message: string | null
          id: string
          inputs: Json
          outputs: Json
          run_at: string
          status: Database["public"]["Enums"]["tool_run_status"]
          tool_name: string
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          batch_sequence?: number | null
          brand_id?: string | null
          error_message?: string | null
          id?: string
          inputs: Json
          outputs: Json
          run_at?: string
          status?: Database["public"]["Enums"]["tool_run_status"]
          tool_name: string
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          batch_sequence?: number | null
          brand_id?: string | null
          error_message?: string | null
          id?: string
          inputs?: Json
          outputs?: Json
          run_at?: string
          status?: Database["public"]["Enums"]["tool_run_status"]
          tool_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_run_history_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      user_brand_permissions: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_brand_role_enum"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_brand_role_enum"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_brand_role_enum"]
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
          {
            foreignKeyName: "user_brand_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
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
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
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
          {
            foreignKeyName: "user_system_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tasks: {
        Row: {
          content_id: string
          created_at: string | null
          due_date: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_id: string
          workflow_id: string
          workflow_step_id: string
          workflow_step_name: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          workflow_id: string
          workflow_step_id: string
          workflow_step_name?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          workflow_id?: string
          workflow_step_id?: string
          workflow_step_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ut_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
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
          step_id: string | null
          user_id: string | null
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
          step_id?: string | null
          user_id?: string | null
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
          step_id?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_invitations_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_invitations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          approval_required: boolean | null
          assigned_user_ids: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_optional: boolean
          name: string
          role: string | null
          step_id: string | null
          step_order: number
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          approval_required?: boolean | null
          assigned_user_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_optional?: boolean
          name: string
          role?: string | null
          step_id?: string | null
          step_order: number
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          approval_required?: boolean | null
          assigned_user_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_optional?: boolean
          name?: string
          role?: string | null
          step_id?: string | null
          step_order?: number
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
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
          step_id: string
          updated_at: string | null
          user_id: string | null
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          step_id: string
          updated_at?: string | null
          user_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          step_id?: string
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
            foreignKeyName: "workflow_user_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_user_assignments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wua_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          brand_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["workflow_status"]
          steps: Json
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["workflow_status"]
          steps?: Json
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["workflow_status"]
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
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
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
      claims_pending_approval: {
        Row: {
          brand_id: string | null
          brand_logo_url: string | null
          brand_name: string | null
          brand_primary_color: string | null
          claim_text: string | null
          claim_type: Database["public"]["Enums"]["claim_type_enum"] | null
          created_at: string | null
          created_by: string | null
          creator_name: string | null
          current_step_assignees: string[] | null
          current_step_name: string | null
          current_step_role: string | null
          current_workflow_step: string | null
          description: string | null
          entity_name: string | null
          id: string | null
          level: Database["public"]["Enums"]["claim_level_enum"] | null
          workflow_id: string | null
          workflow_name: string | null
          workflow_status: Database["public"]["Enums"]["content_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_current_workflow_step_fkey"
            columns: ["current_workflow_step"]
            isOneToOne: false
            referencedRelation: "claims_workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "claims_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      claims_with_arrays: {
        Row: {
          claim_text: string | null
          claim_type: Database["public"]["Enums"]["claim_type_enum"] | null
          completed_workflow_steps: string[] | null
          country_codes: string[] | null
          created_at: string | null
          created_by: string | null
          current_workflow_step: string | null
          description: string | null
          entity_name: string | null
          id: string | null
          ingredient_id: string | null
          ingredient_ids: string[] | null
          ingredient_names: string | null
          level: Database["public"]["Enums"]["claim_level_enum"] | null
          master_brand_id: string | null
          product_ids: string[] | null
          product_names: string | null
          updated_at: string | null
          updated_by: string | null
          workflow_id: string | null
          workflow_status: Database["public"]["Enums"]["content_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_invitation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_current_workflow_step_fkey"
            columns: ["current_workflow_step"]
            isOneToOne: false
            referencedRelation: "claims_workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_master_brand_id_fkey"
            columns: ["master_brand_id"]
            isOneToOne: false
            referencedRelation: "master_claim_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "claims_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
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
      user_invitation_status: {
        Row: {
          email: string | null
          expires_at: string | null
          full_name: string | null
          id: string | null
          invitation_status: string | null
          last_sign_in_at: string | null
          user_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      advance_claim_workflow: {
        Args:
          | {
              p_claim_id: string
              p_action: string
              p_feedback: string
              p_reviewer_id: string
            }
          | {
              p_claim_id: string
              p_action: string
              p_feedback?: string
              p_reviewer_id?: string
              p_comment?: string
              p_updated_claim_text?: string
            }
        Returns: Json
      }
      assign_workflow_to_claim: {
        Args: { p_claim_id: string; p_workflow_id: string }
        Returns: Json
      }
      create_brand_and_set_admin: {
        Args: {
          creator_user_id: string
          brand_name: string
          brand_website_url?: string
          brand_country?: string
          brand_language?: string
          brand_identity_text?: string
          brand_tone_of_voice?: string
          brand_guardrails?: string
          brand_content_vetting_agencies_input?: string[]
          brand_color_input?: string
          approved_content_types_input?: Json
        }
        Returns: string
      }
      create_brand_with_permissions: {
        Args: {
          p_creator_user_id: string
          p_brand_name: string
          p_website_url?: string
          p_country?: string
          p_language?: string
          p_brand_identity?: string
          p_tone_of_voice?: string
          p_guardrails?: string
          p_brand_color?: string
          p_logo_url?: string
          p_approved_content_types?: Json
          p_master_claim_brand_id?: string
          p_agency_ids?: string[]
        }
        Returns: {
          brand_id: string
          success: boolean
          error_message: string
        }[]
      }
      create_claim_with_associations: {
        Args: {
          p_claim_text: string
          p_claim_type: Database["public"]["Enums"]["claim_type_enum"]
          p_level: Database["public"]["Enums"]["claim_level_enum"]
          p_master_brand_id?: string
          p_ingredient_id?: string
          p_ingredient_ids?: string[]
          p_product_ids?: string[]
          p_country_codes?: string[]
          p_description?: string
          p_created_by?: string
          p_workflow_id?: string
        }
        Returns: string
      }
      create_claims_batch: {
        Args: { p_claims: Json; p_workflow_id?: string; p_created_by?: string }
        Returns: {
          success: boolean
          error_message: string
          created_claim_ids: string[]
        }[]
      }
      create_workflow_and_log_invitations: {
        Args: {
          p_name: string
          p_brand_id: string
          p_steps_definition: Json
          p_created_by: string
          p_invitation_items: Json
        }
        Returns: string
      }
      delete_brand_and_dependents: {
        Args: { brand_id_to_delete: string }
        Returns: undefined
      }
      delete_brand_cascade: {
        Args: { p_brand_id: string; p_deleting_user_id: string }
        Returns: {
          success: boolean
          error_message: string
          deleted_content_count: number
          deleted_workflow_count: number
        }[]
      }
      delete_template_and_update_content: {
        Args: { template_id_to_delete: string }
        Returns: undefined
      }
      delete_user_and_reassign_tasks: {
        Args: { p_user_id_to_delete: string }
        Returns: undefined
      }
      get_all_claims_for_master_brand: {
        Args:
          | { master_brand_id_param: string }
          | {
              master_brand_id_param: string
              product_id_param?: string
              country_code_param?: string
            }
        Returns: {
          claim_text: string
          claim_type: string
          level: string
          country_code: string
        }[]
      }
      get_brand_details_by_id: {
        Args: { p_brand_id: string }
        Returns: Json
      }
      get_brand_urls: {
        Args: { brand_uuid: string }
        Returns: string[]
      }
      get_claim_countries: {
        Args: { claim_uuid: string }
        Returns: string[]
      }
      get_claim_ingredients: {
        Args: { claim_uuid: string }
        Returns: string[]
      }
      get_claim_products: {
        Args: { claim_uuid: string }
        Returns: string[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_template_input_fields: {
        Args: { template_uuid: string }
        Returns: Json
      }
      get_template_output_fields: {
        Args: { template_uuid: string }
        Returns: Json
      }
      get_user_by_email: {
        Args: { user_email: string }
        Returns: unknown[]
      }
      get_user_details: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_templates: {
        Args: { p_user_id: string; p_brand_id?: string }
        Returns: {
          id: string
          name: string
          description: string
          category: string
          template_structure: Json
          content_type_id: string
          brand_id: string
          created_by: string
          created_at: string
          updated_at: string
          is_active: boolean
          usage_count: number
          brand_name: string
          content_type_name: string
          creator_name: string
        }[]
      }
      has_brand_permission: {
        Args: {
          user_id: string
          target_brand_id: string
          allowed_roles: string[]
        }
        Returns: boolean
      }
      integer_to_uuid: {
        Args: { "": number }
        Returns: string
      }
      is_global_admin: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_event_type: string
          p_details?: Json
          p_user_id?: string
          p_ip_address?: string
        }
        Returns: string
      }
      normalize_website_domain: {
        Args: { url: string }
        Returns: string
      }
      set_user_role_for_all_assigned_brands: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: number
      }
      test_plpgsql_declare: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_brand_with_agencies: {
        Args:
          | {
              p_brand_id_to_update: string
              p_name: string
              p_website_url: string
              p_additional_website_urls: string[]
              p_country: string
              p_language: string
              p_brand_identity: string
              p_tone_of_voice: string
              p_guardrails: string
              p_brand_color: string
              p_master_claim_brand_id: string
              p_selected_agency_ids: string[]
              p_new_custom_agency_names: string[]
              p_user_id: string
            }
          | {
              p_brand_id_to_update: string
              p_name: string
              p_website_url: string
              p_additional_website_urls: string[]
              p_country: string
              p_language: string
              p_brand_identity: string
              p_tone_of_voice: string
              p_guardrails: string
              p_brand_color: string
              p_master_claim_brand_id: string
              p_selected_agency_ids: string[]
              p_new_custom_agency_names: string[]
              p_user_id: string
              p_logo_url?: string
            }
        Returns: Json
      }
      update_content_workflow_status: {
        Args: {
          p_content_id: string
          p_user_id: string
          p_action: string
          p_comments?: string
          p_new_assignee_id?: string
          p_version_data?: Json
        }
        Returns: {
          success: boolean
          error_message: string
          new_status: string
          new_step: number
        }[]
      }
      update_user_details: {
        Args: {
          p_user_id: string
          p_full_name: string
          p_job_title: string
          p_company: string
          p_role?: string
          p_brand_permissions?: Json
        }
        Returns: undefined
      }
      update_workflow_and_handle_invites: {
        Args: {
          p_workflow_id: string
          p_name: string
          p_brand_id: string
          p_steps: Json
          p_template_id: string
          p_description: string
          p_new_invitation_items: Json
        }
        Returns: boolean
      }
      update_workflow_and_handle_invites_invoker_version_temp: {
        Args: {
          p_workflow_id: string
          p_name?: string
          p_brand_id?: string
          p_steps?: Json
          p_template_id?: string
          p_description?: string
          p_new_invitation_items?: Json
        }
        Returns: boolean
      }
    }
    Enums: {
      claim_category_enum:
        | "Quality"
        | "Dairy Base"
        | "Texture"
        | "Specific Ingredients"
        | "Product Quality"
        | "Ingredient Simplicity"
        | "Dietary Restrictions"
        | "Origin of ingredient"
        | "No/No/No"
        | "Stabilisers/Additives"
        | "Heritage"
        | "Craftmanship"
        | "Best consumed"
        | "Coating"
        | "General"
        | "Brand Promise"
        | "Brand Tag Line"
        | "Allergen Information"
        | "Nutritional Information"
        | "Sustainability/Sourcing"
        | "Promotional"
      claim_level_enum: "brand" | "product" | "ingredient"
      claim_type_enum: "allowed" | "disallowed"
      content_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "published"
        | "rejected"
        | "cancelled"
      feedback_priority: "low" | "medium" | "high" | "critical"
      feedback_status:
        | "open"
        | "in_progress"
        | "resolved"
        | "closed"
        | "wont_fix"
      feedback_type: "bug" | "enhancement"
      tool_run_status: "success" | "failure"
      user_brand_role_enum: "admin" | "editor" | "viewer"
      user_role: "admin" | "editor" | "viewer"
      vetting_agency_priority_level: "High" | "Medium" | "Low"
      workflow_status: "active" | "draft" | "archived"
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
      claim_category_enum: [
        "Quality",
        "Dairy Base",
        "Texture",
        "Specific Ingredients",
        "Product Quality",
        "Ingredient Simplicity",
        "Dietary Restrictions",
        "Origin of ingredient",
        "No/No/No",
        "Stabilisers/Additives",
        "Heritage",
        "Craftmanship",
        "Best consumed",
        "Coating",
        "General",
        "Brand Promise",
        "Brand Tag Line",
        "Allergen Information",
        "Nutritional Information",
        "Sustainability/Sourcing",
        "Promotional",
      ],
      claim_level_enum: ["brand", "product", "ingredient"],
      claim_type_enum: ["allowed", "disallowed"],
      content_status: [
        "draft",
        "pending_review",
        "approved",
        "published",
        "rejected",
        "cancelled",
      ],
      feedback_priority: ["low", "medium", "high", "critical"],
      feedback_status: [
        "open",
        "in_progress",
        "resolved",
        "closed",
        "wont_fix",
      ],
      feedback_type: ["bug", "enhancement"],
      tool_run_status: ["success", "failure"],
      user_brand_role_enum: ["admin", "editor", "viewer"],
      user_role: ["admin", "editor", "viewer"],
      vetting_agency_priority_level: ["High", "Medium", "Low"],
      workflow_status: ["active", "draft", "archived"],
    },
  },
} as const
