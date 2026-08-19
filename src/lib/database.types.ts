// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Once the project is linked, replace with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type UserRole = "owner" | "manager" | "staff";
export type ItemCategory = "spirits" | "beer" | "wine" | "mixer" | "garnish" | "consumable";
export type MovementType = "in" | "out";
export type MovementReason = "restock" | "usage" | "waste" | "adjustment";
export type TaskStatus = "open" | "in_progress" | "done";
export type RecurrenceType = "daily" | "weekly" | "none";
export type ChecklistType = "opening" | "closing" | "weekly" | "monthly";
export type SubmissionStatus = "draft" | "submitted" | "approved";
export type QuizQuestionType = "multiple_choice" | "short_answer";
export type TrainingStatus = "not_started" | "in_progress" | "passed";

export interface ChecklistTemplateItem {
  text: string;
  requires_photo: boolean;
  category: string;
}

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      outlets: Table<
        { id: string; name: string; address: string | null; created_at: string },
        { id?: string; name: string; address?: string | null }
      >;
      users: Table<
        {
          id: string;
          name: string;
          role: UserRole;
          outlet_id: string | null;
          email: string;
          is_active: boolean;
          created_at: string;
        },
        {
          id: string;
          name: string;
          role?: UserRole;
          outlet_id?: string | null;
          email: string;
          is_active?: boolean;
        }
      >;
      suppliers: Table<
        {
          id: string;
          name: string;
          contact: string | null;
          category: string | null;
          notes: string | null;
          created_at: string;
        },
        { id?: string; name: string; contact?: string | null; category?: string | null; notes?: string | null }
      >;
      supplier_price_history: Table<
        {
          id: string;
          supplier_id: string;
          item_id: string;
          price: number;
          valid_from: string;
          created_at: string;
        },
        { id?: string; supplier_id: string; item_id: string; price: number; valid_from?: string }
      >;
      inventory_items: Table<
        {
          id: string;
          name: string;
          category: ItemCategory;
          unit: string;
          par_level: number;
          current_stock: number;
          purchase_price: number | null;
          outlet_id: string;
          is_perishable: boolean;
          default_supplier_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          name: string;
          category: ItemCategory;
          unit: string;
          par_level?: number;
          current_stock?: number;
          purchase_price?: number | null;
          outlet_id: string;
          is_perishable?: boolean;
          default_supplier_id?: string | null;
        }
      >;
      stock_movements: Table<
        {
          id: string;
          item_id: string;
          type: MovementType;
          quantity: number;
          reason: MovementReason;
          user_id: string;
          date: string;
          notes: string | null;
          expiry_date: string | null;
          supplier_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          item_id: string;
          type: MovementType;
          quantity: number;
          reason: MovementReason;
          user_id: string;
          date?: string;
          notes?: string | null;
          expiry_date?: string | null;
          supplier_id?: string | null;
        }
      >;
      menu_items: Table<
        { id: string; name: string; sale_price: number; created_at: string },
        { id?: string; name: string; sale_price: number }
      >;
      recipes: Table<
        { id: string; menu_item_id: string; inventory_item_id: string; amount: number; created_at: string },
        { id?: string; menu_item_id: string; inventory_item_id: string; amount: number }
      >;
      tasks: Table<
        {
          id: string;
          title: string;
          description: string | null;
          assigned_to: string | null;
          status: TaskStatus;
          due_date: string | null;
          recurrence: RecurrenceType;
          outlet_id: string;
          created_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          title: string;
          description?: string | null;
          assigned_to?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          recurrence?: RecurrenceType;
          outlet_id: string;
          created_by?: string | null;
        }
      >;
      checklist_templates: Table<
        {
          id: string;
          name: ChecklistType;
          outlet_id: string;
          items: ChecklistTemplateItem[];
          created_at: string;
        },
        { id?: string; name: ChecklistType; outlet_id: string; items?: ChecklistTemplateItem[] }
      >;
      checklist_submissions: Table<
        {
          id: string;
          template_id: string;
          user_id: string;
          date: string;
          period_start: string;
          shift: string | null;
          cash_count: number | null;
          incident_notes: string | null;
          status: SubmissionStatus;
          created_at: string;
          submitted_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
        },
        {
          id?: string;
          template_id: string;
          user_id: string;
          date?: string;
          period_start?: string;
          shift?: string | null;
          cash_count?: number | null;
          incident_notes?: string | null;
          status?: SubmissionStatus;
          submitted_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
        }
      >;
      checklist_item_results: Table<
        {
          id: string;
          submission_id: string;
          item_text: string;
          checked: boolean;
          photo_url: string | null;
          photo_taken_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          submission_id: string;
          item_text: string;
          checked?: boolean;
          photo_url?: string | null;
          photo_taken_at?: string | null;
        }
      >;
      training_modules: Table<
        {
          id: string;
          menu_item_id: string | null;
          title: string;
          video_url: string | null;
          description: string | null;
          created_by: string | null;
          uploaded_at: string;
        },
        {
          id?: string;
          menu_item_id?: string | null;
          title: string;
          video_url?: string | null;
          description?: string | null;
          created_by?: string | null;
        }
      >;
      quiz_questions: Table<
        {
          id: string;
          training_module_id: string;
          question: string;
          type: QuizQuestionType;
          options: unknown;
          correct_answer: string;
          created_at: string;
        },
        {
          id?: string;
          training_module_id: string;
          question: string;
          type: QuizQuestionType;
          options?: unknown;
          correct_answer: string;
        }
      >;
      staff_training_progress: Table<
        {
          id: string;
          user_id: string;
          training_module_id: string;
          status: TrainingStatus;
          last_score: number | null;
          passed_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          training_module_id: string;
          status?: TrainingStatus;
          last_score?: number | null;
          passed_at?: string | null;
        }
      >;
      handover_notes: Table<
        {
          id: string;
          outlet_id: string;
          user_id: string;
          shift: string | null;
          date: string;
          content: string;
          read_by_next_shift: boolean;
          created_at: string;
        },
        {
          id?: string;
          outlet_id: string;
          user_id: string;
          shift?: string | null;
          date?: string;
          content: string;
          read_by_next_shift?: boolean;
        }
      >;
      audit_log: Table<
        {
          id: string;
          user_id: string | null;
          action: string;
          related_table: string | null;
          timestamp: string;
          change_detail: unknown;
        },
        {
          id?: string;
          user_id?: string | null;
          action: string;
          related_table?: string | null;
          change_detail?: unknown;
        }
      >;
      handbook_sections: Table<
        {
          id: string;
          outlet_id: string;
          category: string;
          title: string;
          body: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        },
        {
          id?: string;
          outlet_id: string;
          category?: string;
          title: string;
          body?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      current_user_outlet: { Args: Record<string, never>; Returns: string };
      submit_quiz_attempt: {
        Args: { p_module_id: string; p_answers: Record<string, string> };
        Returns: { score: number; passed: boolean }[];
      };
      get_quiz_questions: {
        Args: { p_module_id: string };
        Returns: { id: string; question: string; type: QuizQuestionType; options: unknown }[];
      };
    };
    Enums: {
      user_role: UserRole;
      item_category: ItemCategory;
      movement_type: MovementType;
      movement_reason: MovementReason;
      task_status: TaskStatus;
      recurrence_type: RecurrenceType;
      checklist_type: ChecklistType;
      submission_status: SubmissionStatus;
      quiz_question_type: QuizQuestionType;
      training_status: TrainingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
