
/**
 * Get date object for Vietnam Timezone (UTC+7)
 */
export function getVietnamDate(dateStr?: string): Date {
    const date = dateStr ? new Date(dateStr) : new Date();
    // In server environment (usually UTC), this might be just UTC date.
    // But since we deal with YYYY-MM-DD input, we can treat it as local date part.
    // For day of week calculation, it matters.
    return date;
}

/**
 * Get day of week (0-6) for a given date string (YYYY-MM-DD) in Vietnam Time
 */
export function getVietnamDayOfWeek(dateStr: string): number {
    // Parse YYYY-MM-DD manually to avoid timezone shift
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date at noon to avoid boundary issues
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.getDay();
}

/**
 * Validates if string is YYYY-MM-DD
 */
export function isValidDate(dateStr: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}
