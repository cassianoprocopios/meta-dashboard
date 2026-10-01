import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

type StorageProvider = "s3" | "manus";

type StorageConfig = {
  provider: StorageProvider;
  bucket?: string;
  publicBaseUrl?: string;
  signedUrlTtlSeconds: number;
  client?: S3Client;
  manusBaseUrl?: string;
  manusApiKey?: string;
};

function normalizeKey(relKey: string): string {
  const key = relKey.replace(/^\/+/, "");
  if (!key || key.includes("..")) throw new Error("Invalid storage key");
  return key;
}

function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER ?? "s3") as StorageProvider;
  const signedUrlTtlSeconds = Number.parseInt(
    process.env.STORAGE_SIGNED_URL_TTL_SECONDS ?? "900",
    10,
  );

  if (provider === "manus") {
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      throw new Error(
        "Legacy Manus storage requires BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
      );
    }
    return {
      provider,
      signedUrlTtlSeconds,
      manusBaseUrl: ENV.forgeApiUrl.replace(/\/+$/, ""),
      manusApiKey: ENV.forgeApiKey,
    };
  }

  if (provider !== "s3") throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);

  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 storage requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY",
    );
  }

  return {
    provider,
    bucket,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, ""),
    signedUrlTtlSeconds,
    client: new S3Client({
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION || "auto",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string,
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

async function storagePutManus(
  config: StorageConfig,
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const uploadUrl = new URL(
    "v1/storage/upload",
    ensureTrailingSlash(config.manusBaseUrl!),
  );
  uploadUrl.searchParams.set("path", key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(config.manusApiKey!),
    body: toFormData(data, contentType, key.split("/").pop() ?? key),
  });
  if (!response.ok) throw new Error(`Legacy storage upload failed (${response.status})`);
  return { key, url: (await response.json()).url };
}

async function storageGetManus(
  config: StorageConfig,
  key: string,
): Promise<{ key: string; url: string }> {
  const downloadUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(config.manusBaseUrl!),
  );
  downloadUrl.searchParams.set("path", key);
  const response = await fetch(downloadUrl, {
    headers: buildAuthHeaders(config.manusApiKey!),
  });
  if (!response.ok) throw new Error(`Legacy storage download URL failed (${response.status})`);
  return { key, url: (await response.json()).url };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const config = getStorageConfig();
  if (config.provider === "manus") return storagePutManus(config, key, data, contentType);

  await config.client!.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }),
  );

  const url = config.publicBaseUrl
    ? `${config.publicBaseUrl}/${encodeURI(key)}`
    : await getSignedUrl(
        config.client!,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: config.signedUrlTtlSeconds },
      );
  return { key, url };
}

export async function storageGet(
  relKey: string,
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const config = getStorageConfig();
  if (config.provider === "manus") return storageGetManus(config, key);

  const url = config.publicBaseUrl
    ? `${config.publicBaseUrl}/${encodeURI(key)}`
    : await getSignedUrl(
        config.client!,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: config.signedUrlTtlSeconds },
      );
  return { key, url };
}
