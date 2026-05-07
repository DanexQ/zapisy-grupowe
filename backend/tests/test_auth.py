def test_register_returns_token_and_user_profile(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "strongpass123",
            "bio": "Lubi prace zespolowa.",
            "strengths": "Komunikacja i analiza wymagan.",
            "preferred_role": "Analityk",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["full_name"] == "New User"


def test_login_and_me_endpoint_return_authenticated_user(client, registered_user):
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": registered_user["payload"]["email"],
            "password": registered_user["payload"]["password"],
        },
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    me_response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert me_response.status_code == 200
    assert me_response.json()["email"] == registered_user["payload"]["email"]


def test_register_rejects_duplicate_email(client, registered_user):
    response = client.post("/api/auth/register", json=registered_user["payload"])

    assert response.status_code == 400


def test_update_me_updates_profile_fields(client, registered_user):
    response = client.patch(
        "/api/auth/me",
        json={
            "full_name": "Alice Updated",
            "bio": "Nowa wersja opisu profilu.",
            "preferred_role": "Product Designer",
        },
        headers={"Authorization": f"Bearer {registered_user['token']}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Alice Updated"
    assert data["bio"] == "Nowa wersja opisu profilu."
    assert data["preferred_role"] == "Product Designer"


def test_my_projects_returns_owned_and_member_projects(client, registered_user, second_user):
    owned_response = client.post(
        "/api/projects",
        json={
            "title": "Projekt prowadzony przez Alice",
            "short_description": "Projekt skupiony na organizacji pracy zespolowej.",
            "description": "Celem projektu jest przygotowanie narzedzia do wspolpracy nad projektami grupowymi i obiegu zadan.",
            "max_members": 4,
            "is_open": True,
        },
        headers={"Authorization": f"Bearer {registered_user['token']}"},
    )
    owned_project = owned_response.json()

    second_project_response = client.post(
        "/api/projects",
        json={
            "title": "Projekt prowadzony przez Boba",
            "short_description": "Projekt dotyczacy planowania i monitorowania zgloszen.",
            "description": "Projekt obejmuje implementacje panelu zarzadzania kandydatami, statystykami i tablica ogloszen.",
            "max_members": 5,
            "is_open": True,
        },
        headers={"Authorization": f"Bearer {second_user['token']}"},
    )
    second_project = second_project_response.json()

    request_response = client.post(
        f"/api/projects/{second_project['id']}/requests",
        json={
            "strengths": "Dobrze radze sobie z planowaniem, testowaniem i dopracowaniem widokow.",
            "preferred_role": "Frontend",
            "message": "Chetnie dolacze i pomoge przy interfejsie.",
        },
        headers={"Authorization": f"Bearer {registered_user['token']}"},
    )
    request_id = request_response.json()["id"]

    client.post(
        f"/api/projects/{second_project['id']}/requests/{request_id}/review",
        json={"decision": "accepted"},
        headers={"Authorization": f"Bearer {second_user['token']}"},
    )

    response = client.get("/api/auth/me/projects", headers={"Authorization": f"Bearer {registered_user['token']}"})

    assert response.status_code == 200
    data = response.json()
    assert len(data["owned_projects"]) == 1
    assert data["owned_projects"][0]["id"] == owned_project["id"]
    assert len(data["member_projects"]) == 1
    assert data["member_projects"][0]["id"] == second_project["id"]


def test_my_requests_returns_users_join_requests(client, registered_user, second_user):
    project_response = client.post(
        "/api/projects",
        json={
            "title": "Projekt testowy zgloszen",
            "short_description": "Projekt do sprawdzania listy moich zgloszen.",
            "description": "Projekt pozwala zweryfikowac, czy system poprawnie przypisuje i wyswietla zgloszenia biezacego uzytkownika.",
            "max_members": 4,
            "is_open": True,
        },
        headers={"Authorization": f"Bearer {second_user['token']}"},
    )
    project = project_response.json()

    client.post(
        f"/api/projects/{project['id']}/requests",
        json={
            "strengths": "Dobrze odnajduje sie w pracy koncepcyjnej i walidacji formularzy.",
            "preferred_role": "Analityk",
            "message": "Interesuje mnie wspolpraca przy tym projekcie.",
        },
        headers={"Authorization": f"Bearer {registered_user['token']}"},
    )

    response = client.get("/api/auth/me/requests", headers={"Authorization": f"Bearer {registered_user['token']}"})

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["project"]["id"] == project["id"]
    assert data[0]["status"] == "pending"
