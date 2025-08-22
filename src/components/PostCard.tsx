'use client';

import { useState } from "react";
import Markdown from 'react-markdown';
import { RenderImageContext, RenderImageProps } from "react-photo-album";
import "react-photo-album/styles.css";
import Image from "next/image";
import dynamic from "next/dynamic";
const RowsPhotoAlbum = dynamic(() => import("react-photo-album").then(m => m.RowsPhotoAlbum), { ssr: false });
const Lightbox = dynamic(() => import("yet-another-react-lightbox"), { ssr: false });
import "yet-another-react-lightbox/styles.css";

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
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [index, setIndex] = useState(-1);


  const photos = post.photos.map((photo) => {
    const isUrl = /^https?:\/\//.test(photo.filename) || photo.filename.startsWith('/');
    return {
      src: isUrl ? photo.filename : `/posts/${post.slug}/${photo.filename}`,
      width: photo.width,
      height: photo.height,
      alt: post.caption || 'Photo'
    };
  });

  // Custom renderPhoto for Next.js Image optimization
  const renderPhoto = ({ alt = "", title, sizes }: RenderImageProps,
    { photo, width, height }: RenderImageContext) => (
    <div
      style={{
        width: "100%",
        position: "relative",
        aspectRatio: `${width} / ${height}`,
      }}
    >
      <Image
        fill
        src={photo}
        alt={alt}
        title={title}
        sizes={sizes}
        quality={80}
      />
    </div>
  );

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
