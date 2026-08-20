import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kshvjvpwidxikxymfyki.supabase.co";
const supabasePublishableKey = "sb_publishable_FC24HHWobuDMszZ_MUCx5Q_Qo6BNfy7";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
