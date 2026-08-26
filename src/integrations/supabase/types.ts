export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_managers: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          public_ref: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          public_ref: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          public_ref?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      assessment_notifications: {
        Row: {
          assessment_id: string
          attempts: number
          created_at: string
          error: string | null
          id: string
          kind: string
          recipient_email: string | null
          recipient_type: string | null
          report_html: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          recipient_email?: string | null
          recipient_type?: string | null
          report_html?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          recipient_email?: string | null
          recipient_type?: string | null
          report_html?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_notifications_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          answers: Json
          assessment_id: string
          created_at: string
          id: string
          section: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          assessment_id: string
          created_at?: string
          id?: string
          section: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          assessment_id?: string
          created_at?: string
          id?: string
          section?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          account_manager_id: string | null
          company_name: string | null
          completed_at: string | null
          consent_at: string | null
          continuity_score: number | null
          coverage_percentage: number | null
          created_at: string
          current_step: number
          edit_token: string
          endpoint_score: number | null
          findings: Json | null
          id: string
          identity_score: number | null
          maturity_level: string | null
          methodology_version: string
          network_score: number | null
          notification_error: string | null
          notification_sent_at: string | null
          notification_status: string
          overall_score: number | null
          priority_domain: string | null
          priority_domain_label: string | null
          privacy_notice_version: string | null
          public_ref: string | null
          respondent_email: string | null
          respondent_name: string | null
          respondent_role: string | null
          scoring_snapshot: Json | null
          sector: string | null
          source: string | null
          started_at: string
          status: string
          units_count: number | null
          updated_at: string
          users_count: number | null
        }
        Insert: {
          account_manager_id?: string | null
          company_name?: string | null
          completed_at?: string | null
          consent_at?: string | null
          continuity_score?: number | null
          coverage_percentage?: number | null
          created_at?: string
          current_step?: number
          edit_token: string
          endpoint_score?: number | null
          findings?: Json | null
          id?: string
          identity_score?: number | null
          maturity_level?: string | null
          methodology_version?: string
          network_score?: number | null
          notification_error?: string | null
          notification_sent_at?: string | null
          notification_status?: string
          overall_score?: number | null
          priority_domain?: string | null
          priority_domain_label?: string | null
          privacy_notice_version?: string | null
          public_ref?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_role?: string | null
          scoring_snapshot?: Json | null
          sector?: string | null
          source?: string | null
          started_at?: string
          status?: string
          units_count?: number | null
          updated_at?: string
          users_count?: number | null
        }
        Update: {
          account_manager_id?: string | null
          company_name?: string | null
          completed_at?: string | null
          consent_at?: string | null
          continuity_score?: number | null
          coverage_percentage?: number | null
          created_at?: string
          current_step?: number
          edit_token?: string
          endpoint_score?: number | null
          findings?: Json | null
          id?: string
          identity_score?: number | null
          maturity_level?: string | null
          methodology_version?: string
          network_score?: number | null
          notification_error?: string | null
          notification_sent_at?: string | null
          notification_status?: string
          overall_score?: number | null
          priority_domain?: string | null
          priority_domain_label?: string | null
          privacy_notice_version?: string | null
          public_ref?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_role?: string | null
          scoring_snapshot?: Json | null
          sector?: string | null
          source?: string | null
          started_at?: string
          status?: string
          units_count?: number | null
          updated_at?: string
          users_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "account_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "admin" | "manager" | "account_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "account_manager"],
    },
  },
} as const
