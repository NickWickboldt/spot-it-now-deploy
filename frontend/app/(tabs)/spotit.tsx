import { MaterialIcons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CameraCapturedPicture, CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from "react"; // 1. Import useCallback
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import { apiCreateSighting } from '../../api/sighting';
import { isRemoteUrl, uploadToCloudinarySigned } from '../../api/upload';
import ConfirmationModal from "../../components/ConfirmationModal";
import { useAuth } from '../../context/AuthContext';


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
};

async function fileToGenerativePart(uri: string, mimeType: string) {
  const base64ImageData = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return {
    inlineData: {
      data: base64ImageData,
      mimeType,
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
        const imagePart = await fileToGenerativePart(uri, "image/jpeg");
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


    // Add with other functions in SpotItScreen
const handleUploadImage = async () => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      // Analyze the selected image
      setIsProcessing(true);

      const prompt = `
      Analyze the image and provide your output in a single, clean JSON object.

      **JSON Key Definitions and Structure:**
      - **"type"**: A broad category like 'Bird', 'Mammal', 'Insect', 'Reptile'.
      - **"animal"**: The specific common name of the animal, e.g., 'Bald Eagle', 'Grizzly Bear'.
      - **"species"**: The scientific (Latin) name, enclosed in parentheses, e.g., '(Haliaeetus leucocephalus)'.
      - **"confidence"**: Your confidence in the identification from 0-100, be as exact as possible try to really nail down the score.
      - **"reasoning"**: A brief justification for your identification.

      **Example Output:**
      If the image contained a clear picture of a Lilac-breasted Roller, your output should be formatted EXACTLY like this:
      {
        "type": "Bird",
        "animal": "Lilac-breasted Roller",
        "species": "Coracias caudatus",
        "confidence": 98,
        "reasoning": "The image shows a bird with vibrant, multi-colored plumage including a lilac throat and blue belly, which are key identifiers."
      }

      **No Animal Case:**
      If no animal is present, return this exact JSON:
      {
        "type": "N/A",
        "animal": "None",
        "species": "N/A",
        "confidence": 0,
        "reasoning": "No animal could be clearly identified in the image."
      }
      `;

      const analysis = await analyzeImage(result.assets[0].uri, 'gemini-1.5-flash', prompt);
      const HIGH_CONFIDENCE_THRESHOLD = 55
      const LOW_CONFIDENCE_THRESHOLD = 0
      if (!analysis) {
        throw new Error("Analysis returned null.");
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
      console.log("User requested override. Using gemini-2.5-flash.");

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
    setIsProcessing(true);
    
    try {
      // 1. Take the picture
      const photo: CameraCapturedPicture = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      console.log("Photo taken:", photo.uri);



      setPhotoUri(photo.uri)
      const prompt = `
      Analyze the image and provide your output in a single, clean JSON object.

      **JSON Key Definitions and Structure:**
      - **"type"**: A broad category like 'Bird', 'Mammal', 'Insect', 'Reptile'.
      - **"animal"**: The specific common name of the animal, e.g., 'Bald Eagle', 'Grizzly Bear'.
      - **"species"**: The scientific (Latin) name, enclosed in parentheses, e.g., '(Haliaeetus leucocephalus)'.
      - **"confidence"**: Your confidence in the identification from 0-100, be as exact as possible try to really nail down the score.
      - **"reasoning"**: A brief justification for your identification.

      **Example Output:**
      If the image contained a clear picture of a Lilac-breasted Roller, your output should be formatted EXACTLY like this:
      {
        "type": "Bird",
        "animal": "Lilac-breasted Roller",
        "species": "Coracias caudatus",
        "confidence": 98,
        "reasoning": "The image shows a bird with vibrant, multi-colored plumage including a lilac throat and blue belly, which are key identifiers."
      }

      **No Animal Case:**
      If no animal is present, return this exact JSON:
      {
        "type": "N/A",
        "animal": "None",
        "species": "N/A",
        "confidence": 0,
        "reasoning": "No animal could be clearly identified in the image."
      }
      `;

      const analysis = await analyzeImage(photo.uri, 'gemini-1.5-flash', prompt);
      const HIGH_CONFIDENCE_THRESHOLD = 55;
      const LOW_CONFIDENCE_THRESHOLD = 0;

      if (!analysis){
        throw new Error("Analysis returned null.");
      }
      if (analysis.confidence >= HIGH_CONFIDENCE_THRESHOLD){
        setAnalysisResult(analysis);
        setModalVisible(true);
      }   

      else {
          Alert.alert(
          "Not a Clear Sighting",
          `We think we saw a ${analysis.animal}, but we're not very confident. Would you like to try a more powerful analysis or retake the photo?`,
          [
            {
              text: "Try Advanced Analysis",
              onPress: () => handleOverride(photo.uri),
            },
            {
              text: "Retake Photo",
              style: "cancel",
              onPress: () => setPhotoUri(null), // Clear the URI on retake
            },
          ]
        );
      }
    


   } catch (error) {
      console.error("Error in takePicture function:", error);
      Alert.alert("Error", "Something went wrong while trying to analyze the image.");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cameraRef,]);

  
  useEffect(() => {

    navigation.setParams({ takePicture: takePicture });
  }, [navigation, takePicture]);

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
        mediaUrls: [photoUri],
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
        const up = await uploadToCloudinarySigned(uri, token, 'image');
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
      } : undefined)
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
    setAnalysisResult(null);
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
        mediaUrls: [photoUri],
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
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} zoom={zoom} />
      
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
          <ScrollView contentContainerStyle={styles.formContainer}>
            <Text style={styles.formTitle}>Post Sighting</Text>
            
            {photoUri && (
              <Image 
                source={{ uri: photoUri }} 
                style={styles.previewImage}
              />
            )}

            <Text style={styles.label}>Caption</Text>
            <TextInput
              value={sightingForm.caption}
              onChangeText={(text) => setSightingForm(prev => ({ ...prev, caption: text }))}
              style={styles.input}
              multiline
            />

            <View style={styles.privateContainer}>
              <Text style={styles.label}>Private Sighting</Text>
              <Switch
                value={sightingForm.isPrivate}
                onValueChange={(value) => setSightingForm(prev => ({ ...prev, isPrivate: value }))}
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmitSighting}
              >
                <Text style={styles.buttonText}>Post Sighting</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowSightingForm(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Modal>
      {/* Show a loading spinner while processing */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Analyzing...</Text>
        </View>
      )}

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
formContainer: {
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 100,
  },
  privateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
    uploadButton: {
    position: 'absolute',
    bottom: 125,
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
