'use client'

// Admin UI: drag & drop images, caption, create post
import { useState } from "react";
type PhotoMeta = { filename: string; width: number; height: number };

export default function AdminPage() {
  const [caption, setCaption] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [videos, setVideos] = useState<string[]>([]);

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).slice(0, 10);
    setFiles(droppedFiles);
    // Separate images and videos
    const imageFiles = droppedFiles.filter(f => f.type.startsWith("image/"));
    const videoFiles = droppedFiles.filter(f => f.type.startsWith("video/"));
    // Extract dimensions for each image
    const metaPromises = imageFiles.map((file) => {
      return new Promise<PhotoMeta>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          resolve({ filename: file.name, width: img.width, height: img.height });
        };
        img.src = URL.createObjectURL(file);
      });
    });
    const meta = await Promise.all(metaPromises);
    setPhotos(meta);
    setVideos(videoFiles.map(f => f.name));
  }

  async function handleSubmit() {
    const formData = new FormData();
    formData.append("caption", caption);
    // Get author from header if available (for demo, use placeholder)
    formData.append("author", "from header");
    formData.append("photos", JSON.stringify(photos));
    formData.append("videos", JSON.stringify(videos));
    files.forEach((file) => {
      formData.append(file.name, file);
    });
    const res = await fetch("/admin/api/create-post", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      alert(`Post created! Slug: ${data.slug}`);
      setCaption("");
      setFiles([]);
      setPhotos([]);
      setVideos([]);
    } else {
      const error = await res.text();
      alert("Error: " + error);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <nav className="mb-6">
        <a href="/" className="text-blue-600 hover:underline text-sm">← Back to posts</a>
      </nav>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 text-center">Create a new post</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <textarea
          className="appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500 my-0"
          rows={3}
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <p className="prose text-gray-600 text-xs italic">Use <a href="https://commonmark.org/help/" target="_blank">Markdown</a> to style</p>
        <div
          className="border-dashed border-2 border-gray-300 rounded p-8 text-center cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          Drop photos or videos here<br />
          <span className="text-xs text-gray-400">or click to select</span>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const inputFiles = Array.from(e.target.files || []).slice(0, 10);
              setFiles(inputFiles);
              // Separate images and videos
              const imageFiles = inputFiles.filter(f => f.type.startsWith("image/"));
              const videoFiles = inputFiles.filter(f => f.type.startsWith("video/"));
              // Extract dimensions for each image
              const metaPromises = imageFiles.map((file) => {
                return new Promise<PhotoMeta>((resolve) => {
                  const img = new window.Image();
                  img.onload = () => {
                    resolve({ filename: file.name, width: img.width, height: img.height });
                  };
                  img.src = URL.createObjectURL(file);
                });
              });
              const meta = await Promise.all(metaPromises);
              setPhotos(meta);
              setVideos(videoFiles.map(f => f.name));
            }}
          />
        </div>
        <ul className="mb-4">
          {photos.map((photo, i) => (
            <li key={photo.filename} className="text-sm text-gray-500">
              🖼️ {photo.filename} <span className="text-xs text-gray-400">({photo.width}×{photo.height})</span>
            </li>
          ))}
          {videos.map((video, i) => (
            <li key={video} className="text-sm text-gray-500">
              🎬 {video}
            </li>
          ))}
        </ul>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Post
        </button>
      </form>
    </div>
  );
}
