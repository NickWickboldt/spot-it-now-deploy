import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
// Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
export const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[CLOUDINARY CONFIG] Missing environment variables:', {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    });
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  
  console.log('[CLOUDINARY CONFIG] Cloudinary configured for cloud:', cloudName);
  return cloudinary;
};

export { cloudinary };

