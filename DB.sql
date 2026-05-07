-- ENUM
CREATE TYPE join_request_status AS ENUM (
    'pending',
    'accepted',
    'rejected'
);

-- USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    strengths TEXT,
    preferred_role VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- PROJECTS
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    short_description VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    max_members INTEGER NOT NULL,
    is_open BOOLEAN DEFAULT TRUE,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_title ON projects(title);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- MEMBERSHIPS
CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_label VARCHAR(255) DEFAULT 'Członek zespołu',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_membership_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX idx_memberships_project_id ON memberships(project_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);

-- JOIN REQUESTS
CREATE TABLE join_requests (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    strengths TEXT NOT NULL,
    preferred_role VARCHAR(255) NOT NULL,
    status join_request_status DEFAULT 'pending',
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_join_request_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX idx_join_requests_project_id ON join_requests(project_id);
CREATE INDEX idx_join_requests_user_id ON join_requests(user_id);

-- ANNOUNCEMENTS
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_project_id ON announcements(project_id);
CREATE INDEX idx_announcements_author_id ON announcements(author_id);