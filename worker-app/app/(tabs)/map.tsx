import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  ActivityIndicator, 
  Alert, 
  Modal 
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin, Trash2, X, Camera, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

// =====================================================================
// 1. CONSTANTS
// =====================================================================
const API_BASE_URL = "http://192.168.0.105:8000";

// =====================================================================
// 2. HELPERS
// =====================================================================
const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();
const getTodayStr = () => new Date().toISOString().split('T')[0];

/**
 * ExploreScreen
 * Interactive map interface for workers to view, filter, and select their tasks.
 */
export default function ExploreScreen() {
  // --- Navigation & References ---
  const params = useLocalSearchParams();
  const router = useRouter();
  const mapRef = useRef<any>(null); 

  // --- Task & Map State ---
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedTask, setSelectedTask] = useState<any>(null); 
  const [tasks, setTasks] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [workerId, setWorkerId] = useState<any>(null); 

  // --- Calendar States ---
  const [scanDate, setScanDate] = useState(params?.passedDate ? String(params.passedDate) : getTodayStr());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState(scanDate);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());


  // =====================================================================
  // 3. MAP CONTROLS
  // =====================================================================

  /**
   * Animates the map view to a specific coordinate.
   */
  const flyToLocation = (lat: any, lng: any) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.005, 
        longitudeDelta: 0.005,
      }, 1000); 
    }
  };

  /**
   * Adjusts the map zoom and bounding box to ensure all provided pins are visible.
   */
  const fitAllPins = (dataToFit: any[]) => {
    if (mapRef.current && dataToFit.length > 0) {
      const coordinates = dataToFit.map(t => ({ 
        latitude: t.latitude, 
        longitude: t.longitude 
      }));
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 180, right: 50, bottom: 50, left: 50 }, 
        animated: true,
      });
    }
  };

  // =====================================================================
  // 4. DATA FETCHING & LIFECYCLE
  // =====================================================================

  /**
   * Fetches tasks for the specific worker and the currently selected scanDate.
   */
  const fetchTasks = async (id: any) => {
    try {
      // ✅ Added headers to legally force the phone to fetch fresh data every time
      const response = await fetch(`${API_BASE_URL}/worker-tasks/${id}/${scanDate}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      
      // If backend returns {"error": "..."}, data will not be an Array.
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks([]); // Clear pins if no data found
        console.log("No data for this date");
      }
    } catch (error) {
      setTasks([]);
      console.error("Error fetching tasks:", error);
    }
  };

  // Initial mount: load worker ID and fetch data
  useEffect(() => {
    const initMap = async () => {
      try {
        const savedId = await AsyncStorage.getItem('worker_id');
        if (savedId) {
          setWorkerId(savedId);
          await fetchTasks(savedId);
        }
      } finally {
        setLoading(false);
      }
    };
    initMap();
  }, []);

  // When screen is focused: check if another screen changed the shared date
  useFocusEffect(
    useCallback(() => {
      const checkSharedDate = async () => {
        // Look for a date saved by the Tasks screen
        const sharedDate = await AsyncStorage.getItem('shared_date');
        
        if (sharedDate && sharedDate !== scanDate) {
          setScanDate(sharedDate);
          setTempDate(sharedDate);
        }
        
        if (workerId) {
          fetchTasks(workerId);
        }
      };
      
      // 1. Run your existing check immediately when the screen opens
      checkSharedDate();

      // 2. Start the 30-second background refresh timer
      const refreshTimer = setInterval(() => {
        if (workerId) {
          fetchTasks(workerId);
        }
      }, 30000); // 30000 ms = 30 seconds

      // 3. IMPORTANT: Stop the timer when the user leaves the map screen
      return () => {
        clearInterval(refreshTimer);
      };
      
    }, [workerId, scanDate]) // scanDate change triggers fetch
  );

  // When navigated to with a passedDate parameter (e.g., from Task list)
  useEffect(() => {
    if (params?.passedDate) {
      const newDate = String(params.passedDate);
      
      // 1. Update the date state (This triggers useFocusEffect to fetch new tasks)
      setScanDate(newDate);
      setTempDate(newDate); 
      
      // 2. Update the Calendar internal view so the UI matches
      const dateParts = newDate.split('-');
      if (dateParts.length === 3) {
        setCurrentYear(parseInt(dateParts[0]));
        setCurrentMonth(parseInt(dateParts[1]) - 1);
      }
    }
  }, [params?.passedDate]); // This listens for the change from the Task Screen

  // Filter and Map Synchronization Logic
  useEffect(() => {
    if (tasks.length === 0) return;

    // Apply current filter tab rules
    const currentFilteredData = tasks.filter(t => 
      filterStatus === "All" ? (t.status === "Assigned" || t.status === "Done") : 
      filterStatus === "Assigned" ? (t.status === "Assigned") : 
      t.status === "Done"
    );

    // If navigated with a specific taskId, auto-select it and fly to it
    if (params.taskId) {
      const targetTask = tasks.find((t: any) => String(t.id) === String(params.taskId));
      if (targetTask) {
        setFilterStatus("All");
        setSelectedTask(targetTask);
        setTimeout(() => flyToLocation(targetTask.latitude, targetTask.longitude), 500);
      }
    } else {
      // Otherwise, adjust map to fit all currently filtered pins
      setTimeout(() => fitAllPins(currentFilteredData), 500);
    }
  }, [params.taskId, tasks, filterStatus]);

  // =====================================================================
  // 5. RENDER HELPERS
  // =====================================================================

  // =====================================================================
  // 5. RENDER HELPERS
  // =====================================================================

  // ✅ 1. ADD THIS NEW FUNCTION HERE
  const changeMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;

    if (newMonth > 11) { // Going past December
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) { // Going before January
      newMonth = 11;
      newYear -= 1;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Your existing code stays exactly the same below this line:
  const renderCalendarDays = () => {
    const days = [];
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const totalDays = getDaysInMonth(currentMonth, currentYear);

    // Padding for the start of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View 
          key={`empty-${currentMonth}-${currentYear}-${i}`} 
          style={styles.dayCell} 
        />
      );
    }

    // Actual days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = tempDate === dateStr;

      days.push(
        <TouchableOpacity 
          key={dateStr} 
          onPress={() => setTempDate(dateStr)} 
          style={[styles.dayCell, isSelected && styles.selectedDayCell]}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    return days;
  };

  
  // Filtered data for map rendering based on the active tab
  const filteredData = tasks.filter(t => 
    filterStatus === "All" ? (t.status === "Assigned" || t.status === "Done") : 
    filterStatus === "Assigned" ? (t.status === "Assigned") : 
    t.status === "Done"
  );

  // =====================================================================
  // 6. MAIN UI RENDER
  // =====================================================================

  return (
    <View style={styles.container}>
      
      {/* 1. TOP UI: DATE PILL & STATUS FILTER */}
      <View style={styles.topContainer}>
        
        {/* Date Selector Pill */}
        <TouchableOpacity 
          onPress={() => { 
            setTempDate(scanDate); 
            setIsDatePickerOpen(true); 
          }}
          style={styles.datePill}
        >
          <Text style={styles.datePillText}>📅 {scanDate}</Text>
        </TouchableOpacity>

        {/* Tab Filters */}
        <View style={styles.tabContainer}>
          {["All", "Assigned", "Done"].map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[styles.tabButton, filterStatus === tab && styles.tabButtonActive]}
              onPress={() => {
                setFilterStatus(tab);
                setSelectedTask(null);
                router.setParams({ taskId: '' });
              }}
            >
              <Text style={[styles.tabText, filterStatus === tab && styles.tabTextActive]}>
                {tab === "Done" ? "Completed" : tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </View>

      {/* 2. MAP */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        mapType="hybrid"
        style={styles.map}
        initialRegion={{ 
          latitude: 34.37, 
          longitude: 73.47, 
          latitudeDelta: 0.05, 
          longitudeDelta: 0.05 
        }}
      >
        {filteredData.map((task) => (
          <Marker
            key={`${task.id}-${task.status}`}
            coordinate={{ latitude: task.latitude, longitude: task.longitude }}
            pinColor={
              task.status === "Done" ? "green" : 
              task.status === "Assigned" ? "yellow" : "red"
            }
            onPress={() => {
              setSelectedTask(task);
              flyToLocation(task.latitude, task.longitude);
            }}
          />
        ))}
      </MapView>

      {/* 3. CALENDAR MODAL */}
      <Modal visible={isDatePickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            
            {/* ✅ FIX: Added left and right arrows to change the month */}
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
                <Text style={styles.arrowText}>{"<"}</Text>
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>
                {months[currentMonth]} {currentYear}
              </Text>
              
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
                <Text style={styles.arrowText}>{">"}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarGrid}>
              {renderCalendarDays()}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setTempDate(getTodayStr())}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <TouchableOpacity onPress={() => setIsDatePickerOpen(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={async () => { 
                  setScanDate(tempDate); 
                  setIsDatePickerOpen(false); 
                  // Save the date globally so My Tasks can see it
                  await AsyncStorage.setItem('shared_date', tempDate); 
                }}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      {/* 4. DETAILS CARD (Floating at bottom) */}
      {selectedTask && (
        <View style={styles.floatingCard}>
          
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => { 
              setSelectedTask(null); 
              router.setParams({ taskId: '' }); 
            }}
          >
            <X size={18} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.imageContainer}>
            <Image 
              source={{ 
                uri: selectedTask.image_url 
                  ? selectedTask.image_url.replace("127.0.0.1", "192.168.0.105") 
                  : null 
              }}
              style={styles.cardImage}
            />
          </View>
          
          <View style={styles.detailsContainer}>
            <View style={styles.row}>
              <MapPin size={20} color="#1b5319" />
              <Text style={styles.siteName}>
                {selectedTask.site_name || "Assigned Area"}
              </Text>
            </View>
            
            <View style={[styles.row, { marginBottom: 15 }]}>
              <Trash2 
                size={18} 
                color={selectedTask.status === "Done" ? '#22c55e' : '#ef4444'} 
              />
              <Text style={styles.statusText}>
                Status: <Text style={{ 
                  color: selectedTask.status === "Done" ? '#22c55e' : '#ef4444', 
                  fontWeight: 'bold' 
                }}>
                  {selectedTask.status}
                </Text>
              </Text>
            </View>
            
            {/* Conditional Action Button */}
            {selectedTask.status !== "Done" ? (
              <TouchableOpacity 
                style={styles.assignButton} 
                onPress={() => { 
                  setSelectedTask(null); 
                  router.push({ 
                    pathname: '/upload-proof', 
                    params: { 
                      taskId: selectedTask.id, 
                      siteName: selectedTask.site_name 
                    } 
                  }); 
                }}
              >
                <Camera size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.assignButtonText}>Take Proof Photo</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.successBox}>
                <Text style={styles.successText}>🎉 Task Completed</Text>
              </View>
            )}
            
          </View>
        </View>
      )}

    </View>
  );
}

// =====================================================================
// 7. STYLESHEET
// =====================================================================
const styles = StyleSheet.create({
  // Main Layout
  container: { 
    flex: 1 
  },
  map: { 
    width: '100%', 
    height: '100%' 
  },
  
  // Top UI (Date & Tabs)
  topContainer: { 
    position: 'absolute', 
    top: 50, 
    left: 0, 
    right: 0, 
    alignItems: 'center', 
    zIndex: 10, 
    gap: 10 
  },
  datePill: { 
    backgroundColor: '#1f2937', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 25, 
    borderWidth: 1, 
    borderColor: '#f59e0b', 
    elevation: 5 
  },
  datePillText: { 
    color: 'white', 
    fontWeight: 'bold' 
  },
  tabContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 10 
  },
  tabButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 20, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    elevation: 3 
  },
  tabButtonActive: { 
    backgroundColor: '#1b5319' 
  },
  tabText: { 
    color: '#64748b', 
    fontWeight: '600', 
    fontSize: 13 
  },
  tabTextActive: { 
    color: 'white' 
  },
  
  // Modal Calendar Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  calendarContainer: { 
    width: '85%', 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 20 
  },

  // ✅ NEW STYLES FOR THE ARROWS
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10
  },
  arrowButton: {
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8
  },
  arrowText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b5319'
  },
  // (Keep your existing modalTitle here, but you can remove its marginBottom if you want)
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#111', 
    textAlign: 'center'
  },


  calendarGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap' 
  },
  dayCell: { 
    width: '14.28%', 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  dayText: { 
    color: '#374151' 
  },
  selectedDayCell: { 
    backgroundColor: '#1b5319', 
    borderRadius: 20 
  },
  selectedDayText: { 
    color: 'white', 
    fontWeight: 'bold' 
  },
  modalFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20, 
    paddingTop: 15, 
    borderTopWidth: 1, 
    borderTopColor: '#eee' 
  },
  todayButtonText: { 
    color: '#1b5319', 
    fontWeight: 'bold' 
  },
  cancelButtonText: { 
    color: '#9ca3af' 
  },
  confirmButtonText: { 
    color: '#1b5319', 
    fontWeight: 'bold' 
  },

  // Floating Task Details Card Styles
  floatingCard: { 
    position: 'absolute', 
    bottom: 30, 
    left: 20, 
    right: 20, 
    backgroundColor: 'white', 
    borderRadius: 16, 
    overflow: 'hidden', 
    elevation: 10, 
    zIndex: 1000 
  },
  closeButton: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    backgroundColor: 'rgba(255,255,255,0.85)', 
    borderRadius: 15, 
    padding: 6, 
    zIndex: 20 
  },
  imageContainer: { 
    width: '100%', 
    height: 160, 
    backgroundColor: '#f1f5f9' 
  },
  cardImage: { 
    width: '100%', 
    height: '100%' 
  },
  detailsContainer: { 
    padding: 20 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    marginBottom: 12 
  },
  siteName: { 
    fontWeight: '600', 
    fontSize: 15, 
    color: '#333' 
  },
  statusText: { 
    fontSize: 14, 
    color: '#666' 
  },
  assignButton: { 
    flexDirection: 'row', 
    backgroundColor: '#22c55e', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  assignButtonText: { 
    color: 'white', 
    fontWeight: 'bold' 
  },
  successBox: { 
    padding: 12, 
    backgroundColor: '#f0fdf4', 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  successText: { 
    color: '#22c55e', 
    fontWeight: 'bold' 
  }
});