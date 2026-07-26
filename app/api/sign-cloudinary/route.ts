import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const UPLOAD_FOLDER = "inventory-items";

/**
 * Signs a signed direct upload for the item form. The browser POSTs the file
 * straight to Cloudinary; here we sign the non-file params we control
 * (`timestamp`, `folder`) with the server-only API secret and hand back the
 * public values the upload request needs. No Cloudinary UI is involved.
 *
 * Gated to signed-in staff: the proxy already requires a session for every /api
 * route except /api/cron, and we re-check here.
 */
export async function POST() {
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

  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!apiKey || !cloudName) {
    console.error(
      "[cloudinary] NEXT_PUBLIC_CLOUDINARY_API_KEY or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set"
    );
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = UPLOAD_FOLDER;

  // The signed set must exactly match the non-file fields sent in the upload
  // FormData, or Cloudinary rejects with 401 "Invalid Signature".
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    apiSecret
  );

  return NextResponse.json({ signature, timestamp, folder, apiKey, cloudName });
}
