import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { scrapeWithTimeout } from '@/lib/scraper';
import { findAllMatches, calculateTotalWin } from '@/lib/matcher';
import { CheckRequest, CheckResponse, LotteryResult, ERROR_CODES } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body: CheckRequest = await request.json();
        const { ticket_number, station_code, draw_date } = body;

        // Validate input
        if (!ticket_number || !station_code || !draw_date) {
            return NextResponse.json<CheckResponse>({
                success: false,
                matches: [],
                all_results: [],
                total_win_amount: 0,
                error_code: ERROR_CODES.INVALID_INPUT,
                message: 'Vui lòng nhập đầy đủ thông tin',
            }, { status: 400 });
        }

        // Validate ticket number (must be 6 digits)
        const cleanTicket = ticket_number.replace(/\D/g, '');
        if (cleanTicket.length !== 6) {
            return NextResponse.json<CheckResponse>({
                success: false,
                matches: [],
                all_results: [],
                total_win_amount: 0,
                error_code: ERROR_CODES.INVALID_INPUT,
                message: 'Số vé phải có đúng 6 chữ số',
            }, { status: 400 });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(draw_date)) {
            return NextResponse.json<CheckResponse>({
                success: false,
                matches: [],
                all_results: [],
                total_win_amount: 0,
                error_code: ERROR_CODES.INVALID_INPUT,
                message: 'Định dạng ngày không hợp lệ',
            }, { status: 400 });
        }

        // Check if date is in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(draw_date);
        if (checkDate > today) {
            return NextResponse.json<CheckResponse>({
                success: false,
                matches: [],
                all_results: [],
                total_win_amount: 0,
                error_code: ERROR_CODES.NO_RESULTS,
                message: 'Chưa có kết quả cho ngày này',
            }, { status: 400 });
        }

        // Step 1: Query database for existing results
        const { data: existingResults, error: dbError } = await supabase
            .from('lottery_results')
            .select('*')
            .eq('station_code', station_code)
            .eq('draw_date', draw_date)
            .order('prize_type')
            .order('prize_order');

        let results: LotteryResult[] = existingResults || [];

        // Step 2: If no results in DB, scrape from web
        if (results.length === 0) {
            try {
                results = await scrapeWithTimeout(station_code, draw_date);

                // Step 3: UPSERT scraped results to database
                if (results.length > 0) {
                    const { error: upsertError } = await supabase
                        .from('lottery_results')
                        .upsert(results, {
                            onConflict: 'station_code,draw_date,prize_type,prize_order',
                            ignoreDuplicates: true,
                        });

                    if (upsertError) {
                        console.error('UPSERT error:', upsertError);
                        // Continue anyway - we have the results in memory
                    }
                }
            } catch (scrapeError: unknown) {
                const error = scrapeError as { code?: string };
                if (error.code === ERROR_CODES.SCRAPE_TIMEOUT) {
                    return NextResponse.json<CheckResponse>({
                        success: false,
                        matches: [],
                        all_results: [],
                        total_win_amount: 0,
                        error_code: ERROR_CODES.SCRAPE_TIMEOUT,
                        message: 'Không thể lấy kết quả. Vui lòng thử lại sau.',
                    }, { status: 503 });
                }

                return NextResponse.json<CheckResponse>({
                    success: false,
                    matches: [],
                    all_results: [],
                    total_win_amount: 0,
                    error_code: ERROR_CODES.SCRAPE_FAILED,
                    message: 'Không tìm thấy kết quả cho đài này',
                }, { status: 503 });
            }
        }

        // Step 4: Run matching algorithm
        if (results.length === 0) {
            return NextResponse.json<CheckResponse>({
                success: false,
                matches: [],
                all_results: [],
                total_win_amount: 0,
                error_code: ERROR_CODES.NO_RESULTS,
                message: 'Không có kết quả xổ số cho ngày này',
            }, { status: 404 });
        }

        const matches = findAllMatches(cleanTicket, results);
        const totalWin = calculateTotalWin(matches);

        return NextResponse.json<CheckResponse>({
            success: true,
            matches,
            all_results: results,
            total_win_amount: totalWin,
            message: matches.length > 0
                ? `Chúc mừng! Bạn trúng ${matches.length} giải!`
                : 'Chúc bạn may mắn lần sau!',
        });

    } catch (error) {
        console.error('Check API error:', error);
        return NextResponse.json<CheckResponse>({
            success: false,
            matches: [],
            all_results: [],
            total_win_amount: 0,
            error_code: ERROR_CODES.DB_ERROR,
            message: 'Đã xảy ra lỗi. Vui lòng thử lại.',
        }, { status: 500 });
    }
}
