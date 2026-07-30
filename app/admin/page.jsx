'use client';

import { useMemo, useState } from 'react';

async function adminRequest(adminPass, action, payload = {}) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPass, action, ...payload }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('服务器返回了无效响应');
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || '操作失败');
  }

  return data;
}

function normalizeSectionList(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function PermissionPicker({ availableSections, value, onChange, disabled }) {
  const selected = new Set(value || []);
  const options = useMemo(() => {
    const ordinary = normalizeSectionList([
      ...availableSections,
      ...(value || []).filter((section) => section !== '__all__'),
    ]);
    return [{ value: '__all__', label: '全部权限' }, ...ordinary.map((section) => ({
      value: section,
      label: section,
    }))];
  }, [availableSections, value]);

  function toggle(section, checked) {
    if (section === '__all__') {
      onChange(checked ? ['__all__'] : []);
      return;
    }

    const next = new Set((value || []).filter((item) => item !== '__all__'));
    if (checked) next.add(section);
    else next.delete(section);
    onChange([...next]);
  }

  return (
    <div className="permissionGrid">
      {options.map((option) => (
        <label className={option.value === '__all__' ? 'permission allPermission' : 'permission'} key={option.value}>
          <input
            type="checkbox"
            checked={selected.has(option.value)}
            disabled={disabled}
            onChange={(event) => toggle(option.value, event.target.checked)}
          />
          <span>{option.label}</span>
        </label>
      ))}
      {options.length === 1 && (
        <p className="emptyHint">请先在右侧添加功能模块。</p>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [users, setUsers] = useState({});
  const [sections, setSections] = useState([]);
  const [sectionDraft, setSectionDraft] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', sections: [] });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const userEntries = useMemo(
    () => Object.entries(users).sort(([left], [right]) => left.localeCompare(right, 'zh-CN')),
    [users],
  );

  async function loadAll(pass = adminPass) {
    const data = await adminRequest(pass, 'getAll');
    const loadedSections = normalizeSectionList(data.sections || []);
    setUsers(data.users || {});
    setSections(loadedSections);
    setSectionDraft(loadedSections.join('\n'));
  }

  function clearMessages() {
    setError('');
    setNotice('');
  }

  async function login(event) {
    event.preventDefault();
    clearMessages();
    if (!passwordInput) {
      setError('请输入管理员密码');
      return;
    }

    setBusy('login');
    try {
      await adminRequest(passwordInput, 'login');
      await loadAll(passwordInput);
      setAdminPass(passwordInput);
      setPasswordInput('');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy('');
    }
  }

  function updateExistingUser(username, patch) {
    setUsers((current) => ({
      ...current,
      [username]: { ...current[username], ...patch },
    }));
  }

  async function saveExistingUser(username) {
    clearMessages();
    const user = users[username];
    if (!user?.pass) {
      setError(`请为 ${username} 输入密码`);
      return;
    }

    setBusy(`save:${username}`);
    try {
      await adminRequest(adminPass, 'saveUser', {
        username,
        password: user.pass,
        sections: user.sections || [],
      });
      await loadAll();
      setNotice(`已保存用户：${username}`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy('');
    }
  }

  async function createUser(event) {
    event.preventDefault();
    clearMessages();
    if (!newUser.username.trim() || !newUser.password) {
      setError('新用户的用户名和密码不能为空');
      return;
    }

    setBusy('create');
    try {
      await adminRequest(adminPass, 'saveUser', {
        username: newUser.username,
        password: newUser.password,
        sections: newUser.sections,
      });
      await loadAll();
      setNotice(`已创建用户：${newUser.username.trim()}`);
      setNewUser({ username: '', password: '', sections: [] });
    } catch (createError) {
      setError(createError.message);
    } finally {
      setBusy('');
    }
  }

  async function deleteUser(username) {
    if (!window.confirm(`确定删除用户“${username}”吗？`)) return;

    clearMessages();
    setBusy(`delete:${username}`);
    try {
      await adminRequest(adminPass, 'deleteUser', { username });
      await loadAll();
      setNotice(`已删除用户：${username}`);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusy('');
    }
  }

  async function saveSectionList(event) {
    event.preventDefault();
    clearMessages();
    const nextSections = normalizeSectionList(sectionDraft.split(/\r?\n/));
    setBusy('sections');
    try {
      await adminRequest(adminPass, 'saveSections', { sections: nextSections });
      await loadAll();
      setNotice('功能模块已保存');
    } catch (sectionError) {
      setError(sectionError.message);
    } finally {
      setBusy('');
    }
  }

  function logout() {
    setAdminPass('');
    setPasswordInput('');
    setUsers({});
    setSections([]);
    setSectionDraft('');
    setNewUser({ username: '', password: '', sections: [] });
    clearMessages();
  }

  if (!adminPass) {
    return (
      <main className="adminShell loginShell">
        <section className="loginCard">
          <div className="lockIcon" aria-hidden="true">🔐</div>
          <p className="eyebrow">BACKLINK HELPER</p>
          <h1>权限管理后台</h1>
          <p className="intro">使用 Vercel 中设置的 ADMIN_PASS 登录。</p>

          <form onSubmit={login}>
            <label htmlFor="adminPassword">管理员密码</label>
            <input
              id="adminPassword"
              type="password"
              autoComplete="current-password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="请输入管理员密码"
              autoFocus
              disabled={busy === 'login'}
            />
            {error && <div className="message errorMessage" role="alert">{error}</div>}
            <button className="primaryButton fullButton" type="submit" disabled={busy === 'login'}>
              {busy === 'login' ? '正在验证…' : '登录后台'}
            </button>
          </form>
          <a className="backLink" href="/">← 返回工具首页</a>
        </section>
        <AdminStyles />
      </main>
    );
  }

  return (
    <main className="adminShell">
      <header className="topBar">
        <div>
          <p className="eyebrow">BACKLINK HELPER</p>
          <h1>用户权限管理</h1>
          <p className="intro">管理登录账号及每个账号可访问的功能模块。</p>
        </div>
        <div className="headerActions">
          <a className="secondaryButton" href="/">打开工具首页</a>
          <button className="secondaryButton" type="button" onClick={logout}>退出后台</button>
        </div>
      </header>

      {(error || notice) && (
        <div className={error ? 'message errorMessage globalMessage' : 'message successMessage globalMessage'} role="status">
          {error || notice}
        </div>
      )}

      <div className="dashboardGrid">
        <section className="panel userPanel">
          <div className="panelHeading">
            <div>
              <p className="panelKicker">USERS</p>
              <h2>用户账号</h2>
            </div>
            <span className="countBadge">{userEntries.length} 个</span>
          </div>

          <form className="newUserCard" onSubmit={createUser}>
            <div className="cardTitleRow">
              <h3>添加新用户</h3>
              <span className="newBadge">NEW</span>
            </div>
            <div className="fieldGrid">
              <div>
                <label htmlFor="newUsername">用户名</label>
                <input
                  id="newUsername"
                  value={newUser.username}
                  onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))}
                  placeholder="例如：alice"
                  disabled={Boolean(busy)}
                />
              </div>
              <div>
                <label htmlFor="newPassword">密码</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newUser.password}
                  onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                  placeholder="设置登录密码"
                  disabled={Boolean(busy)}
                />
              </div>
            </div>
            <label>访问权限</label>
            <PermissionPicker
              availableSections={sections}
              value={newUser.sections}
              onChange={(next) => setNewUser((current) => ({ ...current, sections: next }))}
              disabled={Boolean(busy)}
            />
            <button className="primaryButton" type="submit" disabled={Boolean(busy)}>
              {busy === 'create' ? '正在创建…' : '添加用户'}
            </button>
          </form>

          <div className="userList">
            {userEntries.map(([username, user]) => (
              <article className="userCard" key={username}>
                <div className="cardTitleRow">
                  <div>
                    <p className="username">{username}</p>
                    <p className="userMeta">{(user.sections || []).includes('__all__') ? '全部权限' : `${(user.sections || []).length} 项权限`}</p>
                  </div>
                  <button
                    className="dangerButton"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => deleteUser(username)}
                  >
                    {busy === `delete:${username}` ? '删除中…' : '删除'}
                  </button>
                </div>

                <label htmlFor={`password-${username}`}>登录密码</label>
                <input
                  id={`password-${username}`}
                  type="text"
                  value={user.pass || ''}
                  onChange={(event) => updateExistingUser(username, { pass: event.target.value })}
                  disabled={Boolean(busy)}
                />

                <label>访问权限</label>
                <PermissionPicker
                  availableSections={sections}
                  value={user.sections || []}
                  onChange={(next) => updateExistingUser(username, { sections: next })}
                  disabled={Boolean(busy)}
                />

                <button
                  className="primaryButton"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => saveExistingUser(username)}
                >
                  {busy === `save:${username}` ? '保存中…' : '保存用户'}
                </button>
              </article>
            ))}

            {userEntries.length === 0 && (
              <div className="emptyState">
                <span aria-hidden="true">👤</span>
                <p>还没有用户，请先添加一个登录账号。</p>
              </div>
            )}
          </div>
        </section>

        <aside className="panel sectionPanel">
          <div className="panelHeading">
            <div>
              <p className="panelKicker">SECTIONS</p>
              <h2>功能模块</h2>
            </div>
            <span className="countBadge">{sections.length} 项</span>
          </div>
          <p className="helperText">每行填写一个功能名称。保存后，可在用户卡片中分配对应权限。</p>
          <form onSubmit={saveSectionList}>
            <label htmlFor="sectionList">模块列表</label>
            <textarea
              id="sectionList"
              value={sectionDraft}
              onChange={(event) => setSectionDraft(event.target.value)}
              placeholder={'URL读取\n基础设置\n站群配置\n整理导出\nSEO工具箱'}
              rows={14}
              disabled={Boolean(busy)}
            />
            <button className="primaryButton fullButton" type="submit" disabled={Boolean(busy)}>
              {busy === 'sections' ? '正在保存…' : '保存功能模块'}
            </button>
          </form>
          <div className="securityNote">
            <strong>安全说明</strong>
            <p>管理员密码仅保存在当前页面内存中，刷新页面后需要重新登录。</p>
          </div>
        </aside>
      </div>
      <AdminStyles />
    </main>
  );
}

function AdminStyles() {
  return (
    <style jsx global>{`
      :global(body) {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(212, 171, 104, 0.12), transparent 34%),
          #111317;
        color: #f1ede4;
      }

      :global(*) {
        box-sizing: border-box;
      }

      .adminShell {
        min-height: 100vh;
        padding: 48px clamp(20px, 5vw, 72px) 72px;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .loginShell {
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .loginCard,
      .panel {
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(24, 27, 33, 0.92);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.35);
      }

      .loginCard {
        width: min(440px, 100%);
        padding: 42px;
        border-radius: 24px;
      }

      .lockIcon {
        display: grid;
        width: 54px;
        height: 54px;
        margin-bottom: 22px;
        place-items: center;
        border-radius: 16px;
        background: rgba(212, 171, 104, 0.12);
        font-size: 26px;
      }

      .eyebrow,
      .panelKicker {
        margin: 0 0 8px;
        color: #d4ab68;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.16em;
      }

      h1,
      h2,
      h3,
      p {
        margin-top: 0;
      }

      h1 {
        margin-bottom: 8px;
        font-size: clamp(30px, 4vw, 44px);
        letter-spacing: -0.04em;
      }

      h2 {
        margin-bottom: 0;
        font-size: 22px;
      }

      h3 {
        margin-bottom: 0;
        font-size: 17px;
      }

      .intro,
      .helperText,
      .userMeta,
      .emptyHint {
        color: #9ea5b2;
        line-height: 1.65;
      }

      .intro {
        margin-bottom: 28px;
      }

      label {
        display: block;
        margin: 16px 0 7px;
        color: #c9c3b4;
        font-size: 12px;
        font-weight: 700;
      }

      input,
      textarea {
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 11px;
        outline: none;
        background: #15181e;
        color: #f1ede4;
        font: inherit;
        transition: border-color 160ms ease, box-shadow 160ms ease;
      }

      input {
        height: 44px;
        padding: 0 13px;
      }

      textarea {
        min-height: 260px;
        padding: 13px;
        resize: vertical;
        line-height: 1.65;
      }

      input:focus,
      textarea:focus {
        border-color: #d4ab68;
        box-shadow: 0 0 0 3px rgba(212, 171, 104, 0.12);
      }

      input:disabled,
      textarea:disabled {
        cursor: not-allowed;
        opacity: 0.62;
      }

      button,
      .secondaryButton {
        min-height: 40px;
        border-radius: 10px;
        padding: 0 16px;
        font: inherit;
        font-size: 13px;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
        transition: transform 150ms ease, opacity 150ms ease, border-color 150ms ease;
      }

      button:hover:not(:disabled),
      .secondaryButton:hover {
        transform: translateY(-1px);
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .primaryButton {
        border: 1px solid #d4ab68;
        background: #d4ab68;
        color: #1c160d;
      }

      .secondaryButton {
        display: inline-grid;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.04);
        color: #e7e1d5;
      }

      .dangerButton {
        border: 1px solid rgba(251, 113, 133, 0.4);
        background: rgba(251, 113, 133, 0.08);
        color: #fb7185;
      }

      .fullButton {
        width: 100%;
        margin-top: 18px;
      }

      .backLink {
        display: block;
        margin-top: 22px;
        color: #9ea5b2;
        text-align: center;
        text-decoration: none;
      }

      .backLink:hover {
        color: #d4ab68;
      }

      .message {
        border-radius: 10px;
        padding: 11px 13px;
        font-size: 13px;
        line-height: 1.5;
      }

      .errorMessage {
        margin-top: 12px;
        border: 1px solid rgba(251, 113, 133, 0.35);
        background: rgba(251, 113, 133, 0.09);
        color: #fda4af;
      }

      .successMessage {
        border: 1px solid rgba(52, 211, 153, 0.32);
        background: rgba(52, 211, 153, 0.08);
        color: #6ee7b7;
      }

      .globalMessage {
        margin: 0 0 22px;
      }

      .topBar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 28px;
      }

      .topBar .intro {
        margin-bottom: 0;
      }

      .headerActions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .dashboardGrid {
        display: grid;
        grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.8fr);
        gap: 22px;
        align-items: start;
      }

      .panel {
        border-radius: 20px;
        padding: 24px;
      }

      .sectionPanel {
        position: sticky;
        top: 20px;
      }

      .panelHeading,
      .cardTitleRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .panelHeading {
        margin-bottom: 20px;
      }

      .countBadge,
      .newBadge {
        border-radius: 999px;
        padding: 5px 9px;
        background: rgba(212, 171, 104, 0.12);
        color: #d4ab68;
        font-size: 11px;
        font-weight: 800;
      }

      .newUserCard,
      .userCard {
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 15px;
        padding: 19px;
        background: rgba(255, 255, 255, 0.025);
      }

      .newUserCard {
        margin-bottom: 18px;
        border-color: rgba(212, 171, 104, 0.24);
        background: rgba(212, 171, 104, 0.045);
      }

      .userList {
        display: grid;
        gap: 14px;
      }

      .fieldGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .username {
        margin-bottom: 3px;
        color: #f1ede4;
        font-size: 17px;
        font-weight: 800;
      }

      .userMeta {
        margin-bottom: 0;
        font-size: 12px;
      }

      .permissionGrid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0 0 16px;
      }

      .permission {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin: 0;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 9px;
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.025);
        color: #c9c3b4;
        cursor: pointer;
      }

      .permission input {
        width: 15px;
        height: 15px;
        margin: 0;
        accent-color: #d4ab68;
      }

      .allPermission {
        border-color: rgba(212, 171, 104, 0.3);
        color: #e4bf80;
      }

      .emptyHint {
        width: 100%;
        margin: 3px 0 0;
        font-size: 12px;
      }

      .emptyState {
        display: grid;
        place-items: center;
        min-height: 160px;
        border: 1px dashed rgba(255, 255, 255, 0.12);
        border-radius: 15px;
        color: #9ea5b2;
        text-align: center;
      }

      .emptyState span {
        font-size: 30px;
      }

      .emptyState p {
        margin: 8px 0 0;
      }

      .securityNote {
        margin-top: 18px;
        border: 1px solid rgba(96, 165, 250, 0.22);
        border-radius: 12px;
        padding: 14px;
        background: rgba(96, 165, 250, 0.06);
        color: #bfdbfe;
        font-size: 12px;
        line-height: 1.6;
      }

      .securityNote p {
        margin: 4px 0 0;
        color: #93c5fd;
      }

      @media (max-width: 900px) {
        .dashboardGrid {
          grid-template-columns: 1fr;
        }

        .sectionPanel {
          position: static;
        }
      }

      @media (max-width: 620px) {
        .adminShell {
          padding: 28px 15px 52px;
        }

        .loginCard,
        .panel {
          padding: 20px;
          border-radius: 16px;
        }

        .topBar {
          flex-direction: column;
        }

        .headerActions {
          width: 100%;
        }

        .headerActions > * {
          flex: 1;
        }

        .fieldGrid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
