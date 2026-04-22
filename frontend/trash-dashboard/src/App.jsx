import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LayoutDashboard, Menu, Users, Settings, LogOut, Search, Bell, X, MapPin, Trash2, Calendar, Camera } from 'lucide-react';

// =====================================================================
// 1. LEAFLET MAP CONFIGURATION & ICONS
// =====================================================================
// Custom function to generate colored map pins based on task status
const createIcon = (colorUrl) => new L.Icon({
  iconUrl: colorUrl,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Pre-defined colored markers for different detection statuses
const redIcon = createIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png');
const yellowIcon = createIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png');
const greenIcon = createIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png');

// =====================================================================
// 2. HELPER UTILITIES
// =====================================================================
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getDaysInMonth = (month, year) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (month, year) => {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
};

// Generates today's date in YYYY-MM-DD format for API initialization
const getTodayStr = () => new Date().toISOString().split('T')[0];

// =====================================================================
// 3. MAP BEHAVIOR COMPONENTS
// =====================================================================
// Smoothly pans and zooms the map to a specific selected location
function FlyToLocation({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      // Zooms into level 18 smoothly over 1.5 seconds
      map.flyTo(target, 18, { duration: 1.5 });
    }
  }, [target, map]);
  return null;
}

// 🌟 AUTO-ZOOM TO FIT ALL MARKERS
// Dynamically calculates the boundaries of all current pins and adjusts the map view
function FitBoundsToData({ data }) {
  const map = useMap();

  // Stringifying the data ensures the effect only triggers when the actual dataset changes.
  // This prevents the map from forcefully zooming out when a user simply clicks a pin.
  const dataString = JSON.stringify(data);

  useEffect(() => {
    // If valid data exists, calculate the boundaries and adjust the map view
    if (data && data.length > 0) {
      const bounds = L.latLngBounds(data.map(item => [item.latitude, item.longitude]));
      
      // Smoothly fly to the calculated bounds with padding so pins aren't cut off at the edges
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.5 });
    }
  }, [dataString, map]); // <-- Crucial: Depend on the stringified data to avoid infinite loops

  return null;
}

// BULLETPROOF FIX FOR GREY MAP SPACE
// Prevents Leaflet rendering glitches when the sidebar is toggled
function MapResizer({ isCollapsed }) {
  const map = useMap();

  useEffect(() => {
    // Tells Leaflet to recalculate its size continuously EVERY 50ms 
    // while the sidebar is sliding, ensuring no grey space is left behind.
    const interval = setInterval(() => {
      map.invalidateSize();
    }, 50);

    // Stop checking after 400ms (giving the 300ms CSS animation plenty of time to finish)
    const timeout = setTimeout(() => {
      clearInterval(interval);
      map.invalidateSize(); // One final safety check
    }, 400);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isCollapsed, map]);

  return null;
}

// =====================================================================
// 4. MAIN APPLICATION COMPONENT
// =====================================================================
function App() {
  const loggedInAdminId = localStorage.getItem("admin_id");
  
  // --- AUTHENTICATION & USER STATES ---
  const [isAuthenticated, setIsAuthenticated] = useState(!!loggedInAdminId);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminUser, setAdminUser] = useState(null); 
  const [adminFirstName, setAdminFirstName] = useState("Admin");
  const [profileImage, setProfileImage] = useState(null);

  // --- DATA STATES ---
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(""); 
  const [trashData, setTrashData] = useState([]);
  
  // --- UI & INTERACTION STATES ---
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scanDate, setScanDate] = useState(getTodayStr());
  const [selectedTask, setSelectedTask] = useState(null); // Logic for Floating Card
  const [filterStatus, setFilterStatus] = useState("All"); // Logic for Tabs
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // Holds typed search query
  
  // --- CUSTOM DATE PICKER STATES ---
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState(scanDate); 
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // =====================================================================
  // 5. AUTHENTICATION & PROFILE HANDLERS
  // =====================================================================
  const handleLogin = async (e) => {
    e.preventDefault(); 
    try {
      const response = await axios.post("http://127.0.0.1:8000/login", {
        email: email,
        password: password
      });
      
      if (response.status === 200) {
        setIsAuthenticated(true);
        setAdminUser(response.data); 
        setLoginError("");
        // Persist session on page refresh
        localStorage.setItem("admin_id", response.data.admin_id); 
      }
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError("Invalid email or password. Please try again.");
    }
  };

  const handleLogout = () => {
  // 1. CLEAR HARD STORAGE
  localStorage.removeItem("admin_id");
  localStorage.clear(); // Wipes everything in LocalStorage to be 100% safe

  // 2. RESET DATA STATES (Clear the Map)
  setTrashData([]);      // Removes all pins from memory
  setSelectedTask(null); // Closes the floating details card
  setSuggestions([]);    // Clears any search suggestions

  // 3. RESET FILTER STATES (The Date Fix)
  setScanDate(getTodayStr()); 
  setFilterStatus("All");

  // 4. RESET AUTHENTICATION
  setIsAuthenticated(false);
  setAdminUser(null);

  // 5. THE "CLEAN SLATE" REDIRECT
  // This is the most important part. It clears the browser RAM.
  window.location.href = "/"; 
};

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !loggedInAdminId) return;

    // Show preview immediately for better UX
    setProfileImage(URL.createObjectURL(file)); 

    const formData = new FormData();
    formData.append("file", file); 
    formData.append("admin_id", loggedInAdminId); 

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfileImage(response.data.profile_pic_url); 
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  // =====================================================================
  // 6. SEARCH & GEOLOCATION HANDLERS
  // =====================================================================
  const handleMapSearch = async () => {
    if (!searchQuery) return;

    // Smart Translator for local contextual search
    const smartQuery = searchQuery.toLowerCase()
      .replace("mzd", "muzaffarabad")
      .replace("ajk", "azad jammu and kashmir")
      .replace("chella", "chehla")
      .replace("uajk", "university of azad jammu and kashmir");

    try {
      // Using OpenStreetMap (Nominatim) for accurate regional geospatial data
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${smartQuery}&limit=1&countrycodes=pk`);
      
      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        setSelectedLocation([parseFloat(lat), parseFloat(lon)]);
        setShowSuggestions(false);
      } else {
        alert("Location not found! Try searching with 'Muzaffarabad' at the end (e.g. 'Chehla Campus Muzaffarabad').");
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleSelectLocation = (loc) => {
    const coords = [parseFloat(loc.lat), parseFloat(loc.lon)];
    setSearchQuery(loc.display_name); // Put full name in search bar
    setSelectedLocation(coords);      // Triggers map "Fly" logic
    setShowSuggestions(false);        // Hide the dropdown
  };

  // =====================================================================
  // 7. DATA FETCHING & SIDE EFFECTS
  // =====================================================================
  
  // Fetch Admin Profile Data
  useEffect(() => {
    if (!loggedInAdminId) return; 

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/admin/profile/${loggedInAdminId}`);
        if (response.data) {
          setAdminFirstName(response.data.name); 
          if (response.data.profile_pic_url) {
            setProfileImage(response.data.profile_pic_url);
          }
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      }
    };
    fetchProfile();
  }, [loggedInAdminId]);

  // Debounced Auto-Suggestion Logic for Search Bar
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 3) {
        setSuggestions([]);
        return;
      }

      const smartQuery = searchQuery.toLowerCase()
        .replace("mzd", "muzaffarabad")
        .replace("ajk", "azad jammu and kashmir")
        .replace("chella", "chehla")
        .replace("uajk", "university of azad jammu and kashmir");

      try {
        const res = await axios.get(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=${smartQuery}&maxLocations=5&sourceCountry=PAK`);
        
        if (res.data.candidates) {
          const formattedSuggestions = res.data.candidates.map(c => ({
            lat: c.location.y,
            lon: c.location.x,
            display_name: c.address,
            name: c.address.split(',')[0] // Forcefully grabs the main title
          }));
          setSuggestions(formattedSuggestions);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Suggestion error:", err);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Available Field Workers
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/workers'); 
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setAvailableWorkers(data); 
      } catch (error) {
        console.error("Failed to fetch workers:", error);
      }
    };

    fetchWorkers();
  }, []); 

  // Fetch AI Trash Detections Based on Date
  // NEW: Auto-Syncing Trash Detections (Refreshes every 30s)
  useEffect(() => {
    // 1. Immediate fetch on load or date change
    if (isAuthenticated && scanDate) { 
      fetchTrash();
    }

    // 2. Start the 30-second "Heartbeat"
    const refreshTimer = setInterval(() => {
      // Only fetch if the user is logged in and not currently looking at a specific task
      // (Optional: adding !selectedTask prevents the map from refreshing while they are typing)
      if (isAuthenticated && scanDate) {
        console.log("Syncing with Database...");
        fetchTrash();
      }
    }, 30000); // 30 seconds

    // 3. Cleanup: Kills the timer when the user logs out or leaves the page
    return () => {
      console.log("Stopping Auto-Sync...");
      clearInterval(refreshTimer);
    };
  }, [scanDate, isAuthenticated]);

  const fetchTrash = async () => {
    console.log(`📡 LOGIC: Fetching data from Python for: ${scanDate}`);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/scan/${scanDate}`);
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        setTrashData(response.data);
      } else {
        setTrashData([]); // CRITICAL: Removes old pins from the map!
        alert("No data found for this date.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setTrashData([]); 
    }
  };

  // =====================================================================
  // 8. TASK MANAGEMENT HANDLERS
  // =====================================================================
  
  const handleAssign = async (taskId) => {
    if (!selectedWorker) {
      alert("Please select a worker first!");
      return;
    }
    try {
      console.log(`📡 LOGIC: Assigning task #${taskId} to worker #${selectedWorker}...`);
      await axios.put(`http://127.0.0.1:8000/assign/${taskId}/${selectedWorker}`);
      
      fetchTrash();          // Refresh Map
      setSelectedTask(null); // Close Card
      setSelectedWorker(""); // Reset dropdown
    } catch (error) {
      alert("Backend Error: Could not assign task.");
    }
  };

  const handleComplete = async (id) => {
    try {
      console.log(`📡 LOGIC: Completing task #${id}...`);
      await axios.put(`http://127.0.0.1:8000/complete/${id}`);
      fetchTrash();          // Refresh Map
      setSelectedTask(null); // Close Card
    } catch (error) {
      alert("Backend Error: Could not complete task.");
    }
  };

  // Dashboard Data Filtering (Tabs)
  const filteredData = trashData.filter(t => 
    filterStatus === "All" ? true : 
    filterStatus === "Pending" ? t.status === "Pending" : 
    t.status === "Done" // BUG IS HERE (As annotated by original author)
  );

  // =====================================================================
  // 9. UI RENDERING
  // =====================================================================

  // --- LOGIN SCREEN (Unauthenticated State) ---
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '350px' }}>
          
          <h2 style={{ textAlign: 'center', color: '#16a34a', marginBottom: '8px', fontSize: '24px', fontWeight: 'bold' }}>
            TrashTracker
          </h2>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
            Admin Dashboard Login
          </p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input 
              type="email" 
              placeholder="Email (e.g., admin@tracker.com)" 
              required
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outlineColor: '#16a34a' }}
            />
            
            <input 
              type="password" 
              placeholder="Password (e.g., admin123)" 
              required
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outlineColor: '#16a34a' }}
            />
            
            {loginError && (
              <p style={{ color: '#ef4444', fontSize: '13px', margin: 0, textAlign: 'center' }}>
                {loginError}
              </p>
            )}
            
            <button 
              type="submit" 
              style={{ padding: '12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', marginTop: '8px' }}
            >
              Secure Login
            </button>
          </form>

        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD INTERFACE (Authenticated State) ---
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f4f6f8' }}>

      {/* === LEFT SIDEBAR === */}
      <div style={{ width: isCollapsed ? '60px' : '170px', transition: 'all 0.3s ease', background: '#0B0B0B', color: 'white', display: 'flex', flexDirection: 'column', padding: isCollapsed ? '24px 10px' : '24px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
          
          {/* Profile Picture Upload Area */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <label htmlFor="profile-upload" style={{ cursor: 'pointer', display: 'block' }}>
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Admin Profile" 
                  style={{ width: '48px', height: '48px', minWidth: '48px', borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid #FFD700', boxSizing: 'border-box' }} 
                />
              ) : (
                <div style={{ width: '48px', height: '48px', minWidth: '48px', borderRadius: '50%', background: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: '18px', fontWeight: 'bold', boxSizing: 'border-box' }}>
                  {adminFirstName ? adminFirstName.charAt(0).toUpperCase() : "A"}
                </div>
              )}
            </label>
          </div>

          <input 
            id="profile-upload" 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            style={{ display: 'none' }} 
          />
          
          {/* Greeting Text (Hidden when sidebar is collapsed) */}
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#00d2b4' }}>
                Hi, {adminFirstName}
              </span>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', marginTop: '2px', fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
                Welcome back!
              </span>
            </div>
          )}
        </div>
       
        <nav style={{ flex: 1 }}>
          <div 
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
            <Menu size={24} color="white" />
            {!isCollapsed && <span style={{ marginLeft: '12px', fontWeight: '500' }}>Menu</span>}
          </div>
          <SidebarItem icon={<LayoutDashboard size={20} />} text={!isCollapsed && "Dashboard"} fullText="Dashboard"/>
          <SidebarItem icon={<MapPin size={22} />} text={!isCollapsed && "Trash Map"} fullText="Trash Map" active />
          <SidebarItem icon={<Users size={20} />} text={!isCollapsed && "Workers"} fullText="Workers"/>
          <SidebarItem icon={<Settings size={20} />} text={!isCollapsed && "Settings"} fullText="Settings"/>
        </nav>

        {/* Logout Button */}
        <div 
          onClick={handleLogout} 
          style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #333', cursor: 'pointer' }}
        >
          <SidebarItem icon={<LogOut size={20} />} text={!isCollapsed && "Logout"} fullText="Logout"/>
        </div>
      </div>

      {/* === MAIN CONTENT AREA === */}
      <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '200px' }}>

             {/* Branding / Logo */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 {/* Lid Handle */}
                 <path d="M9 3H15V5H9V3Z" fill="#1b5319" />
                 {/* Lid Top */}
                 <path d="M4 5H20V7H4V5Z" fill="#1b5319" />
                 {/* Main Body */}
                 <path d="M5 7H19V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V7Z" fill="#9AE39E" />
                 {/* Vertical Stripes */}
                 <rect x="9" y="10" width="2" height="9" rx="1" fill="#1b5319" />
                 <rect x="13" y="10" width="2" height="9" rx="1" fill="#1b5319" />
               </svg>

               <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                 <span style={{ color: '#333333' }}>Trash</span>
                 <span style={{ color: '#549a51', marginLeft: '2px' }}>Tracker</span>
               </h2>
             </div>

              {/* SEARCH BAR WITH AUTO-SUGGESTIONS */}
              <div style={{ position: 'relative' }}> 
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'stretch', 
                  border: '1px solid #a3a3a3', 
                  borderRadius: '30px', 
                  overflow: 'hidden', 
                  width: '380px',
                  background: 'white'
                }}>
                  <input 
                    placeholder="Search Specific Location ..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    style={{ 
                      border: 'none', 
                      outline: 'none', 
                      padding: '12px 20px', 
                      flex: 1,
                      fontSize: '14px',
                      color: '#333'
                    }} 
                  />
                  <button style={{
                    background: '#1b5319', 
                    color: '#ffffff',
                    border: 'none',
                    padding: '0 28px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600'
                  }}>
                    Search
                  </button>
                </div>

                {/* THE DROPDOWN LIST */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '55px',
                    left: '0',
                    width: '100%',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    zIndex: 2000,
                    maxHeight: '250px',
                    overflowY: 'auto',
                    border: '1px solid #eee'
                  }}>
                    {suggestions.map((loc, i) => (
                      <div 
                        key={i}
                        onClick={() => handleSelectLocation(loc)}
                        style={{
                          padding: '12px 20px',
                          fontSize: '13px',
                          color: '#333',
                          cursor: 'pointer',
                          borderBottom: i === suggestions.length - 1 ? 'none' : '1px solid #f0f0f0',
                          backgroundColor: 'white'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f8f1'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: '600', fontSize: '14px', color: '#111' }}>
                            {loc.name ? loc.name : loc.display_name.split(',')[0]}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {loc.display_name.split(',').slice(1, 4).join(',').trim()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>             
          </div>
          
          {/* RIGHT SIDE HEADER CONTROLS */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', position: 'relative' }}>
            
            {/* Custom Date Picker Trigger */}
            <div 
              onClick={() => {
                setTempDate(scanDate); 
                setIsDatePickerOpen(!isDatePickerOpen);
              }}
              style={{ 
                background: 'white',
                borderRadius: '30px',
                padding: '10px 20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                color: '#333',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              <Calendar size={18} color="#1b5319" />
              {scanDate ? scanDate : "Select Date"}
            </div>

            {/* CUSTOM DATE POPOVER UI */}
            {isDatePickerOpen && (
              <div style={{
                position: 'absolute',
                top: '55px',
                right: '55px',
                background: 'white',
                padding: '20px',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                border: '1px solid #E5E7EB',
                zIndex: 1000,
                width: '280px'
              }}>
               
                <div style={{ width: '100%' }}>

                  {/* Month / Year Header */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    
                    <select
                      value={currentMonth}
                      onChange={(e) => setCurrentMonth(Number(e.target.value))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '10px',
                        border: '1px solid #E5E7EB', background: '#F9FAFB',
                        fontSize: '13px', cursor: 'pointer'
                      }}
                    >
                      {months.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>

                    <select
                      value={currentYear}
                      onChange={(e) => setCurrentYear(Number(e.target.value))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '10px',
                        border: '1px solid #E5E7EB', background: '#F9FAFB',
                        fontSize: '13px', cursor: 'pointer'
                      }}
                    >
                      {Array.from({ length: 10 }).map((_, i) => {
                        const y = 2020 + i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>

                  {/* Week Days */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center', fontSize: '11px', color: '#9CA3AF',
                    marginBottom: '6px'
                  }}>
                    {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d => <div key={d}>{d}</div>)}
                  </div>

                  {/* Calendar Grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '6px', textAlign: 'center'
                  }}>
                    {Array(getFirstDayOfMonth(currentMonth, currentYear)).fill(null).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}

                    {Array.from({ length: getDaysInMonth(currentMonth, currentYear) }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                      const isSelected = tempDate === dateStr;

                      return (
                        <div
                          key={day}
                          onClick={() => setTempDate(dateStr)}
                          style={{
                            height: '32px', width: '32px', margin: 'auto',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer',
                            background: isSelected ? '#1b5319' : 'transparent',
                            color: isSelected ? 'white' : '#374151',
                            fontSize: '13px', fontWeight: isSelected ? '600' : '400'
                          }}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>
               
                {/* Footer Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  
                  <button 
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setTempDate(today); 
                    }}
                    style={{
                      background: 'transparent', border: 'none', color: '#1b5319', 
                      cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: '0'
                    }}
                  >
                    Today
                  </button>

                  <div style={{ display: 'flex', gap: '15px' }}>
                    
                    <button 
                      onClick={() => setIsDatePickerOpen(false)}
                      style={{
                        background: 'transparent', border: 'none', color: '#9CA3AF', 
                        cursor: 'pointer', fontSize: '14px', padding: '0'
                      }}
                    >
                      Cancel
                    </button>
                    
                    {/* --- CONFIRM BUTTON --- */}
                    {/* Saves the selected date to state and closes the modal, triggering a map refresh */}
                    <button 
                      onClick={() => {
                        setScanDate(tempDate); // 1. Save the selected date
                        setIsDatePickerOpen(false); // 2. Close the menu
                      }}
                      style={{
                        background: 'transparent', border: 'none', color: '#1b5319', 
                        cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: '0'
                      }}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== MODERN GREEN NOTIFICATION BELL ===== */}
            {/* Interactive bell icon with hover scaling and opacity transitions */}
            <div 
              style={{ 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s ease, opacity 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = '0.85';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="42" height="42" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">

                {/* Outer Circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="44" 
                  fill="none" 
                  stroke="#1b5319" 
                  strokeWidth="3"
                />

                {/* Top Dot */}
                <circle 
                  cx="50" 
                  cy="24" 
                  r="3.5" 
                  fill="#1b5319"
                />

                {/* Bell Body */}
                <path
                  d="
                    M50 30
                    C42 30 38 35 38 42
                    V55
                    C38 58 36 61 34 63
                    H66
                    C64 61 62 58 62 55
                    V42
                    C62 35 58 30 50 30
                    Z
                  "
                  fill="#1b5319"
                />

                {/* Bell Base */}
                <path
                  d="
                    M56 65
                    H44
                    C45.5 69 48 72 50 72
                    C52 72 54.5 69 56 65
                    Z
                  "
                  fill="#1b5319"
                />

              </svg>
            </div>
          </div>
        </div>

        {/* ===== TASK FILTER TABS ===== */}
        {/* Allows users to filter map pins based on task status (All, Pending, Completed) */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <TabButton text="All Tasks" active={filterStatus === "All"} onClick={() => setFilterStatus("All")} />
          <TabButton text="Pending" active={filterStatus === "Pending"} onClick={() => setFilterStatus("Pending")} />
          <TabButton text="Completed" active={filterStatus === "Done"} onClick={() => setFilterStatus("Done")} />
        </div>

        {/* ===== MAP CONTAINER (The "Google Earth" View) ===== */}
        <div style={{ flex: 1, background: 'white', borderRadius: '20px', padding: '0px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
          
          <MapContainer center={[34.37, 73.47]} zoom={12} zoomControl={false} style={{ height: "100%", width: "100%", borderRadius: '15px' }}>
            
            {/* 🌍 GOOGLE HYBRID TILE LAYER (Satellite imagery + Roads + Labels) 🌍 */}
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              attribution="&copy; Google Maps"
            />

            {/* Custom Hook: Resizes the map correctly when the sidebar is collapsed/expanded */}
            <MapResizer isCollapsed={isCollapsed} />

            {/* Custom Hook: Smoothly animates the map camera to the selected location */}
            <FlyToLocation target={selectedLocation} />
            
            {/* Custom Hook: Adjusts map bounds to perfectly fit all filtered pins on screen */}
            <FitBoundsToData data={filteredData} />

            {/* MAPPING LOGIC: Loop through filtered data and render dynamic pins */}
            {filteredData.map((trash) => (
              <Marker 
                key={trash.id} 
                position={[trash.latitude, trash.longitude]} 
                icon={trash.status === "Pending" ? redIcon : trash.status === "Assigned" ? yellowIcon : greenIcon}
                eventHandlers={{
                  // LOGIC: When a pin is clicked, set it as the active task and pan the camera to it
                  click: () => {
                    setSelectedTask(trash);
                    setSelectedLocation([trash.latitude, trash.longitude]); // For zooming in
                  }
                }}
              />
            ))}
          </MapContainer>

         {/* ===== FLOATING DETAILS CARD ===== */}
         {/* Renders conditionally when a specific task/pin is selected by the user */}
          {selectedTask && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '320px',
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              zIndex: 1000,
              animation: 'slideIn 0.3s ease-out'
            }}>
              
              {/* --- 1. CLOSE BUTTON --- */}
              <div 
                onClick={() => setSelectedTask(null)}
                style={{ 
                  position: 'absolute', 
                  top: '12px', 
                  right: '12px', 
                  background: 'rgba(255, 255, 255, 0.85)', 
                  backdropFilter: 'blur(4px)',
                  borderRadius: '50%', 
                  padding: '6px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  zIndex: 20,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}
              >
                <X size={18} color="#333" />
              </div>

              {/* --- 2. IMAGE CONTAINER WITH BADGE --- */}
              <div style={{ position: 'relative', width: '100%', height: '180px', backgroundColor: '#f1f5f9' }}>
                
                {/* Worker Proof Badge: Displays only if the task status is "Done" */}
                {selectedTask.status === "Done" && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '800',
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ✓ Worker Proof
                  </div>
                )}

                {/* IMAGE LOGIC: Shows "Proof" image if Done (or placeholder if missing), otherwise shows original detected trash */}
                <img 
                  src={
                    selectedTask.status === "Done" 
                      ? (selectedTask.proof_url ? selectedTask.proof_url : "https://via.placeholder.com/320x180?text=No+Proof+Uploaded") 
                      : selectedTask.image_url
                  } 
                  alt={selectedTask.status === "Done" ? "Cleaned Area Proof" : "Detected Trash"} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                />
              </div>
              
              {/* --- 3. DETAILS SECTION --- */}
              <div style={{ padding: '20px' }}>
                
                {/* Location & Date Information */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#444', marginBottom: '12px' }}>
                  <MapPin size={20} style={{ marginTop: '2px', flexShrink: 0, color: '#1b5319' }} /> 
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px', lineHeight: '1.2' }}>
                      {selectedTask.site_name || "Detected Area"}
                    </span>
                    <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>
                      📅 Date: {scanDate}
                    </span>
                  </div>
                </div>

                {/* Status Indicator with Dynamic Colors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                    <Trash2 size={18} style={{ color: selectedTask.status === "Pending" ? '#ef4444' : selectedTask.status === "Assigned" ? '#eab308' : '#22c55e' }}/> 
                    <span>Status: <b style={{ color: selectedTask.status === "Pending" ? '#ef4444' : selectedTask.status === "Assigned" ? '#eab308' : '#22c55e' }}>{selectedTask.status}</b></span>
                </div>

                {/* --- 4. ACTION LOGIC (Dynamic UI based on Task Status) --- */}
                {selectedTask.status === "Pending" ? (
                  
                  // Pending Status: Show dropdown to assign a worker
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Assign to Worker:</label>
                    <select 
                      value={selectedWorker} 
                      onChange={(e) => setSelectedWorker(e.target.value)}
                      style={{ 
                        width: '100%', padding: '10px', borderRadius: '8px', 
                        border: '1px solid #d1d5db', fontSize: '14px', 
                        outlineColor: '#1b5319', background: 'white', cursor: 'pointer' 
                      }}
                    >
                      <option value="">-- Select Worker --</option>
                      {availableWorkers.map(worker => (
                        <option key={worker.id} value={worker.id}>{worker.name}</option>
                      ))}
                    </select>

                    <button 
                      onClick={() => handleAssign(selectedTask.id)}
                      style={{ width: '100%', background: '#22c55e', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
                    >
                      👷 Dispatch Worker
                    </button>
                  </div>

                ) : selectedTask.status === "Assigned" ? (
                  
                  // Assigned Status: Show waiting message
                  <div style={{ textAlign: 'center', color: '#eab308', fontWeight: 'bold', padding: '15px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                    ⏳ Waiting for Worker to upload Proof
                  </div>

                ) : (
                  
                  // Done Status: Show success message
                  <div style={{ textAlign: 'center', color: '#22c55e', fontWeight: 'bold', padding: '10px', background: '#f0fdf4', borderRadius: '8px' }}>
                    🎉 Task Completed by Worker
                  </div>

                )}
              </div>
            </div>
          )}   

        </div>
      </div>
    </div>
  );
}

// ==========================================
// REUSABLE HELPER COMPONENTS & STYLES
// ==========================================

// SidebarItem: Renders individual links/buttons in the navigation sidebar
const SidebarItem = ({ icon, text, active, fullText }) => (
  <div 
    title={!text ? fullText : ""} // <-- Adds hover tooltip when sidebar is collapsed
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: text ? 'flex-start' : 'center', 
      padding: '12px', 
      borderRadius: '8px',
      marginBottom: '8px',
      cursor: 'pointer',
      background: active ? 'rgba(113, 202, 109, 0.1)' : 'transparent',
      color: active ? '#71CA6D' : '#a0a0a0',
      transition: '0.2s'
    }}
  >
    {icon}
    {text && <span style={{ marginLeft: '12px', whiteSpace: 'nowrap', fontWeight: '500' }}>{text}</span>}
  </div>
);

// TabButton: Renders the pill-shaped toggle buttons for filtering tasks
const TabButton = ({ text, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: '8px 20px', border: 'none', borderRadius: '20px', fontWeight: '600', cursor: 'pointer',
    background: active ? '#1b5319' : '#e2e8f0', color: active ? 'white' : '#64748b', transition: '0.2s'
  }}>
    {text}
  </button>
);

export default App;