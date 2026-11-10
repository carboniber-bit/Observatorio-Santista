// Tipos do banco escritos A MAO (supabase gen types nao roda neste ambiente).
// Regenere com: supabase gen types typescript --local > lib/db/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      candidates: {
        Row: {
          id: string
          slug: string
          name: string
          ticket_name: string | null
          vice: string | null
          status: string
          bio: string | null
          club_history: string | null
          trajectory: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          ticket_name?: string | null
          vice?: string | null
          status?: string
          bio?: string | null
          club_history?: string | null
          trajectory?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          ticket_name?: string | null
          vice?: string | null
          status?: string
          bio?: string | null
          club_history?: string | null
          trajectory?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          id: string
          slug: string
          name: string
          position: number
        }
        Insert: {
          id?: string
          slug: string
          name: string
          position: number
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      proposals: {
        Row: {
          id: string
          candidate_id: string
          theme_id: string
          description: string
          source_kind: string
          reference_year: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          theme_id: string
          description: string
          source_kind: string
          reference_year?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          theme_id?: string
          description?: string
          source_kind?: string
          reference_year?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          id: string
          proposal_id: string
          url: string
          outlet: string | null
          published_on: string | null
          consulted_on: string | null
          kind: string | null
          excerpt: string | null
        }
        Insert: {
          id?: string
          proposal_id: string
          url: string
          outlet?: string | null
          published_on?: string | null
          consulted_on?: string | null
          kind?: string | null
          excerpt?: string | null
        }
        Update: {
          id?: string
          proposal_id?: string
          url?: string
          outlet?: string | null
          published_on?: string | null
          consulted_on?: string | null
          kind?: string | null
          excerpt?: string | null
        }
        Relationships: []
      }
      news: {
        Row: {
          id: string
          slug: string
          title: string
          body: string
          category: string
          badge: string
          source_url: string | null
          status: string
          published_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          body: string
          category: string
          badge: string
          source_url?: string | null
          status?: string
          published_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          body?: string
          category?: string
          badge?: string
          source_url?: string | null
          status?: string
          published_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      analyses: {
        Row: {
          id: string
          slug: string
          title: string
          facts: string
          candidate_statements: string
          editorial_interpretation: string
          status: string
          published_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          facts: string
          candidate_statements: string
          editorial_interpretation: string
          status?: string
          published_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          facts?: string
          candidate_statements?: string
          editorial_interpretation?: string
          status?: string
          published_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      change_log: {
        Row: {
          id: string
          table_name: string
          row_id: string | null
          old_value: Json | null
          new_value: Json | null
          changed_at: string
          reason: string | null
          source_id: string | null
          author: string | null
        }
        Insert: {
          id?: string
          table_name: string
          row_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          changed_at?: string
          reason?: string | null
          source_id?: string | null
          author?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          row_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          changed_at?: string
          reason?: string | null
          source_id?: string | null
          author?: string | null
        }
        Relationships: []
      }
      correction_requests: {
        Row: {
          id: string
          body: string
          link: string | null
          email: string | null
          status: string
          handled_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          body: string
          link?: string | null
          email?: string | null
          status?: string
          handled_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          body?: string
          link?: string | null
          email?: string | null
          status?: string
          handled_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      vote_events: {
        Row: {
          id: string
          candidate_id: string | null
          is_socio: boolean
          flag: string
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id?: string | null
          is_socio: boolean
          flag?: string
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string | null
          is_socio?: boolean
          flag?: string
          created_at?: string
        }
        Relationships: []
      }
      vote_hashes: {
        Row: {
          vote_id: string
          voter_hash: string
          created_at: string
        }
        Insert: {
          vote_id: string
          voter_hash: string
          created_at?: string
        }
        Update: {
          vote_id?: string
          voter_hash?: string
          created_at?: string
        }
        Relationships: []
      }
      voter_tokens: {
        Row: {
          token_hash: string
          created_at: string
        }
        Insert: {
          token_hash: string
          created_at?: string
        }
        Update: {
          token_hash?: string
          created_at?: string
        }
        Relationships: []
      }
      admin_allowlist: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
