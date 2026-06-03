'use client';

import { useState } from "react";
import Markdown from 'react-markdown';
import { RenderImageContext, RenderImageProps } from "react-photo-album";
import "react-photo-album/styles.css";
import Image from "next/image";
import r2ImageLoader from "@/lib/image-loader";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
const RowsPhotoAlbum = dynamic(
  () => import("react-photo-album").then((m) => m.RowsPhotoAlbum),
  {
    ssr: true,
    loading: () => (
      <div className="h-56 w-full rounded-xl bg-gray-100" aria-hidden="true" />
    ),
  }
);
const Lightbox = dynamic(() => import("yet-another-react-lightbox"), { ssr: false });
import "yet-another-react-lightbox/styles.css";
import Link from "next/link";
import { PencilSquareIcon, TrashIcon, ShareIcon } from "@heroicons/react/24/outline";

 export type PhotoMeta = {
   filename: string; // Can be full URL from R2
   width: number;
   height: number;
 };

 export type Post = {
   id: string;        // stable record id, used for admin edit/delete
   date: string;
   author: string;
   caption: string;
   photos: PhotoMeta[];
   slug: string;      // canonical permalink segment, used for /p/<slug>
   videos?: string[];
 };

 interface PostCardProps {
   post: Post;
   isAdmin?: boolean;
   isAboveFold?: boolean;
   onDeleted?: () => void;
 }

 const resolveMediaSrc = (value: string) => {
   if (!value) return value;
   if (/^https?:\/\//.test(value)) return value;
   if (value.startsWith('/')) return value;
  return `/${value.replace(/^\/+/, '')}`;
 };

const DEFAULT_CONTAINER_WIDTH = 864; // matches max-w-4xl wrapper minus card padding

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PostCard: React.FC<PostCardProps> = ({ post, isAdmin = false, isAboveFold = false, onDeleted }) => {
   const router = useRouter();
   const [index, setIndex] = useState(-1);
   const [deleting, setDeleting] = useState(false);

   const handleDelete = async () => {
     if (!confirm('Delete this post? This cannot be undone.')) return;
     try {
       setDeleting(true);
       const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, { method: 'DELETE', cache: 'no-store' });
       if (!res.ok) throw new Error(await res.text());
       onDeleted?.();
     } catch (e) {
       const message = e instanceof Error ? e.message : 'Unknown error';
       alert(`Failed to delete: ${message}`);
     } finally {
       setDeleting(false);
     }
   };

   const photos = post.photos.map((photo) => ({
     src: resolveMediaSrc(photo.filename),
     width: photo.width,
     height: photo.height,
     alt: post.caption || 'Photo',
   }));

   // Lightbox slides use the 2048w variant for sharp display on retina screens
   const lightboxSlides = photos.map((p) => ({ ...p, src: `${p.src}-2048w.webp` }));

   // Custom renderPhoto for Next.js Image so SSR markup matches hydration.
  const renderPhoto = ({ alt = "", title, sizes }: RenderImageProps,
    { photo, width, height }: RenderImageContext) => {
    return (
     <div
       className="rounded-xl overflow-hidden"
       style={{
         width: "100%",
         position: "relative",
         aspectRatio: `${width} / ${height}`,
       }}
     >
       <Image
         loader={r2ImageLoader}
         fill
         src={photo}
         alt={alt}
         title={title}
         sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        priority={isAboveFold}
        loading={isAboveFold ? "eager" : "lazy"}
       />
     </div>
  );
  };

   // Parse date in a UTC-stable way to avoid SSR/CSR timezone differences
   const parsedDate = new Date(post.date);
   const isValidDate = !isNaN(parsedDate.getTime());
   const dayNumeral = isValidDate ? parsedDate.getUTCDate() : null;
   const monthName = isValidDate ? MONTH_NAMES[parsedDate.getUTCMonth()] : null;
   const yearText = isValidDate ? parsedDate.getUTCFullYear() : null;
   const fullDate = isValidDate ? `${monthName} ${dayNumeral}, ${yearText}` : post.date;

   return (
     <article className="relative overflow-hidden bg-white rounded-[20px] mb-8">
       <div className="p-4">
         <div>
           <RowsPhotoAlbum
             rowConstraints={{ minPhotos: 1, maxPhotos: 3, singleRowMaxHeight: 535 }}
             photos={photos}
             defaultContainerWidth={DEFAULT_CONTAINER_WIDTH}
             onClick={({ index }) => setIndex(index)}
             render={{ image: renderPhoto }}
           />
           <Lightbox
             slides={lightboxSlides}
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
                   className="w-full rounded-xl bg-black"
                   style={{ maxHeight: 400 }}
                 >
                   <source src={resolveMediaSrc(video)} />
                   Your browser does not support the video tag.
                 </video>
               ))}
             </div>
           )}
         </div>
         {post.caption && (
           <div className="prose prose-sm max-w-none mt-4">
             <Markdown>{post.caption}</Markdown>
           </div>
         )}
         <footer className="mt-4 flex items-center justify-between gap-3">
           <p className="text-[13px] text-accent">
             {isValidDate && <time dateTime={post.date}>{fullDate}</time>}
             {post.author && (
               <>
                 {isValidDate && <span aria-hidden="true"> · </span>}
                 by <strong>{post.author}</strong>
               </>
             )}
           </p>
           <div className="flex items-center gap-1">
             {isAdmin && (
               <>
                 <button
                   type="button"
                   onClick={() => router.push(`/admin?edit=${encodeURIComponent(post.id)}`)}
                   aria-label="Edit this post"
                   title="Edit this post"
                   className="inline-flex items-center justify-center rounded-[10px] border border-transparent bg-transparent p-2 text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                 >
                   <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                 </button>
                 <button
                   type="button"
                   onClick={handleDelete}
                   disabled={deleting}
                   aria-label="Delete this post"
                   title="Delete this post"
                   className="inline-flex items-center justify-center rounded-[10px] border border-transparent bg-transparent p-2 text-red-700/80 transition-colors hover:bg-red-900/6 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2 disabled:opacity-50"
                 >
                   <TrashIcon className="h-4 w-4" aria-hidden="true" />
                 </button>
               </>
             )}
             <Link
               href={`/p/${post.slug}`}
               aria-label="Permalink to this post"
               title="Permalink to this post"
               className="inline-flex items-center justify-center rounded-[10px] border border-transparent bg-transparent p-2 text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
             >
               <ShareIcon className="h-4 w-4" aria-hidden="true" />
             </Link>
           </div>
         </footer>
       </div>
     </article>
   );
 };

 export { PostCard };
