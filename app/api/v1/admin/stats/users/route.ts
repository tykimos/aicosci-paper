import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const supabase = createAdminClient();

    // Get total count separately (not limited)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: totalCount } = await (supabase as any)
      .from('anonymous_sessions')
      .select('*', { count: 'exact', head: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessions, error } = await (supabase as any)
      .from('anonymous_sessions')
      .select('id, ip_address, device_type, browser, os, referrer, screen_width, screen_height, language, created_at, last_active_at')
      .order('last_active_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const rows = sessions || [];

    // Distributions
    const deviceDist: Record<string, number> = {};
    const browserDist: Record<string, number> = {};
    const osDist: Record<string, number> = {};
    const referrerDist: Record<string, number> = {};

    for (const s of rows) {
      const dev = s.device_type || 'unknown';
      deviceDist[dev] = (deviceDist[dev] || 0) + 1;

      const br = s.browser || 'unknown';
      browserDist[br] = (browserDist[br] || 0) + 1;

      const os = s.os || 'unknown';
      osDist[os] = (osDist[os] || 0) + 1;

      if (s.referrer) {
        try {
          const host = new URL(s.referrer).hostname || s.referrer;
          referrerDist[host] = (referrerDist[host] || 0) + 1;
        } catch {
          referrerDist[s.referrer] = (referrerDist[s.referrer] || 0) + 1;
        }
      }
    }

    return successResponse({
      total: totalCount || rows.length,
      distributions: {
        device: deviceDist,
        browser: browserDist,
        os: osDist,
        referrer: referrerDist,
      },
      recent: rows.slice(0, 100).map((s: Record<string, unknown>) => ({
        id: s.id,
        ip_address: s.ip_address,
        device_type: s.device_type,
        browser: s.browser,
        os: s.os,
        referrer: s.referrer,
        screen_width: s.screen_width,
        screen_height: s.screen_height,
        language: s.language,
        created_at: s.created_at,
        last_active_at: s.last_active_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return internalErrorResponse('Failed to fetch user stats');
  }
}
