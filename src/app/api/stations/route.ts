import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Station } from '@/lib/types';

export async function GET(request: NextRequest) {
    // Parse URL params outside try-catch to be available in catch block
    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get('day');

    try {
        // Check if Supabase keys are configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.warn('Supabase credential missing. Returning mock data.');
            return NextResponse.json(getMockStations(dayParam));
        }

        // If day is provided, filter by day of week
        let query = supabase
            .from('stations')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (dayParam !== null) {
            const day = parseInt(dayParam, 10);
            if (isNaN(day) || day < 0 || day > 6) {
                return NextResponse.json(
                    { error: 'Invalid day parameter. Must be 0-6.' },
                    { status: 400 }
                );
            }
            query = query.eq('draw_day', day);
        }

        const { data: stations, error } = await query;

        if (error) {
            console.error('Database error:', error);
            // Fallback to mock data on DB error
            return NextResponse.json(getMockStations(dayParam));
        }

        return NextResponse.json<Station[]>(stations || []);
    } catch (error) {
        console.error('Stations API error:', error);
        // Fallback to mock data on server error
        return NextResponse.json(getMockStations(searchParams.get('day')));
    }
}

// Mock data helper
function getMockStations(dayParam: string | null): Station[] {
    const allStations: Station[] = [
        { id: 1, code: 'TG', name: 'Tiền Giang', short_name: 'Tiền Giang', draw_day: 0, region: 'MN', is_active: true, created_at: '' },
        { id: 2, code: 'KG', name: 'Kiên Giang', short_name: 'Kiên Giang', draw_day: 0, region: 'MN', is_active: true, created_at: '' },
        { id: 3, code: 'DL', name: 'Đà Lạt', short_name: 'Đà Lạt', draw_day: 0, region: 'MN', is_active: true, created_at: '' },
        { id: 4, code: 'TP', name: 'TP. HCM', short_name: 'TP. HCM', draw_day: 1, region: 'MN', is_active: true, created_at: '' },
        { id: 5, code: 'DT', name: 'Đồng Tháp', short_name: 'Đồng Tháp', draw_day: 1, region: 'MN', is_active: true, created_at: '' },
        { id: 6, code: 'CM', name: 'Cà Mau', short_name: 'Cà Mau', draw_day: 1, region: 'MN', is_active: true, created_at: '' },
        { id: 7, code: 'BT', name: 'Bến Tre', short_name: 'Bến Tre', draw_day: 2, region: 'MN', is_active: true, created_at: '' },
        { id: 8, code: 'VT', name: 'Vũng Tàu', short_name: 'Vũng Tàu', draw_day: 2, region: 'MN', is_active: true, created_at: '' },
        { id: 9, code: 'BL', name: 'Bạc Liêu', short_name: 'Bạc Liêu', draw_day: 2, region: 'MN', is_active: true, created_at: '' },
        { id: 10, code: 'DN', name: 'Đồng Nai', short_name: 'Đồng Nai', draw_day: 3, region: 'MN', is_active: true, created_at: '' },
        { id: 11, code: 'CT', name: 'Cần Thơ', short_name: 'Cần Thơ', draw_day: 3, region: 'MN', is_active: true, created_at: '' },
        { id: 12, code: 'ST', name: 'Sóc Trăng', short_name: 'Sóc Trăng', draw_day: 3, region: 'MN', is_active: true, created_at: '' },
        { id: 13, code: 'TN', name: 'Tây Ninh', short_name: 'Tây Ninh', draw_day: 4, region: 'MN', is_active: true, created_at: '' },
        { id: 14, code: 'AG', name: 'An Giang', short_name: 'An Giang', draw_day: 4, region: 'MN', is_active: true, created_at: '' },
        { id: 15, code: 'BTH', name: 'Bình Thuận', short_name: 'Bình Thuận', draw_day: 4, region: 'MN', is_active: true, created_at: '' },
        { id: 16, code: 'VL', name: 'Vĩnh Long', short_name: 'Vĩnh Long', draw_day: 5, region: 'MN', is_active: true, created_at: '' },
        { id: 17, code: 'BD', name: 'Bình Dương', short_name: 'Bình Dương', draw_day: 5, region: 'MN', is_active: true, created_at: '' },
        { id: 18, code: 'TV', name: 'Trà Vinh', short_name: 'Trà Vinh', draw_day: 5, region: 'MN', is_active: true, created_at: '' },
        { id: 19, code: 'TP', name: 'TP. HCM', short_name: 'TP. HCM', draw_day: 6, region: 'MN', is_active: true, created_at: '' },
        { id: 20, code: 'LA', name: 'Long An', short_name: 'Long An', draw_day: 6, region: 'MN', is_active: true, created_at: '' },
        { id: 21, code: 'BP', name: 'Bình Phước', short_name: 'Bình Phước', draw_day: 6, region: 'MN', is_active: true, created_at: '' },
        { id: 22, code: 'HG', name: 'Hậu Giang', short_name: 'Hậu Giang', draw_day: 6, region: 'MN', is_active: true, created_at: '' },
    ];

    if (dayParam !== null) {
        const day = parseInt(dayParam, 10);
        return allStations.filter(s => s.draw_day === day);
    }
    return allStations;
}
