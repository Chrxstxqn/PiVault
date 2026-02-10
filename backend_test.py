#!/usr/bin/env python3
"""
PiVault Backend API Testing Suite
Tests all core functionality of the password manager API
"""
import requests
import json
import sys
import uuid
from datetime import datetime
import base64
import os

class PiVaultAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.test_user_email = f"testuser_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_password = "TestPassword123!"
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []

    def log_result(self, test_name, success, response_data=None, error=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED")
            if error:
                print(f"   Error: {error}")
                self.errors.append(f"{test_name}: {error}")
        
        if response_data:
            print(f"   Response: {json.dumps(response_data, indent=2)[:200]}")
        print()

    def make_request(self, method, endpoint, data=None, expected_status=None):
        """Make HTTP request with auth header if available"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            
            # Check status code
            if expected_status and response.status_code != expected_status:
                return False, {
                    "error": f"Expected status {expected_status}, got {response.status_code}",
                    "response": response.text[:500]
                }
            
            # Try to parse JSON response
            try:
                return True, response.json()
            except json.JSONDecodeError:
                return True, {"raw_response": response.text[:500]}
                
        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test health check endpoints"""
        # Test root endpoint
        success, response = self.make_request('GET', '/', expected_status=200)
        self.log_result("Root health check", success, response if success else None, response.get('error') if not success else None)
        
        # Test health endpoint
        success, response = self.make_request('GET', '/health', expected_status=200)
        self.log_result("Health endpoint", success, response if success else None, response.get('error') if not success else None)
        
        return success

    def test_user_registration(self):
        """Test user registration"""
        data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        success, response = self.make_request('POST', '/auth/register', data, expected_status=200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('user_id')
            
        self.log_result("User registration", success, response if success else None, response.get('error') if not success else None)
        return success

    def test_user_login(self):
        """Test user login"""
        data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        success, response = self.make_request('POST', '/auth/login', data, expected_status=200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('user_id')
            
        self.log_result("User login", success, response if success else None, response.get('error') if not success else None)
        return success

    def test_get_current_user(self):
        """Test get current user info"""
        success, response = self.make_request('GET', '/auth/me', expected_status=200)
        
        user_valid = success and 'id' in response and 'email' in response
        
        self.log_result("Get current user", user_valid, response if success else None, response.get('error') if not success else None)
        return user_valid

    def test_get_categories(self):
        """Test get categories"""
        success, response = self.make_request('GET', '/categories', expected_status=200)
        
        categories_valid = success and isinstance(response, list)
        
        self.log_result("Get categories", categories_valid, response if success else None, response.get('error') if not success else None)
        return categories_valid, response if categories_valid else []

    def test_create_category(self):
        """Test create category"""
        data = {
            "name": "Test Category",
            "icon": "folder"
        }
        
        success, response = self.make_request('POST', '/categories', data, expected_status=200)
        
        category_created = success and 'id' in response and 'name' in response
        category_id = response.get('id') if category_created else None
        
        self.log_result("Create category", category_created, response if success else None, response.get('error') if not success else None)
        return category_created, category_id

    def test_create_vault_entry(self, category_id=None):
        """Test create vault entry (with encrypted data)"""
        # Mock encrypted data - in real app this would be AES encrypted JSON
        encrypted_data = base64.b64encode(json.dumps({
            "title": "Test Entry",
            "username": "testuser",
            "password": "testpass123",
            "url": "https://example.com",
            "notes": "Test notes"
        }).encode()).decode()
        
        nonce = base64.b64encode(os.urandom(12)).decode()
        
        data = {
            "encrypted_data": encrypted_data,
            "nonce": nonce,
            "category_id": category_id
        }
        
        success, response = self.make_request('POST', '/vault', data, expected_status=200)
        
        entry_created = success and 'id' in response
        entry_id = response.get('id') if entry_created else None
        
        self.log_result("Create vault entry", entry_created, response if success else None, response.get('error') if not success else None)
        return entry_created, entry_id

    def test_get_vault_entries(self):
        """Test get vault entries"""
        success, response = self.make_request('GET', '/vault', expected_status=200)
        
        entries_valid = success and isinstance(response, list)
        
        self.log_result("Get vault entries", entries_valid, response if success else None, response.get('error') if not success else None)
        return entries_valid, response if entries_valid else []

    def test_update_vault_entry(self, entry_id):
        """Test update vault entry"""
        if not entry_id:
            self.log_result("Update vault entry", False, None, "No entry ID provided")
            return False
            
        # Mock updated encrypted data
        encrypted_data = base64.b64encode(json.dumps({
            "title": "Updated Test Entry",
            "username": "updateduser",
            "password": "updatedpass123",
            "url": "https://updated.com",
            "notes": "Updated test notes"
        }).encode()).decode()
        
        nonce = base64.b64encode(os.urandom(12)).decode()
        
        data = {
            "encrypted_data": encrypted_data,
            "nonce": nonce
        }
        
        success, response = self.make_request('PUT', f'/vault/{entry_id}', data, expected_status=200)
        
        entry_updated = success and 'id' in response
        
        self.log_result("Update vault entry", entry_updated, response if success else None, response.get('error') if not success else None)
        return entry_updated

    def test_delete_vault_entry(self, entry_id):
        """Test delete vault entry"""
        if not entry_id:
            self.log_result("Delete vault entry", False, None, "No entry ID provided")
            return False
            
        success, response = self.make_request('DELETE', f'/vault/{entry_id}', expected_status=200)
        
        entry_deleted = success and 'message' in response
        
        self.log_result("Delete vault entry", entry_deleted, response if success else None, response.get('error') if not success else None)
        return entry_deleted

    def test_password_strength(self):
        """Test password strength checker"""
        data = {
            "password": "testpassword123"
        }
        
        success, response = self.make_request('POST', '/password-strength', data, expected_status=200)
        
        strength_valid = success and 'score' in response and 'feedback' in response
        
        self.log_result("Password strength check", strength_valid, response if success else None, response.get('error') if not success else None)
        return strength_valid

    def test_update_settings(self):
        """Test update user settings"""
        data = {
            "language": "en",
            "auto_lock_minutes": 30
        }
        
        success, response = self.make_request('PATCH', '/settings', data, expected_status=200)
        
        settings_updated = success and 'message' in response
        
        self.log_result("Update settings", settings_updated, response if success else None, response.get('error') if not success else None)
        return settings_updated

    def test_export_vault(self):
        """Test vault export"""
        success, response = self.make_request('GET', '/export', expected_status=200)
        
        export_valid = success and 'entries' in response and 'categories' in response
        
        self.log_result("Export vault", export_valid, response if success else None, response.get('error') if not success else None)
        return export_valid

    def test_logout(self):
        """Test user logout"""
        success, response = self.make_request('POST', '/auth/logout', expected_status=200)
        
        logout_valid = success and 'message' in response
        
        self.log_result("User logout", logout_valid, response if success else None, response.get('error') if not success else None)
        return logout_valid

    def run_full_test_suite(self):
        """Run complete test suite"""
        print("🚀 Starting PiVault Backend API Tests")
        print("="*50)
        
        # Test health checks first
        if not self.test_health_check():
            print("❌ Critical: API health check failed - stopping tests")
            return False
            
        # Test authentication flow
        if not self.test_user_registration():
            print("❌ Critical: User registration failed - stopping tests")
            return False
            
        if not self.test_user_login():
            print("❌ Critical: User login failed - stopping tests")
            return False
            
        if not self.test_get_current_user():
            print("❌ Critical: Get current user failed - stopping tests")
            return False
        
        # Test categories
        categories_success, categories = self.test_get_categories()
        category_success, category_id = self.test_create_category()
        
        # Test vault operations
        entry_success, entry_id = self.test_create_vault_entry(category_id)
        
        entries_success, entries = self.test_get_vault_entries()
        
        if entry_id:
            self.test_update_vault_entry(entry_id)
            self.test_delete_vault_entry(entry_id)
        
        # Test other features
        self.test_password_strength()
        self.test_update_settings()
        self.test_export_vault()
        self.test_logout()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("🧪 Test Summary")
        print("="*50)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.errors:
            print(f"\n❌ Failed tests:")
            for error in self.errors:
                print(f"   • {error}")
        
        return self.tests_passed / self.tests_run if self.tests_run > 0 else 0

def main():
    """Main test runner"""
    tester = PiVaultAPITester()
    
    try:
        tester.run_full_test_suite()
        success_rate = tester.print_summary()
        
        # Exit with status code based on success rate
        exit_code = 0 if success_rate >= 0.8 else 1
        sys.exit(exit_code)
        
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()