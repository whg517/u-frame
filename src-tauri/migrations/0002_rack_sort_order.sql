ALTER TABLE racks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) - 1 AS position
    FROM racks
)
UPDATE racks
SET sort_order = (
    SELECT position
    FROM ranked
    WHERE ranked.id = racks.id
);

CREATE INDEX racks_canvas_order ON racks(sort_order, id);
