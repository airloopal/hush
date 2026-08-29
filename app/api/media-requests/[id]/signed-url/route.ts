import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserResult } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

/**
 * GET /api/media-requests/[id]/signed-url
 *
 * The only path fulfilled media is ever retrieved through — the storage
 * bucket is private and nothing in the app ever constructs a public URL
 * for it. RLS on media_requests already scopes the lookup to the
 * buyer/creator/staff, but the explicit check here gives a clean 404
 * rather than an empty result for anyone else, and a signed URL is only
 * ever generated after that check passes.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: mediaRequestId } = await params;

  const currentUser = await getCurrentUserResult();
  if (currentUser.status !== "ok") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: mediaRequest } = await supabase
    .from("media_requests")
    .select("id, fan_id, creator_id, status, storage_path")
    .eq("id", mediaRequestId)
    .maybeSingle();

  const isParticipant =
    mediaRequest && (mediaRequest.fan_id === currentUser.user.id || mediaRequest.creator_id === currentUser.user.id);
  if (!mediaRequest || !isParticipant) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (mediaRequest.status !== "fulfilled" || !mediaRequest.storage_path) {
    return NextResponse.json({ error: "This request hasn't been fulfilled yet." }, { status: 409 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("media-requests")
    .createSignedUrl(mediaRequest.storage_path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    return NextResponse.json({ error: "Couldn't generate access to this media." }, { status: 502 });
  }

  return NextResponse.json({ url: data.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS });
}
