import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side admin client (uses service role key — never expose to browser)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Browser client (anon key — safe for the client)
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(url, key)
}

export type Lead = {
  id: string
  campaign_id: string
  company_name: string
  sector: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  google_maps_url: string | null
  address: string | null
  opening_hours: string | null
  business_type: string | null
  website_url: string | null
  rating: number | null
  review_count: number | null
  popularity_score: number | null
  status: 'found' | 'sent' | 'opened' | 'replied' | 'interested' | 'not_interested'
  notes: string
  email_sent_at: string | null
  email_opened_at: string | null
  email_replied_at: string | null
  tracking_id: string
  created_at: string
}

export type Campaign = {
  id: string
  name: string
  category: string
  city: string
  status: 'active' | 'paused' | 'completed'
  leads_found: number
  emails_sent: number
  emails_opened: number
  emails_replied: number
  daily_limit: number
  created_at: string
}

export type EmailTemplate = {
  id: string
  name: string
  subject: string
  body: string
  is_default: boolean
  created_at: string
}
