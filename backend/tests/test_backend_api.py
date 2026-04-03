"""
Backend API Tests for Polish Work Report App
Tests: Auth, Questions CRUD, Reports CRUD, Settings
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = "https://write-polish-4.preview.emergentagent.com"

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@raport.pl"
ADMIN_PASSWORD = "Admin123!"
USER_EMAIL = "pracownik@raport.pl"
USER_PASSWORD = "Praca123!"

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_token(api_client):
    """Get admin auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return response.json()["token"]

@pytest.fixture
def user_token(api_client):
    """Get user auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"User login failed: {response.status_code}")
    return response.json()["token"]

class TestAuth:
    """Authentication endpoint tests"""

    def test_admin_login_success(self, api_client):
        """Test admin login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"

    def test_user_login_success(self, api_client):
        """Test user login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == USER_EMAIL
        assert data["user"]["role"] == "user"

    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_auth_me_with_admin_token(self, api_client, admin_token):
        """Test /auth/me endpoint with admin token"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"

    def test_auth_me_with_user_token(self, api_client, user_token):
        """Test /auth/me endpoint with user token"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == USER_EMAIL
        assert data["role"] == "user"

    def test_auth_me_without_token(self, api_client):
        """Test /auth/me without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401

class TestQuestions:
    """Questions CRUD tests"""

    def test_get_active_questions_as_user(self, api_client, user_token):
        """Test GET /api/questions returns active questions"""
        response = api_client.get(
            f"{BASE_URL}/api/questions",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        questions = response.json()
        assert isinstance(questions, list)
        # Should have seeded questions
        assert len(questions) > 0
        # All should be active
        for q in questions:
            assert q["active"] is True
            assert "id" in q
            assert "text" in q
            assert "category" in q

    def test_get_all_questions_as_admin(self, api_client, admin_token):
        """Test GET /api/questions/all returns all questions (admin only)"""
        response = api_client.get(
            f"{BASE_URL}/api/questions/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        questions = response.json()
        assert isinstance(questions, list)
        assert len(questions) > 0

    def test_get_all_questions_as_user_forbidden(self, api_client, user_token):
        """Test GET /api/questions/all as user returns 403"""
        response = api_client.get(
            f"{BASE_URL}/api/questions/all",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403

    def test_create_question_as_admin(self, api_client, admin_token):
        """Test POST /api/questions creates question and verify persistence"""
        create_payload = {
            "text": "TEST_Pytanie testowe?",
            "category": "daily",
            "order": 999
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/questions",
            json=create_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["text"] == create_payload["text"]
        assert created["category"] == create_payload["category"]
        assert "id" in created
        question_id = created["id"]

        # Verify persistence by fetching all questions
        get_response = api_client.get(
            f"{BASE_URL}/api/questions/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        all_questions = get_response.json()
        found = [q for q in all_questions if q["id"] == question_id]
        assert len(found) == 1
        assert found[0]["text"] == create_payload["text"]

    def test_create_question_invalid_category(self, api_client, admin_token):
        """Test POST /api/questions with invalid category returns 400"""
        response = api_client.post(
            f"{BASE_URL}/api/questions",
            json={"text": "Test", "category": "invalid", "order": 1},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400

    def test_update_question_as_admin(self, api_client, admin_token):
        """Test PUT /api/questions/{id} updates question"""
        # First create a question
        create_response = api_client.post(
            f"{BASE_URL}/api/questions",
            json={"text": "TEST_Original", "category": "daily", "order": 1},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        question_id = create_response.json()["id"]

        # Update it
        update_response = api_client.put(
            f"{BASE_URL}/api/questions/{question_id}",
            json={"text": "TEST_Updated", "active": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200

        # Verify update
        get_response = api_client.get(
            f"{BASE_URL}/api/questions/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        all_questions = get_response.json()
        updated = [q for q in all_questions if q["id"] == question_id]
        assert len(updated) == 1
        assert updated[0]["text"] == "TEST_Updated"
        assert updated[0]["active"] is False

    def test_delete_question_as_admin(self, api_client, admin_token):
        """Test DELETE /api/questions/{id} deletes question"""
        # Create a question
        create_response = api_client.post(
            f"{BASE_URL}/api/questions",
            json={"text": "TEST_ToDelete", "category": "daily", "order": 1},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        question_id = create_response.json()["id"]

        # Delete it
        delete_response = api_client.delete(
            f"{BASE_URL}/api/questions/{question_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200

        # Verify deletion
        get_response = api_client.get(
            f"{BASE_URL}/api/questions/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        all_questions = get_response.json()
        found = [q for q in all_questions if q["id"] == question_id]
        assert len(found) == 0

class TestReports:
    """Reports CRUD tests"""

    def test_create_report_as_user(self, api_client, user_token):
        """Test POST /api/reports creates report and verify persistence"""
        create_payload = {
            "date": "03/04/2026",
            "answers": [
                {
                    "question_id": "test_q1",
                    "question_text": "Pytanie 1?",
                    "answer": "Odpowiedz testowa 1"
                },
                {
                    "question_id": "test_q2",
                    "question_text": "Pytanie 2?",
                    "answer": "Odpowiedz testowa 2"
                }
            ]
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/reports",
            json=create_payload,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["date"] == create_payload["date"]
        assert created["status"] == "open"
        assert len(created["answers"]) == 2
        assert "id" in created
        report_id = created["id"]

        # Verify persistence by fetching the report
        get_response = api_client.get(
            f"{BASE_URL}/api/reports/{report_id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["id"] == report_id
        assert fetched["date"] == create_payload["date"]

    def test_get_open_report_as_user(self, api_client, user_token):
        """Test GET /api/reports/open returns open report"""
        response = api_client.get(
            f"{BASE_URL}/api/reports/open",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        # May be null or a report object
        data = response.json()
        if data:
            assert data["status"] == "open"

    def test_cannot_create_report_while_one_open(self, api_client, user_token):
        """Test cannot create new report while one is open"""
        # First, check if there's an open report and close it
        open_response = api_client.get(
            f"{BASE_URL}/api/reports/open",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        if open_response.json():
            report_id = open_response.json()["id"]
            api_client.post(
                f"{BASE_URL}/api/reports/{report_id}/close",
                headers={"Authorization": f"Bearer {user_token}"}
            )

        # Create first report
        create_payload = {
            "date": "03/04/2026",
            "answers": [{"question_id": "q1", "question_text": "Q?", "answer": "A"}]
        }
        first_response = api_client.post(
            f"{BASE_URL}/api/reports",
            json=create_payload,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert first_response.status_code == 200

        # Try to create second report while first is open
        second_response = api_client.post(
            f"{BASE_URL}/api/reports",
            json=create_payload,
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert second_response.status_code == 400

    def test_close_report_as_user(self, api_client, user_token):
        """Test POST /api/reports/{id}/close closes report"""
        # Get open report
        open_response = api_client.get(
            f"{BASE_URL}/api/reports/open",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        open_report = open_response.json()
        if not open_report:
            pytest.skip("No open report to close")

        report_id = open_report["id"]

        # Close it
        close_response = api_client.post(
            f"{BASE_URL}/api/reports/{report_id}/close",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert close_response.status_code == 200

        # Verify it's closed
        get_response = api_client.get(
            f"{BASE_URL}/api/reports/{report_id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert get_response.status_code == 200
        report = get_response.json()
        assert report["status"] == "closed"
        assert report["closed_at"] is not None

    def test_get_all_reports_as_user(self, api_client, user_token):
        """Test GET /api/reports returns user's reports"""
        response = api_client.get(
            f"{BASE_URL}/api/reports",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        reports = response.json()
        assert isinstance(reports, list)

    def test_get_all_reports_as_admin(self, api_client, admin_token):
        """Test GET /api/reports as admin returns all reports"""
        response = api_client.get(
            f"{BASE_URL}/api/reports",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        reports = response.json()
        assert isinstance(reports, list)

class TestSettings:
    """Settings endpoint tests"""

    def test_get_settings_as_user(self, api_client, user_token):
        """Test GET /api/settings returns settings"""
        response = api_client.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        settings = response.json()
        assert "notification_time" in settings
        assert "notification_text" in settings
        assert "close_reminder_text" in settings

    def test_update_settings_as_admin(self, api_client, admin_token):
        """Test PUT /api/settings updates settings"""
        update_payload = {
            "notification_time": "09:00",
            "notification_text": "TEST_Nowy tekst powiadomienia"
        }
        update_response = api_client.put(
            f"{BASE_URL}/api/settings",
            json=update_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200

        # Verify update
        get_response = api_client.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        settings = get_response.json()
        assert settings["notification_time"] == "09:00"
        assert settings["notification_text"] == "TEST_Nowy tekst powiadomienia"

    def test_update_settings_as_user_forbidden(self, api_client, user_token):
        """Test PUT /api/settings as user returns 403"""
        response = api_client.put(
            f"{BASE_URL}/api/settings",
            json={"notification_time": "10:00"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
