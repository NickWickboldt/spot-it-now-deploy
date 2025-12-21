import { BASE_URL, fetchWithAuth } from './client';

type ResourceType = 'image' | 'video';

type SignResponse = {
  statusCode: number;
  data: {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    upload_preset: string;
    folder?: string;
    public_id?: string;
  };
};

export async function apiSignUpload(token: string, resourceType: ResourceType, folder?: string, publicId?: string) {
  return fetchWithAuth('/uploads/sign', token, {
    method: 'POST',
    body: JSON.stringify({ resourceType, folder, publicId }),
  }) as Promise<SignResponse>;
}

function guessMimeType(uri: string, resourceType: ResourceType): string {
  if (resourceType === 'video') return 'video/mp4';
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export async function uploadToCloudinarySigned(
  fileUri: string,
  token: string,
  resourceType: ResourceType = 'image',
  folder?: string,
  publicId?: string
): Promise<{ secure_url: string; public_id: string }> {
  const sign = await apiSignUpload(token, resourceType, folder, publicId);
  const { cloudName, apiKey, timestamp, signature, upload_preset, folder: signedFolder, public_id } = sign.data;

  const formData: any = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: public_id || `upload.${resourceType === 'image' ? 'jpg' : 'mp4'}`,
    type: guessMimeType(fileUri, resourceType),
  } as any);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('upload_preset', upload_preset);
  if (signedFolder) formData.append('folder', signedFolder);
  if (public_id) formData.append('public_id', public_id);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const resp = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error('[CLOUDINARY ERROR]', {
      status: resp.status,
      body: text,
      cloudName,
      resourceType
    });
    
    let errorMessage = `Cloudinary upload failed (${resp.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error && parsed.error.message) {
        errorMessage += `: ${parsed.error.message}`;
      } else {
        errorMessage += `: ${text}`;
      }
    } catch (e) {
      errorMessage += `: ${text}`;
    }
    
    throw new Error(errorMessage);
  }
  const json = await resp.json();
  return { secure_url: json.secure_url, public_id: json.public_id };
}

export function isRemoteUrl(url: string | undefined | null): boolean {
  return !!url && /^(https?:)?\/\//i.test(url);
}

