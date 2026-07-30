const USERS_KEY = 'blh:users';
const SECTIONS_KEY = 'blh:sections';

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];

  return [...new Set(
    sections
      .map((value) => String(value).trim())
      .filter(Boolean),
  )];
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export function createAdminHandler({
  adminPass,
  redisUrl,
  redisToken,
  fetchImpl = fetch,
}) {
  async function redisCmd(...args) {
    const response = await fetchImpl(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Redis 返回了无效响应');
    }

    if (!response.ok || data.error) {
      throw new Error(data.error || `Redis 请求失败（${response.status}）`);
    }

    return data.result;
  }

  async function readJsonValue(key, fallback) {
    const raw = await redisCmd('GET', key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  async function getUsers() {
    const users = await readJsonValue(USERS_KEY, {});
    return users && typeof users === 'object' && !Array.isArray(users) ? users : {};
  }

  async function saveUsers(users) {
    await redisCmd('SET', USERS_KEY, JSON.stringify(users));
  }

  async function getSections() {
    const sections = await readJsonValue(SECTIONS_KEY, []);
    return normalizeSections(sections);
  }

  async function saveSections(sections) {
    await redisCmd('SET', SECTIONS_KEY, JSON.stringify(sections));
  }

  return async function POST(request) {
    let parsed;
    try {
      parsed = await request.json();
    } catch {
      return json({ success: false, error: 'Invalid JSON' }, 400);
    }

    const { adminPass: suppliedPass, action } = parsed || {};

    if (!adminPass) {
      return json({ success: false, error: '未设置 ADMIN_PASS 环境变量' }, 500);
    }

    if (suppliedPass !== adminPass) {
      return json({ success: false, error: '管理密码错误' }, 401);
    }

    if (action === 'login') {
      return json({ success: true });
    }

    if (!redisUrl || !redisToken) {
      return json({ success: false, error: 'Redis 配置不完整' }, 500);
    }

    try {
      switch (action) {
        case 'getAll': {
          const [users, sections] = await Promise.all([getUsers(), getSections()]);
          return json({ success: true, users, sections });
        }

        case 'saveUser': {
          const normalizedUsername = String(parsed.username || '').trim();
          const password = String(parsed.password ?? '');
          const sections = normalizeSections(parsed.sections);

          if (!normalizedUsername || !password) {
            return json({ success: false, error: '用户名和密码不能为空' }, 400);
          }

          const users = await getUsers();
          users[normalizedUsername] = { pass: password, sections };
          await saveUsers(users);
          return json({ success: true });
        }

        case 'deleteUser': {
          const normalizedUsername = String(parsed.username || '').trim();
          if (!normalizedUsername) {
            return json({ success: false, error: '缺少用户名' }, 400);
          }

          const users = await getUsers();
          delete users[normalizedUsername];
          await saveUsers(users);
          return json({ success: true });
        }

        case 'saveSections': {
          if (!Array.isArray(parsed.sections)) {
            return json({ success: false, error: 'sections 必须是数组' }, 400);
          }

          await saveSections(normalizeSections(parsed.sections));
          return json({ success: true });
        }

        default:
          return json({ success: false, error: `未知 action: ${action || ''}` }, 400);
      }
    } catch (error) {
      return json({ success: false, error: error.message || '操作失败' }, 500);
    }
  };
}
