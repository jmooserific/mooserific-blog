"use client"

// Admin UI: drag & drop images, caption, create post
import { useMemo, useState } from "react";
import { PhotoIcon, FilmIcon } from "@heroicons/react/24/outline";

type PhotoMeta = { filename: string; width: number; height: number };

export default function AdminPage() {
  const [caption, setCaption] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const folderId = useMemo(() => crypto.randomUUID(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

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

  function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress: (pct: number) => void) {
    return new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
          onProgress(pct);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Response(null, { status: xhr.status }));
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }

  async function handleSubmit() {
    try {
      if (files.length === 0) {
        alert('Select at least one file');
        return;
      }
      setIsSubmitting(true);
      setUploadProgress({});
      // 1. Direct upload each file to R2 via presigned URL
      const uploaded: { url: string; filename: string }[] = [];
      for (const file of files) {
        const presignRes = await fetch('/api/media/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, folderId })
        });
        if (!presignRes.ok) {
          throw new Error(await presignRes.text());
        }
        const presign = await presignRes.json();
        await putWithProgress(presign.uploadUrl, file, presign.headers, (pct) => {
          setUploadProgress((prev) => ({ ...prev, [file.name]: pct }));
        });
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        uploaded.push({ url: presign.publicUrl, filename: file.name });
      }
      const urls = uploaded.map(u => u.url);
      // Separate photos/videos by MIME type or extension
      const photoUrls: string[] = urls.filter((u: string) => /\.(jpe?g|png|gif|webp|avif)$/i.test(u));
      const videoUrls: string[] = urls.filter((u: string) => /\.(mp4|mov|webm)$/i.test(u));
      // Map photoUrls back to dimensions we already captured in "photos" state
      const photoAssets = photoUrls.map(url => {
        const meta = photos.find(p => url.includes(p.filename)) || { width: 800, height: 600 };
        return { url, width: meta.width, height: meta.height };
      });
      // 2. Create post record
      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: folderId, description: caption, photos: photoAssets, videos: videoUrls })
      });
      if (!postRes.ok) {
        throw new Error(await postRes.text());
      }
      const created = await postRes.json();
      alert(`Post created! ID: ${created.id}`);
  setCaption('');
  setFiles([]);
  setPhotos([]);
  setVideos([]);
      setUploadProgress({});
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSubmitting(false);
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
              <PhotoIcon className="h-4 w-4 inline-block" />&nbsp;
              {photo.filename} <span className="text-xs text-gray-400">({photo.width}×{photo.height})</span>
            </li>
          ))}
          {videos.map((video, i) => (
            <li key={video} className="text-sm text-gray-500">
              <FilmIcon className="h-4 w-4 inline-block" />&nbsp;
              {video}
            </li>
          ))}
        </ul>
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
              )}
              {isSubmitting ? 'Uploading media…' : 'Ready to upload'}
            </div>
            <ul className="space-y-1">
              {files.map((f) => {
                const pct = uploadProgress[f.name] ?? 0;
                return (
                  <li key={f.name} className="text-xs text-gray-700">
                    <div className="flex justify-between mb-1">
                      <span className="truncate mr-2">{f.name}</span>
                      <span className="text-gray-500">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div className="bg-blue-600 h-2 rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <button type="submit" className={`bg-blue-600 text-white px-4 py-2 rounded ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Posting…' : 'Post'}
        </button>
      </form>
    </div>
  );
}
