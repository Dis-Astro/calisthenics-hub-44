#!/usr/bin/env python3
"""
Backend API Testing Script
Tests all FastAPI endpoints with proper error handling
"""
import requests
import json
from datetime import datetime
import sys

# Backend URL from frontend/.env
BACKEND_URL = "https://code-review-suite.preview.emergentagent.com/api"

def print_test_result(test_name, success, details="", response=None):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL" 
    print(f"{status} {test_name}")
    if details:
        print(f"   Details: {details}")
    if response and not success:
        print(f"   Response Status: {response.status_code}")
        try:
            print(f"   Response Body: {response.text}")
        except:
            print(f"   Response Body: <Unable to decode>")
    print()

def test_root_endpoint():
    """Test GET / endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print_test_result("Root Endpoint", True, "Message: Hello World")
                return True
            else:
                print_test_result("Root Endpoint", False, f"Unexpected message: {data}", response)
                return False
        else:
            print_test_result("Root Endpoint", False, f"HTTP {response.status_code}", response)
            return False
    except requests.exceptions.RequestException as e:
        print_test_result("Root Endpoint", False, f"Connection error: {e}")
        return False
    except Exception as e:
        print_test_result("Root Endpoint", False, f"Unexpected error: {e}")
        return False

def test_create_status_check():
    """Test POST /status endpoint"""
    test_data = {
        "client_name": "Test Client API"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/status", 
            json=test_data,
            timeout=30,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("client_name") == "Test Client API" and 
                "id" in data and 
                "timestamp" in data):
                print_test_result("Create Status Check", True, f"ID: {data['id']}, Client: {data['client_name']}")
                return True, data["id"]
            else:
                print_test_result("Create Status Check", False, f"Invalid response structure: {data}", response)
                return False, None
        else:
            print_test_result("Create Status Check", False, f"HTTP {response.status_code}", response)
            return False, None
    except requests.exceptions.RequestException as e:
        print_test_result("Create Status Check", False, f"Connection error: {e}")
        return False, None
    except Exception as e:
        print_test_result("Create Status Check", False, f"Unexpected error: {e}")
        return False, None

def test_get_status_checks():
    """Test GET /status endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/status", timeout=30)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("Get Status Checks", True, f"Retrieved {len(data)} status checks")
                return True
            else:
                print_test_result("Get Status Checks", False, f"Expected list, got: {type(data)}", response)
                return False
        else:
            print_test_result("Get Status Checks", False, f"HTTP {response.status_code}", response)
            return False
    except requests.exceptions.RequestException as e:
        print_test_result("Get Status Checks", False, f"Connection error: {e}")
        return False
    except Exception as e:
        print_test_result("Get Status Checks", False, f"Unexpected error: {e}")
        return False

def test_backend_health():
    """Test basic backend connectivity and health"""
    try:
        # Test without /api prefix first
        base_url = "https://code-review-suite.preview.emergentagent.com"
        response = requests.get(f"{base_url}/health", timeout=15)
        health_available = response.status_code == 200
        
        # Test with /api prefix
        api_response = requests.get(f"{BACKEND_URL}/", timeout=15)
        api_available = api_response.status_code == 200
        
        if api_available:
            print_test_result("Backend Health", True, "Backend API is accessible")
            return True
        elif health_available:
            print_test_result("Backend Health", True, "Backend service is running (health check passed)")
            return True
        else:
            print_test_result("Backend Health", False, "Backend not responding to health checks")
            return False
            
    except requests.exceptions.RequestException as e:
        print_test_result("Backend Health", False, f"Connection error: {e}")
        return False
    except Exception as e:
        print_test_result("Backend Health", False, f"Unexpected error: {e}")
        return False

def run_all_tests():
    """Run all backend tests and report results"""
    print("=" * 60)
    print("BACKEND API TESTING")
    print(f"Testing URL: {BACKEND_URL}")
    print("=" * 60)
    print()
    
    results = []
    
    # Test 1: Backend Health
    results.append(test_backend_health())
    
    # Test 2: Root endpoint
    results.append(test_root_endpoint())
    
    # Test 3: Create status check
    create_success, created_id = test_create_status_check()
    results.append(create_success)
    
    # Test 4: Get status checks
    results.append(test_get_status_checks())
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Backend is working correctly.")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Backend needs attention.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)