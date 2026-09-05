CREATE TRIGGER rack_placements_validate_update
BEFORE UPDATE OF rack_id, asset_id, start_u, height_u, removed_at ON rack_placements
WHEN NEW.removed_at IS NULL
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM racks WHERE id = NEW.rack_id AND status = 'active'
        ) THEN RAISE(ABORT, 'Placement.RackUnavailable')
    END;

    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM assets WHERE id = NEW.asset_id AND status != 'archived'
        ) THEN RAISE(ABORT, 'Placement.AssetUnavailable')
    END;

    SELECT CASE
        WHEN NEW.start_u < 1
          OR NEW.height_u < 1
          OR NEW.start_u + NEW.height_u - 1 > (
              SELECT total_u FROM racks WHERE id = NEW.rack_id
          )
        THEN RAISE(ABORT, 'Placement.OutOfRange')
    END;

    SELECT CASE
        WHEN EXISTS (
            SELECT 1
            FROM rack_placements existing
            WHERE existing.id != OLD.id
              AND existing.rack_id = NEW.rack_id
              AND existing.removed_at IS NULL
              AND existing.start_u <= NEW.start_u + NEW.height_u - 1
              AND existing.start_u + existing.height_u - 1 >= NEW.start_u
        ) THEN RAISE(ABORT, 'Placement.Overlap')
    END;
END;

CREATE TRIGGER racks_validate_total_u_update
BEFORE UPDATE OF total_u ON racks
WHEN EXISTS (
    SELECT 1
    FROM rack_placements placement
    WHERE placement.rack_id = OLD.id
      AND placement.removed_at IS NULL
      AND placement.start_u + placement.height_u - 1 > NEW.total_u
)
BEGIN
    SELECT RAISE(ABORT, 'Rack.HeightOccupied');
END;

CREATE TRIGGER assets_sync_active_placement_height
AFTER UPDATE OF height_u ON assets
WHEN NEW.height_u != OLD.height_u
BEGIN
    UPDATE rack_placements
    SET height_u = NEW.height_u
    WHERE asset_id = NEW.id AND removed_at IS NULL;
END;
