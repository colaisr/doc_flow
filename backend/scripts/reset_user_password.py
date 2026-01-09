"""
Script to reset a user's password.
Usage: python3 scripts/reset_user_password.py --email test@docflow.com --password newpassword
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.user import User
from app.api.auth import hash_password
import argparse


def reset_user_password(email: str, new_password: str):
    """Reset a user's password."""
    db = SessionLocal()
    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User with email {email} not found!")
            return False
        
        # Update password
        user.hashed_password = hash_password(new_password)
        db.commit()
        
        print(f"✅ Password reset successfully!")
        print(f"   Email: {email}")
        print(f"   New Password: {new_password}")
        print(f"   Full Name: {user.full_name}")
        print(f"   Role: {user.role}")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error resetting password: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Reset user password')
    parser.add_argument('--email', required=True, help='User email')
    parser.add_argument('--password', required=True, help='New password')
    
    args = parser.parse_args()
    reset_user_password(args.email, args.password)
