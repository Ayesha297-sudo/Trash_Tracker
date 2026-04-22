import React, { useState } from 'react';
import { 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  StyleSheet 
} from 'react-native';
import { useRouter } from 'expo-router'; 
import { ThemedView } from '@/components/themed-view'; 
import { ThemedText } from '@/components/themed-text'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * WorkerAuthScreen
 * Handles Worker Login and Worker Registration.
 */
export default function WorkerAuthScreen() {
  // --- Navigation ---
  const router = useRouter(); 

  // --- UI State ---
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // --- Form Data State ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // --- Configuration ---
  const API_BASE_URL = "http://192.168.0.105:8000"; 

  // --- Action Handlers ---

  const handleSubmit = async () => {
    // 1. Basic Validation
    if (!phone || !password || (!isLoginMode && !name)) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    // 2. Prepare API Request Details
    const endpoint = isLoginMode ? '/worker/login' : '/worker/signup';
    const payload = isLoginMode 
      ? { phone, password } 
      : { name, phone, password };

    try {
      // 3. Send Request to Backend
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();

      // 4. Handle Server Response
      if (!response.ok) {
        Alert.alert("Error", data.detail || "Something went wrong");
      } else {
        
        // Success Handling
        if (isLoginMode) {
          // Save the worker_id to local storage for future sessions
          await AsyncStorage.setItem('worker_id', data.worker_id.toString());
          
          // ✅ FIX ADDED HERE: Clear any stale shared date from previous sessions
          await AsyncStorage.removeItem('shared_date');
          
          Alert.alert("Success", "Welcome back, " + data.name + "!");
          
          // 🚀 Teleport the user to the main tabs dashboard!
          router.replace('/(tabs)'); 
        } else {
          // Switch to login mode after successful registration
          Alert.alert("Success", "Account created! You can now log in.");
          setIsLoginMode(true); 
          setPassword(''); 
        }
      }
    } catch (error) {
      // 5. Handle Network/Connection Errors
      Alert.alert(
        "Network Error", 
        "Could not connect to the server. Did you replace the IP address?"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- UI Render ---
  return (
    <ThemedView style={styles.container}>
      
      <ThemedText type="title" style={styles.headerText}>
        {isLoginMode ? 'Worker Login' : 'Worker Registration'}
      </ThemedText>

      {!isLoginMode && (
        <TextInput 
          placeholder="Full Name" 
          placeholderTextColor="#94a3b8"
          value={name} 
          onChangeText={setName} 
          style={styles.input}
        />
      )}

      <TextInput 
        placeholder="Phone Number" 
        placeholderTextColor="#94a3b8"
        value={phone} 
        onChangeText={setPhone} 
        keyboardType="phone-pad"
        style={styles.input}
      />
      
      <TextInput 
        placeholder="Password" 
        placeholderTextColor="#94a3b8"
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity 
        onPress={handleSubmit} 
        disabled={loading}
        style={styles.primaryButton}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <ThemedText style={styles.buttonText}>
            {isLoginMode ? "Log In" : "Sign Up"}
          </ThemedText>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => setIsLoginMode(!isLoginMode)} 
        style={{ marginTop: 20 }}
      >
        <ThemedText style={{ textAlign: 'center' }}>
          {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          <ThemedText type="defaultSemiBold" style={{ color: '#1b5319' }}>
            {isLoginMode ? "Sign Up" : "Log In"}
          </ThemedText>
        </ThemedText>
      </TouchableOpacity>

    </ThemedView>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
  },
  headerText: {
    color: '#1b5319', 
    marginBottom: 30, 
    textAlign: 'center'
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    color: '#0f172a',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16
  },
  primaryButton: {
    backgroundColor: '#1b5319', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10 
  },
  buttonText: {
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16
  }
});