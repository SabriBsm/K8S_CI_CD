-- Add customer_id column to projects table
-- This column stores the ID of the ProjectMember with role 'CUSTOMER'
-- One project can have only one customer member

ALTER TABLE projects ADD COLUMN customer_id BIGINT;

-- Add a foreign key constraint to ensure customer_id references a valid ProjectMember
ALTER TABLE projects ADD CONSTRAINT fk_projects_customer_id
    FOREIGN KEY (customer_id)
    REFERENCES project_members(id)
    ON DELETE SET NULL;

-- Add an index for faster queries
CREATE INDEX idx_projects_customer_id ON projects(customer_id);

