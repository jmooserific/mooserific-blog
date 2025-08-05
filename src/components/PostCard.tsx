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
    <section className="bg-white rounded-xl shadow-sm p-4 mb-8">
      <p className="text-sm text-gray-500 mb-4 text-right">
        Posted on <strong className="text-gray-700">{new Date(post.date).toLocaleDateString()}</strong> by <strong>{post.author}</strong>
      </p>
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
    </section>
  )
};

export default PostCard;
