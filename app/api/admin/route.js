/**
 * Admin API — manage users and sections via Upstash Redis.
 * All requests use POST /api/admin with { adminPass, action, ...params }.
 */

import { createAdminHandler } from '../../../lib/admin-handler.mjs';

export const POST = createAdminHandler({
  adminPass: process.env.ADMIN_PASS,
  redisUrl: process.env.KV_REST_API_URL,
  redisToken: process.env.KV_REST_API_TOKEN,
});

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
