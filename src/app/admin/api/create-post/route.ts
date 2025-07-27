import { NextRequest } from "next/server";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const caption = formData.get("caption") as string;
    const author = formData.get("author") as string;
    const photosMeta = JSON.parse(formData.get("photos") as string) as Array<{ filename: string; width: number; height: number }>;
    const date = new Date().toISOString();
    const slug = date.replace(/[:]/g, "-").slice(0, 16); // YYYY-MM-DDTHH-MM
    const postDir = join(process.cwd(), "posts", slug);
    await mkdir(postDir, { recursive: true });
    // Save images
    for (const photo of photosMeta) {
      const file = formData.get(photo.filename);
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(join(postDir, photo.filename), buffer);
      }
    }
    // Save post.json
    const postJson = {
      date,
      author,
      caption,
      photos: photosMeta
    };
    await writeFile(join(postDir, "post.json"), JSON.stringify(postJson, null, 2));
    return new Response(JSON.stringify({ success: true, slug }), { status: 201 });
  } catch (err) {
    return new Response("Error creating post: " + (err as Error).message, { status: 500 });
  }
}
