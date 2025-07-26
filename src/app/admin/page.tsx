// Admin UI: drag & drop images, caption, create post
import { useState } from "react";

export default function AdminPage() {
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).slice(0, 10);
    setFiles(droppedFiles);
  }

  function handleSubmit() {
    // TODO: Implement post creation logic (save to /posts)
    alert("Post created! (stub)");
  }

  return (
    <main className="bg-gray-50 min-h-screen font-sans antialiased">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 text-center">Create New Post</h1>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <textarea
            className="w-full border rounded p-2 prose prose-base mb-6"
            rows={3}
            placeholder="Caption (Markdown supported)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <div
            className="border-dashed border-2 border-gray-300 rounded p-4 text-center"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            Drag & drop up to 10 images here
          </div>
          <ul className="mb-4">
            {files.map((file, i) => (
              <li key={i} className="text-sm text-gray-500">{file.name}</li>
            ))}
          </ul>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            Post
          </button>
        </form>
        <footer className="text-center text-sm text-gray-400 py-6 mt-8">
          &copy; {new Date().getFullYear()} Family Photo Blog
        </footer>
      </div>
    </main>
  );
}
