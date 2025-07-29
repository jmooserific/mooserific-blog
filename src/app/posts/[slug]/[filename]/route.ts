import { NextRequest } from "next/server";
import { join } from "path";
import { readFile } from "fs/promises";

export async function GET(req: NextRequest, context: { params: { slug: string; filename: string } }) {
  const params = await context.params;
  const filePath = join(process.cwd(), "posts", params.slug, params.filename);
  try {
    const file = await readFile(filePath);
    // Infer content type from file extension
    const ext = params.filename.split('.').pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "png") contentType = "image/png";
    else if (ext === "gif") contentType = "image/gif";
    else if (ext === "webp") contentType = "image/webp";
    else if (ext === "mp4") contentType = "video/mp4";
    else if (ext === "webm") contentType = "video/webm";
    else if (ext === "mov") contentType = "video/quicktime";
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (err) {
    return new Response("Not found", { status: 404 });
  }
}
