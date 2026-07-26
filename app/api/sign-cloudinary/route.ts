import { NextResponse, type NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Signs a Cloudinary upload for the item form's <CldUploadWidget signatureEndpoint>.
 * The widget POSTs the params it wants to upload with; we return a signature
 * generated with the server-only API secret so the actual upload is trusted.
 *
 * Gated to signed-in staff: the proxy already requires a session for every /api
 * route except /api/cron, and we re-check here.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    console.error("[cloudinary] CLOUDINARY_API_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const body = await request.json();
  const paramsToSign = (body?.paramsToSign ?? {}) as Record<string, string>;

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({ signature });
}
