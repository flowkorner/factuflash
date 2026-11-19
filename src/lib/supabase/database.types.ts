/**
 * Types de la base, écrits à la main d'après supabase/migrations.
 * Peut être régénéré : `npx supabase gen types typescript --project-id <ref>`.
 */
export type VatModeDb = 'subject' | 'franchise';

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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
