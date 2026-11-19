/**
 * Types de la base, écrits à la main d'après supabase/migrations.
 * Peut être régénéré : `npx supabase gen types typescript --project-id <ref>`.
 */
export type VatModeDb = 'subject' | 'franchise';
export type QuoteStatusDb = 'draft' | 'sent' | 'accepted' | 'declined';
export type UnitDb = 'u' | 'h' | 'jour' | 'm' | 'm2' | 'm3' | 'kg' | 'forfait' | 'lot';
export type SourceDb = 'manual' | 'ai';
export type VatRateBpDb = 0 | 550 | 1000 | 2000;

/** Ligne envoyée à save_quote_draft (p_lines). */
// `type` (et non `interface`) pour rester assignable au type Json de l'appel RPC.
export type QuoteLinePayload = {
  designation: string;
  /** Décimal en chaîne, point comme séparateur ("2.5"). */
  quantity: string;
  unit: UnitDb;
  unit_price_cents: number;
  vat_rate_bp: VatRateBpDb;
  source: SourceDb;
  price_item_id: string | null;
};

export type NewClientPayload = {
  name: string;
  email: string;
  address: string;
};

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          user_id: string;
          name: string;
          siret: string;
          address: string;
          phone: string;
          vat_mode: VatModeDb;
          logo_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          siret: string;
          address: string;
          phone: string;
          vat_mode: VatModeDb;
          logo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          name?: string;
          siret?: string;
          address?: string;
          phone?: string;
          vat_mode?: VatModeDb;
          logo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          email?: string | null;
          address?: string | null;
        };
        Update: { name?: string; email?: string | null; address?: string | null };
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          number: string;
          status: QuoteStatusDb;
          title: string;
          site_address: string;
          description: string | null;
          issue_date: string;
          validity_days: number;
          vat_mode: VatModeDb;
          source: SourceDb;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      quote_lines: {
        Row: {
          id: string;
          quote_id: string;
          user_id: string;
          position: number;
          designation: string;
          quantity: number;
          unit: UnitDb;
          unit_price_cents: number;
          vat_rate_bp: VatRateBpDb;
          source: SourceDb;
          price_item_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      quote_summaries: {
        Row: {
          id: string;
          number: string;
          status: QuoteStatusDb;
          title: string;
          issue_date: string;
          updated_at: string;
          client_name: string;
          total_ht_cents: number;
          total_vat_cents: number;
          total_ttc_cents: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      save_quote_draft: {
        Args: {
          p_quote_id: string | null;
          p_client_id: string | null;
          p_new_client: Json | null;
          p_title: string;
          p_site_address: string;
          p_description: string;
          p_validity_days: number;
          p_lines: Json;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
