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
    <main className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Create New Post</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <textarea
          className="w-full border rounded p-2"
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
        <ul>
          {files.map((file, i) => (
            <li key={i}>{file.name}</li>
          ))}
        </ul>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Post
        </button>
      </form>
    </main>
  );
}
