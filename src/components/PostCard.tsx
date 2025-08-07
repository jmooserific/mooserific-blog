'use client';

import { useState } from "react";
import Markdown from 'react-markdown';
import {
  RenderImageContext,
  RenderImageProps,
  RowsPhotoAlbum,
} from "react-photo-album";
import "react-photo-album/styles.css";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export type PhotoMeta = {
  filename: string;
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


  const photos = post.photos.map((photo) => ({
    src: `/posts/${post.slug}/${photo.filename}`,
    width: photo.width,
    height: photo.height,
    alt: post.caption || "Photo"
  }));

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

  return (
    <section className="bg-white shadow-sm p-4 mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        {new Date(post.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
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
                <source src={`/posts/${post.slug}/${video}`} />
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
