import { MaterialIcons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CameraCapturedPicture, CameraType, CameraView, useCameraPermissions } from "expo-camera";
// Use legacy API to avoid SDK 54 migration error for readAsStringAsync
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from "react"; // 1. Import useCallback
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import { apiCreateSighting } from '../../api/sighting';
import { isRemoteUrl, uploadToCloudinarySigned } from '../../api/upload';
import { apiVerifyImage } from '../../api/verification';
import ConfirmationModal from "../../components/ConfirmationModal";
import ImageCropModal from '../../components/ImageCropModal';
import VideoFramePickerModal from '../../components/VideoFramePickerModal';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { setCaptureState, setTakePictureRef } from '../captureRegistry';


const API_KEY = "AIzaSyCZOLCu2c-fTsGqN2oy2Gl_hSPaFTq2V30";
const genAI = new GoogleGenerativeAI(API_KEY);


interface SightingForm {
  caption: string;
  isPrivate: boolean;
  mediaUrls: string[];
  latitude: number | null;
  longitude: number | null;
  identification?: {
    source: 'AI' | 'USER';
    commonName: string;
    scientificName?: string;
    confidence?: number;
  };
}

type AnalysisResult = {
  type: string,
  animal: string;
  species: string;
  confidence: number;
  reasoning: string;
  isScreenshot?: boolean;
  screenshotEvidence?: string | null;
};

function guessMimeType(uri: string): string {
  const lower = uri.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.startsWith('data:image/jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

async function fileToGenerativePart(uri: string, mimeType?: string) {
  const base64ImageData = await FileSystem.readAsStringAsync(uri, {
    // SDK 54 typing accepts string literal
    encoding: 'base64' as any,
  });
  return {
    inlineData: {
      data: base64ImageData,
      mimeType: mimeType || guessMimeType(uri),
    },
  };
}

export default function SpotItScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [frameUri, setFrameUri] = useState<string | null>(null);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);


  const [zoom, setZoom] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  
  const navigation = useNavigation();


  const baseZoom = useRef(0);


  const { token } = useAuth();
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingForm, setSightingForm] = useState<SightingForm>({
    caption: '',
    isPrivate: false,
    mediaUrls: [],
    latitude: null,
    longitude: null,
  });
  // New: manual / ambiguous identification states
  const [showAmbiguousModal, setShowAmbiguousModal] = useState(false);
  const [showManualInputModal, setShowManualInputModal] = useState(false);
  const [manualCommonName, setManualCommonName] = useState('');
  const [manualScientificName, setManualScientificName] = useState('');

  // Image verification states
  const [imageVerification, setImageVerification] = useState<any>(null);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);
  const [verificationWarningMessage, setVerificationWarningMessage] = useState('');
  const [captureMethod, setCaptureMethod] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');

  const resetManualInputs = () => {
    setManualCommonName('');
    setManualScientificName('');
  };


    const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to upload images');
      return false;
    }
    return true;
  };
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to post sightings.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location');
      return null;
    }
  };

  const onPinchHandlerStateChange = (event) => {
  if (event.nativeEvent.oldState === State.ACTIVE) {
    const { scale } = event.nativeEvent;
    
    console.log(`Gesture Ended! Scale: ${scale.toFixed(2)}, Last Zoom: ${baseZoom.current.toFixed(2)}`);
    const SENSITIVITY = 5;
    const newZoom = baseZoom.current + (scale - 1) / SENSITIVITY;

    const clampedZoom = Math.max(0, Math.min(newZoom, 1));
    
    console.log(`New Clamped Zoom: ${clampedZoom.toFixed(2)}`);

    setZoom(clampedZoom);
    baseZoom.current = clampedZoom;
  }
};



    const analyzeImage = async (uri: string, modelName: string, prompt: string): Promise<AnalysisResult | null> => {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
  const imagePart = await fileToGenerativePart(uri);
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        console.log(`Gemini Raw Response (${modelName}):`, responseText);
        
        const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedResponse);
      } catch (e) {
        console.error(`Error during analysis with ${modelName}:`, e);
        Alert.alert("Analysis Error", "Could not get a valid response from the AI model.");
        return null;
      }
    };

  // Unified analyzer that applies thresholds and opens the right modal
  const analyzeAndHandle = useCallback(async (uri: string) => {
    setIsProcessing(true);
    try {
      // Verify image authenticity first
      const isVerified = await verifyImageBeforeAnalysis(uri);
      if (!isVerified) {
        setIsProcessing(false);
        return; // User chose to retake
      }

      const prompt = `
      Analyze the image carefully and provide your output in a single, clean JSON object.

      CRITICAL: First check if this image is a screenshot, photo of a photo, unnatural scenario, or image of a screen:
      - Look for browser UI elements, status bars, menu bars, or window frames
      - Look for visible screen bezels, reflections, or screen distortion
      - Look for photos printed/displayed on screens or other surfaces being photographed
      - Look for watermarks, logos, or text overlays typical of online images
      - Look for animals wearing unnatural objects (sunglasses, hats, clothing unless domestic animals)
      - Look for animals making unnatural gestures (peace signs, rock-on gestures, waving hands)
      - Look for impossibly posed or arranged animals
      - Look for animated characters, cartoons, or illustrations instead of real animals
      - Look for impossible anatomical features or proportions for that species
      - If any of these are detected, set "isScreenshot" to true and explain in "screenshotEvidence"
      
      **JSON Key Definitions and Structure:**
      - **"isScreenshot"**: Boolean - true if image is a screenshot, photo of photo, from online source, or shows unnatural/impossible animals. false if authentic direct capture of real animal.
      - **"screenshotEvidence"**: String - if isScreenshot is true, explain what made you think this (e.g., "Visible browser bar at top", "Watermark present", "Animal wearing sunglasses", "Cartoon character", "Unnatural pose"). null if isScreenshot is false.
      - **"type"**: A broad category like 'Bird', 'Mammal', 'Insect', 'Reptile'.
      - **"animal"**: The specific common name of the animal, e.g., 'Bald Eagle', 'Grizzly Bear'.
      - **"species"**: The scientific (Latin) name, enclosed in parentheses, e.g., '(Haliaeetus leucocephalus)'.
      - **"confidence"**: Your confidence in the identification from 0-100, be as exact as possible try to really nail down the score. Set to 0 if isScreenshot is true.
      - **"reasoning"**: A brief justification for your identification.

      **Example Output - Authentic Animal:**
      {
        "isScreenshot": false,
        "screenshotEvidence": null,
        "type": "Bird",
        "animal": "Lilac-breasted Roller",
        "species": "Coracias caudatus",
        "confidence": 98,
        "reasoning": "The image shows a bird with vibrant, multi-colored plumage including a lilac throat and blue belly, which are key identifiers."
      }

      **Example Output - Screenshot/Photo of Photo:**
      {
        "isScreenshot": true,
        "screenshotEvidence": "Image shows Wikipedia article page with browser UI visible and article text clearly readable",
        "type": "N/A",
        "animal": "None",
        "species": "N/A",
        "confidence": 0,
        "reasoning": "Image is a screenshot of an online article, not an authentic fresh capture."
      }

      **Example Output - Unnatural Animal (Fake):**
      {
        "isScreenshot": true,
        "screenshotEvidence": "Animal wearing sunglasses and making rock-on gesture - this is unnatural and appears to be a composite or cartoon image",
        "type": "N/A",
        "animal": "None",
        "species": "N/A",
        "confidence": 0,
        "reasoning": "Image shows an animal in an impossible/unnatural scenario that indicates it is not an authentic wildlife photo."
      }

      **No Animal Case (Authentic Image):**
      {
        "isScreenshot": false,
        "screenshotEvidence": null,
        "type": "N/A",
        "animal": "None",
        "species": "N/A",
        "confidence": 0,
        "reasoning": "No animal could be clearly identified in the image."
      }
      `;

      const analysis = await analyzeImage(uri, 'gemini-2.5-flash', prompt);
      const HIGH_CONFIDENCE_THRESHOLD = 55;
      const LOW_CONFIDENCE_THRESHOLD = 0;

      if (!analysis) throw new Error('Analysis returned null');

      // Check if AI detected this as a screenshot/photo of photo/unnatural
      if (analysis.isScreenshot) {
        Alert.alert(
          'Invalid Image Detected',
          `This image is not a valid authentic wildlife photo:\n\n${analysis.screenshotEvidence || 'Image contains elements that indicate it is not an authentic capture'}\n\nPlease capture a fresh photo directly with your camera instead.`,
          [
            {
              text: 'Retake',
              style: 'default',
              onPress: () => {
                setPhotoUri(null);
                setImageVerification(null);
                setAnalysisResult(null);
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return; // Stop processing
      }

      if (analysis.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
        setAnalysisResult(analysis);
        setModalVisible(true);
      } else if (analysis.confidence >= LOW_CONFIDENCE_THRESHOLD) {
        // Force ambiguous modal flow for consistency
        setAnalysisResult(analysis.animal.toLowerCase() === 'none' ? {
          type: analysis.type || 'N/A',
          animal: 'Unknown',
          species: 'N/A',
          confidence: analysis.confidence ?? 0,
          reasoning: analysis.reasoning || 'Model could not confidently identify an animal.'
        } : analysis);
        setShowAmbiguousModal(true);
      } else {
        Alert.alert('Nothing Spotted', "We couldn't identify an animal in this picture.");
      }
    } catch (err) {
      console.error('analyzeAndHandle error', err);
      Alert.alert('Error', 'Failed to analyze the image');
    } finally {
      setIsProcessing(false);
    }
  }, [analyzeImage]);

/**
 * Verify an image for fraud indicators before proceeding with analysis
 */
const verifyImageBeforeAnalysis = async (uri: string): Promise<boolean> => {
  if (!token || isRemoteUrl(uri)) {
    // Skip verification for remote URLs (already uploaded) or if no token
    console.log('Skipping verification - remote URL or no token');
    setImageVerification({
      fraudScore: 0,
      isSuspicious: false,
      summary: 'Verification skipped for remote URLs',
      recommendations: [],
      details: {}
    });
    return true;
  }

  try {
    console.log('Verifying image for fraud indicators...');
    // NOTE: Do NOT set isProcessing here - let parent function manage it
    
    // Upload to temporary location first for verification
    console.log('Uploading image to Cloudinary for verification...');
    const uploadForVerification = await uploadToCloudinarySigned(uri, token, 'image', 'spotitnow/verification');
    const verificationUrl = uploadForVerification.secure_url;
    console.log('Image uploaded for verification:', verificationUrl);

    // Run verification checks
    console.log('Calling verification API...');
    const verification = await apiVerifyImage(token, verificationUrl);
    
    console.log('Verification API response:', verification);
    setImageVerification(verification);
    
    if (verification && verification.isSuspicious) {
      // Image failed verification - show warning
      const detailedMessage = verification.summary || 'Image quality concern detected';
      setVerificationWarningMessage(detailedMessage);
      setShowVerificationWarning(true);
      
      console.warn('Image verification failed:', verification);
      
      // Screenshot or online image detected - BLOCK these
      const screenshotDetected = verification.verifications?.screenshotDetection?.likelyScreenshot === true;
      const onlineImageDetected = verification.verifications?.reverseSearch?.foundOnline === true;
      
      if (screenshotDetected || onlineImageDetected) {
        // Hard block - screenshots and online images are not allowed
        Alert.alert(
          'Image Not Allowed',
          'This image is not a fresh camera capture.\n\n' +
          (screenshotDetected ? 'Detected: Screenshot' : 'Detected: Image from internet') +
          '\n\nPlease use photos taken directly with your camera:\n' +
          '• Fresh wildlife photos only\n' +
          '• Not screenshots or downloads\n' +
          '• Good lighting and focus required',
          [
            {
              text: 'Retake Photo',
              style: 'default',
              onPress: () => {
                setPhotoUri(null);
                setImageVerification(null);
                setShowVerificationWarning(false);
              }
            }
          ]
        );
        
        return false; // Block - do not allow to continue
      } else {
        // High fraud score but not explicitly screenshot/online - soft warning
        Alert.alert(
          'Image Quality Note',
          detailedMessage + '\n\nYou can continue, but fresh camera photos are preferred.',
          [
            {
              text: 'Retake Photo',
              style: 'default',
              onPress: () => {
                setPhotoUri(null);
                setImageVerification(null);
                setShowVerificationWarning(false);
              }
            },
            {
              text: 'Continue Anyway',
              style: 'cancel'
            }
          ]
        );
        
        return true; // Allow with warning
      }
    }
    
    console.log('Image verification passed');
    return true; // Image passed verification
  } catch (error) {
    console.error('Error during image verification:', error);
    // Don't block on verification errors - allow user to continue
    // but log the error
    Alert.alert(
      'Verification Note',
      'Could not verify image quality due to a network issue, but you can continue.',
      [{ text: 'OK', onPress: () => {} }]
    );
    return true;
  }
  // NOTE: Removed finally block - parent function manages isProcessing state
};

    // Add with other functions in SpotItScreen
const handleUploadImage = async () => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return;

  try {
  // Switching to image flow: discard any pending recorded video
  setRecordedVideoUri(null);
  setFrameUri(null);
  setIsVideoMode(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setCaptureMethod('UPLOAD'); // Mark as uploaded image
      
      // Verify image authenticity first
      const isVerified = await verifyImageBeforeAnalysis(result.assets[0].uri);
      if (!isVerified) {
        return; // User chose to retake
      }
      
      // Analyze the selected image
      setIsProcessing(true);

      const prompt = `
      Analyze the image carefully and provide your output in a single, clean JSON object.

      CRITICAL: First check if this image is a screenshot, photo of a photo, unnatural scenario, or image of a screen:
      - Look for browser UI elements, status bars, menu bars, or window frames
      - Look for visible screen bezels, reflections, or screen distortion
      - Look for photos printed/displayed on screens or other surfaces being photographed
      - Look for watermarks, logos, or text overlays typical of online images
      - Look for animals wearing unnatural objects (sunglasses, hats, clothing unless domestic animals)
      - Look for animals making unnatural gestures (peace signs, rock-on gestures, waving hands)
      - Look for impossibly posed or arranged animals
      - Look for animated characters, cartoons, or illustrations instead of real animals
      - Look for impossible anatomical features or proportions for that species
      - If any of these are detected, set "isScreenshot" to true and explain in "screenshotEvidence"
      
      **JSON Key Definitions and Structure:**
      - **"isScreenshot"**: Boolean - true if image is a screenshot, photo of photo, from online source, or shows unnatural/impossible animals. false if authentic direct capture of real animal.
      - **"screenshotEvidence"**: String - if isScreenshot is true, explain what made you think this (e.g., "Visible browser bar at top", "Watermark present", "Animal wearing sunglasses", "Cartoon character", "Unnatural pose"). null if isScreenshot is false.
      - **"type"**: A broad category like 'Bird', 'Mammal', 'Insect', 'Reptile'.
      - **"animal"**: The specific common name of the animal, e.g., 'Bald Eagle', 'Grizzly Bear'.
      - **"species"**: The scientific (Latin) name, enclosed in parentheses, e.g., '(Haliaeetus leucocephalus)'.
      - **"confidence"**: Your confidence in the identification from 0-100, be as exact as possible try to really nail down the score. Set to 0 if isScreenshot is true.
      - **"reasoning"**: A brief justification for your identification.

      **Example Output - Authentic Animal:**
      {
        "isScreenshot": false,
        "screenshotEvidence": null,
        "type": "Bird",
        "animal": "Lilac-breasted Roller",
        "species": "Coracias caudatus",
        "confidence": 98,
        "reasoning": "The image shows a bird with vibrant, multi-colored plumage including a lilac throat and blue belly, which are key identifiers."
      }

      **Example Output - Screenshot/Photo of Photo:**
      {
        "isScreenshot": true,
        "screenshotEvidence": "Image shows Wikipedia article page with browser UI visible and article text clearly readable",
        "type": "N/A",
        "animal": "None",
        "species": "N/A",
        "confidence": 0,
        "reasoning": "Image is a screenshot of an online article, not an authentic fresh capture."
      }

      **Example Output - Unnatural Animal (Fake):**
      {
        "isScreenshot": true,
        "screenshotEvidence": "Animal wearing sunglasses and making rock-on gesture - this is unnatural and appears to be a composite or cartoon image",
        "type": "N/A",
        "animal": "None",
        "species": "N/A",
        "confidence": 0,
        "reasoning": "Image shows an animal in an impossible/unnatural scenario that indicates it is not an authentic wildlife photo."
      }

      **No Animal Case (Authentic Image):**
      {
        "isScreenshot": false,
        "screenshotEvidence": null,
        "type": "N/A",
        "animal": "None",
        "species": "N/A",
        "confidence": 0,
        "reasoning": "No animal could be clearly identified in the image."
      }
      `;

      const analysis = await analyzeImage(result.assets[0].uri, 'gemini-2.5-flash', prompt);
      const HIGH_CONFIDENCE_THRESHOLD = 55
      const LOW_CONFIDENCE_THRESHOLD = 0
      if (!analysis) {
        throw new Error("Analysis returned null.");
      }

      // Check if AI detected this as invalid (screenshot/unnatural/etc)
      if (analysis.isScreenshot) {
        Alert.alert(
          'Invalid Image Detected',
          `This image is not a valid authentic wildlife photo:\n\n${analysis.screenshotEvidence || 'Image contains elements that indicate it is not an authentic capture'}\n\nPlease select a fresh photo instead.`,
          [
            {
              text: 'Choose Another',
              style: 'default',
              onPress: () => {
                setPhotoUri(null);
                setImageVerification(null);
                setAnalysisResult(null);
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return;
      }
      
      if (analysis.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
        setAnalysisResult(analysis);
        setModalVisible(true);
      } else if (analysis.confidence >= LOW_CONFIDENCE_THRESHOLD) {
        Alert.alert(
          "Not a Clear Sighting",
          `We think we saw a ${analysis.animal}, but we're not very confident. Would you like to try a more powerful analysis?`,
          [
            {
              text: "Try Advanced Analysis",
              onPress: () => handleOverride(result.assets[0].uri),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
      } else {
        Alert.alert("Nothing Spotted", "We couldn't identify an animal in this picture.");
      }
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    Alert.alert("Error", "Failed to process the selected image");
  } finally {
    setIsProcessing(false);
  }
};

const handleOverride = useCallback(async (uri?: string) => {
    // Determine which URI to use. The one passed directly is preferred.
    const uriToAnalyze = uri || photoUri;

    // --- START OF DEBUGGING ---
    console.log("handleOverride: URI passed as argument:", uri);
    console.log("handleOverride: photoUri from state:", photoUri);
    console.log("handleOverride: Final URI being used for analysis:", uriToAnalyze);

    if (!uriToAnalyze) {
      Alert.alert("Error", "No photo available to re-analyze. The URI is missing.");
      setIsProcessing(false); // Make sure to stop processing
      return;
    }
    // --- END OF DEBUGGING ---

    // Close the main modal if it's open.
    setModalVisible(false);
    setIsProcessing(true);

    try {
      console.log("User requested override. Using gemini-2.5.");

      const promptForPro = `
        Re-analyze this image with a higher level of scrutiny. A previous, faster analysis was either incorrect or had very low confidence.
        Look for more subtle details, consider less common species, or provide your best possible identification even if confidence is lower.
        Keep the reasoning to about 3 sentences.

        Example:
        If the image contained a slightly blurry picture of a Lilac-breasted Roller, your output should be formatted EXACTLY like this:
        {
          "type": "Bird",
          "animal": "Lilac-breasted Roller",
          "species": "Coracias caudatus",
          "confidence": 74,
          "reasoning": "The image shows a bird with vibrant, multi-colored plumage including a lilac throat and blue belly, which are key identifiers, even though the image is slightly blurry."
        }

        Provide your output in the exact same JSON format as before, with keys: "type", "animal", "species", "confidence", "reasoning".
      `;

      // Add logging for ALL parameters right before the call
      console.log("Calling analyzeImage with:", {
        uri: uriToAnalyze,
        model: 'gemini-2.5-flash',
        promptLength: promptForPro.length // Log length to ensure prompt is not empty
      });

      const newAnalysis = await analyzeImage(uriToAnalyze, 'gemini-2.5-flash', promptForPro);

      if (!newAnalysis) {
        Alert.alert('Error', 'Advanced analysis failed.');
      } else {
        // Always route through ambiguous modal so user can manually enter.
        setAnalysisResult(newAnalysis.animal.toLowerCase() === 'none' ? {
          type: newAnalysis.type || 'N/A',
          animal: 'Unknown',
          species: 'N/A',
          confidence: newAnalysis.confidence ?? 0,
          reasoning: newAnalysis.reasoning || 'Model could not confidently identify an animal.'
        } : newAnalysis);
        setShowAmbiguousModal(true);
      }
    } catch (error) {
      console.error("Error during override analysis:", error);
      Alert.alert("Error", "Something went wrong during the advanced analysis.");
    } finally {
      setIsProcessing(false);
    }
}, [photoUri, analyzeImage]); // Keep dependencies as they are relevant to the logic


  const takePicture = useCallback(async () => {
    // Check if we are already processing or if the camera is not ready
    if (isProcessing || !cameraRef.current) {
      return;
    }
    
    try {
  // Starting photo flow: discard any pending recorded video context
  setRecordedVideoUri(null);
  setFrameUri(null);
  setIsVideoMode(false);
      // 1. Take the picture
      const photo: CameraCapturedPicture = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      console.log("Photo taken:", photo.uri);

      setPhotoUri(photo.uri);
      setCaptureMethod('CAMERA'); // Mark as camera capture
      await analyzeAndHandle(photo.uri);
    


   } catch (error) {
      console.error("Error in takePicture function:", error);
      Alert.alert("Error", "Something went wrong while trying to analyze the image.");
    }
  }, [isProcessing, cameraRef, analyzeAndHandle]);

  const handleRecordVideo = useCallback(async () => {
    if (isProcessing || !cameraRef.current) return;
    if (isRecording) {
      try { cameraRef.current.stopRecording(); } catch {}
      return;
    }
    setIsRecording(true);
    setCaptureState({ isRecording: true });
    setRecordingStartedAt(Date.now());
    try {
  const video = await cameraRef.current.recordAsync({ maxDuration: 30 } as any);
  const videoUri = (video as any)?.uri || video?.uri;
  if (!videoUri) throw new Error('No video uri');
  // Store the recorded video and open frame picker so user can scrub to the desired moment
  setRecordedVideoUri(videoUri);
  setShowFramePicker(true);
    } catch (e) {
      console.error('Recording or thumbnail error', e);
      Alert.alert('Error', 'Failed to record video or extract frame');
    } finally {
  setIsRecording(false);
  setCaptureState({ isRecording: false });
      setRecordingStartedAt(null);
      setRecordingElapsed(0);
    }
  }, [isProcessing, isRecording, cameraRef]);

  // Unified capture callback used by the center tab button (mode-aware)
  const capture = useCallback(() => {
    if (isVideoMode) {
      return handleRecordVideo();
    }
    return takePicture();
  }, [isVideoMode, handleRecordVideo, takePicture]);

  
  useEffect(() => {
    setTakePictureRef(capture);
    return () => setTakePictureRef(null);
  }, [capture]);

  // When leaving SpotIt tab, reset to photo mode and clear recording
  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsVideoMode(false);
        setIsRecording(false);
        setCaptureState({ isVideoMode: false, isRecording: false });
      };
    }, [])
  );

  // Publish capture state to the tab bar icon
  useEffect(() => {
    setCaptureState({ isVideoMode });
  }, [isVideoMode]);
  useEffect(() => {
    setCaptureState({ isRecording });
  }, [isRecording]);

  // Update recording timer while recording
  useEffect(() => {
    if (isRecording && recordingStartedAt) {
      const id = setInterval(() => {
        setRecordingElapsed(Math.floor((Date.now() - recordingStartedAt) / 1000));
      }, 200);
      return () => clearInterval(id);
    }
    setRecordingElapsed(0);
  }, [isRecording, recordingStartedAt]);

  const formatTime = (total: number) => {
    const t = Math.min(total, 30);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleConfirm = async () => {
    console.log("User confirmed:", analysisResult?.animal);
    setModalVisible(false);
    
    if (photoUri) {
      // Get location when user confirms
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert('Error', 'Location is required to post a sighting');
        return;
      }

      setSightingForm(prev => ({
        ...prev,
  // If a video was recorded in this flow, post the video; otherwise post the still photo
  mediaUrls: [recordedVideoUri ?? photoUri],
        caption: `Spotted a ${analysisResult?.animal}!`,
        latitude: location.latitude,
        longitude: location.longitude
      }));
      setShowSightingForm(true);
    }
  };

  // Add this new function to handle form submission
  const handleSubmitSighting = async () => {
  if (!token) {
    Alert.alert("Error", "You must be logged in to post a sighting");
    return;
  }

  if (!sightingForm.latitude || !sightingForm.longitude) {
    Alert.alert("Error", "Location information is required");
    return;
  }

  try {
    // Ensure media are uploaded to Cloudinary
    const uploadedUrls: string[] = [];
    for (const uri of sightingForm.mediaUrls || []) {
      if (isRemoteUrl(uri)) {
        uploadedUrls.push(uri);
      } else if (uri) {
        // Upload video if it's the recorded video URI, otherwise upload as image
        const resourceType = recordedVideoUri && uri === recordedVideoUri ? 'video' : 'image';
        const up = await uploadToCloudinarySigned(uri, token, resourceType as any);
        uploadedUrls.push(up.secure_url);
      }
    }

    const sightingData = {
      ...sightingForm,
      mediaUrls: uploadedUrls,
      latitude: sightingForm.latitude,
      longitude: sightingForm.longitude,
      // If manual identification already set on the form, keep it. Otherwise derive from analysisResult.
      identification: sightingForm.identification ?? (analysisResult ? {
        source: 'AI',
        commonName: analysisResult.animal,
        scientificName: analysisResult.species,
        confidence: analysisResult.confidence
      } : undefined),
      // Include image verification data for server-side fraud detection
      imageVerification: imageVerification || undefined,
      captureMethod: captureMethod // Use the tracked capture method (CAMERA or UPLOAD)
    };

    await apiCreateSighting(token, sightingData);
    Alert.alert("Success", "Sighting posted successfully!");
    // Reset states and navigate back
    setShowSightingForm(false);
    setSightingForm({
      caption: '',
      isPrivate: false,
      mediaUrls: [],
      latitude: null,
      longitude: null
    });
    setPhotoUri(null);
  setRecordedVideoUri(null);
  setFrameUri(null);
    setAnalysisResult(null);
    setImageVerification(null);
  } catch (error) {
    console.error("Error posting sighting:", error);
    Alert.alert("Error", "Failed to post sighting");
  }
  };

  const handleRetake = () => {
    console.log("User wants to retake.");
  setModalVisible(false);
  setShowAmbiguousModal(false);
  setShowManualInputModal(false);
  setShowSightingForm(false);
  setAnalysisResult(null); // Clear previous result
  setManualCommonName('');
  setManualScientificName('');
  setPhotoUri(null); // Clear current photo so camera is ready
  setRecordedVideoUri(null);
  setFrameUri(null);
  setImageVerification(null);
  setShowVerificationWarning(false);
  setCaptureMethod('CAMERA'); // Reset to default
  };

  // Accept ambiguous low-confidence AI guess
  const handleAcceptAmbiguous = async () => {
    setShowAmbiguousModal(false);
    // Reuse existing confirm flow
    await handleConfirm();
  };

  // Open manual input form
  const handleManualFromAmbiguous = () => {
    setShowAmbiguousModal(false);
    resetManualInputs();
    setShowManualInputModal(true);
  };

  const submitManualIdentification = async () => {
    if (!manualCommonName.trim()) {
      Alert.alert('Missing', 'Please enter at least a common name.');
      return;
    }
    setShowManualInputModal(false);
    // Prepare form with manual caption & image
  if (photoUri) {
      const location = await getCurrentLocation();
      if (!location) return;
      setSightingForm(prev => ({
        ...prev,
    mediaUrls: [recordedVideoUri ?? photoUri],
        caption: manualCommonName, // free caption; identification stored separately
        latitude: location.latitude,
        longitude: location.longitude,
        identification: {
          source: 'USER',
          commonName: manualCommonName,
          scientificName: manualScientificName || undefined,
          confidence: undefined
        } as any
      }));
      setShowSightingForm(true);
    }
  };

 
  
  if (!permission) {
    return <View style={styles.centered}><Text>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

return (
  <PinchGestureHandler onHandlerStateChange={onPinchHandlerStateChange}>
    <View style={styles.container}>
  <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        zoom={zoom}
        mode={isVideoMode ? ('video' as any) : ('picture' as any)}
      />
      
      {/* Move the upload button outside and directly in the main container */}
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={handleUploadImage}
      >
        <MaterialIcons name="photo-library" size={32} color="white" />
      </TouchableOpacity>

  <Modal
          visible={showSightingForm}
          animationType="slide"
          onRequestClose={() => setShowSightingForm(false)}
        >
          <View style={styles.formWrapper}>
            {/* Header */}
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Post Sighting</Text>
              <TouchableOpacity onPress={handleRetake} style={styles.closeButton}>
                <MaterialIcons name="close" size={28} color={Colors.light.darkNeutral} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
              {photoUri && (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.formSection}>
                <Text style={styles.label}>Caption</Text>
                <TextInput
                  value={sightingForm.caption}
                  onChangeText={(text) => setSightingForm(prev => ({ ...prev, caption: text }))}
                  style={styles.input}
                  placeholder="Share your sighting story..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formSection}>
                <View style={styles.privateRow}>
                  <View>
                    <Text style={styles.label}>Private Sighting</Text>
                    <Text style={styles.helperText}>Only you can see this sighting</Text>
                  </View>
                  <Switch
                    value={sightingForm.isPrivate}
                    onValueChange={(value) => setSightingForm(prev => ({ ...prev, isPrivate: value }))}
                    trackColor={{ false: '#d1d5db', true: Colors.light.primaryGreen }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View style={styles.formFooter}>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmitSighting}
              >
                <Text style={styles.submitButtonText}>Post Sighting</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      {/* Show a loading spinner while processing */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Analyzing...</Text>
        </View>
      )}

      {isVideoMode && isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordDot} />
          <Text style={styles.recordTimer}>{formatTime(recordingElapsed)}</Text>
        </View>
      )}

      {/* Capture button */}
      <TouchableOpacity
        style={[styles.captureButton, isVideoMode ? styles.captureButtonVideo : null]}
        onPress={capture}
        disabled={isProcessing}
      >
        <View
          style={[
            styles.captureInner,
            isVideoMode && isRecording ? styles.captureInnerVideo : isVideoMode ? styles.captureInnerVideoIdle : null,
          ]}
        />
      </TouchableOpacity>

      {/* Toggle photo/video mode (disabled while recording) */}
      <TouchableOpacity
        style={styles.modeToggleButton}
        onPress={() => { if (!isRecording) setIsVideoMode(v => { const nv = !v; setCaptureState({ isVideoMode: nv }); return nv; }); }}
        disabled={isRecording}
      >
        <MaterialIcons
          name={!isVideoMode ? 'videocam' : (isRecording ? 'stop' : 'fiber-manual-record')}
          size={24}
          color={!isVideoMode ? '#fff' : '#ff4040'}
        />
      </TouchableOpacity>

      {/* Render the Modal component */}
      <ConfirmationModal
        isVisible={modalVisible}
        analysisResult={analysisResult}
        onConfirm={handleConfirm}
        onRetake={handleRetake}
         onOverride={() => handleOverride(photoUri)}
      />
      {/* Ambiguous Modal */}
      <Modal visible={showAmbiguousModal} transparent animationType="fade" onRequestClose={() => setShowAmbiguousModal(false)}>
        <View style={ambiguousStyles.backdrop}>
          <View style={ambiguousStyles.card}>
            <Text style={ambiguousStyles.title}>Low Confidence</Text>
            {analysisResult && (
              <Text style={ambiguousStyles.text}>
                Best guess: {analysisResult.animal} ({analysisResult.species}) at {analysisResult.confidence}% confidence.
              </Text>
            )}
            <TouchableOpacity style={[ambiguousStyles.btn, ambiguousStyles.accept]} onPress={handleAcceptAmbiguous}>
              <Text style={ambiguousStyles.btnText}>Yes that's it</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ambiguousStyles.btn, ambiguousStyles.manual]} onPress={handleManualFromAmbiguous}>
              <Text style={ambiguousStyles.btnText}>No, manual input</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ambiguousStyles.btn, ambiguousStyles.retake]} onPress={handleRetake}>
              <Text style={ambiguousStyles.btnText}>Retake</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Manual Input Modal */}
      <Modal visible={showManualInputModal} transparent animationType="slide" onRequestClose={() => setShowManualInputModal(false)}>
        <View style={manualStyles.backdrop}>
          <View style={manualStyles.sheet}>
            <Text style={manualStyles.header}>Manual Identification</Text>
            <Text style={manualStyles.label}>Common Name</Text>
            <TextInput
              value={manualCommonName}
              onChangeText={setManualCommonName}
              placeholder="e.g. White-tailed Deer"
              style={manualStyles.input}
              autoCapitalize="words"
            />
            <Text style={manualStyles.label}>Scientific Name (optional)</Text>
            <TextInput
              value={manualScientificName}
              onChangeText={setManualScientificName}
              placeholder="e.g. Odocoileus virginianus"
              style={manualStyles.input}
              autoCapitalize="none"
            />
            <View style={manualStyles.row}>
              <TouchableOpacity style={[manualStyles.btn, manualStyles.cancel]} onPress={() => setShowManualInputModal(false)}>
                <Text style={manualStyles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[manualStyles.btn, manualStyles.submit]} onPress={submitManualIdentification}>
                <Text style={manualStyles.btnText}>Use This</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Crop Modal for video frame */}
      <VideoFramePickerModal
        isVisible={showFramePicker}
        videoUri={recordedVideoUri}
  onClose={() => { setShowFramePicker(false); setRecordedVideoUri(null); setFrameUri(null); }}
        onPickFrame={(uri) => {
          setShowFramePicker(false);
          setFrameUri(uri);
          setShowCropModal(true);
        }}
      />
      <ImageCropModal
        isVisible={showCropModal}
        imageUri={frameUri}
        onClose={() => setShowCropModal(false)}
        onCropComplete={async (croppedUri) => {
          setShowCropModal(false);
          // Ensure we revert to photo mode after cropping
          setIsVideoMode(false);
          setCaptureState({ isVideoMode: false, isRecording: false });
          setPhotoUri(croppedUri);
          await analyzeAndHandle(croppedUri);
        }}
      />
    </View>
    </PinchGestureHandler>
  );
}

// --- NEW: Added styles for the processing overlay ---
const styles = StyleSheet.create({
 container: { 
    flex: 1,
    position: 'relative'
  },
  camera: { 
    flex: 1,
    position: 'relative'
  },
  button: { backgroundColor: "rgba(0,0,0,0.6)", padding: 15, borderRadius: 50 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
formWrapper: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.darkNeutral,
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: Colors.light.lightGrey,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.darkNeutral,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.light.darkNeutral,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    minHeight: 120,
  },
  privateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  formFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: Colors.light.primaryGreen,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: Colors.light.primaryGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff4040',
    marginRight: 8,
  },
  recordTimer: {
    color: '#fff',
    fontWeight: '700',
  },
  // Bottom-left upload already exists. Add capture and toggle buttons
  captureButton: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  captureButtonVideo: {
    borderColor: '#ff4040',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  captureInnerVideo: {
    backgroundColor: '#ff4040',
  },
  captureInnerVideoIdle: {
    backgroundColor: '#ff9f9f',
  },
  modeToggleButton: {
    position: 'absolute',
    bottom: 205,
    right: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
    uploadButton: {
    position: 'absolute',
    bottom: 205,
    left: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // Ensure it's above other elements
    elevation: 5, // For Android
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

// Styles for ambiguous modal
const ambiguousStyles = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' },
  card: { width:'85%', backgroundColor:'#fff', borderRadius:16, padding:22 },
  title: { fontSize:22, fontWeight:'700', marginBottom:10 },
  text: { fontSize:15, marginBottom:18, lineHeight:20 },
  btn: { paddingVertical:12, borderRadius:10, marginBottom:10, alignItems:'center' },
  accept: { backgroundColor:'#2d8cff' },
  manual: { backgroundColor:'#ff9f1c' },
  retake: { backgroundColor:'#ff3b30' },
  btnText: { color:'#fff', fontWeight:'600', fontSize:15 }
});

// Styles for manual input modal
const manualStyles = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.65)', justifyContent:'flex-end' },
  sheet: { backgroundColor:'#fff', padding:20, borderTopLeftRadius:20, borderTopRightRadius:20 },
  header: { fontSize:20, fontWeight:'700', marginBottom:12 },
  label: { fontSize:14, fontWeight:'600', marginTop:10, marginBottom:4 },
  input: { borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, fontSize:14 },
  row: { flexDirection:'row', justifyContent:'space-between', marginTop:18 },
  btn: { flex:1, padding:14, borderRadius:10, alignItems:'center' },
  cancel: { backgroundColor:'#999', marginRight:8 },
  submit: { backgroundColor:'#007AFF', marginLeft:8 },
  btnText: { color:'#fff', fontWeight:'600' }
});
