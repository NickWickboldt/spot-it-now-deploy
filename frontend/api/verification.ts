import { fetchWithAuth } from './client';

export type ImageVerificationReport = {
  fraudScore: number;
  isSuspicious: boolean;
  summary: string;
  recommendations: string[];
  details: {
    exif: any;
    aiDetection: any;
    screenshot: any;
  };
  verifications?: {
    screenshotDetection?: {
      likelyScreenshot?: boolean;
      confidence?: number;
    };
    reverseSearch?: {
      foundOnline?: boolean;
      confidence?: number;
    };
    exifAnalysis?: any;
    aiDetection?: any;
  };
};

/**
 * Verify a single image for fraud indicators
 */
export async function apiVerifyImage(token: string, imageUrl: string): Promise<ImageVerificationReport> {
  const response = await fetchWithAuth('/verify/image', token, {
    method: 'POST',
    body: JSON.stringify({ imageUrl }),
  });
  
  // Extract data from ApiResponse wrapper
  return response.data || response;
}

/**
 * Verify multiple images in batch
 */
export async function apiVerifyImages(token: string, imageUrls: string[]): Promise<{
  totalImages: number;
  suspiciousCount: number;
  reports: ImageVerificationReport[];
}> {
  const response = await fetchWithAuth('/verify/images', token, {
    method: 'POST',
    body: JSON.stringify({ imageUrls }),
  });
  
  // Extract data from ApiResponse wrapper
  return response.data || response;
}

