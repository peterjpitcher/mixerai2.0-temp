-- Update claims_pending_approval view to include brand information
CREATE OR REPLACE VIEW "public"."claims_pending_approval" AS
 SELECT "c"."id",
    "c"."claim_text",
    "c"."claim_type",
    "c"."level",
    "c"."description",
    "c"."workflow_id",
    "c"."current_workflow_step",
    "c"."workflow_status",
    "c"."created_at",
    "c"."created_by",
    "w"."name" AS "workflow_name",
    "ws"."name" AS "current_step_name",
    "ws"."role" AS "current_step_role",
    "ws"."assigned_user_ids" AS "current_step_assignees",
    "p"."full_name" AS "creator_name",
    CASE
        WHEN ("c"."level" = 'brand'::"public"."claim_level_enum") THEN "mcb"."name"
        WHEN ("c"."level" = 'product'::"public"."claim_level_enum") THEN "prod"."name"
        WHEN ("c"."level" = 'ingredient'::"public"."claim_level_enum") THEN "ing"."name"
        ELSE NULL::"text"
    END AS "entity_name",
    -- Add brand information
    COALESCE(
        CASE
            WHEN ("c"."level" = 'brand'::"public"."claim_level_enum") THEN "b_brand"."id"
            WHEN ("c"."level" = 'product'::"public"."claim_level_enum") THEN "b_prod"."id"
            WHEN ("c"."level" = 'ingredient'::"public"."claim_level_enum") THEN "b_ing"."id"
        END
    ) AS "brand_id",
    COALESCE(
        CASE
            WHEN ("c"."level" = 'brand'::"public"."claim_level_enum") THEN "b_brand"."name"
            WHEN ("c"."level" = 'product'::"public"."claim_level_enum") THEN "b_prod"."name"
            WHEN ("c"."level" = 'ingredient'::"public"."claim_level_enum") THEN "b_ing"."name"
        END
    ) AS "brand_name",
    COALESCE(
        CASE
            WHEN ("c"."level" = 'brand'::"public"."claim_level_enum") THEN "b_brand"."logo_url"
            WHEN ("c"."level" = 'product'::"public"."claim_level_enum") THEN "b_prod"."logo_url"
            WHEN ("c"."level" = 'ingredient'::"public"."claim_level_enum") THEN "b_ing"."logo_url"
        END
    ) AS "brand_logo_url",
    COALESCE(
        CASE
            WHEN ("c"."level" = 'brand'::"public"."claim_level_enum") THEN "b_brand"."primary_color"
            WHEN ("c"."level" = 'product'::"public"."claim_level_enum") THEN "b_prod"."primary_color"
            WHEN ("c"."level" = 'ingredient'::"public"."claim_level_enum") THEN "b_ing"."primary_color"
        END
    ) AS "brand_primary_color"
   FROM (((((("public"."claims" "c"
     LEFT JOIN "public"."claims_workflows" "w" ON (("c"."workflow_id" = "w"."id")))
     LEFT JOIN "public"."claims_workflow_steps" "ws" ON (("c"."current_workflow_step" = "ws"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("c"."created_by" = "p"."id")))
     LEFT JOIN "public"."master_claim_brands" "mcb" ON (("c"."master_brand_id" = "mcb"."id")))
     LEFT JOIN "public"."products" "prod" ON (("c"."product_id" = "prod"."id")))
     LEFT JOIN "public"."ingredients" "ing" ON (("c"."ingredient_id" = "ing"."id")))
     -- Join brands based on claim level
     LEFT JOIN "public"."brands" "b_brand" ON (("c"."level" = 'brand'::"public"."claim_level_enum") AND ("mcb"."mixerai_brand_id" = "b_brand"."id"))
     LEFT JOIN "public"."brands" "b_prod" ON (("c"."level" = 'product'::"public"."claim_level_enum") AND ("prod"."brand_id" = "b_prod"."id"))
     LEFT JOIN "public"."brands" "b_ing" ON (("c"."level" = 'ingredient'::"public"."claim_level_enum") AND (EXISTS (
        SELECT 1 FROM "public"."product_ingredients" "pi"
        JOIN "public"."products" "p2" ON "pi"."product_id" = "p2"."id"
        JOIN "public"."brands" "b2" ON "p2"."brand_id" = "b2"."id"
        WHERE "pi"."ingredient_id" = "ing"."id"
        LIMIT 1
     )))
  WHERE (("c"."workflow_status" = 'in_progress'::"public"."workflow_status_enum") AND ("c"."workflow_id" IS NOT NULL) AND ("c"."current_workflow_step" IS NOT NULL));