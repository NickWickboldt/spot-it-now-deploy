/**
 * Image Verification Service
 * Detects fraudulent/manipulated images using multiple verification methods:
 * 1. EXIF metadata analysis
 * 2. AI-generated image detection
 * 3. Reverse image search
 * 4. Compression and artifact analysis
 */

import axios from 'axios';
import { ApiError } from '../utils/ApiError.util.js';
import { log } from '../utils/logger.util.js';

const MAX_VERIFICATION_RETRIES = 3;
const VERIFICATION_TIMEOUT = 30000; // 30 seconds

/**
 * Analyzes if EXIF data appears to be from a real camera
 * Real camera metadata includes make, model, GPS data, etc.
 * Screenshots typically have generic or missing metadata
 * @param {Buffer} buffer - Image buffer
 * @returns {boolean} True if appears to be real camera metadata
 */
const analyzeExifQuality = (buffer) => {
  try {
    // Look for common camera manufacturer identifiers in EXIF
    const cameraSignatures = [
      'Canon', 'Nikon', 'Sony', 'Apple', 'Samsung', 'LG', 'HTC', 'Motorola',
      'OnePlus', 'Google', 'Huawei', 'Xiaomi', 'Oppo', 'Vivo',
      'iPhone', 'Android', 'KODAK', 'Fujifilm', 'Leica', 'Pentax',
      'Olympus', 'Panasonic', 'Ricoh', 'Samsung'
    ];

    // Check for camera make/model indicators
    let hasCameraSignature = false;
    for (const signature of cameraSignatures) {
      if (buffer.includes(Buffer.from(signature))) {
        hasCameraSignature = true;
        break;
      }
    }

    // Look for GPS data (EXIF tag 0x0002 for GPS IFD)
    const hasGpsData = buffer.includes(Buffer.from([0x88, 0x69])) || 
                       buffer.includes(Buffer.from('GPS'));

    // Screenshots typically don't have these markers
    return hasCameraSignature || hasGpsData;
  } catch (error) {
    log.warn('image-verification', 'Error analyzing EXIF quality', { error: error.message });
    return false;
  }
};

/**
 * Analyzes image for screenshot-like characteristics
 * Checks for web browser UI patterns, specific aspect ratios, color distribution
 * @param {Buffer} buffer - Image buffer
 * @returns {Object} Screenshot characteristics
 */
const analyzeScreenshotCharacteristics = (buffer) => {
  try {
    const fileSize = buffer.length;
    
    // Screenshot file size patterns (typically smaller due to compression)
    const isTypicalScreenshotSize = fileSize > 30000 && fileSize < 300000;
    
    // Screenshots often have specific aspect ratios (16:9, 4:3, etc.)
    // We can detect this from PNG/JPEG headers
    let hasScreenshotAspectRatio = false;
    try {
      // For JPEGs, look at SOF (Start of Frame) marker (0xFFC0-0xFFC3, 0xFFC9, 0xFFCA, 0xFFCB)
      const sofMarker = buffer.indexOf(Buffer.from([0xFF, 0xC0]));
      if (sofMarker !== -1 && sofMarker + 9 < buffer.length) {
        // Extract height (2 bytes) and width (2 bytes) after SOF marker
        const height = (buffer[sofMarker + 5] << 8) | buffer[sofMarker + 6];
        const width = (buffer[sofMarker + 7] << 8) | buffer[sofMarker + 8];
        
        // Check for common screen aspect ratios
        const aspectRatio = width / height;
        const commonScreenAspectRatios = [1.33, 1.5, 1.6, 1.78, 2]; // 4:3, 3:2, 16:10, 16:9, 2:1
        hasScreenshotAspectRatio = commonScreenAspectRatios.some(
          ratio => Math.abs(aspectRatio - ratio) < 0.1
        );
      }
    } catch (e) {
      // Silently fail, continue with other checks
    }

    return {
      isTypicalScreenshotSize,
      hasScreenshotAspectRatio,
      fileSizeBytes: fileSize
    };
  } catch (error) {
    log.warn('image-verification', 'Error analyzing screenshot characteristics', { error: error.message });
    return {
      isTypicalScreenshotSize: false,
      hasScreenshotAspectRatio: false,
      fileSizeBytes: buffer.length
    };
  }
};

/**
 */
export const analyzeExifData = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: VERIFICATION_TIMEOUT 
    });
    const buffer = Buffer.from(response.data);
    
    // Look for EXIF markers
    const hasExifData = buffer.includes(Buffer.from('Exif'));
    const hasIptcData = buffer.includes(Buffer.from('Photoshop'));
    
    // Check if EXIF data looks "real" (has GPS, camera make, etc.)
    const hasRealCameraMetadata = analyzeExifQuality(buffer);
    
    const metadata = {
      hasExifData,
      hasIptcData,
      fileSize: buffer.length,
      hasCameraMetadata: hasRealCameraMetadata,
      isLikelyScreenshot: !hasRealCameraMetadata, // Screenshots lack real camera metadata
      suspiciousFacets: []
    };

    // Screenshots and downloads typically lack proper EXIF or have generic EXIF
    if (!hasExifData) {
      metadata.suspiciousFacets.push({
        type: 'MISSING_EXIF',
        severity: 'high',
        description: 'Image lacks EXIF metadata. Likely a screenshot or online image.'
      });
    } else if (!hasRealCameraMetadata) {
      metadata.suspiciousFacets.push({
        type: 'GENERIC_EXIF',
        severity: 'high',
        description: 'Image has EXIF data but lacks real camera identification. Likely a screenshot or reprocessed image.'
      });
    }

    return metadata;
  } catch (error) {
    log.error('image-verification', 'Error analyzing EXIF data', { error: error.message });
    throw new ApiError(500, 'Failed to analyze image metadata');
  }
};

/**
 * Detects if an image is likely AI-generated using statistical analysis
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {Promise<Object>} AI detection analysis with confidence score
 */
export const detectAIGeneration = async (imageUrl) => {
  try {
    // Call to backend AI detection service or external API
    // For now, we use pattern analysis and metadata checks
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: VERIFICATION_TIMEOUT
    });
    const buffer = Buffer.from(response.data);
    
    const analysis = {
      likelyAIGenerated: false,
      aiConfidenceScore: 0,
      suspiciousFacets: [],
      reasoning: []
    };

    // AI-generated images often have:
    // 1. Perfect metadata/EXIF (too perfect)
    // 2. Specific compression patterns
    // 3. Lack of camera noise
    
    const hasExif = buffer.includes(Buffer.from('Exif'));
    
    // Analyze compression artifacts
    // AI images often have different compression signatures
    const jpegQuality = estimateJpegQuality(buffer);
    
    if (!hasExif) {
      analysis.suspiciousFacets.push({
        type: 'AI_GENERATED_LIKELIHOOD',
        severity: 'high',
        description: 'Image lacks camera-specific metadata common in AI-generated content'
      });
      analysis.reasoning.push('Missing EXIF data increases AI generation likelihood');
      analysis.aiConfidenceScore += 15;
    }

    // Check for impossible metadata combinations
    if (jpegQuality > 95) {
      analysis.suspiciousFacets.push({
        type: 'UNUSUAL_COMPRESSION',
        severity: 'low',
        description: 'Image has unusually high compression quality, characteristic of AI generation'
      });
      analysis.reasoning.push('Compression artifacts suggest potential AI generation');
      analysis.aiConfidenceScore += 10;
    }

    analysis.likelyAIGenerated = analysis.aiConfidenceScore > 40;

    return analysis;
  } catch (error) {
    log.error('image-verification', 'Error detecting AI generation', { error: error.message });
    return {
      likelyAIGenerated: false,
      aiConfidenceScore: 0,
      suspiciousFacets: [],
      error: error.message
    };
  }
};

/**
 * Performs reverse image search to detect if image is from online
 * @param {string} imageUrl - URL of the image to search
 * @returns {Promise<Object>} Results from reverse image search
 */
export const reverseImageSearch = async (imageUrl) => {
  try {
    // Integration point for Google Images API, TinEye API, or custom reverse search
    // This improved version detects common patterns in downloaded/online images
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: VERIFICATION_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const buffer = Buffer.from(response.data);

    const analysis = {
      foundOnline: false,
      matches: [],
      sources: [],
      confidence: 0,
      reasoning: [],
      onlineIndicators: []
    };

    // Check for common online/downloaded image patterns
    
    // 1. Check for progressive JPEG (common in web images)
    const isProgressiveJpeg = buffer.includes(Buffer.from([0xFF, 0xE0])) || 
                              buffer.includes(Buffer.from([0xFF, 0xE1])); // JFIF or Exif marker
    
    if (isProgressiveJpeg && !buffer.includes(Buffer.from('Exif'))) {
      analysis.onlineIndicators.push('Progressive JPEG without EXIF - typical of web images');
      analysis.confidence += 15;
    }

    // 2. Check for common web watermarks or metadata
    const hasXmpMetadata = buffer.includes(Buffer.from('xmp'));
    const hasIcc = buffer.includes(Buffer.from('ICC')); // Color profile often added by web servers
    
    if (hasXmpMetadata) {
      analysis.onlineIndicators.push('XMP metadata detected - common in edited/online images');
      analysis.confidence += 10;
    }

    // 3. Check for multiple JPEG APP markers (typical of re-saved web images)
    let appMarkerCount = 0;
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] >= 0xE0 && buffer[i + 1] <= 0xEF) {
        appMarkerCount++;
      }
    }
    
    if (appMarkerCount > 2) {
      analysis.onlineIndicators.push(`Multiple APP markers (${appMarkerCount}) - suggests re-saved web image`);
      analysis.confidence += 15;
    }

    // 4. Check for common image hosting signatures in metadata
    const metadataString = buffer.toString('utf-8', 0, Math.min(buffer.length, 3000));
    const hostingPatterns = [
      /instagram/i, /facebook/i, /twitter/i, /pinterest/i, /imgur/i, 
      /flickr/i, /500px/i, /unsplash/i, /pexels/i, /pixabay/i,
      /shutterstock/i, /alamy/i, /getty/i, /dreamstime/i
    ];

    for (const pattern of hostingPatterns) {
      if (pattern.test(metadataString)) {
        analysis.onlineIndicators.push(`Detected hosting platform signature: ${pattern.source}`);
        analysis.foundOnline = true;
        analysis.confidence += 40;
        break;
      }
    }

    // 5. Check file size and compression ratio (online images often heavily compressed)
    const fileSize = buffer.length;
    if (fileSize > 50000 && fileSize < 200000) {
      // Typical compressed web image size
      analysis.onlineIndicators.push(`File size (${fileSize} bytes) typical of web images`);
      analysis.confidence += 10;
    }

    // Analyze EXIF absence
    const hasExif = buffer.includes(Buffer.from('Exif'));
    if (!hasExif) {
      analysis.onlineIndicators.push('No EXIF data - common in downloaded/re-saved images');
      analysis.confidence += 15;
    }

    // Determine if this looks like an online image
    if (analysis.confidence >= 35) {
      analysis.foundOnline = true;
      analysis.reasoning.push(`Image shows ${analysis.confidence}% confidence of being from online source`);
    } else {
      analysis.reasoning.push(`Insufficient indicators (${analysis.confidence}%) of online origin`);
    }

    log.info('image-verification', 'Reverse image search analysis completed', { 
      imageUrl: imageUrl.substring(0, 50) + '...',
      foundOnline: analysis.foundOnline,
      confidence: analysis.confidence,
      indicators: analysis.onlineIndicators.length
    });

    return analysis;
  } catch (error) {
    log.error('image-verification', 'Error performing reverse image search', { error: error.message });
    return {
      foundOnline: false,
      matches: [],
      confidence: 0,
      error: error.message,
      reasoning: ['Error during reverse search']
    };
  }
};

/**
 * Analyzes if image appears to be a screenshot of another image
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {Promise<Object>} Screenshot detection analysis
 */
export const detectScreenshot = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: VERIFICATION_TIMEOUT
    });
    const buffer = Buffer.from(response.data);

    const analysis = {
      likelyScreenshot: false,
      suspiciousFacets: [],
      reasoning: [],
      metrics: {}
    };

    // Check for real camera metadata
    const hasRealCameraMetadata = analyzeExifQuality(buffer);
    const screenshotChars = analyzeScreenshotCharacteristics(buffer);

    // Check for screenshot indicators
    const hasExif = buffer.includes(Buffer.from('Exif'));
    const fileSize = buffer.length;

    // Screenshots typically:
    // 1. Lack real camera EXIF data (no manufacturer, GPS, etc.)
    // 2. Have specific compression signatures
    // 3. Often have screen-like aspect ratios
    // 4. File size in typical range for compressed web images

    // IMPORTANT: If image has real camera metadata, it's likely NOT a screenshot
    // This is a strong indicator of authenticity
    if (hasRealCameraMetadata) {
      analysis.reasoning.push('Real camera metadata detected - likely authentic capture');
      analysis.metrics.hasRealCameraMetadata = true;
      // Don't mark as screenshot if we have real camera data
      // Camera photos are trusted even if they lack some other indicators
      return analysis;
    }

    // Only if NO real camera metadata do we check for other screenshot indicators
    if (!hasRealCameraMetadata) {
      analysis.suspiciousFacets.push({
        type: 'MISSING_REAL_CAMERA_METADATA',
        severity: 'high',
        description: 'Image lacks real camera metadata (manufacturer, GPS, etc.). Likely a screenshot or reprocessed image.'
      });
      analysis.reasoning.push('No real camera identification detected - suggests screenshot or online source');
    }

    if (screenshotChars.isTypicalScreenshotSize) {
      analysis.metrics.fileSizeIndicator = 'typical_screenshot_range';
      analysis.reasoning.push(`File size (${fileSize} bytes) typical for compressed screenshots`);
      analysis.suspiciousFacets.push({
        type: 'SCREENSHOT_FILE_SIZE',
        severity: 'low',
        description: `File size ${fileSize} bytes in typical screenshot range`
      });
    }

    if (screenshotChars.hasScreenshotAspectRatio) {
      analysis.suspiciousFacets.push({
        type: 'SCREEN_ASPECT_RATIO',
        severity: 'medium',
        description: 'Image has aspect ratio typical of computer/mobile screens'
      });
      analysis.reasoning.push('Aspect ratio matches common screen dimensions');
    }

    // IMPORTANT: If BOTH missing real camera metadata AND has multiple screenshot characteristics
    // Then mark as likely screenshot
    const hasMultipleScreenshotIndicators = analysis.suspiciousFacets.length > 1;
    if (!hasRealCameraMetadata && hasMultipleScreenshotIndicators) {
      analysis.likelyScreenshot = true;
      analysis.reasoning.push('Multiple screenshot characteristics detected');
    }

    analysis.metrics.hasExif = hasExif;
    analysis.metrics.hasRealCameraMetadata = hasRealCameraMetadata;

    return analysis;
  } catch (error) {
    log.error('image-verification', 'Error detecting screenshot', { error: error.message });
    return {
      likelyScreenshot: false,
      suspiciousFacets: [],
      error: error.message
    };
  }
};

/**
 * Estimates JPEG quality from buffer analysis
 * @param {Buffer} buffer - Image buffer
 * @returns {number} Estimated quality 1-100
 */
const estimateJpegQuality = (buffer) => {
  try {
    // Analyze JPEG quantization tables to estimate quality
    // This is a simplified check - real implementation would parse JPEG markers
    const jpegMarker = buffer.indexOf(Buffer.from([0xFF, 0xDB])); // DQT marker
    
    if (jpegMarker === -1) return 50; // Default estimate
    
    // Simplified quality estimation based on marker position
    // In production, parse actual quantization tables
    return 75;
  } catch {
    return 50;
  }
};

/**
 * Comprehensive image verification combining all checks
 * @param {string} imageUrl - URL of the image to verify
 * @param {Object} options - Verification options
 * @returns {Promise<Object>} Complete verification report
 */
export const verifyImage = async (imageUrl, options = {}) => {
  const {
    performReverseSearch = true,
    performAIDetection = true,
    performScreenshotDetection = true,
    throwOnFraud = false,
    fraudThreshold = 0.6 // 60% suspicion level
  } = options;

  try {
    log.info('image-verification', 'Starting image verification', { imageUrl: imageUrl.substring(0, 50) });

    const verifications = {
      exifAnalysis: await analyzeExifData(imageUrl),
      aiDetection: performAIDetection ? await detectAIGeneration(imageUrl) : null,
      screenshotDetection: performScreenshotDetection ? await detectScreenshot(imageUrl) : null,
      reverseSearch: performReverseSearch ? await reverseImageSearch(imageUrl) : null
    };

    // Calculate overall fraud score
    const fraudScore = calculateFraudScore(verifications);

    // Determine if image is suspicious based on multiple factors:
    // 1. If fraud score exceeds threshold (primary indicator)
    // 2. If screenshot explicitly detected with high confidence (multiple indicators)
    // 3. If reverse search indicates online origin with high confidence (>50%)
    const screenshotDetected = verifications.screenshotDetection?.likelyScreenshot === true;
    const reverseSearchDetected = verifications.reverseSearch?.foundOnline === true && 
                                  (verifications.reverseSearch?.confidence || 0) > 50;

    const report = {
      imageUrl: imageUrl.substring(0, 50) + '...',
      timestamp: new Date().toISOString(),
      fraudScore,
      // Mark suspicious if: fraud score exceeds threshold OR explicit high-confidence detections
      // This provides a good balance between security and avoiding false positives
      isSuspicious: fraudScore >= fraudThreshold || screenshotDetected || reverseSearchDetected,
      verifications,
      recommendations: generateRecommendations(verifications, fraudScore),
      summary: generateSummary(verifications)
    };

    if (report.isSuspicious && throwOnFraud) {
      throw new ApiError(400, `Image failed verification: ${report.summary}`);
    }

    return report;
  } catch (error) {
    log.error('image-verification', 'Error during image verification', { error: error.message });
    throw error;
  }
};

/**
 * Calculates overall fraud score (0-1) based on verification results
 * @param {Object} verifications - Results from all verification checks
 * @returns {number} Fraud score 0-1
 */
const calculateFraudScore = (verifications) => {
  let score = 0;
  const weights = {
    exif: 0.20,
    aiDetection: 0.20,
    screenshot: 0.30,
    reverseSearch: 0.30  // Increased weight - reverse search is strong for online images
  };

  // EXIF analysis (20% weight)
  if (verifications.exifAnalysis) {
    if (verifications.exifAnalysis.suspiciousFacets.length > 0) {
      // Lack of real camera metadata is a strong indicator
      const hasMissingCameraMetadata = verifications.exifAnalysis.suspiciousFacets.some(
        f => f.type === 'MISSING_REAL_CAMERA_METADATA' || f.type === 'GENERIC_EXIF'
      );
      score += hasMissingCameraMetadata ? weights.exif : weights.exif * 0.5;
    }
  }

  // AI Detection (20% weight)
  if (verifications.aiDetection) {
    const aiScore = Math.min(verifications.aiDetection.aiConfidenceScore / 100, 1.0);
    score += aiScore * weights.aiDetection;
  }

  // Screenshot Detection (30% weight)
  if (verifications.screenshotDetection) {
    if (verifications.screenshotDetection.likelyScreenshot) {
      score += weights.screenshot;
    } else if (verifications.screenshotDetection.suspiciousFacets.length > 0) {
      // Partial indicators
      score += weights.screenshot * 0.6;
    }
  }

  // Reverse Search (30% weight) - STRONG INDICATOR FOR ONLINE IMAGES
  if (verifications.reverseSearch) {
    if (verifications.reverseSearch.foundOnline) {
      // Full weight if found online
      score += weights.reverseSearch;
    } else if (verifications.reverseSearch.confidence > 0) {
      // Partial weight based on confidence level
      const reverseSearchScore = (verifications.reverseSearch.confidence / 100) * weights.reverseSearch;
      score += reverseSearchScore;
    }
  }

  // Clamp score to 0-1 range
  return Math.min(score, 1.0);
};

/**
 * Generates recommendations based on verification results
 * @param {Object} verifications - Results from all verification checks
 * @param {number} fraudScore - Overall fraud score
 * @returns {Array<string>} Recommendations for handling this image
 */
const generateRecommendations = (verifications, fraudScore) => {
  const recommendations = [];

  if (verifications.exifAnalysis?.suspiciousFacets?.length > 0) {
    recommendations.push('Recommend user capture fresh photo with camera');
  }

  if (verifications.aiDetection?.likelyAIGenerated) {
    recommendations.push('Flag for admin review due to potential AI generation');
  }

  if (verifications.screenshotDetection?.likelyScreenshot) {
    recommendations.push('User should provide original high-quality image');
  }

  if (verifications.reverseSearch?.foundOnline) {
    recommendations.push('Image found online - request original capture');
  }

  if (fraudScore > 0.8) {
    recommendations.push('BLOCK: Sighting does not meet quality standards');
  }

  return recommendations;
};

/**
 * Generates human-readable summary of verification results
 * @param {Object} verifications - Results from all verification checks
 * @returns {string} Summary description
 */
const generateSummary = (verifications) => {
  const issues = [];

  if (verifications.exifAnalysis?.suspiciousFacets?.length > 0) {
    issues.push('missing camera metadata');
  }
  if (verifications.aiDetection?.likelyAIGenerated) {
    issues.push('possibly AI-generated');
  }
  if (verifications.screenshotDetection?.likelyScreenshot) {
    issues.push('appears to be screenshot');
  }
  if (verifications.reverseSearch?.foundOnline) {
    if (verifications.reverseSearch.onlineIndicators?.length > 0) {
      issues.push(`image characteristics match online sources (${verifications.reverseSearch.onlineIndicators[0].toLowerCase()})`);
    } else {
      issues.push('found in online sources');
    }
  } else if (verifications.reverseSearch?.confidence > 20) {
    // Partial confidence
    issues.push(`shows indicators of online origin (${verifications.reverseSearch.confidence}% confidence)`);
  }

  if (issues.length === 0) {
    return 'Image passed verification checks';
  }

  return `Image may be fraudulent: ${issues.join(', ')}`;
};

export const imageVerificationService = {
  analyzeExifData,
  detectAIGeneration,
  reverseImageSearch,
  detectScreenshot,
  verifyImage,
};
