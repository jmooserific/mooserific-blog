import { NextRequest } from "next/server";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { z } from "zod";

const PhotoMetaSchema = z.array(z.object({
  filename: z.string(),
  width: z.number(),
  height: z.number(),
}));

const PostBodySchema = z.object({
  caption: z.string().optional().default(''),
  author: z.string().optional().default(''),
  photos: PhotoMetaSchema,
  videos: z.array(z.string()).optional().default([]),
});

interface PostJson {
  date: string;
  author: string;
  caption: string;
  photos: Array<{ filename: string; width: number; height: number }>;
  videos?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const parseResult = PostBodySchema.safeParse({
      caption: formData.get("caption"),
      author: formData.get("author"),
      photos: JSON.parse((formData.get("photos") as string | null) ?? "[]"),
      videos: formData.has("videos")
        ? JSON.parse(formData.get("videos") as string)
        : [],
    });

    if (!parseResult.success) {
      return new Response(`Invalid request: ${parseResult.error.message}`, { status: 400 });
    }

    const { caption, author, photos, videos } = parseResult.data;
    const date = new Date().toISOString();
    const slug = date.replace(/[:]/g, "-").slice(0, 16); // YYYY-MM-DDTHH-MM
    const postDir = join(process.cwd(), "posts", slug);
    await mkdir(postDir, { recursive: true });

    // Save images
    for (const photo of photos) {
      const file = formData.get(photo.filename);
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const buffer = Buffer.from(await (file as File).arrayBuffer());
        await writeFile(join(postDir, photo.filename), buffer);
      }
    }

    // Save videos
    for (const videoFilename of videos) {
      const file = formData.get(videoFilename);
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const buffer = Buffer.from(await (file as File).arrayBuffer());
        await writeFile(join(postDir, videoFilename), buffer);
      }
    }

    // Save post.json
    const postJson: PostJson = { date, author, caption, photos };
    if (videos.length > 0) postJson.videos = videos;
    await writeFile(join(postDir, "post.json"), JSON.stringify(postJson, null, 2));

    return new Response(JSON.stringify({ success: true, slug }), { status: 201 });
  } catch (err: unknown) {
    console.error('create-post error', err);
    return new Response("Internal server error", { status: 500 });
  }
}
