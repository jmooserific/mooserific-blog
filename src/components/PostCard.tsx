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
import { shouldLeadWithHero } from "@/utils/heroLayout";

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

const CONTAINER_WIDTH = 1120; // max-w-6xl card minus the px-4 inset on the gallery rows

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

   // Lightbox slides use the 2048w variant for sharp display on retina screens.
   // Built from every photo in order, so the hero stays at index 0.
   const lightboxSlides = photos.map((p) => ({ ...p, src: `${p.src}-2048w.webp` }));

   // When the first photo leads as a wide hero it renders on its own; the rest
   // (if any) fall back to the justified rows. The lightbox indices are offset
   // so a click on a row photo still opens the right slide.
   const useHero = shouldLeadWithHero(post.photos);
   const heroPhoto = useHero ? photos[0] : null;
   const albumPhotos = useHero ? photos.slice(1) : photos;
   const albumOffset = useHero ? 1 : 0;
   // The hero is the LCP image on hero posts, so the rows beneath it never get
   // eager/priority loading even above the fold.
   const albumPriority = isAboveFold && !useHero;
   // Hero cards bleed to the viewport edge below `sm`, so their padded sections
   // widen to px-8 to keep text aligned with the in-gutter cards (16px gutter +
   // 16px padding = 32px from the viewport edge either way).
   const insetPad = useHero ? "px-4 max-sm:px-8" : "px-4";

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
         sizes={sizes}
        priority={albumPriority}
        loading={albumPriority ? "eager" : "lazy"}
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

   // overflow-clip (not -hidden): hidden would make the card a scroll container
   // and hijack the hero-reveal view() timeline. Below `sm` a hero card escapes
   // the feed's px-4 gutter to the viewport edge — w-[calc(100%+2rem)] pairs
   // with -mx-4, and no stock utility expresses that gutter escape.
   return (
     <article className={`relative mx-auto w-full max-w-6xl overflow-clip bg-white rounded-[20px] mb-8 ${useHero ? 'max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:rounded-none' : ''}`}>
       {/* Quiet byline + caption lead-in above the photos. Kept compact so the
           gallery stays the dominant mass (photos-forward); the Timeline still
           carries the live "when am I" wayfinding. */}
       <header className={`flex flex-col gap-2 pt-4 pb-4 ${insetPad}`}>
         <p className="text-[13px] text-accent">
           {isValidDate && <time dateTime={post.date}>{fullDate}</time>}
           {post.author && (
             <>
               {isValidDate && <span aria-hidden="true"> · </span>}
               by <strong>{post.author}</strong>
             </>
           )}
         </p>
         {post.caption && (
           <div className="prose prose-sm max-w-none">
             <Markdown>{post.caption}</Markdown>
           </div>
         )}
       </header>
       {/* The hero bleeds to the card edges: no inset, no radius of its own —
           the padded header/footer keep it off the rounded card corners. */}
       {heroPhoto && (
         <button
           type="button"
           onClick={() => setIndex(0)}
           aria-label="Open photo"
           className="hero-reveal relative block w-full cursor-pointer overflow-hidden p-0"
           style={{ aspectRatio: `${heroPhoto.width} / ${heroPhoto.height}`, maxHeight: "85vh" }}
         >
           <Image
             loader={r2ImageLoader}
             fill
             src={heroPhoto.src}
             alt={heroPhoto.alt}
             sizes="(max-width: 1152px) 100vw, 1152px"
             priority={isAboveFold}
             loading={isAboveFold ? "eager" : "lazy"}
             className="object-cover"
           />
         </button>
       )}
       <div className={insetPad}>
         {albumPhotos.length > 0 && (
           <div className={heroPhoto ? "pt-3" : undefined}>
             <RowsPhotoAlbum
               rowConstraints={{ minPhotos: 1, maxPhotos: 3, singleRowMaxHeight: 535 }}
               photos={albumPhotos}
               defaultContainerWidth={CONTAINER_WIDTH}
               // Describe the album's rendered width so react-photo-album emits an
               // accurate per-photo `sizes`: a lone photo filling a justified row
               // then requests a large variant instead of the old static 33vw.
               // Widths track the nested padding — feed gutter + card inset:
               // <640px px-4+px-4 (or hero px-8) = 64px; sm+ px-6+px-4 = 80px.
               sizes={{
                 size: `${CONTAINER_WIDTH}px`,
                 sizes: [
                   { viewport: "(max-width: 640px)", size: "calc(100vw - 64px)" },
                   { viewport: "(max-width: 1200px)", size: "calc(100vw - 80px)" },
                 ],
               }}
               onClick={({ index }) => setIndex(index + albumOffset)}
               render={{ image: renderPhoto }}
             />
           </div>
         )}
         <Lightbox
           slides={lightboxSlides}
           open={index >= 0}
           index={index}
           close={() => setIndex(-1)}
         />
         {/* TODO: generate poster/preview images for videos so a video-led
             post can lead with a hero (and so videos don't render posterless).
             Until then, posts with no photos never get the hero treatment. */}
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
       {/* Actions sit at the footer's left, clear of the right-edge vertical
           timeline rail on narrow screens. */}
       <footer className={`flex items-center gap-1 pt-4 pb-4 ${insetPad}`}>
         {isAdmin && (
           <>
             <button
               type="button"
               onClick={() => router.push(`/admin?edit=${encodeURIComponent(post.id)}`)}
               aria-label="Edit this post"
               title="Edit this post"
               className="inline-flex items-center justify-center rounded-[10px] border border-accent/15 bg-transparent p-2 text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
             >
               <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
             </button>
             <button
               type="button"
               onClick={handleDelete}
               disabled={deleting}
               aria-label="Delete this post"
               title="Delete this post"
               className="inline-flex items-center justify-center rounded-[10px] border border-red-700/20 bg-transparent p-2 text-red-700/80 transition-colors hover:bg-red-900/6 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2 disabled:opacity-50"
             >
               <TrashIcon className="h-4 w-4" aria-hidden="true" />
             </button>
           </>
         )}
         <Link
           href={`/p/${post.slug}`}
           aria-label="Permalink to this post"
           title="Permalink to this post"
           className="inline-flex items-center justify-center rounded-[10px] border border-accent/15 bg-transparent p-2 text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
         >
           <ShareIcon className="h-4 w-4" aria-hidden="true" />
         </Link>
       </footer>
     </article>
   );
 };

 export { PostCard };
