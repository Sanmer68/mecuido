import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vghtylgmbujwfjnbvdhb.supabase.co'
const supabaseAnonKey = 'sb_publishable_d9uCYzxtNOPhJRVhAYoQBw_5uvK8iBv'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)