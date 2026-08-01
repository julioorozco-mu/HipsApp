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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academy_settings: {
        Row: {
          academy_name: string
          created_at: string
          id: boolean
          timezone: string
          updated_at: string
          whatsapp_max_delay_seconds: number
          whatsapp_min_delay_seconds: number
        }
        Insert: {
          academy_name?: string
          created_at?: string
          id?: boolean
          timezone?: string
          updated_at?: string
          whatsapp_max_delay_seconds?: number
          whatsapp_min_delay_seconds?: number
        }
        Update: {
          academy_name?: string
          created_at?: string
          id?: boolean
          timezone?: string
          updated_at?: string
          whatsapp_max_delay_seconds?: number
          whatsapp_min_delay_seconds?: number
        }
        Relationships: []
      }
      attendance: {
        Row: {
          id: string
          marked_at: string
          marked_by: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          id?: string
          marked_at?: string
          marked_by?: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          id?: string
          marked_at?: string
          marked_by?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          attendance_saved_at: string | null
          class_id: string
          created_at: string
          finished_at: string | null
          id: string
          instructor_id: string | null
          notes: string | null
          playlist_url: string | null
          starts_at: string
          status: Database["public"]["Enums"]["class_session_status"]
        }
        Insert: {
          attendance_saved_at?: string | null
          class_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          instructor_id?: string | null
          notes?: string | null
          playlist_url?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["class_session_status"]
        }
        Update: {
          attendance_saved_at?: string | null
          class_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          instructor_id?: string | null
          notes?: string | null
          playlist_url?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["class_session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          active: boolean
          created_at: string
          duration_minutes: number
          id: string
          instructor_id: string | null
          name: string
          playlist_id: string | null
          start_time: string
          weekday: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          name: string
          playlist_id?: string | null
          start_time: string
          weekday: number
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          name?: string
          playlist_id?: string | null
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          active: boolean
          created_at: string
          duration_days: number
          id: string
          kind: Database["public"]["Enums"]["membership_plan_kind"]
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_days: number
          id?: string
          kind: Database["public"]["Enums"]["membership_plan_kind"]
          name: string
          price: number
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_days?: number
          id?: string
          kind?: Database["public"]["Enums"]["membership_plan_kind"]
          name?: string
          price?: number
        }
        Relationships: []
      }
      memberships: {
        Row: {
          cancelled_at: string | null
          created_at: string
          fecha_inicio: string
          fecha_vencimiento: string
          id: string
          plan_id: string
          student_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          fecha_inicio: string
          fecha_vencimiento: string
          id?: string
          plan_id: string
          student_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          fecha_inicio?: string
          fecha_vencimiento?: string
          id?: string
          plan_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      message_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          max_delay_seconds: number
          min_delay_seconds: number
          session_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["message_batch_status"]
          template_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_delay_seconds?: number
          min_delay_seconds?: number
          session_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["message_batch_status"]
          template_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_delay_seconds?: number
          min_delay_seconds?: number
          session_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["message_batch_status"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_batches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_batches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_batches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_recipients: {
        Row: {
          batch_id: string
          error: string | null
          id: string
          phone: string
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          student_id: string | null
        }
        Insert: {
          batch_id: string
          error?: string | null
          id?: string
          phone: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          student_id?: string | null
        }
        Update: {
          batch_id?: string
          error?: string | null
          id?: string
          phone?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_recipients_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "message_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_recipients_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_recipients_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          id: string
          membership_id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          recorded_by: string | null
          student_id: string
        }
        Insert: {
          amount: number
          id?: string
          membership_id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          recorded_by?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          id?: string
          membership_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          recorded_by?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "student_overview"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_tracks: {
        Row: {
          artist: string | null
          bpm: number | null
          duration_seconds: number | null
          external_url: string | null
          genre: string | null
          id: string
          playlist_id: string
          position: number
          title: string
        }
        Insert: {
          artist?: string | null
          bpm?: number | null
          duration_seconds?: number | null
          external_url?: string | null
          genre?: string | null
          id?: string
          playlist_id: string
          position: number
          title: string
        }
        Update: {
          artist?: string | null
          bpm?: number | null
          duration_seconds?: number | null
          external_url?: string | null
          genre?: string | null
          id?: string
          playlist_id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          active: boolean
          created_at: string
          external_url: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          external_url?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          external_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_class_streak: number
          email: string
          full_name: string
          highest_class_streak: number
          id: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_class_streak?: number
          email: string
          full_name: string
          highest_class_streak?: number
          id: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_class_streak?: number
          email?: string
          full_name?: string
          highest_class_streak?: number
          id?: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          active: boolean
          correo: string | null
          cumpleanos: string | null
          current_streak: number
          fecha_registro: string
          highest_streak: number
          id: string
          nombre: string
          objetivo_peso_grasa: number | null
          telefono: string
        }
        Insert: {
          active?: boolean
          correo?: string | null
          cumpleanos?: string | null
          current_streak?: number
          fecha_registro?: string
          highest_streak?: number
          id?: string
          nombre: string
          objetivo_peso_grasa?: number | null
          telefono: string
        }
        Update: {
          active?: boolean
          correo?: string | null
          cumpleanos?: string | null
          current_streak?: number
          fecha_registro?: string
          highest_streak?: number
          id?: string
          nombre?: string
          objetivo_peso_grasa?: number | null
          telefono?: string
        }
        Relationships: []
      }
    }
    Views: {
      session_overview: {
        Row: {
          absent_count: number | null
          attendance_saved_at: string | null
          class_id: string | null
          class_name: string | null
          finished_at: string | null
          id: string | null
          instructor_id: string | null
          playlist_url: string | null
          present_count: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["class_session_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_overview: {
        Row: {
          active: boolean | null
          attendance_count: number | null
          correo: string | null
          cumpleanos: string | null
          current_streak: number | null
          fecha_registro: string | null
          fecha_vencimiento: string | null
          highest_streak: number | null
          id: string | null
          membership_id: string | null
          membership_status: string | null
          nombre: string | null
          objetivo_peso_grasa: number | null
          plan_name: string | null
          telefono: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      finish_class_session: {
        Args: { p_playlist_url?: string; p_session_id: string }
        Returns: undefined
      }
      register_membership_payment: {
        Args: {
          p_method: Database["public"]["Enums"]["payment_method"]
          p_plan_id: string
          p_student_id: string
        }
        Returns: {
          cancelled_at: string | null
          created_at: string
          fecha_inicio: string
          fecha_vencimiento: string
          id: string
          plan_id: string
          student_id: string
        }
        SetofOptions: {
          from: "*"
          to: "memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_attendance: {
        Args: { p_absent: string[]; p_present: string[]; p_session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status: "presente" | "ausente"
      class_session_status:
        | "programada"
        | "en_curso"
        | "completada"
        | "cancelada"
      membership_plan_kind: "mensual" | "clase_suelta"
      message_batch_status:
        | "pendiente"
        | "procesando"
        | "pausado"
        | "completado"
        | "fallido"
      message_status: "pendiente" | "enviado" | "fallido" | "cancelado"
      payment_method: "efectivo" | "transferencia" | "tarjeta"
      staff_role: "instructor" | "admin"
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
      attendance_status: ["presente", "ausente"],
      class_session_status: [
        "programada",
        "en_curso",
        "completada",
        "cancelada",
      ],
      membership_plan_kind: ["mensual", "clase_suelta"],
      message_batch_status: [
        "pendiente",
        "procesando",
        "pausado",
        "completado",
        "fallido",
      ],
      message_status: ["pendiente", "enviado", "fallido", "cancelado"],
      payment_method: ["efectivo", "transferencia", "tarjeta"],
      staff_role: ["instructor", "admin"],
    },
  },
} as const
