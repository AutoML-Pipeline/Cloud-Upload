-- Test data with 100 rows including outliers for preprocessing testing
-- Create table
CREATE TABLE test_customers (
  customer_id INT PRIMARY KEY,
  age INT,
  income DECIMAL(12,2),
  tenure_months INT,
  purchases INT,
  returns INT,
  credit_score INT,
  gender VARCHAR(10),
  membership VARCHAR(20),
  last_login_days INT
);

-- Insert 100 rows with normal data and outliers
INSERT INTO test_customers (customer_id, age, income, gender, membership, tenure_months, purchases, returns, credit_score, last_login_days) VALUES
-- Normal data (rows 1-80)
(1, 25, 45000.00, 'Female', 'Bronze', 12, 15, 2, 650, 5),
(2, 32, 55000.00, 'Male', 'Silver', 24, 25, 3, 720, 2),
(3, 28, 48000.00, 'Female', 'Bronze', 18, 20, 1, 680, 7),
(4, 35, 62000.00, 'Male', 'Gold', 36, 35, 4, 750, 1),
(5, 29, 51000.00, 'Female', 'Silver', 15, 18, 2, 690, 4),
(6, 31, 58000.00, 'Male', 'Silver', 30, 28, 3, 710, 3),
(7, 27, 47000.00, 'Female', 'Bronze', 20, 22, 1, 660, 6),
(8, 33, 60000.00, 'Male', 'Gold', 42, 40, 5, 760, 2),
(9, 26, 46000.00, 'Female', 'Bronze', 14, 16, 2, 670, 8),
(10, 30, 54000.00, 'Male', 'Silver', 28, 26, 3, 700, 3),
(11, 34, 61000.00, 'Female', 'Gold', 38, 38, 4, 740, 1),
(12, 28, 49000.00, 'Male', 'Silver', 22, 24, 2, 685, 5),
(13, 32, 57000.00, 'Female', 'Gold', 34, 32, 3, 730, 2),
(14, 29, 50000.00, 'Male', 'Bronze', 16, 19, 1, 675, 7),
(15, 31, 56000.00, 'Female', 'Silver', 26, 27, 3, 705, 4),
(16, 27, 48000.00, 'Male', 'Bronze', 18, 21, 2, 665, 6),
(17, 33, 59000.00, 'Female', 'Gold', 40, 36, 4, 745, 1),
(18, 30, 52000.00, 'Male', 'Silver', 24, 25, 2, 695, 3),
(19, 28, 47000.00, 'Female', 'Bronze', 20, 23, 1, 680, 5),
(20, 32, 58000.00, 'Male', 'Silver', 32, 30, 3, 715, 2),
(21, 26, 46000.00, 'Female', 'Bronze', 12, 17, 2, 660, 8),
(22, 29, 51000.00, 'Male', 'Silver', 22, 24, 2, 690, 4),
(23, 31, 55000.00, 'Female', 'Gold', 28, 29, 3, 720, 3),
(24, 27, 48000.00, 'Male', 'Bronze', 16, 20, 1, 670, 6),
(25, 34, 60000.00, 'Female', 'Gold', 36, 37, 4, 750, 1),
(26, 30, 53000.00, 'Male', 'Silver', 26, 26, 3, 700, 3),
(27, 28, 49000.00, 'Female', 'Bronze', 18, 22, 2, 675, 5),
(28, 32, 57000.00, 'Male', 'Silver', 30, 31, 3, 710, 2),
(29, 25, 45000.00, 'Female', 'Bronze', 14, 16, 1, 650, 7),
(30, 33, 59000.00, 'Male', 'Gold', 38, 35, 4, 740, 1),
(31, 29, 50000.00, 'Female', 'Silver', 20, 23, 2, 685, 4),
(32, 31, 56000.00, 'Male', 'Silver', 28, 28, 3, 705, 3),
(33, 27, 47000.00, 'Female', 'Bronze', 16, 19, 1, 665, 6),
(34, 35, 61000.00, 'Male', 'Gold', 42, 39, 5, 760, 1),
(35, 28, 48000.00, 'Female', 'Bronze', 18, 21, 2, 680, 5),
(36, 32, 58000.00, 'Male', 'Silver', 32, 30, 3, 715, 2),
(37, 26, 46000.00, 'Female', 'Bronze', 12, 17, 2, 660, 8),
(38, 30, 52000.00, 'Male', 'Silver', 24, 25, 2, 695, 3),
(39, 33, 59000.00, 'Female', 'Gold', 36, 34, 4, 735, 1),
(40, 29, 51000.00, 'Male', 'Silver', 22, 24, 2, 690, 4),
(41, 31, 55000.00, 'Female', 'Gold', 28, 29, 3, 720, 3),
(42, 27, 48000.00, 'Male', 'Bronze', 16, 20, 1, 670, 6),
(43, 34, 60000.00, 'Female', 'Gold', 38, 37, 4, 750, 1),
(44, 30, 53000.00, 'Male', 'Silver', 26, 26, 3, 700, 3),
(45, 28, 49000.00, 'Female', 'Bronze', 18, 22, 2, 675, 5),
(46, 32, 57000.00, 'Male', 'Silver', 30, 31, 3, 710, 2),
(47, 25, 45000.00, 'Female', 'Bronze', 14, 16, 1, 650, 7),
(48, 33, 59000.00, 'Male', 'Gold', 36, 35, 4, 740, 1),
(49, 29, 50000.00, 'Female', 'Silver', 20, 23, 2, 685, 4),
(50, 31, 56000.00, 'Male', 'Silver', 28, 28, 3, 705, 3),
(51, 27, 47000.00, 'Female', 'Bronze', 16, 19, 1, 665, 6),
(52, 35, 61000.00, 'Male', 'Gold', 40, 39, 5, 760, 1),
(53, 28, 48000.00, 'Female', 'Bronze', 18, 21, 2, 680, 5),
(54, 32, 58000.00, 'Male', 'Silver', 32, 30, 3, 715, 2),
(55, 26, 46000.00, 'Female', 'Bronze', 12, 17, 2, 660, 8),
(56, 30, 52000.00, 'Male', 'Silver', 24, 25, 2, 695, 3),
(57, 33, 59000.00, 'Female', 'Gold', 36, 34, 4, 735, 1),
(58, 29, 51000.00, 'Male', 'Silver', 22, 24, 2, 690, 4),
(59, 31, 55000.00, 'Female', 'Gold', 28, 29, 3, 720, 3),
(60, 27, 48000.00, 'Male', 'Bronze', 16, 20, 1, 670, 6),
(61, 34, 60000.00, 'Female', 'Gold', 38, 37, 4, 750, 1),
(62, 30, 53000.00, 'Male', 'Silver', 26, 26, 3, 700, 3),
(63, 28, 49000.00, 'Female', 'Bronze', 18, 22, 2, 675, 5),
(64, 32, 57000.00, 'Male', 'Silver', 30, 31, 3, 710, 2),
(65, 25, 45000.00, 'Female', 'Bronze', 14, 16, 1, 650, 7),
(66, 33, 59000.00, 'Male', 'Gold', 36, 35, 4, 740, 1),
(67, 29, 50000.00, 'Female', 'Silver', 20, 23, 2, 685, 4),
(68, 31, 56000.00, 'Male', 'Silver', 28, 28, 3, 705, 3),
(69, 27, 47000.00, 'Female', 'Bronze', 16, 19, 1, 665, 6),
(70, 35, 61000.00, 'Male', 'Gold', 40, 39, 5, 760, 1),
(71, 28, 48000.00, 'Female', 'Bronze', 18, 21, 2, 680, 5),
(72, 32, 58000.00, 'Male', 'Silver', 32, 30, 3, 715, 2),
(73, 26, 46000.00, 'Female', 'Bronze', 12, 17, 2, 660, 8),
(74, 30, 52000.00, 'Male', 'Silver', 24, 25, 2, 695, 3),
(75, 33, 59000.00, 'Female', 'Gold', 36, 34, 4, 735, 1),
(76, 29, 51000.00, 'Male', 'Silver', 22, 24, 2, 690, 4),
(77, 31, 55000.00, 'Female', 'Gold', 28, 29, 3, 720, 3),
(78, 27, 48000.00, 'Male', 'Bronze', 16, 20, 1, 670, 6),
(79, 34, 60000.00, 'Female', 'Gold', 38, 37, 4, 750, 1),
(80, 30, 53000.00, 'Male', 'Silver', 26, 26, 3, 700, 3),

-- Outliers and edge cases (rows 81-100)
(81, 5, 1000000.00, 'Male', 'Platinum', 1, 1, 0, 300, 365),  -- Extreme age outlier, income outlier
(82, 120, 5000.00, 'Female', 'Basic', 240, 200, 50, 850, 0),  -- Age outlier, low income
(83, 45, 150000.00, 'Male', 'Platinum', 60, 100, 10, 800, 1),  -- High income outlier
(84, 22, 25000.00, 'Female', 'Bronze', 6, 5, 8, 500, 30),  -- Low income, high returns
(85, 50, 75000.00, 'Male', 'Gold', 48, 80, 15, 780, 2),  -- High purchases outlier
(86, 18, 35000.00, 'Female', 'Bronze', 3, 2, 1, 400, 60),  -- Young age, low credit
(87, 65, 90000.00, 'Male', 'Platinum', 72, 120, 20, 820, 1),  -- High age, high everything
(88, 19, 28000.00, 'Female', 'Basic', 2, 1, 0, 350, 90),  -- Very young, low values
(89, 55, 85000.00, 'Male', 'Gold', 66, 90, 12, 790, 1),  -- High tenure outlier
(90, 21, 32000.00, 'Female', 'Bronze', 4, 3, 2, 450, 45),  -- Low credit score
(91, 48, 95000.00, 'Male', 'Platinum', 54, 110, 18, 810, 1),  -- High income, high purchases
(92, 17, 20000.00, 'Female', 'Basic', 1, 0, 0, 300, 120),  -- Very young, very low values
(93, 62, 80000.00, 'Male', 'Gold', 78, 85, 14, 770, 1),  -- High age, high tenure
(94, 20, 30000.00, 'Female', 'Bronze', 3, 2, 1, 400, 75),  -- Low income, low credit
(95, 52, 88000.00, 'Male', 'Platinum', 60, 95, 16, 800, 1),  -- High income outlier
(96, 16, 15000.00, 'Female', 'Basic', 0, 0, 0, 250, 150),  -- Extreme young age, very low values
(97, 58, 92000.00, 'Male', 'Platinum', 72, 105, 19, 815, 1),  -- High age, high income
(98, 23, 38000.00, 'Female', 'Bronze', 8, 8, 3, 520, 25),  -- Moderate outlier
(99, 47, 78000.00, 'Male', 'Gold', 56, 75, 11, 760, 1),  -- High values
(100, 24, 42000.00, 'Female', 'Silver', 10, 12, 2, 580, 15);  -- Normal range

-- Add some NULL values for testing null handling
UPDATE test_customers SET income = NULL WHERE customer_id IN (15, 35, 55);
UPDATE test_customers SET age = NULL WHERE customer_id IN (25, 45);
UPDATE test_customers SET credit_score = NULL WHERE customer_id IN (5, 65, 85);
UPDATE test_customers SET purchases = NULL WHERE customer_id IN (10, 30, 50, 70, 90);

-- Add some duplicate rows for testing duplicate removal
INSERT INTO test_customers (customer_id, age, income, gender, membership, tenure_months, purchases, returns, credit_score, last_login_days) VALUES
(101, 25, 45000.00, 'Female', 'Bronze', 12, 15, 2, 650, 5),  -- Duplicate of row 1
(102, 32, 55000.00, 'Male', 'Silver', 24, 25, 3, 720, 2),  -- Duplicate of row 2
(103, 28, 48000.00, 'Female', 'Bronze', 18, 20, 1, 680, 7);  -- Duplicate of row 3
