# Content Templates Guide for Mixer AI

This guide outlines content templates designed for mass-market food brands to drive organic search performance. Each template includes minimal required inputs and structured output fields with AI prompts.

## Table of Contents

### Recipe-Based Content
1. Classic Recipe Template
2. Quick Recipe Template
3. Seasonal Recipe Collection
4. Dietary-Specific Recipe
5. One-Pot/Tray Bake Recipe
6. Meal Prep Guide

### Educational/How-To Content
7. Ingredient Deep Dive
8. Cooking Technique Guide
9. Kitchen Tips & Hacks
10. Food Storage Guide
11. Substitution Guide

### Practical Guides
12. Budget Meal Planning
13. Back-to-School Packed Lunch Ideas
14. Breakfast on the Go
15. Store Cupboard Essentials Guide

### Family & Lifestyle
16. Children's Cooking Activities
17. Family Dinner Ideas
18. Leftover Transformation Guide
19. Baking Basics Guide

### Seasonal & Event Content
20. Holiday Cooking Guide
21. Match Day Snacks
22. Summer BBQ Guide
23. Bring-a-Dish Guide

### Brand-Specific
24. Behind the Brand Story
25. Product Usage Guide
26. Recipe Remix

---

## Recipe-Based Content

### 1. Classic Recipe Template

**Purpose**: Traditional recipes featuring brand products with full instructions and details.

**Input Fields**:
- `recipe_name` (shortText, required): Name of the recipe
- `featured_product` (product-selector, required): Primary brand product used
- `meal_type` (select, required): Breakfast, Lunch, Dinner, Snack, Dessert
- `serving_size` (number, required): Number of servings
- `total_time` (number, required): Total time in minutes

**Output Fields**:
- `seo_title` (plainText): "Create an SEO-optimised recipe title (50-60 characters) for {{recipe_name}} featuring {{featured_product}}. Include primary keyword at the beginning. Focus on search terms like 'easy', 'quick', 'best' that families use. Consider search intent and include the cooking method if relevant."
- `meta_description` (plainText): "Write a compelling meta description (150-160 characters) for this {{recipe_name}} that includes the primary keyword, highlights {{featured_product}}, mentions it serves {{serving_size}}, and includes a call-to-action. Use active voice and create urgency."
- `introduction` (richText): "Write a warm, conversational 2-paragraph introduction for {{recipe_name}} that explains why families will love this {{meal_type}} recipe. Naturally mention {{featured_product}} and that it serves {{serving_size}}."
- `ingredients_list` (richText): "Create an ingredients list for {{recipe_name}} serving {{serving_size}} people. Feature {{featured_product}} as a key ingredient. Format as HTML unordered list."
- `instructions` (richText): "Write clear, numbered step-by-step instructions for {{recipe_name}}. Include specific instructions for using {{featured_product}}. Keep steps simple and family-friendly. Format as HTML ordered list."
- `serving_suggestions` (richText): "Suggest 2-3 ways to serve or vary this {{recipe_name}} for different family preferences or occasions. Include related long-tail keywords naturally. Mention complementary {{featured_product}} products to encourage cross-selling."
- `schema_markup_data` (plainText): "Generate key data points for Recipe schema markup: prep time ({{total_time}} mins), servings ({{serving_size}}), main ingredient ({{featured_product}}). Include cuisine type and meal type ({{meal_type}})."
- `internal_links` (plainText): "Suggest 3-4 relevant internal links to other recipes or guides that use {{featured_product}} or suit {{meal_type}}. Focus on user journey and complementary content."

### 2. Quick Recipe Template

**Purpose**: Fast recipes for busy families that can be made in 30 minutes or less.

**Input Fields**:
- `recipe_name` (shortText, required): Quick recipe name
- `featured_product` (product-selector, required): Primary brand product
- `prep_time` (number, required): Prep time in minutes (max 10)
- `cook_time` (number, required): Cook time in minutes (max 20)
- `difficulty` (select, required): Super Easy, Easy

**Output Fields**:
- `seo_title` (plainText): "Create an SEO-optimised title for {{recipe_name}} (50-60 characters). Front-load keywords like 'Quick' or '{{cook_time}}-Minute'. Include {{featured_product}} and power words like 'easy'. Target voice search queries like 'how to make quick {{recipe_name}}'."
- `meta_description` (plainText): "Write a compelling meta description (150-160 characters) highlighting this {{recipe_name}} takes only {{cook_time}} minutes. Include {{featured_product}}, create urgency with 'tonight' or 'now', and add clear CTA like 'Get recipe'."
- `introduction` (richText): "Write a brief introduction for busy parents about {{recipe_name}}. Emphasise total time and how {{featured_product}} saves time. Include semantic keywords like 'speedy', 'fast', 'quick dinner'. Answer 'what can I cook in {{cook_time}} minutes?' for featured snippets."
- `ingredients_list` (richText): "Create a short ingredients list (5-8 items max) for {{recipe_name}} featuring {{featured_product}}. Format as HTML unordered list."
- `quick_instructions` (richText): "Write simple 4-6 step instructions for {{recipe_name}}. Each step should be one sentence. Highlight time-savers using {{featured_product}}."
- `make_ahead_tips` (plainText): "Provide 1-2 tips for making this {{recipe_name}} even faster on busy weeknights. Target long-tail keywords like 'meal prep {{recipe_name}}' and 'make ahead {{recipe_name}}'."
- `faq_section` (richText): "Create 3-4 FAQs about making {{recipe_name}} with {{featured_product}}. Include substitutions, storage, common mistakes. Use natural question format for voice search and People Also Ask. Start questions with 'Can I', 'How do I', 'What if'."
- `schema_data` (plainText): "Generate Recipe schema data: totalTime ({{prep_time}} + {{cook_time}} mins), prepTime ({{prep_time}}), cookTime ({{cook_time}}), difficulty ({{difficulty}}), featuring {{featured_product}}."
- `quick_links` (plainText): "Suggest 3-4 internal links: similar quick recipes, {{featured_product}} product page, meal planning guides, and technique tutorials. Use descriptive anchor text."

### 3. Seasonal Recipe Collection

**Purpose**: Holiday and seasonal recipes that families search for during specific times of year.

**Input Fields**:
- `season_holiday` (select, required): Spring, Summer, Autumn, Winter, Christmas, Easter, Bonfire Night, Halloween, May Bank Holiday
- `featured_products` (product-selector, required): Brand products featured (can be multiple)
- `recipe_count` (number, required): Number of recipes to include (3-5)
- `recipe_types` (tags, required): starters, mains, sides, puddings

**Output Fields**:
- `collection_title` (plainText): "Create an SEO title for a {{season_holiday}} recipe collection featuring {{featured_products}}. Include the current year and {{recipe_count}} recipes."
- `meta_description` (plainText): "Write a meta description for {{recipe_count}} {{season_holiday}} recipes featuring {{featured_products}}. Mention {{recipe_types}}."
- `introduction` (richText): "Write an introduction about celebrating {{season_holiday}} with these {{recipe_count}} recipes. Mention how {{featured_products}} make holiday cooking easier."
- `recipe_list` (richText): "Create {{recipe_count}} recipe names and brief descriptions for {{season_holiday}}. Include {{recipe_types}} using {{featured_products}}. Format with H3 headers and 2-3 sentence descriptions each."
- `holiday_tips` (richText): "Provide 3-4 practical tips for {{season_holiday}} meal planning and preparation using {{featured_products}}."
- `shopping_list` (richText): "Create a categorized shopping list for all {{recipe_count}} recipes, highlighting {{featured_products}}."
- `pinterest_description` (plainText): "Write a Pinterest-optimised description (100-200 characters) for this {{season_holiday}} collection featuring {{featured_products}}. Include relevant hashtags."
- `content_hub_links` (plainText): "Identify 3-5 pillar pages or content hubs this collection should link to, such as 'Ultimate {{season_holiday}} Guide' or 'Year-Round Meal Planning'."

### 4. Dietary-Specific Recipe

**Purpose**: Recipes for common dietary needs like gluten-free, dairy-free, or vegetarian.

**Input Fields**:
- `recipe_name` (shortText, required): Recipe name
- `dietary_type` (select, required): Gluten-Free, Dairy-Free, Vegetarian, Nut-Free
- `featured_product` (product-selector, required): Brand product that meets dietary need
- `substitutions_needed` (tags): Common ingredients that need substituting

**Output Fields**:
- `seo_title` (plainText): "Create an SEO-optimised title (50-60 chars) for {{dietary_type}} {{recipe_name}} featuring {{featured_product}}. Front-load '{{dietary_type}}' for search intent. Include power words like 'Easy' or 'Delicious'. Target searches like 'best {{dietary_type}} {{recipe_name}}'."
- `meta_description` (plainText): "Write a compelling meta description (150-160 chars) for this {{dietary_type}} {{recipe_name}}. Reassure it's truly {{dietary_type}}, mention {{featured_product}}, include benefits, and add CTA. Use trust words like 'certified', 'guaranteed'."
- `introduction` (richText): "Write an introduction explaining how this {{recipe_name}} is perfectly {{dietary_type}} thanks to {{featured_product}}. Address common concerns about {{substitutions_needed}}."
- `ingredients_with_notes` (richText): "Create an ingredients list for {{dietary_type}} {{recipe_name}} with notes about why each ingredient is {{dietary_type}}-safe. Highlight {{featured_product}}."
- `instructions` (richText): "Write clear instructions for {{recipe_name}} with special notes about maintaining {{dietary_type}} requirements. Reference {{featured_product}} usage."
- `substitution_guide` (richText): "Provide a guide for additional {{dietary_type}} substitutions readers might need based on {{substitutions_needed}}. Target long-tail keywords like '{{dietary_type}} substitute for X'. Format as scannable list."
- `schema_markup` (plainText): "Generate Recipe schema with suitableForDiet: {{dietary_type}}, plus nutrition info highlighting {{dietary_type}} benefits. Include recipeIngredient with {{featured_product}}."
- `trust_signals` (richText): "Add trust elements: mention any {{dietary_type}} certifications, link to {{dietary_type}} organisation guidelines, include 'verified {{dietary_type}}' badges where applicable."
- `related_content` (plainText): "Link to: {{dietary_type}} meal plans, other {{dietary_type}} recipes, {{dietary_type}} shopping guide, and {{featured_product}} product page with {{dietary_type}} info."

### 5. One-Pot/Tray Bake Recipe

**Purpose**: Minimal washing-up recipes that busy families love for weeknight dinners.

**Input Fields**:
- `recipe_name` (shortText, required): Recipe name
- `cooking_method` (select, required): One-Pot, Tray Bake, Slow Cooker, Pressure Cooker
- `featured_product` (product-selector, required): Primary brand product
- `washing_up_time` (select, required): Under 5 minutes, Under 10 minutes

**Output Fields**:
- `seo_title` (plainText): "Create an SEO-optimised title (50-60 chars) for {{cooking_method}} {{recipe_name}} featuring {{featured_product}}. Front-load {{cooking_method}} and include 'easy' or 'simple'. Target searches like 'easy {{cooking_method}} recipes'."
- `meta_description` (plainText): "Write a compelling meta description (150-160 chars) for {{cooking_method}} {{recipe_name}}. Highlight {{washing_up_time}} washing-up, mention {{featured_product}}, add benefit like 'perfect for busy weeknights', include CTA."
- `introduction` (richText): "Write an introduction about how {{cooking_method}} cooking makes {{recipe_name}} perfect for busy weeknights. Mention {{featured_product}} and {{washing_up_time}} washing-up."
- `ingredients_list` (richText): "Create an ingredients list for {{cooking_method}} {{recipe_name}} organized by when they're added. Feature {{featured_product}}."
- `simple_instructions` (richText): "Write instructions for {{cooking_method}} {{recipe_name}} emphasizing how everything cooks together. Highlight {{featured_product}} usage."
- `washing_up_tips` (plainText): "Provide 2-3 tips for making washing-up even easier with this {{cooking_method}} recipe. Target keywords like 'minimal cleanup {{cooking_method}}' and 'easy washing-up dinners'."
- `featured_snippet` (richText): "Create a 40-60 word answer to 'What is {{cooking_method}} cooking?' Include benefits like minimal washing-up and time-saving. Format for position zero."
- `schema_data` (plainText): "Generate Recipe schema: cookingMethod: {{cooking_method}}, include equipment needed, total time, and highlight minimal cleanup benefit."
- `content_links` (plainText): "Link to: other {{cooking_method}} recipes, washing-up tips guide, busy weeknight meal hub, {{featured_product}} uses. Use keyword-rich anchor text."

### 6. Meal Prep Guide

**Purpose**: Weekly meal planning guides that help families save time and money.

**Input Fields**:
- `meal_prep_type` (select, required): Breakfast, Lunch, Dinner, Full Day
- `prep_day` (select, required): Sunday, Saturday
- `serving_count` (number, required): Number of meals to prep (5-10)
- `featured_products` (product-selector, required): Brand products used

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{meal_prep_type}} meal prep guide for {{serving_count}} meals using {{featured_products}}."
- `meta_description` (plainText): "Write a meta description for {{prep_day}} {{meal_prep_type}} meal prep creating {{serving_count}} meals with {{featured_products}}."
- `introduction` (richText): "Write an introduction about how {{prep_day}} meal prep saves time during the week. Explain how {{featured_products}} make prep easier for {{serving_count}} {{meal_prep_type}} meals."
- `prep_schedule` (richText): "Create a time-based schedule for {{prep_day}} prep session making {{serving_count}} {{meal_prep_type}} meals. Include specific tasks and timing."
- `recipe_rotation` (richText): "Provide 3-5 {{meal_prep_type}} recipes using {{featured_products}} that work well for meal prep. Include storage instructions."
- `storage_guide` (richText): "Create a guide for storing {{serving_count}} prepped {{meal_prep_type}} meals, including container recommendations and shelf life."
- `reheating_instructions` (plainText): "Provide instructions for reheating {{meal_prep_type}} meals throughout the week."

## Educational/How-To Content

### 7. Ingredient Deep Dive

**Purpose**: Comprehensive guides about common ingredients that pair with brand products.

**Input Fields**:
- `ingredient_name` (shortText, required): The ingredient to explore
- `related_products` (product-selector, required): Brand products that pair well
- `usage_focus` (tags, required): cooking, baking, seasoning, mixing

**Output Fields**:
- `article_title` (plainText): "Create an SEO-optimised title for a comprehensive guide about {{ingredient_name}}. Include 'ultimate guide', 'everything about', or 'complete guide to' for featured snippet potential. Target {{target_audience}} with practical angle. 50-60 characters."
- `meta_description` (plainText): "Write a meta description about mastering {{ingredient_name}} in everyday cooking with {{related_products}}."
- `introduction` (richText): "Write an introduction about {{ingredient_name}} that home cooks will find useful. Mention how {{related_products}} work well with it."
- `selection_tips` (richText): "Provide practical tips for selecting and buying {{ingredient_name}} at the grocery store. Focus on {{usage_focus}}."
- `storage_guide` (richText): "Explain how to properly store {{ingredient_name}} to maximize freshness and avoid waste."
- `cooking_basics` (richText): "Share essential tips for cooking with {{ingredient_name}} based on {{usage_focus}}. Reference {{related_products}} where relevant."
- `common_mistakes` (richText): "List 3-4 common mistakes people make with {{ingredient_name}} and how to avoid them."
- `recipe_ideas` (richText): "Suggest 5 simple ways to use {{ingredient_name}} with {{related_products}}. Include seasonal variations and trending preparations. Each idea should target different long-tail keywords like 'quick {{ingredient_name}} recipes' or 'healthy {{ingredient_name}} dishes'."
- `featured_snippet_box` (richText): "Create a concise definition box (40-60 words) answering 'What is {{ingredient_name}}?' optimised for Google's featured snippet. Include key facts in bullet points."
- `related_searches` (plainText): "List 5-7 'People Also Ask' questions about {{ingredient_name}} that this content should answer. Include questions about storage, substitutes, nutrition, and cooking methods."

### 8. Cooking Technique Guide

**Purpose**: How-to guides for common cooking techniques families need to master.

**Input Fields**:
- `technique_name` (shortText, required): Cooking technique to teach
- `skill_level` (select, required): Beginner, Intermediate
- `applicable_products` (product-selector, required): Products that use this technique
- `common_mistakes` (tags): Typical errors to address

**Output Fields**:
- `guide_title` (plainText): "Create an SEO-optimised title for mastering {{technique_name}} at {{skill_level}} level. Include action words like 'master', 'learn', or 'perfect'. Add year for freshness. Target voice search with natural phrasing. 50-60 characters."
- `meta_description` (plainText): "Write a meta description for learning {{technique_name}} with tips for using {{applicable_products}}."
- `introduction` (richText): "Write an encouraging introduction about learning {{technique_name}} for {{skill_level}} cooks. Mention how {{applicable_products}} make it easier."
- `equipment_needed` (richText): "List essential and optional equipment for {{technique_name}}. Keep it practical for home kitchens."
- `step_by_step` (richText): "Create clear, numbered steps for {{technique_name}} appropriate for {{skill_level}} level. Reference {{applicable_products}} where applicable."
- `troubleshooting` (richText): "Address {{common_mistakes}} with solutions for each. Make fixes simple and practical."
- `practice_recipes` (richText): "Suggest 3 easy recipes using {{applicable_products}} to practice {{technique_name}}. Include difficulty progression and time estimates. Link each to potential recipe pages."
- `video_script_outline` (plainText): "Create a brief outline for a complementary how-to video about {{technique_name}}. Include key visual moments and timestamps for maximum engagement."
- `skill_progression` (plainText): "Suggest next techniques to learn after mastering {{technique_name}}. Create a learning path that encourages exploring more content."

### 9. Kitchen Tips & Hacks

**Purpose**: Practical tips and shortcuts that save time in the kitchen.

**Input Fields**:
- `tip_category` (select, required): Time-Saving, Money-Saving, Storage, Prep Work, Cooking Shortcuts
- `featured_products` (product-selector, required): Products that relate to tips
- `tip_count` (number, required): Number of tips (10-15)

**Output Fields**:
- `article_title` (plainText): "Create an SEO title for {{tip_count}} {{tip_category}} kitchen tips. Make it clickable and practical."
- `meta_description` (plainText): "Write a meta description for {{tip_count}} {{tip_category}} tips featuring {{featured_products}}."
- `introduction` (richText): "Write a brief introduction about how these {{tip_category}} tips will help busy families. Mention {{featured_products}} naturally."
- `tips_list` (richText): "Create {{tip_count}} practical {{tip_category}} tips. Include specific mentions of {{featured_products}} in at least 3-4 tips. Format with H3 headers and explanations."
- `bonus_tip` (plainText): "Add one bonus {{tip_category}} tip specifically featuring {{featured_products}}."

### 10. Food Storage Guide

**Purpose**: Help families reduce food waste and save money through proper storage.

**Input Fields**:
- `storage_focus` (select, required): Fridge, Freezer, Cupboard, Leftovers
- `food_categories` (tags, required): produce, dairy, meats, baked-goods, prepared-foods
- `related_products` (product-selector, required): Products with storage considerations

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{storage_focus}} storage guide covering {{food_categories}}."
- `meta_description` (plainText): "Write a meta description for properly storing {{food_categories}} in {{storage_focus}}."
- `introduction` (richText): "Write an introduction about saving money and reducing waste through proper {{storage_focus}} storage of {{food_categories}}."
- `storage_rules` (richText): "Create comprehensive storage guidelines for {{food_categories}} in {{storage_focus}}. Include specifics for {{related_products}}."
- `shelf_life_chart` (richText): "Create a reference chart showing how long {{food_categories}} last in {{storage_focus}}. Format as an HTML table."
- `organization_tips` (richText): "Provide 5 tips for organizing {{storage_focus}} to maximize space and minimize waste."
- `safety_reminders` (plainText): "List 3 important food safety rules for {{storage_focus}} storage."

### 11. Substitution Guide

**Purpose**: Help home cooks when they're missing ingredients or need alternatives.

**Input Fields**:
- `substitution_type` (select, required): Baking, Cooking, Dietary Needs, Emergency
- `common_swaps` (tags, required): eggs, butter, milk, flour, sugar
- `brand_products` (product-selector, required): Products that can serve as substitutes

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{substitution_type}} substitutions focusing on {{common_swaps}}."
- `meta_description` (plainText): "Write a meta description for {{substitution_type}} ingredient substitutions including {{brand_products}}."
- `introduction` (richText): "Write an introduction about why {{substitution_type}} substitutions are helpful. Mention how {{brand_products}} can help."
- `substitution_chart` (richText): "Create a comprehensive substitution chart for {{common_swaps}} in {{substitution_type}} contexts. Include {{brand_products}} as options where relevant. Format as HTML table."
- `usage_notes` (richText): "Provide important notes about how substitutions might affect results in {{substitution_type}} applications."
- `success_tips` (richText): "Share 4-5 tips for successful {{substitution_type}} substitutions."

## Practical Guides

### 12. Budget Meal Planning

**Purpose**: Help families eat well while staying within budget using brand products.

**Input Fields**:
- `budget_target` (select, required): £40/week, £60/week, £80/week
- `family_size` (number, required): Number of people (2-6)
- `featured_products` (product-selector, required): Budget-friendly brand products
- `meal_types` (tags, required): breakfast, lunch, dinner, snacks

**Output Fields**:
- `guide_title` (plainText): "Create an SEO-optimised title for feeding {{family_size}} people on {{budget_target}} per week. Include current year and location (UK). Use numbers for click-through rate. Target 'budget meal plan' keywords. 50-60 characters."
- `meta_description` (plainText): "Write a meta description for budget meal planning for {{family_size}} on {{budget_target}} using {{featured_products}}."
- `introduction` (richText): "Write an introduction about feeding {{family_size}} people well on {{budget_target}}. Explain how {{featured_products}} help stretch the budget."
- `weekly_menu` (richText): "Create a full week menu for {{family_size}} people including {{meal_types}} within {{budget_target}}. Feature {{featured_products}} prominently."
- `shopping_list` (richText): "Generate a categorised shopping list with estimated prices totalling under {{budget_target}}. Highlight {{featured_products}}."
- `money_saving_tips` (richText): "Provide 5-7 specific tips for staying within {{budget_target}} while feeding {{family_size}} people."
- `batch_cooking_ideas` (richText): "Suggest 3 recipes using {{featured_products}} that can be doubled for leftovers without exceeding budget. Calculate cost per portion. Include freezing instructions."
- `cost_breakdown_table` (richText): "Create a detailed cost breakdown table showing price per meal and per person. Include {{featured_products}} prices based on average UK supermarket costs. Format as HTML table for easy scanning."
- `shopping_hacks` (plainText): "List 5-7 UK-specific shopping hacks for staying within {{budget_target}}. Include best days to shop, own-brand alternatives, and seasonal savings."
- `meal_prep_timeline` (richText): "Create a Sunday meal prep schedule to maximise the {{budget_target}} weekly budget. Include time estimates and storage instructions."

### 13. Back-to-School Packed Lunch Ideas

**Purpose**: Easy, nutritious packed lunch ideas that children will actually eat.

**Input Fields**:
- `age_group` (select, required): Primary School, Secondary School, Sixth Form
- `lunch_products` (product-selector, required): Portable brand products
- `prep_time` (select, required): Night Before, Morning Of, Weekly Prep
- `dietary_considerations` (tags): nut-free, dairy-free, vegetarian

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{age_group}} school packed lunch ideas featuring {{lunch_products}}."
- `meta_description` (plainText): "Write a meta description for {{prep_time}} lunch prep for {{age_group}} students using {{lunch_products}}."
- `introduction` (richText): "Write an introduction about making {{age_group}} packed lunches children will eat. Mention {{prep_time}} prep and {{lunch_products}}."
- `lunch_ideas` (richText): "Create 10 packed lunch combinations for {{age_group}} students featuring {{lunch_products}}. Consider {{dietary_considerations}}. Format with fun names and contents."
- `prep_schedule` (richText): "Provide a {{prep_time}} prep schedule for efficient lunch making using {{lunch_products}}."
- `nutrition_balance` (richText): "Explain how to balance nutrition in {{age_group}} lunches with practical examples using {{lunch_products}}."
- `child_approved_tips` (plainText): "Share 3-4 tips for getting {{age_group}} children to eat their packed lunches."

### 14. Breakfast on the Go

**Purpose**: Quick breakfast solutions for busy mornings.

**Input Fields**:
- `breakfast_type` (select, required): Grab-and-Go, 5-Minute Prep, Make-Ahead
- `breakfast_products` (product-selector, required): Quick breakfast products
- `portions_needed` (number, required): Number of breakfasts to prep

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{breakfast_type}} breakfast ideas using {{breakfast_products}}."
- `meta_description` (plainText): "Write a meta description for {{portions_needed}} {{breakfast_type}} breakfasts featuring {{breakfast_products}}."
- `introduction` (richText): "Write an introduction about solving the morning rush with {{breakfast_type}} options using {{breakfast_products}}."
- `breakfast_ideas` (richText): "Create 7-10 {{breakfast_type}} breakfast ideas featuring {{breakfast_products}}. Include estimated prep/eat times."
- `prep_instructions` (richText): "Provide detailed instructions for preparing {{portions_needed}} {{breakfast_type}} breakfasts efficiently."
- `storage_tips` (richText): "Explain how to store {{breakfast_type}} breakfasts featuring {{breakfast_products}} for the week."
- `morning_timeline` (plainText): "Create a realistic morning timeline showing how {{breakfast_type}} breakfasts fit into a busy routine."

### 15. Store Cupboard Essentials Guide

**Purpose**: Building and maintaining a well-stocked store cupboard with brand products.

**Input Fields**:
- `cupboard_size` (select, required): Small, Medium, Large
- `staple_products` (product-selector, required): Shelf-stable brand products
- `cooking_frequency` (select, required): Daily, Few Times a Week, Weekends Only

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for stocking a {{cupboard_size}} cupboard with essentials including {{staple_products}}."
- `meta_description` (plainText): "Write a meta description for building a {{cupboard_size}} cupboard for {{cooking_frequency}} cooking."
- `introduction` (richText): "Write an introduction about the importance of a well-stocked {{cupboard_size}} cupboard for {{cooking_frequency}} cooking. Mention {{staple_products}}."
- `essentials_list` (richText): "Create a categorised list of cupboard essentials for {{cupboard_size}} cupboard and {{cooking_frequency}} cooking. Feature {{staple_products}} prominently."
- `organisation_system` (richText): "Provide a system for organising a {{cupboard_size}} cupboard efficiently."
- `rotation_tips` (richText): "Explain how to rotate stock and track expiry dates in a {{cupboard_size}} cupboard."
- `quick_meals` (richText): "List 5 meals you can make entirely from cupboard staples featuring {{staple_products}}."

## Family & Lifestyle

### 16. Children's Cooking Activities

**Purpose**: Fun, safe cooking activities that get children involved in the kitchen.

**Input Fields**:
- `age_range` (select, required): 3-5 years, 6-8 years, 9-12 years
- `activity_type` (select, required): No-Cook, Simple Cooking, Baking
- `child_friendly_products` (product-selector, required): Products safe for children to use
- `supervision_level` (select, required): Full Supervision, Minimal Help, Independent

**Output Fields**:
- `activity_title` (plainText): "Create an SEO title for {{activity_type}} cooking activities for {{age_range}} children using {{child_friendly_products}}."
- `meta_description` (plainText): "Write a meta description for {{age_range}} children's {{activity_type}} activities featuring {{child_friendly_products}}."
- `introduction` (richText): "Write an introduction about getting {{age_range}} children cooking with {{activity_type}} activities. Mention {{supervision_level}} and {{child_friendly_products}}."
- `activity_list` (richText): "Create 5-7 {{activity_type}} activities appropriate for {{age_range}} using {{child_friendly_products}}. Include skill-building notes."
- `safety_guidelines` (richText): "Provide age-appropriate safety rules for {{age_range}} children doing {{activity_type}} activities with {{supervision_level}}."
- `learning_opportunities` (richText): "Explain what {{age_range}} children learn from these {{activity_type}} activities beyond cooking."
- `washing_up_tips` (plainText): "Share 3 tips for making washing-up fun and manageable with {{age_range}} children."

### 17. Family Dinner Ideas

**Purpose**: Crowd-pleasing meals that work for diverse family tastes and schedules.

**Input Fields**:
- `family_type` (select, required): Picky Eaters, Mixed Ages, Large Family, Busy Schedule
- `dinner_products` (product-selector, required): Versatile dinner products
- `prep_window` (select, required): 30 minutes, 45 minutes, 1 hour

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{family_type}} family dinners ready in {{prep_window}} using {{dinner_products}}."
- `meta_description` (plainText): "Write a meta description for {{family_type}} family dinner solutions featuring {{dinner_products}}."
- `introduction` (richText): "Write an introduction about solving {{family_type}} dinner challenges in {{prep_window}} using {{dinner_products}}."
- `dinner_ideas` (richText): "Create 7 dinner ideas perfect for {{family_type}} families using {{dinner_products}}. Include why each works for this family type."
- `customisation_tips` (richText): "Provide ways to customise each dinner for {{family_type}} preferences while keeping prep under {{prep_window}}."
- `side_dish_pairings` (richText): "Suggest quick side dishes that complement the dinners and work for {{family_type}} families."
- `weekly_rotation` (plainText): "Create a sample weekly dinner rotation for {{family_type}} families featuring these meals."

### 18. Leftover Transformation Guide

**Purpose**: Creative ways to repurpose leftovers into new meals.

**Input Fields**:
- `leftover_type` (select, required): Proteins, Sides, Mixed Dishes, Baked Goods
- `transformation_products` (product-selector, required): Products that help transform leftovers
- `original_meals` (tags, required): roast-chicken, pasta, rice, vegetables

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for transforming {{leftover_type}} from {{original_meals}} using {{transformation_products}}."
- `meta_description` (plainText): "Write a meta description for creative {{leftover_type}} leftover transformations featuring {{transformation_products}}."
- `introduction` (richText): "Write an introduction about reducing waste and saving money by transforming {{leftover_type}} leftovers. Mention {{transformation_products}}."
- `transformation_ideas` (richText): "Create 8-10 specific transformations for {{leftover_type}} from {{original_meals}} using {{transformation_products}}. Include new meal names and brief instructions."
- `storage_between` (richText): "Explain how to properly store {{leftover_type}} between the original meal and transformation."
- `flavour_refresh_tips` (richText): "Provide tips for refreshing flavours when transforming {{leftover_type}} using {{transformation_products}}."
- `meal_planning_strategy` (plainText): "Suggest how to intentionally plan for these leftover transformations in weekly meal planning."

### 19. Baking Basics Guide

**Purpose**: Simple baking guidance for beginners using brand products.

**Input Fields**:
- `baking_category` (select, required): Cookies, Cakes, Quick Breads, Muffins
- `skill_focus` (select, required): First Time Baker, Improving Skills, Troubleshooting
- `baking_products` (product-selector, required): Brand baking products
- `common_issues` (tags): overmixing, temperature, timing, texture

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{skill_focus}} guide to baking {{baking_category}} with {{baking_products}}."
- `meta_description` (plainText): "Write a meta description for {{skill_focus}} bakers making {{baking_category}} using {{baking_products}}."
- `introduction` (richText): "Write an encouraging introduction for {{skill_focus}} bakers starting with {{baking_category}}. Mention how {{baking_products}} simplify the process."
- `essential_tips` (richText): "Provide 5-7 essential tips for {{baking_category}} success addressing {{common_issues}}. Reference {{baking_products}} usage."
- `basic_recipe` (richText): "Share a foolproof {{baking_category}} recipe using {{baking_products}} perfect for {{skill_focus}} level."
- `troubleshooting_guide` (richText): "Create a troubleshooting guide for common {{baking_category}} problems related to {{common_issues}}."
- `next_steps` (plainText): "Suggest 3 ways to build on these {{baking_category}} skills once comfortable."

## Seasonal & Event Content

### 20. Holiday Cooking Guide

**Purpose**: Comprehensive guides for major holiday meal preparation.

**Input Fields**:
- `holiday` (select, required): Christmas, Easter, Boxing Day, Bank Holiday, Bonfire Night, Halloween
- `guest_count` (select, required): 4-6, 8-10, 12+
- `holiday_products` (product-selector, required): Products for holiday cooking
- `menu_items` (tags, required): starters, mains, sides, puddings

**Output Fields**:
- `guide_title` (plainText): "Create an SEO-optimised title for {{holiday}} dinner for {{guest_count}} guests. Include current year and 'menu', 'recipes', or 'guide'. Target high-volume holiday search terms. 50-60 characters."
- `meta_description` (plainText): "Write a meta description for hosting {{guest_count}} guests for {{holiday}} using {{holiday_products}}."
- `introduction` (richText): "Write an introduction about hosting a memorable {{holiday}} for {{guest_count}} guests. Mention how {{holiday_products}} help."
- `complete_menu` (richText): "Create a full {{holiday}} menu for {{guest_count}} including {{menu_items}}. Feature {{holiday_products}} in multiple dishes."
- `cooking_timeline` (richText): "Provide a detailed cooking timeline for {{holiday}} starting 3 days before through serving."
- `serving_suggestions` (richText): "Explain serving sizes and presentation tips for {{guest_count}} guests at {{holiday}}."
- `leftover_plan` (richText): "Suggest creative ways to use {{holiday}} leftovers featuring {{holiday_products}}. Target 'Boxing Day leftovers' and similar high-search terms."
- `planning_checklist` (richText): "Create a printable {{holiday}} planning checklist starting 2 weeks before. Include shopping lists, prep tasks, and timing. Format with checkboxes for user engagement."
- `dietary_alternatives` (richText): "Provide alternatives for common dietary requirements (vegetarian, gluten-free, dairy-free) for each dish. Use 'substitution' keywords for SEO."
- `quick_links_sidebar` (plainText): "List 10-12 related content pieces to link to: individual recipes, technique guides, shopping guides. Create comprehensive topic cluster."

### 21. Match Day Snacks

**Purpose**: Party-friendly snacks for football matches and gatherings.

**Input Fields**:
- `event_type` (select, required): Football Match, Rugby Match, Watch Party, Children's Sports
- `snack_products` (product-selector, required): Snack-friendly products
- `guest_count` (select, required): 6-8, 10-12, 15+
- `prep_timing` (select, required): Make-Ahead, Last-Minute, During Game

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{event_type}} snacks for {{guest_count}} people featuring {{snack_products}}."
- `meta_description` (plainText): "Write a meta description for {{prep_timing}} {{event_type}} snacks using {{snack_products}}."
- `introduction` (richText): "Write an introduction about hosting a great {{event_type}} for {{guest_count}} with {{prep_timing}} snacks featuring {{snack_products}}."
- `snack_lineup` (richText): "Create 6-8 crowd-pleasing snacks for {{event_type}} using {{snack_products}}. Mix hot and cold options."
- `prep_strategy` (richText): "Provide a {{prep_timing}} prep strategy for managing multiple snacks for {{guest_count}} people."
- `serving_setup` (richText): "Describe how to set up a snack station for {{event_type}} that keeps food accessible during the game."
- `quantity_guide` (plainText): "Calculate quantities needed of each snack for {{guest_count}} hungry football fans."

### 22. Summer BBQ Guide

**Purpose**: Grilling guides and outdoor entertaining ideas.

**Input Fields**:
- `bbq_type` (select, required): Garden BBQ, Garden Party, Picnic, Camping
- `grill_products` (product-selector, required): Grilling-friendly products
- `cooking_method` (select, required): Gas BBQ, Charcoal BBQ, No BBQ Options
- `crowd_size` (select, required): Small (4-6), Medium (8-12), Large (15+)

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{bbq_type}} for {{crowd_size}} using {{grill_products}} with {{cooking_method}}."
- `meta_description` (plainText): "Write a meta description for hosting {{bbq_type}} for {{crowd_size}} featuring {{grill_products}}."
- `introduction` (richText): "Write an introduction about hosting a perfect {{bbq_type}} for {{crowd_size}}. Mention {{cooking_method}} tips and {{grill_products}}."
- `menu_ideas` (richText): "Create a complete {{bbq_type}} menu for {{crowd_size}} featuring {{grill_products}}. Include mains, sides, and desserts."
- `grilling_tips` (richText): "Provide specific {{cooking_method}} tips for the menu items using {{grill_products}}."
- `make_ahead_plan` (richText): "Detail what can be prepped ahead for {{bbq_type}} to enjoy the party with {{crowd_size}}."
- `outdoor_serving` (plainText): "Share 3-4 tips for keeping food safe and appealing when serving outdoors at {{bbq_type}}."

### 23. Bring-a-Dish Guide

**Purpose**: Dishes that travel well and feed a crowd.

**Input Fields**:
- `occasion` (select, required): Church Event, School Fête, Family Gathering, Office Party
- `casserole_products` (product-selector, required): Products ideal for casseroles
- `serving_size` (select, required): Large Dish (serves 12), Double Recipe, Individual Portions
- `transport_distance` (select, required): Walk/Short Drive, 30+ minutes

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{occasion}} dishes in {{serving_size}} featuring {{casserole_products}}."
- `meta_description` (plainText): "Write a meta description for {{occasion}} recipes that travel {{transport_distance}} using {{casserole_products}}."
- `introduction` (richText): "Write an introduction about bringing the perfect dish to {{occasion}}. Consider {{transport_distance}} travel and {{serving_size}}."
- `recipe_options` (richText): "Provide 5-6 recipes perfect for {{occasion}} in {{serving_size}} featuring {{casserole_products}}. Note why each travels well."
- `transport_tips` (richText): "Explain how to safely transport {{serving_size}} dishes for {{transport_distance}} to {{occasion}}."
- `serving_suggestions` (richText): "Provide tips for serving and keeping dishes at proper temperature at {{occasion}}."
- `container_guide` (plainText): "Recommend the best containers for {{serving_size}} portions traveling {{transport_distance}}."

## Brand-Specific

### 24. Behind the Brand Story

**Purpose**: Share brand heritage and values to build connection with consumers.

**Input Fields**:
- `brand_focus` (select, required): History, Values, Innovation, Sustainability
- `featured_products` (product-selector, required): Products to highlight
- `story_angle` (tags, required): family-tradition, local-sourcing, quality-commitment

**Output Fields**:
- `story_title` (plainText): "Create an SEO title about {{brand_focus}} featuring {{featured_products}} with {{story_angle}} angle."
- `meta_description` (plainText): "Write a meta description about the {{brand_focus}} story behind {{featured_products}}."
- `introduction` (richText): "Write an engaging introduction about {{brand_focus}} that connects to {{story_angle}}. Naturally mention {{featured_products}}."
- `brand_narrative` (richText): "Tell the {{brand_focus}} story emphasizing {{story_angle}}. Weave in how {{featured_products}} embody these values."
- `timeline_highlights` (richText): "Create 5-7 key moments in brand history related to {{brand_focus}} and {{featured_products}} development."
- `values_in_action` (richText): "Show how {{brand_focus}} translates into real benefits for families using {{featured_products}}."
- `looking_forward` (plainText): "Share how {{brand_focus}} continues to guide innovation with {{featured_products}}."

### 25. Product Usage Guide

**Purpose**: Creative ways to use products beyond the obvious applications.

**Input Fields**:
- `product` (product-selector, required): Specific product to feature
- `usage_category` (select, required): Breakfast, Snacks, Dinner, Baking, Creative Uses
- `innovation_level` (select, required): Traditional, Slightly Creative, Very Creative

**Output Fields**:
- `guide_title` (plainText): "Create an SEO title for {{innovation_level}} ways to use {{product}} for {{usage_category}}."
- `meta_description` (plainText): "Write a meta description for {{innovation_level}} {{usage_category}} ideas using {{product}}."
- `introduction` (richText): "Write an introduction about discovering {{innovation_level}} ways to enjoy {{product}} for {{usage_category}}."
- `usage_ideas` (richText): "Create 8-10 {{innovation_level}} ideas for using {{product}} in {{usage_category}}. Range from simple to surprising."
- `step_by_step_favorite` (richText): "Provide detailed instructions for the most popular {{innovation_level}} use of {{product}}."
- `pairing_suggestions` (richText): "Suggest other products or ingredients that pair well with {{product}} for {{usage_category}}."
- `storage_tips` (plainText): "Include tips for storing {{product}} to maintain freshness for these {{usage_category}} uses."

### 26. Recipe Remix

**Purpose**: Modern updates to classic brand recipes that consumers love.

**Input Fields**:
- `classic_recipe` (shortText, required): Name of classic recipe to update
- `remix_type` (select, required): Healthier, Quicker, Trendy, Seasonal
- `original_product` (product-selector, required): Product from original recipe
- `update_elements` (tags): ingredients, technique, presentation, flavour

**Output Fields**:
- `remix_title` (plainText): "Create an SEO title for {{remix_type}} version of {{classic_recipe}} featuring {{original_product}}."
- `meta_description` (plainText): "Write a meta description for a {{remix_type}} update to classic {{classic_recipe}}."
- `introduction` (richText): "Write an introduction honouring the classic {{classic_recipe}} while explaining the {{remix_type}} updates. Mention {{original_product}}."
- `what_changed` (richText): "Explain specific {{update_elements}} changes that make this {{remix_type}} while keeping {{original_product}} central."
- `updated_recipe` (richText): "Provide the complete {{remix_type}} recipe for {{classic_recipe}} with clear instructions featuring {{original_product}}."
- `comparison_notes` (richText): "Compare the original and {{remix_type}} versions, highlighting benefits of each approach."
- `serving_suggestions` (plainText): "Suggest modern ways to serve this {{remix_type}} version of {{classic_recipe}}."

---

## Implementation Notes

### General Guidelines for All Templates:

1. **SEO Optimisation**: All title fields should be 50-60 characters, meta descriptions 150-160 characters
2. **Brand Integration**: Products should be naturally integrated, not forced into content
3. **Practical Focus**: Content should solve real problems families face
4. **Scannable Format**: Use headers, lists, and short paragraphs for easy reading
5. **Mobile-Friendly**: Consider mobile readers in formatting choices
6. **Voice & Tone**: Warm, helpful, and conversational without being overly casual

### Content Requirements:

- Each template should produce 800-1,500 words of content
- Include specific, actionable information
- Balance SEO keywords with natural language
- Provide value beyond just promoting products
- Include internal linking opportunities to related content

### Technical Implementation:

- All templates follow the Mixer AI field structure
- Input fields use existing field types (shortText, longText, select, tags, product-selector, number)
- Output fields are either plainText or richText
- AI prompts reference input fields using {{field_id}} syntax
- Brand identity, tone, and guardrails are applied per output field as needed

### SEO Best Practices for All Templates:

1. **Title Optimisation**:
   - Front-load primary keywords
   - Include numbers where relevant (increases CTR by 36%)
   - Use power words: Ultimate, Essential, Complete, Easy, Quick
   - Include current year for freshness
   - Target 50-60 characters

2. **Meta Description Excellence**:
   - Include primary and secondary keywords naturally
   - Add clear call-to-action
   - Create urgency or highlight benefit
   - Use active voice
   - Target 150-160 characters

3. **Content Structure for Featured Snippets**:
   - Answer key questions in 40-60 words
   - Use definition boxes for 'What is' queries
   - Create numbered lists for 'How to' content
   - Include tables for comparisons
   - Add FAQ sections for People Also Ask

4. **Keyword Strategy**:
   - Target long-tail keywords for each section
   - Include semantic variations naturally
   - Answer voice search queries conversationally
   - Use location-specific terms (UK, British)
   - Include seasonal/trending modifiers

5. **Internal Linking**:
   - Link to pillar pages and content hubs
   - Create topic clusters around products
   - Use descriptive anchor text
   - Include 5-10 internal links per piece
   - Link to related recipes, guides, and tips

6. **Schema Markup Requirements**:
   - Recipe schema for all recipe content
   - HowTo schema for guides
   - FAQ schema for Q&A sections
   - Product schema for featured products
   - BreadcrumbList for navigation

7. **User Experience Signals**:
   - Include jump links for long content
   - Add print-friendly versions
   - Create scannable formatting
   - Include time estimates
   - Add difficulty ratings

8. **Content Freshness**:
   - Update dates in titles annually
   - Refresh seasonal content
   - Add trending ingredients/techniques
   - Update prices in budget content
   - Include 'Last Updated' dates