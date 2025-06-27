export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface ExpenseFormData {
  amount: string;
  description: string;
  category: string;
  date: string;
}

export interface ReceiptData {
  amount: number;
  description: string;
  category: string;
  date: string;
  vendor?: string;
  confidence: number;
}

export interface Receipt {
  id: string;
  user_id: string;
  expense_id?: string;
  image_url: string;
  original_filename: string;
  extracted_data: ReceiptData;
  raw_text?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  expenseCount: number;
  categoryBreakdown: CategorySummary[];
}

export interface CategorySummary {
  category: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

export interface FilterOptions {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'date' | 'amount' | 'category';
  sortOrder?: 'asc' | 'desc';
}

// Authentication types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
  confirmPassword: string;
}
