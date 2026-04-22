import os
import shutil
import xml.etree.ElementTree as ET
from fastapi import FastAPI, Depends, HTTPException, APIRouter, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from sqlalchemy.orm import Session
from . import models, database
from datetime import datetime
from pydantic import BaseModel

# =====================================================================
# 1. DATABASE INITIALIZATION
# =====================================================================
# Automatically generates all database tables based on defined ORM models
# if they do not already exist in the MySQL database.
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# =====================================================================
# 2. CORS (CROSS-ORIGIN RESOURCE SHARING) CONFIGURATION
# =====================================================================
# Middleware that allows the React frontend (or mobile app) to communicate 
# with this FastAPI backend without encountering origin security blocks.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Note: Set to '*' for development; restrict in production.
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# 3. DIRECTORY & STATIC FILE CONFIGURATION
# =====================================================================
# Establishes absolute paths for file storage to ensure the application 
# can safely read and write files regardless of where it is executed.
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
static_path = os.path.join(base_dir, "static")

# Sub-directories for organizing platform media
detections_path = os.path.join(static_path, "detections")
proofs_path = os.path.join(static_path, "proofs")
profiles_path = os.path.join(static_path, "profiles")

# Create directories dynamically if they are missing
os.makedirs(detections_path, exist_ok=True)
os.makedirs(proofs_path, exist_ok=True)
os.makedirs(profiles_path, exist_ok=True)

# Mount the static directory to serve images directly via HTTP URLs
app.mount("/static", StaticFiles(directory=static_path), name="static")

# =====================================================================
# 4. YOLO AI MODEL INITIALIZATION
# =====================================================================
# Pre-loads the computer vision model into memory during server startup 
# to optimize inference speed during API calls.
model_path = os.path.join(base_dir, "models", "best(1).pt")
if os.path.exists(model_path):
    model = YOLO(model_path)
    print(f"✅ AI Model Loaded: {model_path}")
else:
    model = None
    print(f"❌ ERROR: Model not found at {model_path}")

# =====================================================================
# 5. DATABASE DEPENDENCY HELPER
# =====================================================================
# Yields a database session for individual API requests and safely 
# closes the connection once the request is completed.
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =====================================================================
# 6. GEOSPATIAL UTILITY: KML READER
# =====================================================================
# Parses Google Earth KML files to extract latitude and longitude 
# coordinates for specific waste sites based on their Placemark names.
def get_coordinates_from_kml(kml_path):
    if not os.path.exists(kml_path):
        print("❌ KML File not found!")
        return {}

    try:
        tree = ET.parse(kml_path)
        root = tree.getroot()
        ns = {'kml': 'http://www.opengis.net/kml/2.2'}
        coords_db = {}

        for placemark in root.findall('.//kml:Placemark', ns):
            name_tag = placemark.find('kml:name', ns)
            point_tag = placemark.find('.//kml:Point/kml:coordinates', ns)
            
            if name_tag is not None and point_tag is not None:
                name = name_tag.text.strip()
                coords = point_tag.text.strip().split(',')
                
                # Extract coordinates (Longitude, Latitude)
                lat = float(coords[1])
                lng = float(coords[0])
                
                coords_db[name] = {"lat": lat, "lng": lng}
        
        print(f"🌍 KML Loaded: Found {len(coords_db)} locations.")
        return coords_db
    except Exception as e:
        print(f"❌ KML Error: {e}")
        return {}


# =====================================================================
# 🚀 CORE API: AI IMAGE SCANNING & DETECTION
# =====================================================================
@app.get("/scan/{date_str}")
def scan_folder(date_str: str, db: Session = Depends(get_db)):
    # Validates date format mapping to the dataset folder
    try:
        scan_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD"}

    input_folder = os.path.join(base_dir, "satellite_dataset", date_str)
    kml_path = os.path.join(base_dir, "Trash_Locations.kml")
    gps_data = get_coordinates_from_kml(kml_path)

    if not os.path.exists(input_folder):
        return {"error": f"No data found for date: {date_str}. Please create the folder."}

    processed_files = []

    # Iterate through target folder and process unanalyzed images
    for filename in os.listdir(input_folder):
        if filename.lower().endswith((".jpg", ".png")):
            clean_name = os.path.splitext(filename)[0].replace("detected_", "")
            unique_id = f"{clean_name}_{date_str}"

            # Skip if already processed
            existing = db.query(models.TrashDetection).filter(models.TrashDetection.id == unique_id).first()
            if existing:
                continue

            filepath = os.path.join(input_folder, filename)

            # Execute YOLOv8 inference and save bounding box results
            results = model.predict(source=filepath, save=True, imgsz=960, conf=0.1, project=detections_path, name="temp", exist_ok=True)

            # If trash is detected, save the record to the database
            if len(results[0].boxes) > 0:
                temp_file = os.path.join(detections_path, "temp", filename)
                final_filename = f"detected_{clean_name}_{date_str}.jpg"
                final_path = os.path.join(detections_path, final_filename)
                
                if os.path.exists(temp_file):
                    shutil.move(temp_file, final_path)

                location = gps_data.get(clean_name, {"lat": 34.37, "lng": 73.47})

                new_record = models.TrashDetection(
                    id=unique_id,
                    site_name=clean_name,
                    filename=final_filename,
                    latitude=location["lat"],
                    longitude=location["lng"],
                    status="Pending",
                    detection_date=scan_date,
                    image_url=f"http://127.0.0.1:8000/static/detections/{final_filename}" 
                )
                db.add(new_record)
                db.commit()
                processed_files.append(unique_id)

    # Return newly detected records for the dashboard
    return db.query(models.TrashDetection).filter(models.TrashDetection.detection_date == scan_date).all()


# =====================================================================
# 👷 TASK ASSIGNMENT & WORKER MANAGEMENT (SUPERVISOR APIs)
# =====================================================================

@app.put("/assign/{image_id}/{worker_id}")
def assign_worker(image_id: str, worker_id: int, db: Session = Depends(get_db)):
    # Assigns a specific task to a designated worker
    record = db.query(models.TrashDetection).filter(models.TrashDetection.id == image_id).first()
    worker = db.query(models.Worker).filter(models.Worker.id == worker_id).first()
    
    if not record or not worker:
        raise HTTPException(status_code=404, detail="Task or Worker not found")
    
    record.status = "Assigned"
    record.worker_id = worker.id
    worker.status = "Busy" 
    
    db.commit()
    return {"message": f"Task {image_id} Assigned to {worker.name} Successfully"}


@app.get("/workers")
def get_all_workers(db: Session = Depends(get_db)):
    # Fetches the list of all workers to populate the frontend dropdown
    workers = db.query(models.Worker).all()
    return workers


@app.put("/complete/{image_id}")
def complete_task(image_id: str, db: Session = Depends(get_db)):
    # Legacy/Fallback endpoint to mark a task as Done directly
    record = db.query(models.TrashDetection).filter(models.TrashDetection.id == image_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    
    record.status = "Done"
    db.commit()
    
    return {"message": "Trash Collected! Task Completed."}


# =====================================================================
# 🔐 SUPERVISOR AUTHENTICATION & PROFILE
# =====================================================================

# Pydantic schemas for request body validation
class LoginRequest(BaseModel):
    email: str
    password: str

class WorkerLogin(BaseModel):
    phone: str
    password: str

@app.post("/login")
def login_supervisor(req: LoginRequest, db: Session = Depends(get_db)):
    # Validates supervisor credentials for the web dashboard
    admin = db.query(models.Supervisor).filter(models.Supervisor.email == req.email).first()
    
    if not admin or admin.password_hash != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "message": "Login successful", 
        "admin_id": admin.id,        
        "name": admin.name,
        "profile_pic_url": admin.profile_pic_url
    }


@app.post("/upload-profile")
async def upload_profile_image(
    admin_id: int = Form(...), 
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Handles supervisor profile picture uploads and local storage
    file_location = os.path.join(profiles_path, file.filename)
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    file_url = f"http://127.0.0.1:8000/static/profiles/{file.filename}"
    
    db_admin = db.query(models.Supervisor).filter(models.Supervisor.id == admin_id).first()
    if db_admin:
        db_admin.profile_pic_url = file_url
        db.commit()
        
    return {"message": "Upload successful", "profile_pic_url": file_url}


@app.get("/admin/profile/{admin_id}")
def get_admin_profile(admin_id: int, db: Session = Depends(get_db)):
    # Retrieves supervisor profile metadata for dashboard rendering
    db_admin = db.query(models.Supervisor).filter(models.Supervisor.id == admin_id).first()
    
    if not db_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
        
    return {
        "name": db_admin.name, 
        "profile_pic_url": db_admin.profile_pic_url
    }


# =====================================================================
# 📱 WORKER MOBILE APP APIs
# =====================================================================

# Add this schema next to your WorkerLogin schema
class WorkerSignup(BaseModel):
    name: str
    phone: str
    password: str

# =====================================================================
# Add this route below your other auth endpoints
# =====================================================================
@app.post("/worker/signup")
def worker_signup(signup_data: WorkerSignup, db: Session = Depends(get_db)):
    # 1. Check if the phone number is already registered
    existing_worker = db.query(models.Worker).filter(models.Worker.phone == signup_data.phone).first()
    if existing_worker:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # 2. Create the new worker (saving password as plain text for now, as requested)
    new_worker = models.Worker(
        name=signup_data.name,
        phone=signup_data.phone,
        password_hash=signup_data.password,  # Storing plain text for MVP
        status="Available"
    )
    
    db.add(new_worker)
    db.commit()
    db.refresh(new_worker)
    
    return {
        "message": "Worker account created successfully!",
        "worker_id": new_worker.id,
        "name": new_worker.name
    }

@app.post("/worker/login")
def worker_login(login_data: WorkerLogin, db: Session = Depends(get_db)):
    # Authenticates field workers using their phone number
    worker = db.query(models.Worker).filter(models.Worker.phone == login_data.phone).first()
    
    if not worker or worker.password_hash != login_data.password:
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    
    return {
        "message": "Login Successful!",
        "worker_id": worker.id,
        "name": worker.name,
        "status": worker.status
    }

    
# Replace your existing @app.get("/worker-tasks/{worker_id}") with this:

@app.get("/worker-tasks/{worker_id}/{date_str}")
def get_worker_tasks_by_date(worker_id: int, date_str: str, db: Session = Depends(get_db)):
    try:
        # Converts "2024-05-20" string into a Python Date object
        filter_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # This query finds tasks that match BOTH the worker and the specific date
    assigned_tasks = db.query(models.TrashDetection).filter(
        models.TrashDetection.worker_id == worker_id,
        models.TrashDetection.detection_date == filter_date
    ).all()
    
    return assigned_tasks

@app.post("/complete-task/{task_id}")
def upload_proof_and_complete(
    task_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    # Processes post-cleanup evidence uploaded by the field worker
    record = db.query(models.TrashDetection).filter(models.TrashDetection.id == task_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Task not found")

    # Extract extension and dynamically generate filename
    file_extension = file.filename.split(".")[-1]
    new_filename = f"proof_{task_id}.{file_extension}"
    file_path = os.path.join(proofs_path, new_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update task lifecycle status and attach evidence URL
    record.status = "Done"
    record.proof_url = f"http://127.0.0.1:8000/static/proofs/{new_filename}"
    
    db.commit()

    return {
        "message": "Task completed successfully!", 
        "proof_saved_at": f"/static/proofs/{new_filename}"
    }