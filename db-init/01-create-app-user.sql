CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'apppassword';
GRANT ALL PRIVILEGES ON group_projects.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
