export interface User {
  id: string
  username: string
  created_at: string
  dify_user_id?: string
}

export interface Assistant {
  id: string
  name: string
  description: string
  dify_api_key?: string
  dify_base_url: string
  status: string
  icon_name?: string
  created_at: string
  updated_at: string
  key_ref?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: number
}

export interface Conversation {
  id: string
  name: string
  created_at: number
  updated_at: number
}
