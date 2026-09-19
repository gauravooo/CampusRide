import os

class Settings:
    PROJECT_NAME: str = "IIM Bodh Gaya CampusRide"
    VERSION: str = "1.0.0"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "iimbg-campus-cycle-secret-key-2026-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day token
    
    # Campus Center Coordinates (~24.6961° N, 84.9869° E)
    CAMPUS_LAT: float = 24.6961
    CAMPUS_LNG: float = 84.9869
    DEFAULT_GEOFENCE_RADIUS_METERS: float = 60.0  # Hub geofence tolerance
    
    # Domain & Auth
    ALLOWED_DOMAIN: str = "iimbg.ac.in"
    ALLOW_AUTH_BYPASS: bool = True  # Allows offline/local dev testing without Google OAuth client secret
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./campus.db")

settings = Settings()
