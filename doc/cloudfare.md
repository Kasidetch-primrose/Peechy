# Cloudflare R2 Storage Setup for Image Reveal Game (SvelteKit Backend)

## 🎯 Goal

Set up image storage using **Cloudflare R2** for an image reveal game built with **SvelteKit**.

The system should:

- Upload images (admin/teacher side)
- Store images in R2
- Serve images efficiently to frontend
- Save image URLs in database
- Keep uploads secure

---

## 📦 Required Environment Variables

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=   # e.g. https://cdn.myproject.com
```

---

## ⚙️ Install Dependencies

Use AWS SDK (R2 is S3-compatible):

```bash
npm install @aws-sdk/client-s3
```

---

## 📁 Suggested Project Structure

```txt
src/
 ├── lib/
 │   ├── server/
 │   │   ├── r2.ts              # R2 client + helpers
 │   │   └── upload.ts          # upload logic
 ├── routes/
 │   ├── api/
 │   │   └── upload-image/
 │   │        └── +server.ts    # POST endpoint
```

---

## 🔌 R2 Client Setup

**File: `src/lib/server/r2.ts`**

```ts
import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

---

## ⬆️ Upload Function

**File: `src/lib/server/upload.ts`**

```ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2";
import crypto from "crypto";

export async function uploadImage(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    })
  );

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

  return {
    key: fileName,
    url: publicUrl,
  };
}
```

---

## 🌐 API Endpoint (Upload)

**File: `src/routes/api/upload-image/+server.ts`**

```ts
import type { RequestHandler } from "./$types";
import { uploadImage } from "$lib/server/upload";

export const POST: RequestHandler = async ({ request, locals }) => {
  // Optional: check authentication
  // if (!locals.user) return new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new Response("No file uploaded", { status: 400 });
  }

  const result = await uploadImage(file);

  // TODO: Save result.url into database

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
};
```

---

## 🗄️ Database Design (Example)

```sql
CREATE TABLE images (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Security Best Practices

- Restrict upload endpoint to authenticated users (admin/teacher only)
- Validate file type:
  - Accept only: image/png, image/jpeg, image/webp

- Limit file size (e.g. max 5MB)
- Generate random file names (avoid collisions)
- Do NOT expose R2 credentials to frontend

---

## 🚀 Optional Enhancements

### 1. Signed Upload URLs (Advanced)

- Generate pre-signed URL from backend
- Upload directly from frontend to R2
- Reduces backend load

---

### 2. Image Optimization

- Store:
  - original image
  - optional compressed version

- Use Cloudflare CDN for caching

---

### 3. Folder Structure in Bucket

```txt
game-images/
  ├── easy/
  ├── medium/
  └── hard/
```

---

## 🧠 Game-Specific Notes

- Do NOT slice images into tiles in storage
- Store only original image
- Handle "image reveal" grid logic in frontend
- Optionally preload blurred version for UX

---

## 🔁 Upload Flow

```txt
Frontend (admin)
   ↓
POST /api/upload-image
   ↓
SvelteKit backend
   ↓
Upload to R2
   ↓
Return public URL
   ↓
Save URL in database
```

---

## ✅ Summary

- Use Cloudflare R2 for image storage
- Use SvelteKit backend to handle uploads
- Store only image URL in database
- Serve images via CDN for performance
- Keep backend simple and secure

---

## 🧩 Future Improvements

- Add image tagging system
- Add bulk upload support
- Add image moderation system
- Add caching headers for performance

---
