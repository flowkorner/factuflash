/**
 * Types de la base, écrits à la main d'après supabase/migrations.
 * Peut être régénéré : `npx supabase gen types typescript --project-id <ref>`.
 */
export type VatModeDb = 'subject' | 'franchise';
export type QuoteStatusDb = 'draft' | 'sent' | 'accepted' | 'declined' | 'deposit_paid';
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
          public_token_hash: string | null;
          snapshot: Json | null;
          sent_at: string | null;
          last_sent_at: string | null;
          sent_to_email: string | null;
          accepted_at: string | null;
          accepted_by_name: string | null;
          deposit_percent: number;
          deposit_cents: number | null;
          deposit_paid_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      quote_payments: {
        Row: {
          id: string;
          quote_id: string;
          user_id: string;
          stripe_checkout_session_id: string;
          stripe_payment_intent_id: string | null;
          amount_cents: number;
          currency: string;
          paid_at: string;
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
          sent_at: string | null;
          accepted_at: string | null;
          deposit_percent: number;
          deposit_cents: number | null;
          deposit_paid_cents: number;
          deposit_paid_at: string | null;
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
      build_quote_snapshot: {
        Args: { p_quote_id: string };
        Returns: Json;
      };
      send_quote: {
        Args: {
          p_quote_id: string;
          p_token_hash: string;
          p_recipient_email: string;
          p_mentions: Json;
          p_deposit_percent: number;
        };
        Returns: Json;
      };
      prepare_deposit_checkout: {
        Args: { p_token: string };
        Returns: Json;
      };
      record_deposit_payment: {
        Args: {
          p_secret: string;
          p_quote_id: string;
          p_session_id: string;
          p_payment_intent_id: string | null;
          p_amount_cents: number;
          p_currency: string;
        };
        Returns: string;
      };
      get_public_quote: {
        Args: { p_token: string };
        Returns: Json;
      };
      accept_public_quote: {
        Args: { p_token: string; p_name: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
