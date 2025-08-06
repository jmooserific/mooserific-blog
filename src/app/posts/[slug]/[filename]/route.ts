import { NextRequest } from "next/server";
import { join } from "path";
import { statSync, createReadStream } from "fs";
import { readFile } from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string, filename: string }> }
) {
  const { slug, filename } = await params;
  const filePath = join(process.cwd(), "posts", slug, filename);

  // Infer content type from file extension
  const ext = filename.split('.').pop()?.toLowerCase();
  let contentType = "application/octet-stream";
  if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
  else if (ext === "png") contentType = "image/png";
  else if (ext === "gif") contentType = "image/gif";
  else if (ext === "webp") contentType = "image/webp";
  else if (ext === "mp4") contentType = "video/mp4";
  else if (ext === "webm") contentType = "video/webm";
  else if (ext === "mov") contentType = "video/quicktime";

  try {
    const stats = statSync(filePath);
    const range = request.headers.get("range");

    if (range) {
      // Parse Range header, e.g. "bytes=0-1023"
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stats.size - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(filePath, { start, end });

      return new Response(stream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stats.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } else {
      // No Range header: return full file
      const file = await readFile(filePath);
      return new Response(new Uint8Array(file), {
        headers: {
          "Content-Type": contentType,
          "Content-Length": stats.size.toString(),
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  } catch (err) {
    return new Response("File not found", { status: 404 });
  }
}