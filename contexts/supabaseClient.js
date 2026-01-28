import { createClient } from "@supabase/supabase-js";

// Hardcode temporarily to test connection
const supabaseUrl = "https://gneisngrdqmugibdmzig.supabase.co";
const supabaseAnonKey = "sb_publishable_ABCwGUZjk2CqMQPY3s1sVw_UlF9qQjH";

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
