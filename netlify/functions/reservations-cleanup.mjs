/**
 * Scheduled: releases stock held by orders that were never paid.
 *
 * The webhook handles the normal endings — settled, cancelled, expired. This
 * is the safety net for the abnormal ones: a shopper who closed the tab
 * mid-payment, or a notification that never arrived. Without it, an abandoned
 * checkout would quietly hold the last unit of a piece forever.
 *
 * Schedule is declared below and applied by Netlify on deploy.
 */

import { ok, serverError } from "./_lib/http.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { isSupabaseConfigured } from "./_lib/env.mjs";

export default async () => {
  if (!isSupabaseConfigured()) {
    console.warn("[reservations-cleanup] skipped: Supabase not configured");
    return ok({ released_orders: 0, skipped: true });
  }

  try {
    const { data, error } = await getServiceClient().rpc("expire_stale_reservations");
    if (error) throw error;

    const released = Number(data) || 0;
    if (released > 0) console.log(`[reservations-cleanup] released ${released} stale order(s)`);

    return ok({ released_orders: released });
  } catch (error) {
    return serverError("reservations-cleanup", error);
  }
};

export const config = {
  // Every ten minutes. Reservations live 30 minutes by default, so nothing is
  // ever held much beyond its expiry.
  schedule: "*/10 * * * *"
};
