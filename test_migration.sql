-- Test script to verify products exist with the correct names

-- Check if we have the stick products
SELECT 'Stick Products Check:' as check_type;
SELECT id, name FROM products 
WHERE name IN (
    'Häagen-Dazs Chunky Salted Caramel Ice Cream Sticks 3x80ml',
    'Häagen-Dazs Crunchy Cookies & Cream Ice Cream Sticks 3x80ml',
    'Häagen-Dazs Cracking Macadamia Nut Brittle Ice Cream Sticks 3x80ml',
    'Häagen-Dazs Peach & Raspberry Ice Cream Sticks 3x80ml',
    'Häagen-Dazs Mango & Passionfruit Ice Cream Sticks 3x80ml'
);

-- Check if we have the mini cups products
SELECT '\nMini Cups Products Check:' as check_type;
SELECT id, name FROM products 
WHERE name IN (
    'Häagen-Dazs Caramel Mini Cups Ice Cream 4x95ml',
    'Häagen-Dazs Fruit Mini Cups Ice Cream 4x95ml',
    'Häagen-Dazs Vanilla Collection Mini Cups Ice Cream 4 x 95ml',
    'Häagen-Dazs Favourites Mini Cups Ice Cream 4x95ml',
    'Häagen-Dazs Indulgence Collection Mini Ice Cream Tubs 4x95ml',
    'Häagen-Dazs Dessert Collection Mini Ice Cream Tubs 4x95ml'
);

-- Check if we have the tub products
SELECT '\nTub Products Check:' as check_type;
SELECT id, name FROM products 
WHERE name IN (
    'Häagen-Dazs Salted Caramel Ice Cream 460ml',
    'Häagen-Dazs Strawberry Cheesecake Ice Cream 460ml',
    'Häagen-Dazs Vanilla Ice Cream 460 ml',
    'Häagen-Dazs Belgian Chocolate Ice Cream 460ml',
    'Häagen-Dazs Cookies & Cream Ice Cream 386g'
);

-- Count total products
SELECT '\nTotal products in database:' as check_type, COUNT(*) as count FROM products;

-- Show all product names to help identify correct names
SELECT '\nAll product names:' as check_type;
SELECT id, name FROM products ORDER BY name;