export interface PhotoAsset {
  url: string;
  width: number;
  height: number;
}

export interface Post {
  id: string;
  date: string; // ISO string
  author?: string;
  description?: string;
  photos: PhotoAsset[]; // stored JSON array of objects
  videos?: string[];
}

export interface ListPostsOptions {
  limit?: number; // default 20
  before?: string; // ISO date for cursor pagination
}
