import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserResult } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateMediaUpload } from "@/lib/media-requests/upload-validation";

/**
 * POST /api/media-requests/[id]/fulfil
 * multipart/form-data: { file: File }
 *
 * Server-side validation of type/size before anything is written — never
 * trusts the browser's claimed Content-Type alone for the size check, and
 * rejects any type not in the allow-list for this request's media type.
 * Writes to the private 'media-requests' bucket using the admin client,
 * after independently verifying the caller is the requested creator and
 * the request is in the 'accepted' state — the same ownership/state check
 * storage RLS (media_requests_storage_insert) and fulfil_media_request()
 * (the database function) both also independently enforce.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: mediaRequestId } = await params;

  const currentUser = await getCurrentUserResult();
  if (currentUser.status !== "ok") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: mediaRequest } = await supabase
    .from("media_requests")
    .select("id, creator_id, request_type, status")
    .eq("id", mediaRequestId)
    .maybeSingle();

  if (!mediaRequest || mediaRequest.creator_id !== currentUser.user.id) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (mediaRequest.status !== "accepted") {
    return NextResponse.json({ error: "Only an accepted request can be fulfilled." }, { status: 409 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const validation = validateMediaUpload(mediaRequest.request_type, file);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const extension = file.type.split("/")[1]?.split(";")[0] ?? "bin";
  const storagePath = `${mediaRequestId}/${Date.now()}.${extension}`;

  const admin = createSupabaseAdminClient();
  const { error: uploadError } = await admin.storage
    .from("media-requests")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: "Couldn't upload the file. Please try again." }, { status: 502 });
  }

  const { error: fulfilError } = await supabase.rpc("fulfil_media_request", {
    p_media_request_id: mediaRequestId,
    p_storage_path: storagePath,
  });
  if (fulfilError) {
    await admin.storage.from("media-requests").remove([storagePath]);
    return NextResponse.json({ error: "Couldn't complete fulfilment. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, storagePath });
}
