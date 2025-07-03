-- Verification script to check what claims are missing before applying migration

-- Check for missing brand claims
SELECT 'Missing brand claim: ' || claim_text AS status
FROM (
    VALUES 
    ('Work with best farms for dairy'),
    ('Luxurious'),
    ('Melts slowly in your mouth'),
    ('Dense, low-air ice cream'),
    ('Driven to be the world''s best ice cream'),
    ('Founded by the Mattus family'),
    ('Carefully crafted'),
    ('Crafted by expert chefs'),
    ('Driven for perfection'),
    ('Suitable for vegetarians'),
    ('Halal'),
    ('Kosher'),
    ('Made with Milk from European farms'),
    ('Crunchy biscuit pieces'),
    ('Crunchy cookie pieces')
) AS missing_claims(claim_text)
WHERE NOT EXISTS (
    SELECT 1 FROM claims c 
    WHERE c.claim_text = missing_claims.claim_text
);

-- Check for missing disallowed claims
SELECT 'Missing disallowed claim: ' || claim_text AS status
FROM (
    VALUES 
    ('All-natural'),
    ('100% real cream'),
    ('French Cream'),
    ('Fresh milk'),
    ('No Palm Oil'),
    ('No Palm Kernel'),
    ('Made in France')
) AS missing_disallowed(claim_text)
WHERE NOT EXISTS (
    SELECT 1 FROM claims c 
    WHERE c.claim_text = missing_disallowed.claim_text
);

-- Count existing claims
SELECT 
    'Total claims in database: ' || COUNT(*) AS status
FROM claims;

-- Count claims by type
SELECT 
    'Claims by type: ' || claim_type || ' = ' || COUNT(*) AS status
FROM claims
GROUP BY claim_type;

-- Count claims by level
SELECT 
    'Claims by level: ' || level || ' = ' || COUNT(*) AS status
FROM claims
GROUP BY level;