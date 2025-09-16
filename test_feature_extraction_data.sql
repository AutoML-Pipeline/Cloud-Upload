-- Test SQL file for Feature Extraction
-- This file contains sample data to test various feature engineering operations

-- Create a sample table with diverse data types for feature engineering testing
CREATE TABLE IF NOT EXISTS customer_transactions (
    customer_id VARCHAR(50),
    transaction_date DATE,
    transaction_time TIME,
    amount DECIMAL(10,2),
    category VARCHAR(50),
    payment_method VARCHAR(30),
    age INT,
    income DECIMAL(12,2),
    gender VARCHAR(10),
    city VARCHAR(50),
    loyalty_tier VARCHAR(20),
    num_purchases INT,
    last_purchase_days_ago INT,
    is_premium BOOLEAN,
    satisfaction_score DECIMAL(3,2)
);

-- Insert sample data with various patterns for feature engineering
INSERT INTO customer_transactions VALUES
-- High-value customers with different patterns
('CUST001', '2024-01-15', '14:30:00', 1250.50, 'Electronics', 'Credit Card', 35, 75000.00, 'Male', 'New York', 'Gold', 45, 2, TRUE, 4.8),
('CUST002', '2024-01-16', '09:15:00', 890.25, 'Clothing', 'Debit Card', 28, 55000.00, 'Female', 'Los Angeles', 'Silver', 32, 5, FALSE, 4.2),
('CUST003', '2024-01-17', '16:45:00', 2100.75, 'Electronics', 'Credit Card', 42, 95000.00, 'Male', 'Chicago', 'Platinum', 67, 1, TRUE, 4.9),
('CUST004', '2024-01-18', '11:20:00', 450.00, 'Books', 'Cash', 25, 35000.00, 'Female', 'Houston', 'Bronze', 18, 8, FALSE, 3.8),
('CUST005', '2024-01-19', '13:10:00', 1750.30, 'Home & Garden', 'Credit Card', 38, 68000.00, 'Male', 'Phoenix', 'Gold', 41, 3, TRUE, 4.5),

-- Medium-value customers
('CUST006', '2024-01-20', '10:30:00', 320.75, 'Sports', 'Debit Card', 31, 48000.00, 'Female', 'Philadelphia', 'Silver', 25, 6, FALSE, 4.1),
('CUST007', '2024-01-21', '15:20:00', 680.90, 'Electronics', 'Credit Card', 29, 52000.00, 'Male', 'San Antonio', 'Silver', 28, 4, FALSE, 4.3),
('CUST008', '2024-01-22', '12:45:00', 425.60, 'Clothing', 'Debit Card', 33, 45000.00, 'Female', 'San Diego', 'Bronze', 22, 7, FALSE, 3.9),
('CUST009', '2024-01-23', '14:15:00', 950.40, 'Home & Garden', 'Credit Card', 36, 62000.00, 'Male', 'Dallas', 'Gold', 35, 2, TRUE, 4.4),
('CUST010', '2024-01-24', '09:50:00', 275.25, 'Books', 'Cash', 27, 38000.00, 'Female', 'San Jose', 'Bronze', 15, 10, FALSE, 3.7),

-- Low-value customers
('CUST011', '2024-01-25', '16:30:00', 125.80, 'Sports', 'Debit Card', 24, 28000.00, 'Male', 'Austin', 'Bronze', 12, 12, FALSE, 3.5),
('CUST012', '2024-01-26', '11:40:00', 85.50, 'Books', 'Cash', 22, 25000.00, 'Female', 'Jacksonville', 'Bronze', 8, 15, FALSE, 3.2),
('CUST013', '2024-01-27', '13:25:00', 195.75, 'Clothing', 'Debit Card', 26, 32000.00, 'Male', 'Fort Worth', 'Bronze', 14, 9, FALSE, 3.6),
('CUST014', '2024-01-28', '10:15:00', 65.30, 'Sports', 'Cash', 23, 26000.00, 'Female', 'Columbus', 'Bronze', 6, 18, FALSE, 3.1),
('CUST015', '2024-01-29', '15:50:00', 145.90, 'Books', 'Debit Card', 25, 30000.00, 'Male', 'Charlotte', 'Bronze', 10, 14, FALSE, 3.4),

-- Outliers and edge cases
('CUST016', '2024-01-30', '17:00:00', 5000.00, 'Electronics', 'Credit Card', 45, 150000.00, 'Male', 'New York', 'Platinum', 89, 1, TRUE, 5.0),
('CUST017', '2024-01-31', '08:30:00', 25.00, 'Books', 'Cash', 20, 20000.00, 'Female', 'Detroit', 'Bronze', 3, 25, FALSE, 2.8),
('CUST018', '2024-02-01', '19:15:00', 3500.25, 'Home & Garden', 'Credit Card', 50, 120000.00, 'Male', 'Seattle', 'Platinum', 76, 1, TRUE, 4.9),
('CUST019', '2024-02-02', '07:45:00', 45.75, 'Sports', 'Cash', 21, 22000.00, 'Female', 'Denver', 'Bronze', 4, 20, FALSE, 3.0),
('CUST020', '2024-02-03', '20:30:00', 2800.60, 'Electronics', 'Credit Card', 48, 110000.00, 'Male', 'Boston', 'Platinum', 82, 1, TRUE, 4.8),

-- More diverse data for comprehensive testing
('CUST021', '2024-02-04', '12:00:00', 750.40, 'Clothing', 'Credit Card', 34, 58000.00, 'Female', 'Nashville', 'Silver', 31, 4, FALSE, 4.2),
('CUST022', '2024-02-05', '14:30:00', 420.80, 'Home & Garden', 'Debit Card', 30, 42000.00, 'Male', 'Baltimore', 'Bronze', 19, 8, FALSE, 3.8),
('CUST023', '2024-02-06', '11:15:00', 1100.25, 'Electronics', 'Credit Card', 39, 72000.00, 'Female', 'Oklahoma City', 'Gold', 38, 3, TRUE, 4.6),
('CUST024', '2024-02-07', '16:45:00', 180.50, 'Books', 'Debit Card', 26, 34000.00, 'Male', 'Portland', 'Bronze', 16, 11, FALSE, 3.7),
('CUST025', '2024-02-08', '13:20:00', 650.90, 'Sports', 'Credit Card', 32, 51000.00, 'Female', 'Las Vegas', 'Silver', 27, 5, FALSE, 4.1),

-- Additional data for scaling and encoding tests
('CUST026', '2024-02-09', '10:45:00', 320.75, 'Clothing', 'Debit Card', 28, 39000.00, 'Male', 'Milwaukee', 'Bronze', 21, 7, FALSE, 3.9),
('CUST027', '2024-02-10', '15:10:00', 890.30, 'Home & Garden', 'Credit Card', 37, 65000.00, 'Female', 'Albuquerque', 'Gold', 36, 2, TRUE, 4.5),
('CUST028', '2024-02-11', '09:30:00', 155.25, 'Books', 'Cash', 24, 29000.00, 'Male', 'Tucson', 'Bronze', 11, 13, FALSE, 3.4),
('CUST029', '2024-02-12', '17:20:00', 1200.60, 'Electronics', 'Credit Card', 41, 78000.00, 'Female', 'Fresno', 'Gold', 44, 2, TRUE, 4.7),
('CUST030', '2024-02-13', '12:50:00', 485.40, 'Sports', 'Debit Card', 29, 46000.00, 'Male', 'Sacramento', 'Silver', 24, 6, FALSE, 4.0);

-- Query to retrieve the data for feature engineering testing
SELECT 
    customer_id,
    transaction_date,
    transaction_time,
    amount,
    category,
    payment_method,
    age,
    income,
    gender,
    city,
    loyalty_tier,
    num_purchases,
    last_purchase_days_ago,
    is_premium,
    satisfaction_score
FROM customer_transactions
ORDER BY customer_id;

-- Additional queries for testing different feature engineering scenarios:

-- 1. Test scaling operations (amount, income, age, satisfaction_score)
-- 2. Test encoding operations (category, payment_method, gender, city, loyalty_tier)
-- 3. Test binning operations (age, income, amount, num_purchases)
-- 4. Test feature creation (datetime decomposition, polynomial features)
-- 5. Test feature selection (correlation analysis, variance threshold)

-- Sample aggregation query for testing feature creation
SELECT 
    category,
    payment_method,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_amount,
    SUM(amount) as total_amount,
    MAX(amount) as max_amount,
    MIN(amount) as min_amount
FROM customer_transactions
GROUP BY category, payment_method
ORDER BY total_amount DESC;
