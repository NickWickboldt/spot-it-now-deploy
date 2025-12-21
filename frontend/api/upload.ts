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
  // Strip query params if any
  const cleanUri = uri.split('?')[0].toLowerCase();
  if (cleanUri.endsWith('.png')) return 'image/png';
  if (cleanUri.endsWith('.webp')) return 'image/webp';
  if (cleanUri.endsWith('.heic') || cleanUri.endsWith('.heif')) return 'image/heic';
  if (cleanUri.endsWith('.jpg') || cleanUri.endsWith('.jpeg')) return 'image/jpeg';
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
  
  if (!sign || !sign.data) {
    throw new Error('Failed to get upload signature from server');
  }

  const { cloudName, apiKey, timestamp, signature, upload_preset, folder: signedFolder, public_id } = sign.data;

  const formData: any = new FormData();
  
  // If we have a signature, it's a signed upload
  if (signature) {
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
  }
  
  // These are required for both signed and unsigned (if the preset is unsigned)
  formData.append('upload_preset', upload_preset);
  if (signedFolder) formData.append('folder', signedFolder);
  if (public_id) formData.append('public_id', public_id);
  
  formData.append('file', {
    uri: fileUri,
    name: public_id || `upload.${resourceType === 'image' ? 'jpg' : 'mp4'}`,
    type: guessMimeType(fileUri, resourceType),
  } as any);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  
  let resp;
  try {
    resp = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
  } catch (fetchError: any) {
    console.error('[CLOUDINARY FETCH ERROR]', fetchError);
    throw new Error(`Network error during Cloudinary upload: ${fetchError.message}`);
  }

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

