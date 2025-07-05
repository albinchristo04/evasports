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
      deleted_matches: {
        Row: {
          deleted_at: string
          sourceMatchId: string
          sourceUrl: string
        }
        Insert: {
          deleted_at: string
          sourceMatchId: string
          sourceUrl: string
        }
        Update: {
          deleted_at?: string
          sourceMatchId?: string
          sourceUrl?: string
        }
      }
      matches: {
        Row: {
          date: string
          group: string | null
          id: string
          leagueName: string
          round: string | null
          score1: number | null
          score2: number | null
          sourceMatchId: string | null
          sourceUrl: string | null
          status: string
          streamLinks: Json
          team1: Json
          team2: Json
          time: string | null
        }
        Insert: {
          date: string
          group?: string | null
          id: string
          leagueName: string
          round?: string | null
          score1?: number | null
          score2?: number | null
          sourceMatchId?: string | null
          sourceUrl?: string | null
          status: string
          streamLinks: Json
          team1: Json
          team2: Json
          time?: string | null
        }
        Update: {
          date?: string
          group?: string | null
          id?: string
          leagueName?: string
          round?: string | null
          score1?: number | null
          score2?: number | null
          sourceMatchId?: string | null
          sourceUrl?: string | null
          status?: string
          streamLinks?: Json
          team1?: Json
          team2?: Json
          time?: string | null
        }
      }
      settings: {
        Row: {
          id: number
          settings_data: Json
          updated_at: string | null
        }
        Insert: {
          id: number
          settings_data: Json
          updated_at?: string | null
        }
        Update: {
          id?: number
          settings_data?: Json
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
