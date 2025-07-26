// Homepage: lists latest posts
import fs from "fs";
import path from "path";
import PhotoAlbum from "react-photo-album";

const postsDir = path.join(process.cwd(), "posts");

function getPosts() {
  const postFolders = fs.readdirSync(postsDir);
  return postFolders
    .map((folder) => {
      const postPath = path.join(postsDir, folder, "post.json");
      if (fs.existsSync(postPath)) {
        const post = JSON.parse(fs.readFileSync(postPath, "utf-8"));
        return { ...post, slug: folder };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function HomePage() {
  const posts = getPosts();
  return (
    <main className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Family Photo Blog</h1>
      {posts.map((post) => (
        <section key={post.slug} className="mb-10 p-4 bg-white rounded shadow">
          <div className="mb-2 text-sm text-gray-500">
            Posted on {new Date(post.date).toLocaleDateString()} by {post.author}
          </div>
          <div className="mb-4 prose">{post.caption}</div>
          <PhotoAlbum
            layout="rows"
            photos={post.photos.map((filename) => ({
              src: `/posts/${post.slug}/${filename}`,
              width: 800,
              height: 600,
            }))}
            rowsPerPage={3}
          />
        </section>
      ))}
    </main>
  );
}
