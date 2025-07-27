// Homepage: lists latest posts
import fs from "fs";
import path from "path";
import Markdown from 'react-markdown'
import RowsPhotoAlbum from "react-photo-album";
import "react-photo-album/styles.css";

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
    <main className="bg-gray-50 min-h-screen font-sans antialiased">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 text-center">Mooserific!</h1>
        {posts.map((post) => (
          <section key={post.slug} className="bg-white rounded-xl shadow-sm p-4  mb-8">
            <p className="text-sm text-gray-500 mb-4 text-right">
              Posted on <strong className="text-gray-700">{new Date(post.date).toLocaleDateString()}</strong> by <strong>{post.author}</strong>
            </p>
            <div className="prose prose-base mb-6">
              <Markdown>{post.caption}</Markdown>
            </div>
            <div className="pt-2">
              <RowsPhotoAlbum
                layout="rows"
                rowConstraints={{ singleRowMaxHeight: 250, minPhotos: 1, maxPhotos: 3 }}
                photos={post.photos.map((photo) => ({
                  src: `/posts/${post.slug}/${photo.filename}`,
                  width: photo.width,
                  height: photo.height,
                  alt: post.caption || "Photo"
                }))}
              />
            </div>
          </section>
        ))}
        <footer className="text-center text-sm text-gray-400 py-6">
          &copy; {new Date().getFullYear()} Mooserific
        </footer>
      </div>
    </main>
  );
}
