export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = any

export type TablesInsert<T extends string> = any

export type TablesUpdate<T extends string> = any

export type Enums<T extends string> = any

// Temporary type definitions until proper types can be regenerated
// This file should be regenerated using: npx supabase gen types typescript --local > src/types/supabase.ts
// when the local Supabase instance is running