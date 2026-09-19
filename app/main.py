import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import Hub
from app.seed import seed_database

# Include routers
from app.routers import auth, cycles, trips, iot, admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Zero-cost Campus Cycle Sharing PWA for IIM Bodh Gaya"
)

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database schema and auto-seed if empty
@app.on_event("startup")
def startup_db_check():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        hub_count = db.query(Hub).count()
        if hub_count == 0:
            print("Database empty. Auto-seeding initial IIM Bodh Gaya campus hubs and cycles...")
            seed_database()
    except Exception as e:
        print(f"Startup DB seed check error: {e}")
    finally:
        db.close()

# Mount API Routers
app.include_router(auth.router)
app.include_router(cycles.router)
app.include_router(trips.router)
app.include_router(iot.router)
app.include_router(admin.router)

# Serve Static Files directory
static_path = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")

# Core PWA Entrypoint Routes
@app.get("/", response_class=FileResponse)
def read_root():
    return FileResponse(os.path.join(static_path, "index.html"))

@app.get("/admin", response_class=FileResponse)
def read_admin():
    return FileResponse(os.path.join(static_path, "admin.html"))

@app.get("/sw.js", response_class=FileResponse)
def read_sw():
    return FileResponse(
        os.path.join(static_path, "sw.js"),
        headers={"Service-Worker-Allowed": "/", "Content-Type": "application/javascript"}
    )

@app.get("/manifest.json", response_class=FileResponse)
def read_manifest():
    return FileResponse(
        os.path.join(static_path, "manifest.json"),
        headers={"Content-Type": "application/json"}
    )

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "campus": "IIM Bodh Gaya",
        "campus_center": [settings.CAMPUS_LAT, settings.CAMPUS_LNG]
    }
