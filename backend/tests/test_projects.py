def create_project(client, token):
    response = client.post(
        "/api/projects",
        json={
            "title": "Platforma wspolpracy zespolowej",
            "short_description": "Aplikacja do zarzadzania wspolna praca nad projektem.",
            "description": "Projekt obejmuje stworzenie aplikacji webowej do organizacji pracy zespolowej, komunikacji i harmonogramowania zadan.",
            "max_members": 4,
            "is_open": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    return response.json()


def test_create_project_adds_owner_as_membership(client, registered_user):
    project = create_project(client, registered_user["token"])

    assert project["owner"]["id"] == registered_user["user"]["id"]
    assert project["member_count"] == 1
    assert len(project["memberships"]) == 1
    assert project["memberships"][0]["user"]["id"] == registered_user["user"]["id"]


def test_projects_list_returns_only_open_projects_with_free_slots(client, registered_user):
    create_project(client, registered_user["token"])

    response = client.get("/api/projects")

    assert response.status_code == 200
    projects = response.json()
    assert len(projects) == 1
    assert projects[0]["title"] == "Platforma wspolpracy zespolowej"
    assert projects[0]["available_slots"] == 3


def test_join_request_can_be_accepted_by_project_owner(client, registered_user, second_user):
    project = create_project(client, registered_user["token"])

    request_response = client.post(
        f"/api/projects/{project['id']}/requests",
        json={
            "strengths": "Potrafie projektowac API, pisac testy i optymalizowac zapytania.",
            "preferred_role": "Backend",
            "message": "Chetnie dolacze do zespolu i zajme sie warstwa serwerowa.",
        },
        headers={"Authorization": f"Bearer {second_user['token']}"},
    )

    assert request_response.status_code == 201
    request_id = request_response.json()["id"]

    review_response = client.post(
        f"/api/projects/{project['id']}/requests/{request_id}/review",
        json={"decision": "accepted"},
        headers={"Authorization": f"Bearer {registered_user['token']}"},
    )

    assert review_response.status_code == 200
    updated_project = review_response.json()
    assert updated_project["member_count"] == 2
    assert any(member["user"]["id"] == second_user["user"]["id"] for member in updated_project["memberships"])


def test_project_owner_cannot_join_own_project(client, registered_user):
    project = create_project(client, registered_user["token"])

    response = client.post(
        f"/api/projects/{project['id']}/requests",
        json={
            "strengths": "Znam zalozenia projektu i koordynuje prace zespolu.",
            "preferred_role": "Lider",
            "message": "To test niepoprawnego scenariusza.",
        },
        headers={"Authorization": f"Bearer {registered_user['token']}"},
    )

    assert response.status_code == 400
