import type { AdminSettings, StreamLink, Team } from './types';

export type Json = any;

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
          streamLinks: StreamLink[]
          team1: Team
          team2: Team
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
          streamLinks: StreamLink[]
          team1: Team
          team2: Team
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
          streamLinks?: StreamLink[]
          team1?: Team
          team2?: Team
          time?: string | null
        }
      }
      settings: {
        Row: {
          id: number
          settings_data: AdminSettings
          updated_at: string | null
        }
        Insert: {
          id: number
          settings_data: AdminSettings
          updated_at?: string | null
        }
        Update: {
          id?: number
          settings_data?: AdminSettings
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
