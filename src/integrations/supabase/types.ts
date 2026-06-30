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
      automatic_promotions: {
        Row: {
          category_id: string | null
          created_at: string
          days_of_week: number[]
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          min_order_value: number
          name: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          discount_type: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_order_value?: number
          name: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_order_value?: number
          name?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          prep_time_minutes: number | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          prep_time_minutes?: number | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          prep_time_minutes?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      combo_step_items: {
        Row: {
          created_at: string
          extra_price: number
          id: string
          product_id: string
          size_id: string | null
          step_id: string
        }
        Insert: {
          created_at?: string
          extra_price?: number
          id?: string
          product_id: string
          size_id?: string | null
          step_id: string
        }
        Update: {
          created_at?: string
          extra_price?: number
          id?: string
          product_id?: string
          size_id?: string | null
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_step_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_step_items_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "pizza_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_step_items_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "combo_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_steps: {
        Row: {
          created_at: string
          id: string
          max_choices: number
          min_choices: number
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_choices?: number
          min_choices?: number
          name: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          max_choices?: number
          min_choices?: number
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_steps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_value: number
          uses: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_value?: number
          uses?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_value?: number
          uses?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customer_otp: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      customer_sessions: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          last_used_at: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at: string
          id?: string
          last_used_at?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          last_used_at?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          name: string | null
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          name?: string | null
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          name?: string | null
          phone?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: Json | null
          change_for: number | null
          coupon_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          discount_applied: number
          id: string
          items: Json
          notes: string | null
          payment_method: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          type: Database["public"]["Enums"]["order_type"]
        }
        Insert: {
          address?: Json | null
          change_for?: number | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          discount_applied?: number
          id?: string
          items: Json
          notes?: string | null
          payment_method: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          type?: Database["public"]["Enums"]["order_type"]
        }
        Update: {
          address?: Json | null
          change_for?: number | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          discount_applied?: number
          id?: string
          items?: Json
          notes?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          type?: Database["public"]["Enums"]["order_type"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_crusts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      pizza_flavor_prices: {
        Row: {
          created_at: string
          id: string
          price: number
          product_id: string
          size_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number
          product_id: string
          size_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          size_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pizza_flavor_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pizza_flavor_prices_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "pizza_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_sizes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_flavors: number
          name: string
          slices: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_flavors?: number
          name: string
          slices?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_flavors?: number
          name?: string
          slices?: number
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          addons: Json
          category_id: string | null
          combo_items: Json
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          sort_order: number
        }
        Insert: {
          addons?: Json
          category_id?: string | null
          combo_items?: Json
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          sort_order?: number
        }
        Update: {
          addons?: Json
          category_id?: string | null
          combo_items?: Json
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          address: string | null
          auto_print_enabled: boolean
          cashier_printer_name: string | null
          delivery_fee: number
          hero_image_url: string | null
          id: string
          is_open: boolean
          kitchen_printer_name: string | null
          logo_url: string | null
          min_order: number
          name: string
          opening_hours: Json
          pix_key: string | null
          primary_color: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string | null
          auto_print_enabled?: boolean
          cashier_printer_name?: string | null
          delivery_fee?: number
          hero_image_url?: string | null
          id?: string
          is_open?: boolean
          kitchen_printer_name?: string | null
          logo_url?: string | null
          min_order?: number
          name?: string
          opening_hours?: Json
          pix_key?: string | null
          primary_color?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          address?: string | null
          auto_print_enabled?: boolean
          cashier_printer_name?: string | null
          delivery_fee?: number
          hero_image_url?: string | null
          id?: string
          is_open?: boolean
          kitchen_printer_name?: string | null
          logo_url?: string | null
          min_order?: number
          name?: string
          opening_hours?: Json
          pix_key?: string | null
          primary_color?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
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
      whatsapp_integration: {
        Row: {
          api_key: string | null
          base_url: string | null
          id: string
          instance: string | null
          is_enabled: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          id?: string
          instance?: string | null
          is_enabled?: boolean
          provider?: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          id?: string
          instance?: string | null
          is_enabled?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "kitchen"
      category_kind: "regular" | "pizza" | "pizza_doce" | "combo"
      order_status:
        | "new"
        | "preparing"
        | "out_for_delivery"
        | "done"
        | "cancelled"
      order_type: "delivery" | "pickup"
      product_type: "simple" | "pizza_flavor" | "combo"
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
      app_role: ["admin", "kitchen"],
      category_kind: ["regular", "pizza", "pizza_doce", "combo"],
      order_status: [
        "new",
        "preparing",
        "out_for_delivery",
        "done",
        "cancelled",
      ],
      order_type: ["delivery", "pickup"],
      product_type: ["simple", "pizza_flavor", "combo"],
    },
  },
} as const
