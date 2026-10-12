/**
 * Reports API
 *
 * GET /report/download?type=session&id={session_id}  (Python, public)
 *   Returns PDF stream. Content-Disposition: attachment; filename="guardrail_session_{id}.pdf"
 *
 * GET /report/download?type=weekly  (Python, public)
 *   Returns PDF stream. Content-Disposition: attachment; filename="guardrail_weekly_report.pdf"
 *
 * NOTE: The internal /internal/report/download endpoint requires
 *   X-Internal-Secret header (shared secret with Express gateway).
 *   We use the public /report/download endpoint instead.
 */

import { pyClient } from './client.js';

export const reportsApi = {
  /**
   * Download a PDF report. Returns a Blob URL the browser can open/download.
   * @param {'session'|'weekly'} type
   * @param {string} [sessionId] — required when type === 'session'
   */
  async downloadReport(type, sessionId) {
    const params = { type };
    if (type === 'session' && sessionId) params.id = sessionId;

    const res = await pyClient.get('/report/download', {
      params,
      responseType: 'blob',
      timeout: 60000, // PDF generation can take a moment
    });

    // Extract filename from Content-Disposition header if available
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `guardrail_${type}_report.pdf`;

    return { blob: res.data, filename };
  },
};
