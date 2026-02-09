-- =============================================
-- XSMN Lottery Checker - Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create stations table
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    draw_day INTEGER NOT NULL,
    region VARCHAR(20) DEFAULT 'south',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for day-based queries
CREATE INDEX IF NOT EXISTS idx_stations_draw_day ON stations(draw_day);

-- 2. Create lottery_results table
CREATE TABLE IF NOT EXISTS lottery_results (
    id SERIAL,
    station_code VARCHAR(10) NOT NULL,
    draw_date DATE NOT NULL,
    prize_type VARCHAR(20) NOT NULL,
    prize_order INTEGER NOT NULL DEFAULT 0,
    prize_value VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Composite Primary Key prevents duplicates during concurrent scrapes
    PRIMARY KEY (station_code, draw_date, prize_type, prize_order),
    
    -- Foreign key reference
    FOREIGN KEY (station_code) REFERENCES stations(code) ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_results_date ON lottery_results(draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_results_station_date ON lottery_results(station_code, draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_results_cleanup ON lottery_results(draw_date);

-- 3. Function to delete old records (> 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_results()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM lottery_results 
    WHERE draw_date < CURRENT_DATE - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Seed data for Southern Vietnam lottery stations
-- Note: Some stations draw on multiple days

-- Clear existing data (for re-running)
DELETE FROM stations;

INSERT INTO stations (code, name, short_name, draw_day) VALUES
-- Monday (1)
('tphcm1', 'TP. Hồ Chí Minh', 'TP.HCM', 1),
('dongnai', 'Đồng Nai', 'Đ.Nai', 1),
('cantho1', 'Cần Thơ', 'C.Thơ', 1),

-- Tuesday (2)
('bentre', 'Bến Tre', 'B.Tre', 2),
('vungtau', 'Vũng Tàu', 'V.Tàu', 2),
('baclieu', 'Bạc Liêu', 'B.Liêu', 2),

-- Wednesday (3)
('dongthap', 'Đồng Tháp', 'Đ.Tháp', 3),
('camau', 'Cà Mau', 'C.Mau', 3),
('tphcm3', 'TP. Hồ Chí Minh', 'TP.HCM', 3),

-- Thursday (4)
('tayninh', 'Tây Ninh', 'T.Ninh', 4),
('angiang', 'An Giang', 'A.Giang', 4),
('binhthuan', 'Bình Thuận', 'B.Thuận', 4),

-- Friday (5)
('vinhlong', 'Vĩnh Long', 'V.Long', 5),
('binhduong', 'Bình Dương', 'B.Dương', 5),
('travinh', 'Trà Vinh', 'T.Vinh', 5),

-- Saturday (6)
('tphcm6', 'TP. Hồ Chí Minh', 'TP.HCM', 6),
('longan', 'Long An', 'L.An', 6),
('binhphuoc', 'Bình Phước', 'B.Phước', 6),
('haugiang', 'Hậu Giang', 'H.Giang', 6),

-- Sunday (0)
('tiengiang', 'Tiền Giang', 'T.Giang', 0),
('kiengiang', 'Kiên Giang', 'K.Giang', 0),
('dalat', 'Đà Lạt', 'Đ.Lạt', 0);

-- Verify insertion
SELECT * FROM stations ORDER BY draw_day, code;
