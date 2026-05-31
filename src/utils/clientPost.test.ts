import { describe, it, expect } from 'vitest';
import { toClientPost } from './clientPost';
import type { Post as DbPost } from '@/lib/types';

const baseDbPost: DbPost = {
  id: 'p1',
  slug: '2026-05-01-0000',
  date: '2026-05-01T00:00:00.000Z',
  author: 'moose',
  description: 'a caption',
  photos: [
    { url: 'https://cdn/a.jpg', width: 100, height: 200 },
    { url: 'https://cdn/b.jpg', width: 300, height: 400 },
  ],
  videos: ['https://cdn/v.mp4'],
};

describe('toClientPost', () => {
  it('maps every field, renaming photo url to filename', () => {
    const client = toClientPost(baseDbPost);
    expect(client).toEqual({
      id: 'p1',
      date: '2026-05-01T00:00:00.000Z',
      author: 'moose',
      caption: 'a caption',
      photos: [
        { filename: 'https://cdn/a.jpg', width: 100, height: 200 },
        { filename: 'https://cdn/b.jpg', width: 300, height: 400 },
      ],
      slug: '2026-05-01-0000',
      videos: ['https://cdn/v.mp4'],
    });
  });

  it('falls back to empty strings for missing author and description', () => {
    const client = toClientPost({ ...baseDbPost, author: undefined, description: undefined });
    expect(client.author).toBe('');
    expect(client.caption).toBe('');
  });

  it('drops only the extra PhotoAsset fields, keeping width and height', () => {
    const client = toClientPost({
      ...baseDbPost,
      photos: [
        {
          url: 'https://cdn/orig.jpg',
          width: 800,
          height: 600,
          originalUrl: 'https://cdn/raw.jpg',
          originalContentType: 'image/jpeg',
        },
      ],
    });
    expect(client.photos).toEqual([{ filename: 'https://cdn/orig.jpg', width: 800, height: 600 }]);
  });

  it('yields an empty photos array when there are no photos', () => {
    const client = toClientPost({ ...baseDbPost, photos: [] });
    expect(client.photos).toEqual([]);
  });

  it('passes videos through untouched, including undefined', () => {
    expect(toClientPost({ ...baseDbPost, videos: undefined }).videos).toBeUndefined();
  });
});
