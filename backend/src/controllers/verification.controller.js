/**
 * Sighting Verification Controller
 * Handles image fraud detection and sighting verification
 */

import { imageVerificationService } from '../services/imageVerification.service.js';
import { ApiError } from '../utils/ApiError.util.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { log } from '../utils/logger.util.js';

/**
 * Endpoint to verify a single image for fraud indicators
 * POST /verify/image
 * Body: { imageUrl: string }
 */
export const verifySingleImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body || {};
  const userId = req.user?._id;

  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new ApiError(400, 'imageUrl is required and must be a string');
  }

  try {
    const verificationReport = await imageVerificationService.verifyImage(imageUrl, {
      performReverseSearch: true,
      performAIDetection: true,
      performScreenshotDetection: true,
      fraudThreshold: 0.5
    });

    log.info('sighting-verification', 'Image verification completed', {
      userId,
      fraudScore: verificationReport.fraudScore,
      isSuspicious: verificationReport.isSuspicious
    });

    return res.status(200).json(new ApiResponse(
      200,
      {
        fraudScore: verificationReport.fraudScore,
        isSuspicious: verificationReport.isSuspicious,
        summary: verificationReport.summary,
        recommendations: verificationReport.recommendations,
        details: {
          exif: verificationReport.verifications.exifAnalysis,
          aiDetection: verificationReport.verifications.aiDetection,
          screenshot: verificationReport.verifications.screenshotDetection
        },
        verifications: {
          screenshotDetection: verificationReport.verifications.screenshotDetection,
          reverseSearch: verificationReport.verifications.reverseSearch
        }
      },
      'Image verification completed'
    ));
  } catch (error) {
    log.error('sighting-verification', 'Error verifying image', { error: error.message, userId });
    throw new ApiError(500, 'Image verification failed');
  }
});

/**
 * Endpoint to verify multiple images (batch)
 * POST /verify/images
 * Body: { imageUrls: string[] }
 */
export const verifyMultipleImages = asyncHandler(async (req, res) => {
  const { imageUrls } = req.body || {};
  const userId = req.user?._id;

  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    throw new ApiError(400, 'imageUrls must be a non-empty array');
  }

  if (imageUrls.length > 10) {
    throw new ApiError(400, 'Maximum 10 images per verification request');
  }

  try {
    const verificationReports = await Promise.all(
      imageUrls.map(url =>
        imageVerificationService.verifyImage(url, {
          performReverseSearch: false, // Disable for batch to save time
          performAIDetection: true,
          performScreenshotDetection: true,
          fraudThreshold: 0.5
        }).catch(error => ({
          imageUrl: url,
          error: error.message,
          fraudScore: 0,
          isSuspicious: false
        }))
      )
    );

    const suspiciousCount = verificationReports.filter(r => r.isSuspicious).length;

    log.info('sighting-verification', 'Batch image verification completed', {
      userId,
      totalImages: imageUrls.length,
      suspiciousCount
    });

    return res.status(200).json(new ApiResponse(
      200,
      {
        totalImages: imageUrls.length,
        suspiciousCount,
        reports: verificationReports
      },
      'Batch verification completed'
    ));
  } catch (error) {
    log.error('sighting-verification', 'Error verifying batch images', { error: error.message, userId });
    throw new ApiError(500, 'Batch verification failed');
  }
});

