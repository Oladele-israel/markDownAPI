CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userName VARCHAR(255) NOT NULL, 
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ENUM type for expense categories
CREATE TYPE category AS ENUM ('Groceries','Leisure','Electronics','Utilities','Clothing','Health','Others');

-- Create Expense Table
CREATE TABLE expense (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),     
    user_id UUID NOT NULL,                            
    title VARCHAR(255) NOT NULL,                        
    description TEXT,                                   
    category category NOT NULL DEFAULT 'Others',       
    amount NUMERIC(10, 2) NOT NULL,                     
    deleted_at TIMESTAMP NULL,                          
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     
    CONSTRAINT fk_user_expense FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Budgets Table
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    user_id UUID NOT NULL, 
    category category NOT NULL, -- Updated to use ENUM 'category'
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     
    CONSTRAINT fk_user_budget FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
SELECT * FROM Budgets;