export type UploadItem = {
  id: string;
  kind: "photo" | "video";
  source: "new" | "existing";
  filename: string;
  file?: File;
  url?: string;
  width?: number;
  height?: number;
  originalUrl?: string;
  originalContentType?: string;
};
