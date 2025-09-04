import { configureCloudinary, cloudinary } from '../config/cloudinary.config.js';
import { ApiError } from '../utils/ApiError.util.js';
import { log } from '../utils/logger.util.js';

configureCloudinary();

const RESOURCE_TYPES = new Set(['image', 'video']);

/**
 * Creates a signed payload for direct uploads to Cloudinary from the client.
 * @param {object} params
 * @param {'image'|'video'} params.resourceType
 * @param {string} [params.folder]
 * @param {string} [params.publicId]
 * @returns {{
 *  cloudName: string,
 *  apiKey: string,
 *  timestamp: number,
 *  signature: string,
 *  upload_preset: string,
 *  folder?: string,
 *  public_id?: string
 * }}
 */
const getUploadSignature = ({ resourceType, folder, publicId }) => {
  if (!RESOURCE_TYPES.has(resourceType)) {
    throw new ApiError(400, 'Invalid resourceType. Expected image or video.');
  }

  const isImage = resourceType === 'image';
  const uploadPreset = isImage
    ? process.env.CLOUDINARY_IMG_PRESET
    : process.env.CLOUDINARY_VIDEO_PRESET;

  if (!uploadPreset) {
    throw new ApiError(500, 'Cloudinary upload preset is not configured.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = {
    timestamp,
    upload_preset: uploadPreset,
  };
  if (folder) toSign.folder = folder;
  if (publicId) toSign.public_id = publicId;

  // Use SDK to sign
  const signature = cloudinary.utils.api_sign_request(
    toSign,
    process.env.CLOUDINARY_API_SECRET
  );

  log.debug('upload-service', 'Generated Cloudinary signature', { resourceType, folder: folder || null, hasPublicId: !!publicId });

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    upload_preset: uploadPreset,
    ...(folder ? { folder } : {}),
    ...(publicId ? { public_id: publicId } : {}),
  };
};

/**
 * Placeholder to verify Cloudinary webhooks (optional enhancement).
 * For now, we accept payloads and log them. Add signature verification as needed.
 */
const handleWebhook = async (payload, headers) => {
  try {
    // In production, verify signature using SDK
    // const valid = cloudinary.utils.webhook_signature_is_valid(JSON.stringify(payload), headers['x-cld-timestamp'], headers['x-cld-signature']);
    // if (!valid) throw new ApiError(401, 'Invalid webhook signature');

    log.info('upload-service', 'Received Cloudinary webhook', {
      event: payload?.notification_type || payload?.type || 'unknown',
      resourceType: payload?.resource_type,
      public_id: payload?.public_id,
      status: payload?.status,
    });

    return { ok: true };
  } catch (e) {
    log.error('upload-service', 'Error handling Cloudinary webhook', { error: e?.message || e });
    throw e;
  }
};

export const uploadService = {
  getUploadSignature,
  handleWebhook,
};

