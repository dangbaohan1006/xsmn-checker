import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// Verify cron secret (optional security)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
    try {
        // Optional: Verify cron authorization
        if (CRON_SECRET) {
            const authHeader = request.headers.get('authorization');
            if (authHeader !== `Bearer ${CRON_SECRET}`) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
        }

        // Use service client for admin operations
        const supabase = getServiceClient();

        // Delete records older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

        const { error, count } = await supabase
            .from('lottery_results')
            .delete()
            .lt('draw_date', cutoffDate)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Cleanup error:', error);
            return NextResponse.json(
                { error: 'Cleanup failed', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Cleanup completed. ${count || 0} records deleted.`,
            cutoff_date: cutoffDate,
        });
    } catch (error) {
        console.error('Cron cleanup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
