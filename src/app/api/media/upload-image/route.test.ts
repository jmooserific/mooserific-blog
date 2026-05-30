import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/image-processing', () => ({
  processAndUploadImage: vi.fn(async () => ({
    baseUrl: 'https://cdn.example.test/photos/p1/uuid',
    width: 1024,
    height: 768,
    originalUrl: 'https://cdn.example.test/photos/p1/uuid/pic.jpg',
    originalContentType: 'image/jpeg',
  })),
}));

import { processAndUploadImage } from '@/lib/image-processing';
import { POST } from './route';

function formReq(form: FormData) {
  return new NextRequest('http://localhost/api/media/upload-image', { method: 'POST', body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/media/upload-image', () => {
  it('400s when no file is provided', async () => {
    const res = await POST(formReq(new FormData()));
    expect(res.status).toBe(400);
  });

  it('415s when the upload is not an image', async () => {
    const form = new FormData();
    form.set('file', new File(['x'], 'a.txt', { type: 'text/plain' }));
    const res = await POST(formReq(form));
    expect(res.status).toBe(415);
  });

  it('413s when the file is too large', async () => {
    // File.size derives from byte length; subclass it to report an oversized value
    // without allocating 600MB. undici's FormData re-wraps File instances (dropping the
    // override), so feed the file straight to the handler via a mocked formData().
    class BigFile extends File {
      get size() {
        return 600 * 1024 * 1024;
      }
    }
    const big = new BigFile(['x'], 'big.jpg', { type: 'image/jpeg' });
    const fakeForm = { get: (k: string) => (k === 'file' ? big : null) } as unknown as FormData;
    const req = new NextRequest('http://localhost/api/media/upload-image', { method: 'POST' });
    vi.spyOn(req, 'formData').mockResolvedValue(fakeForm);
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('processes a valid image and returns the variant metadata', async () => {
    const form = new FormData();
    form.set('file', new File(['imgdata'], 'pic.jpg', { type: 'image/jpeg' }));
    form.set('folderId', 'p1');
    const res = await POST(formReq(form));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.width).toBe(1024);
    expect(body.folderId).toBe('p1');
    expect(vi.mocked(processAndUploadImage)).toHaveBeenCalledWith(expect.any(Buffer), 'p1', 'pic.jpg', 'image/jpeg');
  });

  it('500s when processing throws', async () => {
    vi.mocked(processAndUploadImage).mockRejectedValueOnce(new Error('sharp boom'));
    const form = new FormData();
    form.set('file', new File(['imgdata'], 'pic.jpg', { type: 'image/jpeg' }));
    const res = await POST(formReq(form));
    expect(res.status).toBe(500);
  });
});
