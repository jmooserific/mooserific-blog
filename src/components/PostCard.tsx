'use client';

import { useEffect, useRef, useState } from "react";
import Markdown from 'react-markdown';
import { RenderImageContext, RenderImageProps, RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/styles.css";
import Image from "next/image";
import dynamic from "next/dynamic";
const Lightbox = dynamic(() => import("yet-another-react-lightbox"), { ssr: false });
import "yet-another-react-lightbox/styles.css";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

export type PhotoMeta = {
  filename: string; // Can be full URL from R2
  width: number;
  height: number;
};

export type Post = {
  date: string;
  author: string;
  caption: string;
  photos: PhotoMeta[];
  slug: string;
  videos?: string[];
};

interface PostCardProps {
  post: Post;
  isAdmin?: boolean;
  onDeleted?: () => void;
  // Mark the very first post on the page so we can eagerly load its first image (LCP)
  isFirstPost?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, isAdmin = false, onDeleted, isFirstPost = false }) => {
  const [index, setIndex] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const el = menuContainerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);


  const photos = post.photos.map((photo) => {
    const isUrl = /^https?:\/\//.test(photo.filename) || photo.filename.startsWith('/');
    return {
      src: isUrl ? photo.filename : `/posts/${post.slug}/${photo.filename}`,
      width: photo.width,
      height: photo.height,
      alt: post.caption || 'Photo'
    };
  });

  // Determine the LCP candidate (first image of the first post on the page)
  const lcpSrc = isFirstPost && photos.length > 0 ? photos[0].src : undefined;

  // Custom renderPhoto for Next.js Image optimization
  const renderPhoto = ({ alt = "", title, sizes }: RenderImageProps,
    { photo, width, height }: RenderImageContext) => {
    const isLcp = lcpSrc ? photo.src === lcpSrc : false;
    return (
      <div
        style={{
          width: "100%",
          position: "relative",
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <Image
          fill
          src={photo.src}
          alt={alt}
          title={title}
          sizes={sizes}
          quality={80}
          // Eager-load and prioritize the first image of the first post to improve LCP
          priority={isLcp}
          loading={isLcp ? 'eager' : 'lazy'}
          fetchPriority={isLcp ? 'high' : 'auto'}
          className="object-cover"
        />
      </div>
    );
  };

  // Format date in a UTC-stable way to avoid SSR/CSR timezone differences
  const formatDateUTC = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <section className="bg-white shadow-sm p-4 mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        {formatDateUTC(post.date)}
      </h2>
      {isAdmin && (
        <div ref={menuContainerRef} className="relative">
          <div className="flex justify-end -mt-8 mb-2">
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className="text-gray-500 hover:text-gray-800 px-2 py-1"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Post actions"
            >
              ⋯
            </button>
          </div>
          {menuOpen && (
            <div className="absolute right-0 z-10 bg-white border border-gray-200 rounded shadow-md text-sm">
              <button
                type="button"
                disabled={true}
                title="Edit functionality coming soon"
                className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => {
                  setMenuOpen(false);
                  window.location.href = `/admin?edit=${encodeURIComponent(post.slug)}`;
                }}
              >
                <PencilSquareIcon className="h-4 w-4 text-gray-700" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                disabled={deleting}
                onClick={async () => {
                  setMenuOpen(false);
                  if (!confirm('Delete this post? This cannot be undone.')) return;
                  try {
                    setDeleting(true);
                    const res = await fetch(`/api/posts/${encodeURIComponent(post.slug)}`, { method: 'DELETE', cache: 'no-store' });
                    if (!res.ok) throw new Error(await res.text());
                    onDeleted?.();
                  } catch (e: any) {
                    alert(`Failed to delete: ${e?.message || 'Unknown error'}`);
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                <TrashIcon className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
      <div className="prose prose-base mb-6">
        <Markdown>{post.caption}</Markdown>
      </div>
      <div className="pt-2">
        <RowsPhotoAlbum
          rowConstraints={{ minPhotos: 1, maxPhotos: 3 }}
          photos={photos}
          onClick={({ index }) => setIndex(index)}
          render={{ image: renderPhoto }}
        />
        <Lightbox
          slides={photos}
          open={index >= 0}
          index={index}
          close={() => setIndex(-1)}
        />
        {Array.isArray(post.videos) && post.videos.length > 0 && (
          <div className="mt-4 flex flex-col gap-4">
            {post.videos.map((video: string) => (
              <video
                key={video}
                controls
                className="w-full rounded-md bg-black"
                style={{ maxHeight: 400 }}
              >
                <source src={/^https?:\/\//.test(video) || video.startsWith('/') ? video : `/posts/${post.slug}/${video}`} />
                Your browser does not support the video tag.
              </video>
            ))}
          </div>
        )}
      </div>
      {post.author && (
        <p className="text-sm text-right text-gray-600 mt-2">
          by <strong>{post.author}</strong>
        </p>
      )}
    </section>
  )
};

export default PostCard;
