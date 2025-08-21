import React, { useState, useRef, useEffect, useCallback } from "react"; // 1. Import useCallback
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions, CameraCapturedPicture } from "expo-camera";
import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyBxr0esLPJcDVEML5T6B5ilg7kcFp0jCig";
const genAI = new GoogleGenerativeAI(API_KEY);

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
  const cameraRef = useRef<CameraView>(null);
  
  const navigation = useNavigation();

  // 2. Wrap the takePicture function in useCallback
  const takePicture = useCallback(async () => {
    // The function needs to know the current value of isProcessing, so we check it here
    if (isProcessing || !cameraRef.current) {
      return;
    }
    setIsProcessing(true); // This will trigger a re-render
    
    try {
      const photo: CameraCapturedPicture = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      console.log("Photo taken:", photo.uri);
      Alert.alert("Analyzing...", "Let's see what you found!");

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = "Identify the main animal in this picture. Be as exact as possible, list the species if possible. If there is no clear animal, or if it is a person, respond with 'None'. Please format it as so: {animal name, (Exact species)}, dont include parenthesis or curly braces.";
      const imagePart = await fileToGenerativePart(photo.uri, "image/jpeg");

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const animalName = response.text().trim();
      console.log("Gemini Response:", animalName);
      
      if (animalName.toLowerCase() !== 'none' && animalName.length > 2) {
        Alert.alert("Spotted!", `You found a ${animalName}!`);
      } else {
        Alert.alert("Nothing Spotted", "We couldn't identify an animal in the picture. Try again!");
      }
    } catch (error) {
      console.error("Error analyzing image with Gemini:", error);
      Alert.alert("Error", "Something went wrong while trying to analyze the image.");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cameraRef]); // The function will only be re-created if isProcessing or cameraRef changes

  useEffect(() => {
    // Now that takePicture is stable, this effect will not cause an infinite loop.
    // @ts-ignore
    navigation.setParams({ takePicture: takePicture });
  }, [navigation, takePicture]);

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
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
    </View>
  );
}

// ... your styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  button: { backgroundColor: "rgba(0,0,0,0.6)", padding: 15, borderRadius: 50 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});