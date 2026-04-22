import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, ArrowLeft } from 'lucide-react-native';

// --- Configuration ---
const API_BASE_URL = "http://192.168.0.105:8000"; 

/**
 * UploadProofScreen
 * Handles taking a photo of a cleaned area and submitting it to the server as proof.
 */
export default function UploadProofScreen() {
  // --- Navigation & Parameters ---
  // ✅ TypeScript types for your URL parameters
  const { taskId, siteName } = useLocalSearchParams<{ taskId: string; siteName?: string }>(); 
  const router = useRouter();
  
  // --- Component State ---
  // ✅ TypeScript types for your state variables
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // ✅ NEW: Store the URL params in local state so we can clear them!
  const [displaySiteName, setDisplaySiteName] = useState<string | undefined>(siteName);
  const [displayTaskId, setDisplayTaskId] = useState<string | undefined>(taskId);

  // --- Lifecycle Effects ---
  // This clears the old image out every time you open a new task!
  // --- Lifecycle Effects ---
  useEffect(() => {
    setImageUri(null);
    setIsUploading(false);
    // ✅ NEW: Reset the text based on the URL when the screen opens
    setDisplaySiteName(siteName);
    setDisplayTaskId(taskId);
  }, [taskId, siteName]);

  // --- Action Handlers ---

  /**
   * Prompts the user for camera permissions and opens the device camera.
   * If a photo is taken, it saves the image URI to state.
   */
  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required", 
        "You need to allow camera access to take proof photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, 
      aspect: [4, 3],
      quality: 0.5, 
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  /**
   * Packages the captured image into FormData and sends a POST request
   * to the backend API to mark the task as complete.
   */
  const submitProof = async () => {
    // 1. Validation
    if (!imageUri) {
      Alert.alert("Missing Photo", "Please take a photo before submitting.");
      return;
    }

    setIsUploading(true);

    try {
      // 2. Prepare Payload
      const formData = new FormData();
      
      // 'as any' bypasses a strict TypeScript warning for React Native file uploads
      formData.append('file', {
        uri: imageUri,
        name: `proof_${taskId}.jpg`,
        type: 'image/jpeg',
      } as any);

      // 3. API Request
      const response = await fetch(`${API_BASE_URL}/complete-task/${taskId}`, {
        method: 'POST', 
        body: formData,
      });

      // 4. Handle Server Response
      if (response.ok) {
        // ✅ FIX: Added a button to the Alert. Now it waits for the user!
        Alert.alert(
          "Success!", 
          "Task has been marked as completed.",
          [
            { 
              text: "OK", 
              onPress: () => {
                // 1. WIPE THE STATE CLEAN
                setImageUri(null); 
                setIsUploading(false);
                setDisplaySiteName(""); // ✅ Clears the Site Name
                setDisplayTaskId("");   // ✅ Clears the Task ID
                
                // 2. NAVIGATE BACK
                router.back(); 
              }
            }
          ]
        );
      } else {
        const errorData = await response.json();
        Alert.alert(
          "Upload Failed", 
          errorData.detail || "Could not submit proof. Please try again."
        );
      }
    } catch (error) {
      // 5. Handle Network Errors
      console.error("Upload error:", error);
      Alert.alert("Error", "Network error while uploading.");
    } finally {
      setIsUploading(false);
    }
  };

  
  // --- UI Render ---
  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Upload Proof</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        
        <Text style={styles.title}>
          {displayTaskId ? `Task: ${displaySiteName || `Area ${displayTaskId}`}` : "Task Completed ✅"}
        </Text>
        <Text style={styles.subtitle}>Please take a clear photo of the cleaned area.</Text>

        <View style={styles.imageBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.placeholder}>
              <Camera size={50} color="#9ca3af" />
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.cameraButton} onPress={takePicture}>
          <Camera size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>
            {imageUri ? "Retake Photo" : "Open Camera"}
          </Text>
        </TouchableOpacity>

        {/* ✅ FIX: Using a strict ternary operator prevents empty string crashes! */}
        {imageUri ? (
          <TouchableOpacity 
            style={[styles.submitButton, isUploading ? styles.disabledButton : null]} 
            onPress={submitProof}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Upload size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Submit & Complete Task</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

      </View>
    </View>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f4f6f8' 
  },
  header: { 
    backgroundColor: '#1b5319', 
    padding: 20, 
    paddingTop: 50, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  backButton: { 
    padding: 5 
  },
  headerText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  content: { 
    padding: 20, 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 5 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 30, 
    textAlign: 'center' 
  },
  imageBox: { 
    width: '100%', 
    height: 300, 
    backgroundColor: '#e2e8f0', 
    borderRadius: 12, 
    overflow: 'hidden', 
    marginBottom: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#cbd5e1', 
    borderStyle: 'dashed' 
  },
  imagePreview: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover' 
  },
  placeholder: { 
    alignItems: 'center' 
  },
  placeholderText: { 
    marginTop: 10, 
    color: '#9ca3af', 
    fontSize: 16 
  },
  cameraButton: { 
    flexDirection: 'row', 
    backgroundColor: '#3b82f6', 
    width: '100%', 
    padding: 15, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  submitButton: { 
    flexDirection: 'row', 
    backgroundColor: '#22c55e', 
    width: '100%', 
    padding: 15, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  disabledButton: { 
    opacity: 0.7 
  },
  buttonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  }
});