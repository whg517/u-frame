PRAGMA foreign_keys = ON;

CREATE TABLE rooms (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE areas (
    id TEXT PRIMARY KEY NOT NULL,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    code TEXT NOT NULL COLLATE NOCASE,
    name TEXT NOT NULL COLLATE NOCASE,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (room_id, code),
    UNIQUE (room_id, name)
);

CREATE TABLE racks (
    id TEXT PRIMARY KEY NOT NULL,
    area_id TEXT NOT NULL REFERENCES areas(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    code TEXT NOT NULL COLLATE NOCASE,
    specification TEXT NOT NULL,
    total_u INTEGER NOT NULL CHECK (total_u BETWEEN 1 AND 100),
    power_capacity_w INTEGER CHECK (power_capacity_w IS NULL OR power_capacity_w >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (area_id, code)
);

CREATE TABLE assets (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('server', 'switch', 'router', 'firewall')),
    name TEXT NOT NULL,
    hostname TEXT COLLATE NOCASE UNIQUE,
    intranet_ip TEXT UNIQUE,
    management_ip TEXT,
    serial_number TEXT COLLATE NOCASE UNIQUE,
    vendor TEXT,
    model TEXT,
    purpose TEXT,
    height_u INTEGER NOT NULL DEFAULT 1 CHECK (height_u > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline', 'archived')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE rack_placements (
    id TEXT PRIMARY KEY NOT NULL,
    rack_id TEXT NOT NULL REFERENCES racks(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    start_u INTEGER NOT NULL CHECK (start_u > 0),
    height_u INTEGER NOT NULL CHECK (height_u > 0),
    placed_at TEXT NOT NULL,
    removed_at TEXT
);

CREATE UNIQUE INDEX rack_placements_one_active_per_asset
    ON rack_placements(asset_id)
    WHERE removed_at IS NULL;

CREATE INDEX rack_placements_active_by_rack
    ON rack_placements(rack_id, start_u)
    WHERE removed_at IS NULL;

CREATE TRIGGER rack_placements_validate_insert
BEFORE INSERT ON rack_placements
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
            WHERE existing.rack_id = NEW.rack_id
              AND existing.removed_at IS NULL
              AND existing.start_u <= NEW.start_u + NEW.height_u - 1
              AND existing.start_u + existing.height_u - 1 >= NEW.start_u
        ) THEN RAISE(ABORT, 'Placement.Overlap')
    END;
END;
