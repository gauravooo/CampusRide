from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserLoginRequest, TokenResponse, UserResponse
from app.utils.auth import is_valid_iimbg_domain, create_access_token, get_current_user
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    
    # Check domain enforcement unless bypass token matches or bypass is enabled
    is_domain_valid = is_valid_iimbg_domain(email)
    
    if not is_domain_valid and not settings.ALLOW_AUTH_BYPASS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Restricted: Only @{settings.ALLOWED_DOMAIN} email accounts are permitted."
        )

    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        role = "admin" if email.startswith("admin@") else "student"
        user = User(
            name=request.name if request.name else email.split("@")[0].capitalize(),
            email=email,
            role=role,
            trust_score=100.0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )

    token = create_access_token(data={"sub": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/bypass", response_model=TokenResponse)
def bypass_login(role: str = "student", db: Session = Depends(get_db)):
    """Offline dev bypass button for quick testing without Google OAuth setup."""
    if not settings.ALLOW_AUTH_BYPASS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bypass mode disabled.")
        
    target_email = "admin@iimbg.ac.in" if role == "admin" else "aarav.s2025@iimbg.ac.in"
    user = db.query(User).filter(User.email == target_email).first()
    
    if not user:
        user = User(
            name="Demo Admin" if role == "admin" else "Aarav Sharma (Student)",
            email=target_email,
            role=role,
            trust_score=100.0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
