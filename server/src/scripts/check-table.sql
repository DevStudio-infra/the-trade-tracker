-- Check if the table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'capital_com_pairs'
);

-- Get table structure
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'capital_com_pairs';

-- Count rows in the table
SELECT COUNT(*) FROM capital_com_pairs;

-- Sample data
SELECT * FROM capital_com_pairs LIMIT 10;
