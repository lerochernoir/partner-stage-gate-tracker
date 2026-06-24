import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";

export async function writeAuditEvent(
  supabase: SupabaseClient,
  input: {
    actorUserId: string;
    entityType: string;
    entityId?: string;
    action: string;
    oldValue?: Json;
    newValue?: Json;
  },
) {
  await supabase.from("audit_events").insert({
    actor_user_id: input.actorUserId,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
  });
}
