import { uploadService } from '../services/upload.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { log } from '../utils/logger.util.js';

// POST /uploads/sign
const signUpload = asyncHandler(async (req, res) => {
  const userId = req.user?._id || null;
  const { resourceType, folder, publicId } = req.body || {};
  const baseFolder = process.env.CLOUDINARY_BASE_FOLDER || 'spotitnow';

  const effectiveFolder = folder || `${baseFolder}/${resourceType === 'video' ? 'videos' : 'images'}`;

  const signed = uploadService.getUploadSignature({ resourceType, folder: effectiveFolder, publicId });
  log.info('upload-controller', 'Issued Cloudinary upload signature', { resourceType, folder: effectiveFolder }, userId);
  return res.status(200).json(new ApiResponse(200, signed, 'Upload signature created'));
});

// POST /cloudinary/webhook (optional)
const cloudinaryWebhook = asyncHandler(async (req, res) => {
  await uploadService.handleWebhook(req.body, req.headers);
  return res.status(200).json(new ApiResponse(200, { ok: true }, 'Webhook received'));
});

export { signUpload, cloudinaryWebhook };

