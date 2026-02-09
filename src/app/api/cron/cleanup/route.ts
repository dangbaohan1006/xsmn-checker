import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper: Calculate date N days ago
function getPastDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}

export async function GET() {
    try {
        // 1. Calculate cutoff date (30 days ago)
        const cutoffDate = getPastDate(30);

        // 2. Perform delete
        // Fix: .select() after .delete() in Supabase v2 only accepts columns string, not options object
        const { data, error } = await supabase
            .from('lottery_results')
            .delete()
            .lt('draw_date', cutoffDate)
            .select('id'); // Only select ID to be lightweight

        if (error) {
            console.error('Cleanup error:', error);
            return NextResponse.json(
                { error: 'Failed to cleanup old data' },
                { status: 500 }
            );
        }

        const deletedCount = data ? data.length : 0;

        return NextResponse.json({
            success: true,
            message: `Deleted ${deletedCount} records older than ${cutoffDate}`,
            deleted_count: deletedCount
        });

    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}