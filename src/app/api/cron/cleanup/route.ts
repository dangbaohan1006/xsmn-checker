import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Station } from '@/lib/types';

export async function GET(request: NextRequest) {
    // 1. Parse URL ngay đầu hàm để tránh lỗi scope
    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get('day');

    try {
        let query = supabase
            .from('stations')
            .select('*')
            .eq('is_active', true)
            .order('name');

        // 2. Validate và Filter
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
            return NextResponse.json(
                { error: 'Failed to fetch stations' },
                { status: 500 }
            );
        }

        return NextResponse.json<Station[]>(stations || []);
    } catch (error) {
        console.error('Stations API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}