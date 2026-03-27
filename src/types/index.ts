export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  description: string
  category: string
  date: string
  created_at: string
}

export interface FinancialGoal {
  id: string
  user_id: string
  title: string
  target_amount: number
  current_amount: number
  deadline: string
  created_at: string
}
