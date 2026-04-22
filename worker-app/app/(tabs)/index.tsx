import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Image, 
  Modal, 
  ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router'; 

// =====================================================================
// 1. HELPER UTILITIES (MIRRORING YOUR WEB LOGIC)
// =====================================================================

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();
const getTodayStr = () => new Date().toISOString().split('T')[0];

/**
 * MyTasksScreen Component
 * Displays a list of Assigned and Completed tasks for the worker based on a selected date.
 * Includes a custom modal calendar for date selection.
 */
export default function MyTasksScreen() {
  // --- Navigation & Constants ---
  const router = useRouter(); 
  const API_BASE_URL = "http://192.168.0.105:8000";

  // --- Core State Variables ---
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Assigned'); 
  const [workerId, setWorkerId] = useState<string | null>(null);

  // --- Custom Date Picker States (Same as Web) ---
  const [scanDate, setScanDate] = useState(getTodayStr()); // Final date used for API call
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState(scanDate); // Selected in UI but not confirmed yet
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // =====================================================================
  // 2. LIFECYCLE HOOKS & DATA FETCHING
  // =====================================================================

  // On mount: Load the worker ID from local storage
  useEffect(() => {
    const loadWorkerId = async () => {
      try {
        const savedId = await AsyncStorage.getItem('worker_id');
        if (savedId !== null) {
          setWorkerId(savedId);
        } else {
          setLoading(false);
        }
      } catch (error) { 
        setLoading(false); 
      }
    };
    loadWorkerId();
  }, []);

  // Fetch tasks from the backend for the current worker and scanDate
  const fetchTasks = async () => {
    if (!workerId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/worker-tasks/${workerId}/${scanDate}`);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Every time the screen comes into focus, check if the Map screen changed the date
  useFocusEffect(
    useCallback(() => {
      const checkSharedDate = async () => {
        // Look for a date saved by the Map screen
        const sharedDate = await AsyncStorage.getItem('shared_date');
        
        if (sharedDate && sharedDate !== scanDate) {
          setScanDate(sharedDate);
          setTempDate(sharedDate);
          // We don't fetch here, because changing scanDate will trigger 
          // a re-render, or you can call fetchTasks() directly.
        } else if (workerId) {
          fetchTasks();
        }
      };
      
      checkSharedDate();
    }, [workerId, scanDate])
  );

  
  // =====================================================================
  // 3. UI GENERATORS & HANDLERS
  // =====================================================================

  // ✅ ADDED: Function to handle switching months and years
  const changeMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  /**
   * Generates the days for the custom calendar grid.
   */
  const renderCalendarDays = () => {
    const days = [];
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const totalDays = getDaysInMonth(currentMonth, currentYear);

    // Padding for the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
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

  /**
   * Navigates to the Map screen when a task is clicked.
   */
  const handleTaskClick = (task: any) => {
    router.push({ 
      pathname: '/(tabs)/map', 
      params: { 
        taskId: task.id, 
        passedDate: scanDate // ✅ Send the date you are currently viewing
      } 
    });
  };

  /**
   * Renders an individual task card in the FlatList.
   */
  const renderTaskCard = ({ item }: { item: any }) => {
    // Replace localhost IP with actual backend IP for images
    const imageUrl = item.image_url 
      ? item.image_url.replace("127.0.0.1", "192.168.0.105") 
      : null;
      
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleTaskClick(item)}>
        
        <View style={styles.cardHeader}>
          <Text style={styles.priorityText}>HIGH: {item.site_name}</Text>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.locationText}>
            📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
          <Text style={styles.noteText}>Status: {item.status}</Text>
          {imageUrl && (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.thumbnail} 
              resizeMode="cover" 
            />
          )}
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.detailsText}>View on Map {'>'}</Text>
        </View>

      </TouchableOpacity>
    );
  };

  // =====================================================================
  // 4. MAIN RENDER
  // =====================================================================
  
  return (
    <View style={styles.container}>
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <TouchableOpacity 
          onPress={() => { 
            setTempDate(scanDate); 
            setIsDatePickerOpen(true); 
          }}
          style={styles.dateSelector}
        >
          <Text style={styles.dateText}>📅 {scanDate}</Text>
        </TouchableOpacity>
      </View>

      {/* --- CUSTOM CALENDAR MODAL (YOUR WEB LOGIC + UI) --- */}
      <Modal visible={isDatePickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            
            {/* Month/Year Header with Arrows */}
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


            {/* Week Days Header */}
            <View style={styles.weekDaysContainer}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => ( 
                <Text key={index} style={styles.weekDayText}>{d}</Text> 
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.calendarGrid}>
              {renderCalendarDays()}
            </View>

            {/* Footer Buttons (Mirrors Web) */}
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
                  // Save the date globally so the Map can see it
                  await AsyncStorage.setItem('shared_date', tempDate); 
                }}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
            
          </View>
        </View>
      </Modal>

      {/* TABS SECTION */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Assigned' && styles.activeTab]} 
          onPress={() => setActiveTab('Assigned')}
        >
          <Text style={[styles.tabText, activeTab === 'Assigned' && styles.activeTabText]}>
            Assigned ({tasks.filter(t => t.status === 'Assigned').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Completed' && styles.activeTab]} 
          onPress={() => setActiveTab('Completed')}
        >
          <Text style={[styles.tabText, activeTab === 'Completed' && styles.activeTabText]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST SECTION */}
      {loading ? (
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tasks.filter(t => activeTab === 'Assigned' ? t.status === 'Assigned' : t.status === 'Done')}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTaskCard}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No tasks found for this date.</Text>}
        />
      )}
      
    </View>
  );
}

// =====================================================================
// 5. STYLESHEET
// =====================================================================

const styles = StyleSheet.create({
  // Main Layout
  container: { 
    flex: 1, 
    backgroundColor: '#111827' 
  },
  header: { 
    paddingTop: 50, 
    paddingBottom: 20, 
    alignItems: 'center', 
    backgroundColor: '#1f2937', 
    flexDirection: 'row', 
    justifyContent: 'space-around' 
  },
  headerTitle: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  dateSelector: { 
    backgroundColor: '#374151', 
    padding: 8, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#f59e0b' 
  },
  dateText: { 
    color: 'white', 
    fontWeight: 'bold' 
  },
  
  // Custom Modal Calendar Styles
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
  modalHeader: { 
    marginBottom: 15, 
    alignItems: 'center' 
  },
  // ✅ REPLACED modalHeader WITH monthHeader & ARROWS
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

  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#111' 
  },
  weekDaysContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },
  weekDayText: { 
    width: '14.28%', 
    textAlign: 'center', 
    color: '#9ca3af', 
    fontWeight: 'bold', 
    fontSize: 12 
  },
  calendarGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap' 
  },
  dayCell: { 
    width: '14.28%', 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginVertical: 2 
  },
  dayText: { 
    color: '#374151', 
    fontSize: 14 
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

  // Tabs Styles
  tabContainer: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#374151' 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 15, 
    alignItems: 'center' 
  },
  activeTab: { 
    borderBottomWidth: 2, 
    borderBottomColor: '#f59e0b' 
  },
  tabText: { 
    color: '#9ca3af', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  activeTabText: { 
    color: '#f59e0b' 
  },
  
  // Task Card Styles
  card: { 
    backgroundColor: '#1f2937', 
    borderRadius: 10, 
    marginBottom: 15, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#374151' 
  },
  cardHeader: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#374151' 
  },
  priorityText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  cardBody: { 
    padding: 15 
  },
  locationText: { 
    color: '#cbd5e1', 
    fontSize: 14, 
    marginBottom: 5 
  },
  noteText: { 
    color: '#9ca3af', 
    fontSize: 14 
  },
  thumbnail: { 
    width: '100%', 
    height: 180, 
    borderRadius: 8, 
    marginTop: 10 
  },
  cardFooter: { 
    padding: 15, 
    alignItems: 'flex-end' 
  },
  detailsText: { 
    color: '#cbd5e1', 
    fontSize: 14 
  },
  
  // Miscellaneous
  emptyText: { 
    color: '#9ca3af', 
    textAlign: 'center', 
    marginTop: 50, 
    fontSize: 16 
  }
});