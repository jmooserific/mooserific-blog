'use client';

import { useEffect, useRef, useState } from "react";
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
       {isValidDate && (
         <div
           aria-hidden="true"
           className="pointer-events-none select-none absolute font-black z-1 leading-[0.78] tracking-[-0.05em] -top-8 -right-2 text-[150px] sm:-top-12 sm:-right-3 sm:text-[220px]"
           style={{ color: 'rgba(0, 0, 0, 0.04)' }}
         >
           {dayNumeral}
         </div>
       )}
       <div className="relative h-25 sm:h-35 z-2">
         {isValidDate && (
           <time
             dateTime={post.date}
             className="absolute right-4 top-4 text-right sm:right-7 sm:top-7"
           >
             <span className="sr-only">{fullDate}</span>
             <span aria-hidden="true" className="block uppercase font-bold text-[14px] tracking-[0.08em] text-[#845A2C]">
               {monthName}
             </span>
             <span aria-hidden="true" className="block font-light text-[13px] text-[#A87941] mt-0.75">
               {yearText}
             </span>
           </time>
         )}
         {isAdmin && (
           <div ref={menuContainerRef} className="absolute left-4 top-4">
             <button
               type="button"
               onClick={() => setMenuOpen((v) => !v)}
               className="inline-flex items-center justify-center rounded-full border border-transparent bg-white p-2 text-gray-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
               aria-haspopup="menu"
               aria-expanded={menuOpen}
               aria-label="Post actions"
             >
               <span className="text-lg leading-none">⋯</span>
             </button>
             {menuOpen && (
               <div className="absolute left-0 mt-1 z-10 bg-white border border-gray-200 rounded shadow-md text-sm">
                 <button
                   type="button"
                   className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-50"
                   onClick={() => {
                     setMenuOpen(false);
                     router.push(`/admin?edit=${encodeURIComponent(post.slug)}`);
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
       </div>
       <div className="relative z-2 px-4 pb-4">
         <div className="prose prose-base mb-2">
           <Markdown>{post.caption}</Markdown>
         </div>
         {post.author && (
           <p className="text-[13px] text-[#845A2C] mb-4">
             by <strong>{post.author}</strong>
           </p>
         )}
         <div className="pt-2">
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
       </div>
     </article>
   );
 };

 export { PostCard };
