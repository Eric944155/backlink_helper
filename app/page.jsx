// app/page.jsx
// 使用 dangerouslySetInnerHTML 避免 JSX 语法转换问题。
// 完整功能通过 public/app.js 加载（defer），与原 index.html 行为一致。
'use client';

import './globals.css';

const bodyHTML = `<!-- Google Tag Manager (noscript) -->

<!-- End Google Tag Manager (noscript) -->
  <!-- Login Modal -->
  <div id="authModal" style="position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;">
    <div style="background:#fff;border-radius:16px;padding:36px 32px;width:min(380px,90vw);box-shadow:0 20px 60px rgba(0,0,0,.2);text-align:center;">
      <div style="font-size:28px;margin-bottom:4px;">🔐</div>
      <h2 style="margin:0 0 4px;font-size:20px;color:#f1ede4;">登录</h2>
      <p style="margin:0 0 20px;font-size:13px;color:#9aa1b8;">请输入账号和密码以访问工具</p>
      <input type="text" id="authUser" placeholder="用户名" autocomplete="username" style="display:block;width:100%;padding:10px 14px;margin-bottom:10px;border:1px solid #565e78;border-radius:8px;font-size:14px;outline:none;" />
      <input type="password" id="authPass" placeholder="密码" autocomplete="current-password" style="display:block;width:100%;padding:10px 14px;margin-bottom:6px;border:1px solid #565e78;border-radius:8px;font-size:14px;outline:none;" />
      <div id="authError" style="color:#fb7185;font-size:12px;min-height:20px;margin-bottom:10px;"></div>
      <button type="button" id="authLoginBtn" style="width:100%;padding:11px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">登 录</button>
    </div>
  </div>

  <!-- User bar (shown when logged in) -->
  <div id="authUserBar" style="display:none;position:fixed;top:0;right:0;z-index:9998;padding:8px 16px;background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border-bottom-left-radius:10px;border:1px solid rgba(255,255,255,0.08);font-size:12px;color:#c9c3b4;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <span id="authUserLabel"></span>
    <span id="authRoleBadge" style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;margin-left:4px;"></span>
    <button type="button" id="authLogoutBtn" style="margin-left:10px;padding:3px 10px;border:1px solid rgba(255,255,255,0.16);border-radius:6px;background:rgba(255,255,255,0.06);font-size:11px;cursor:pointer;color:#c9c3b4;">退出</button>
  </div>

  <header>
    <span class="eyebrow">ASSISTANT · TOOLKIT</span>
    <h1>没啥用的助手</h1>
    <p class="subtitle">持续更新一些没什么用的小功能。</p>
  </header>

  <main>
    <div class="grid">
      <section class="card">
        <h2><span class="section-eyebrow">STEP 01</span>操作区</h2>
        <div class="card-body">
          <!-- File upload - always visible -->
          <label class="upload-box" id="dropZone" for="fileInput">
            <strong>上传 Word 文件</strong>
            <span>支持多个 .docx，自动识别锚文本与跳转链接。</span>
          </label>
          <input id="fileInput" type="file" multiple accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
          <div id="fileList" class="file-list"></div>
          <input type="hidden" id="minTitleLength" value="2" />
          <input type="hidden" id="pageUrl" value="" />

          <!-- Tab bar -->
          <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-top:16px;background:linear-gradient(180deg,rgba(248,251,255,.98),rgba(244,248,255,.92));border-radius:10px 10px 0 0;" id="opTabBar">
            <button type="button" class="op-tab active" data-optab="urlRead" style="flex:1;border:0;border-bottom:2px solid var(--primary);border-radius:0;background:transparent;padding:11px 6px;font-size:13px;font-weight:700;color:var(--primary);box-shadow:none;cursor:pointer;">📂 URL 读取</button>
            <button type="button" class="op-tab" data-optab="baseSetting" style="flex:1;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;padding:11px 6px;font-size:13px;font-weight:700;color:var(--muted);box-shadow:none;cursor:pointer;">⚙️ 基础设置</button>
            <button type="button" class="op-tab" data-optab="siteSetting" style="flex:1;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;padding:11px 6px;font-size:13px;font-weight:700;color:var(--muted);box-shadow:none;cursor:pointer;">🌐 站群配置</button>
            <button type="button" class="op-tab" data-optab="exportSetting" style="flex:1;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;padding:11px 6px;font-size:13px;font-weight:700;color:var(--muted);box-shadow:none;cursor:pointer;">📤 整理导出</button>
          </div>

          <!-- Tab 1: URL 读取 -->
          <div class="op-panel" id="opPanelUrlRead" data-section="URL读取" style="display:block;padding-top:16px;">
            <div class="step-block url-reader-block">
              <div class="url-reader-head">
                <div>
                  <p class="step-title"><span class="step-num">URL</span>读取页面锚文本与跳转链接</p>
                </div>
              </div>

              <label for="sourcePageUrls">页面 URL 列表</label>
              <textarea class="textarea" id="sourcePageUrls" placeholder="https://www.example.com/article-1&#10;https://www.example.com/article-2"></textarea>

              <label for="targetDomainFilter" style="margin-top:12px;">客户网址</label>
              <textarea class="textarea target-domain-textarea" id="targetDomainFilter" placeholder="chainzone.com&#10;www.chainzone.com"></textarea>

              <div class="url-reader-options">
                <div>
                  <label for="urlLinkScope">读取范围</label>
                  <select class="text" id="urlLinkScope">
                    <option value="content" selected>优先正文区域</option>
                    <option value="all">整页全部链接</option>
                    <option value="external">仅外部链接</option>
                  </select>
                </div>
                <label class="check-row" for="skipNavigationLinks">
                  <input id="skipNavigationLinks" type="checkbox" checked />
                  排除导航、页脚、侧边栏链接
                </label>
                <div>
                  <label for="failedPlaceholderRows">失败/空结果预留行数</label>
                  <select class="text" id="failedPlaceholderRows">
                    <option value="1">1 行</option>
                    <option value="2">2 行</option>
                    <option value="3" selected>3 行</option>
                    <option value="4">4 行</option>
                    <option value="5">5 行</option>
                  </select>
                </div>
                <div class="concurrency-options">
                  <label>并发数</label>
                  <div class="concurrency-choice-group" id="urlConcurrencyChoices">
                    <label class="concurrency-choice"><input type="radio" name="urlReadConcurrency" value="1" />1 个</label>
                    <label class="concurrency-choice"><input type="radio" name="urlReadConcurrency" value="2" />2 个</label>
                    <label class="concurrency-choice"><input type="radio" name="urlReadConcurrency" value="3" />3 个</label>
                    <label class="concurrency-choice"><input type="radio" name="urlReadConcurrency" value="4" />4 个</label>
                    <label class="concurrency-choice"><input type="radio" name="urlReadConcurrency" value="6" checked />6 个</label>
                    <label class="concurrency-choice"><input type="radio" name="urlReadConcurrency" value="8" />8 个</label>
                  </div>
                </div>
              </div>

              <div class="inline-tools url-actions">
                <button id="extractFromUrlsBtn" class="primary" type="button">读取 URL 页面链接</button>
                <button id="clearSourceUrlsBtn" type="button">清空 URL 列表</button>
              </div>

              <div id="urlLogPanel" class="url-log-panel" aria-live="polite">
                <div class="url-log-head">
                  <span>URL 读取日志</span>
                  <button id="clearUrlLogBtn" type="button">清空日志</button>
                </div>
                <div id="urlLogSummary" class="url-log-summary">等待读取。</div>
                <div class="url-progress"><div id="urlProgressBar" class="url-progress-bar"></div></div>
                <div id="urlLogList" class="url-log-list"></div>
              </div>

              <!-- ===== Failed URL Recovery ===== -->
              <div id="failedUrlRecovery" style="margin-top:16px;border:1px dashed rgba(212,171,104,0.35);border-radius:12px;padding:16px;background:rgba(255,255,255,0.03);display:none;">
                <p class="step-title" style="margin:0 0 10px;"><span class="step-num">⚠</span>读取失败 URL 列表汇总</p>
                <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;">
                  <div>
                    <label for="failedUrlSelect">选择需要手动补充的 URL</label>
                    <select class="text" id="failedUrlSelect" style="width:100%;"></select>
                  </div>
                  <button id="copyFailedUrlBtn" type="button" style="white-space:nowrap;height:38px;">复制该 URL</button>
                </div>
                <label for="manualHtmlInput" style="margin-top:10px;">源码</label>
                <textarea class="textarea" id="manualHtmlInput" placeholder="源码解决" style="min-height:100px;font-family:'Courier New',monospace;font-size:11px;"></textarea>
                <div class="inline-tools" style="margin-top:10px;">
                  <button id="parseManualHtmlBtn" class="primary" type="button">解析并添加到结果表</button>
                  <button id="clearManualHtmlBtn" type="button">清空</button>
                </div>
                <div id="manualHtmlResult" style="display:none;margin-top:10px;">
                  <div id="manualHtmlSummary" style="padding:8px 12px;border-radius:8px;background:rgba(52,211,153,0.14);border:1px solid rgba(52,211,153,0.3);font-size:12px;color:#34d399;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 2: 基础设置 -->
          <div class="op-panel" id="opPanelBaseSetting" data-section="基础设置" style="display:none;padding-top:16px;">
            <div class="step-block">
              <p class="step-title"><span class="step-num">⚙</span>项目基础设置（将映射到导出 Excel 表格中）</p>
              <div class="compact-grid">
                <div>
                  <label for="projectBaseName">项目名</label>
                  <input class="text" id="projectBaseName" placeholder="例如：佛山青松" />
                </div>
                <div>
                  <label>年月份</label>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <select class="text" id="projectYear"></select>
                    <select class="text" id="projectMonth"></select>
                  </div>
                </div>
                <div>
                  <label for="linkType">外链种类</label>
                  <select class="text" id="linkType">
                    <option value="Guest Post" selected>Guest Post</option>
                    <option value="Web2.0">Web2.0</option>
                  </select>
                </div>
                <div>
                  <label for="dofollowValue">是否 dofollow</label>
                  <select class="text" id="dofollowValue">
                    <option value="Yes" selected>Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label for="segmentMode">文章切分</label>
                  <select class="text" id="segmentMode">
                    <option value="hash" selected>按 #编号切分</option>
                    <option value="auto">自动标题切分</option>
                    <option value="headings">仅标题样式</option>
                    <option value="single">每个 Word 一篇</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="step-block">
              <p class="step-title"><span class="step-num">📊</span>域名 → 网站权重映射</p>
              <label for="domainAuthorityMap">域名和权重</label>
              <textarea class="textarea" id="domainAuthorityMap" placeholder="example.com  60&#10;site-a.com  45"></textarea>
              <div class="inline-tools">
                <button id="applyAuthorityMapBtn" disabled>按已填 URL 映射权重</button>
                <button id="clearAuthorityMapBtn" type="button">清空映射表</button>
              </div>
            </div>
          </div>

          <!-- Tab 3: 站群配置 -->
          <div class="op-panel" id="opPanelSiteSetting" data-section="站群配置" style="display:none;padding-top:16px;">
            <div class="step-block">
              <p class="step-title"><span class="step-num">🔗</span>站群URL（映射到列）</p>
              <label for="bulkPublishedUrls">每行一个 URL，顺序对应文章序号</label>
              <textarea class="textarea" id="bulkPublishedUrls" placeholder="www.example.com/article-1&#10;https://site-a.com/post-2.html"></textarea>
              <div class="inline-tools">
                <button id="applyBulkUrlsBtn" disabled>应用到 URL 列</button>
                <button id="clearBulkUrlsBtn" type="button">清空 URL 框</button>
              </div>
            </div>
          </div>

          <!-- Tab 4: 整理导出 -->
          <div class="op-panel" id="opPanelExportSetting" data-section="整理导出" style="display:none;padding-top:16px;">
            <div class="step-block">
              <p class="step-title"><span class="step-num">📤</span>应用设置并导出结果</p>
              <p style="font-size:13px;color:#b0aa9c;margin-bottom:14px;line-height:1.6;">点击「应用基础设置」将上方的项目名、外链种类等信息写入表格。确认无误后可导出 CSV 或 Excel 文件。</p>
              <div class="controls">
                <button class="primary" id="applyMetaBtn" disabled>应用基础设置</button>
                <button id="stripHashBtn" disabled>去除标题 #编号</button>
                <button id="downloadCsvBtn" disabled>导出 CSV</button>
                <button id="clearBtn" disabled>清空全部</button>
              </div>
            </div>
          </div>

          <div id="status" class="status">等待操作。</div>
        </div>
      </section>

      <section class="card">
        <h2><span class="section-eyebrow">STEP 02</span>结果预览</h2>
        <div class="summary" id="summary">
          <span class="pill"><b>0</b><em>文章数</em></span>
          <span class="pill"><b>0</b><em>已识别外链</em></span>
          <span class="pill pill-text"><em>切分方式</em><b class="pill-b-text">#编号强制切分</b></span>
          <span class="pill pill-text"><em>文章标题</em><b class="pill-b-text">合并单元格</b></span>
        </div>

        <div class="preview-actions">
          <button type="button" class="global-copy" id="copyAllVisualBtn" disabled>复制完整表格</button>
          <button type="button" class="export-excel" id="downloadExcelBtn" disabled>导出为 Excel</button>
        </div>

        <div class="table-wrap">
          <table id="resultTable">
            <colgroup>
              <col style="width:87px;">
              <col style="width:54px;">
              <col style="width:487px;">
              <col style="width:350px;">
              <col style="width:69px;">
              <col style="width:157px;">
              <col style="width:478px;">
              <col style="width:118px;">
            </colgroup>
            <thead>
              <tr>
                <th id="projectTitleHeader" class="project-title-header" colspan="8">外链汇总</th>
              </tr>
              <tr>
                <th><span class="th-inner"><span>外链种类</span><button type="button" class="copy-col-btn" data-copy-column="外链种类" title="复制外链种类列" disabled>⧉</button></span></th>
                <th><span class="th-inner"><span>序号</span><button type="button" class="copy-col-btn" data-copy-column="序号" title="复制序号列" disabled>⧉</button></span></th>
                <th><span class="th-inner"><span>文章标题</span><button type="button" class="copy-col-btn" data-copy-column="文章标题" title="复制文章标题列" disabled>⧉</button></span></th>
                <th><span class="th-inner"><span>URL</span><button type="button" class="copy-col-btn" data-copy-column="URL" title="复制URL列" disabled>⧉</button></span></th>
                <th><span class="th-inner"><span>网站权重</span><button type="button" class="copy-col-btn" data-copy-column="网站权重" title="复制网站权重列" disabled>⧉</button></span></th>
                <th><span class="th-inner"><span>锚文本</span><button type="button" class="copy-col-btn" data-copy-column="锚文本" title="复制锚文本列" disabled>⧉</button></span></th>
                <th><span class="th-inner"><span>跳转URL</span><button type="button" class="copy-col-btn" data-copy-column="跳转URL" title="复制跳转URL列" disabled>⧉</button></span></th>
                <th><span class="th-inner"><span>是否dofollow</span><button type="button" class="copy-col-btn" data-copy-column="是否dofollow" title="复制是否dofollow列" disabled>⧉</button></span></th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <tr>
                <td colspan="8">
                  <div class="empty-state">上传 Word 或读取 URL 后显示结果。</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>


    <!-- ===== SEO Tools Extension ===== -->
    <div style="margin-top:28px;" data-section="SEO工具箱">
      <section class="card" id="seoToolsCard">
        <h2><span class="section-eyebrow">MODULES</span>SEO 工具箱</h2>
        <div style="display:flex;gap:0;border-bottom:1px solid var(--border);background:linear-gradient(180deg,rgba(248,251,255,.98),rgba(244,248,255,.92));" id="extTabBar">
          <button type="button" class="ext-tab active" data-tab="healthCheck" id="tabHealthCheck" style="flex:1;border:0;border-bottom:2px solid var(--primary);border-radius:0;background:transparent;padding:12px 8px;font-size:13px;font-weight:700;color:var(--primary);box-shadow:none;">外链存活检测</button>
          <button type="button" class="ext-tab" data-tab="dofollowCheck" id="tabDofollowCheck" style="flex:1;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;padding:12px 8px;font-size:13px;font-weight:700;color:var(--muted);box-shadow:none;">Dofollow / Nofollow 检测</button>
          <button type="button" class="ext-tab" data-tab="regexTool" id="tabRegexTool" style="flex:1;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;padding:12px 8px;font-size:13px;font-weight:700;color:var(--muted);box-shadow:none;">正则表达式生成器</button>
          <button type="button" class="ext-tab" data-tab="indexCheck" id="tabIndexCheck" style="flex:1;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;padding:12px 8px;font-size:13px;font-weight:700;color:var(--muted);box-shadow:none;">批量收录查询 <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(251,191,36,0.18);color:#fbbf24;margin-left:2px;">待更新</span></button>
        </div>
        <div class="ext-panel" id="panelHealthCheck" style="display:block;">
          <div class="card-body">
            <p style="margin:0 0 12px;color:#b0aa9c;font-size:13px;line-height:1.6;">检测页面的 HTTP 状态、Dofollow/Nofollow 属性。支持按批次分组管理。</p>

            <!-- 分组管理区 -->
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px;">
              <div style="flex:1;min-width:180px;">
                <label for="blGroupSelect" style="font-size:12px;font-weight:600;color:#c9c3b4;">选择分组</label>
                <select id="blGroupSelect" class="text" style="width:100%;margin-top:4px;padding:8px 10px;font-size:13px;"></select>
              </div>
              <div style="flex:1;min-width:150px;">
                <label for="blNewGroupName" style="font-size:12px;font-weight:600;color:#c9c3b4;">新建分组</label>
                <input class="text" id="blNewGroupName" placeholder="例如：2026年5月外链" style="width:100%;margin-top:4px;padding:8px 10px;font-size:13px;" />
              </div>
              <button type="button" id="blAddGroupBtn" style="padding:8px 14px;font-size:13px;white-space:nowrap;">+ 添加</button>
              <button type="button" id="blRenameGroupBtn" style="padding:8px 14px;font-size:13px;white-space:nowrap;">✏️ 重命名</button>
              <button type="button" id="blDeleteGroupBtn" style="padding:8px 14px;font-size:13px;color:#fb7185;white-space:nowrap;">🗑 删除组</button>
            </div>

            <!-- 目标域名 -->
            <div style="margin-bottom:14px;">
              <label for="blTargetDomain" style="font-size:12px;font-weight:600;color:#c9c3b4;">目标域名（用于检测链接是否蠢货于页面上）</label>
              <input class="text" id="blTargetDomain" placeholder="yoursite.com" style="width:100%;margin-top:4px;padding:8px 10px;font-size:13px;" />
            </div>

            <!-- URL 输入区 -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label for="healthCheckUrls" style="font-size:12px;font-weight:600;color:#c9c3b4;">外链页面 URL 列表（每行一个）</label>
              <span id="blUrlCount" style="font-size:11px;color:var(--muted);">0 条 URL</span>
            </div>
            <textarea class="textarea" id="healthCheckUrls" placeholder="https://example.com/blog-post-1&#10;https://example.com/directory-listing&#10;https://forum.example.com/thread-123" style="min-height:120px;"></textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
              <button type="button" id="blSaveGroupBtn" style="font-size:11px;padding:4px 10px;color:#93c5fd;">💾 保存到当前分组</button>
              <button type="button" id="blImportCsvBtn" style="font-size:11px;padding:4px 10px;">📂 从 CSV 导入</button>
              <input type="file" id="blImportCsvFile" accept=".csv,.txt" style="display:none;" />
            </div>

            <!-- 并发控制 -->
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;align-items:center;">
              <div style="display:flex;align-items:center;gap:6px;">
                <label for="blConcurrency" style="font-size:12px;font-weight:600;color:#c9c3b4;white-space:nowrap;">并发数</label>
                <input type="range" id="blConcurrencyRange" min="1" max="10" value="3" style="width:80px;cursor:pointer;" />
                <input type="number" id="blConcurrency" min="1" max="10" value="3" style="width:48px;padding:4px 6px;font-size:12px;text-align:center;border:1px solid #cbd5e1;border-radius:6px;" />
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <label for="blDelay" style="font-size:12px;font-weight:600;color:#c9c3b4;white-space:nowrap;">请求间隔</label>
                <input type="range" id="blDelayRange" min="0" max="5000" step="200" value="200" style="width:80px;cursor:pointer;" />
                <input type="number" id="blDelay" min="0" max="10000" step="100" value="200" style="width:64px;padding:4px 6px;font-size:12px;text-align:center;border:1px solid #cbd5e1;border-radius:6px;" />
                <span style="font-size:11px;color:#9aa1b8;">ms</span>
              </div>
              <span style="font-size:11px;color:#9aa1b8;line-height:1.4;">URL 较多时建议降低并发、加大间隔，避免目标站返回 429 或 Vercel 限流</span>
            </div>

            <!-- 操作按钮 -->
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center;">
              <button class="primary" type="button" id="runHealthCheckBtn">🚀 开始检测</button>
              <button type="button" id="clearHealthCheckBtn">清空</button>
              <button type="button" id="exportHealthCheckBtn" disabled>导出结果 CSV</button>
              <span id="healthCheckProgress" style="font-size:12px;color:var(--muted);"></span>
            </div>

            <!-- 汇总统计条 -->
            <div id="blSummaryBar" style="display:none;margin-top:14px;padding:12px 16px;background:linear-gradient(135deg,rgba(201,161,91,0.10),rgba(201,161,91,0.04));border:1px solid rgba(201,161,91,0.28);border-radius:8px;">
              <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;font-weight:600;">
                <span>共 <b id="blStatTotal">0</b> 条</span>
                <span style="color:#34d399;">✅ 存活 <b id="blStatAlive">0</b></span>
                <span style="color:#fbbf24;">⚠️ 链接丢失 <b id="blStatLinkLost">0</b></span>
                <span style="color:#fb7185;">❌ 死链 <b id="blStatDead">0</b></span>
                <span style="color:#c4b5fd;">🔀 重定向 <b id="blStatRedirect">0</b></span>
                <span style="color:#93c5fd;">🔗 Dofollow <b id="blStatDofollow">0</b></span>
                <span style="color:#9aa1b8;">🚫 Nofollow <b id="blStatNofollow">0</b></span>
              </div>
              <!-- 状态过滤 -->
              <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="bl-filter-btn active" data-filter="all" style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);color:#c9c3b4;cursor:pointer;">全部</button>
                <button type="button" class="bl-filter-btn" data-filter="alive" style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);color:#c9c3b4;cursor:pointer;">✅ 存活</button>
                <button type="button" class="bl-filter-btn" data-filter="linklost" style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);color:#c9c3b4;cursor:pointer;">⚠️ 链接丢失</button>
                <button type="button" class="bl-filter-btn" data-filter="dead" style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);color:#c9c3b4;cursor:pointer;">❌ 死链</button>
                <button type="button" class="bl-filter-btn" data-filter="redirect" style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);color:#c9c3b4;cursor:pointer;">🔀 重定向</button>
              </div>
            </div>

            <!-- 结果表格 -->
            <div id="healthCheckResults" style="margin-top:16px;display:none;">
              <div style="overflow:auto;max-height:580px;border:1px solid var(--border);border-radius:12px;">
                <table id="healthCheckTable" style="width:100%;border-collapse:collapse;font-size:12px;min-width:1100px;">
                  <thead><tr style="background:#edf4ff;position:sticky;top:0;z-index:1;">
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;width:36px;">#</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;min-width:200px;">外链页面 URL</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:70px;">HTTP</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:80px;">页面状态</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:80px;">链接存活</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:80px;">链接属性</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;min-width:120px;">锚文本</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;">Redirect Chain</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:65px;">Noindex</th>
                  </tr></thead>
                  <tbody id="healthCheckTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="ext-panel" id="panelDofollowCheck" style="display:none;">
          <div class="card-body">
            <p style="margin:0 0 12px;color:#b0aa9c;font-size:13px;line-height:1.6;">输入页面 URL，检测页面上所有出站链接的 dofollow/nofollow 属性，默认排除内链，只看外部链接。</p>
            <label for="dofollowCheckUrl">页面 URL（每行一个，支持批量）</label>
            <textarea class="textarea" id="dofollowCheckUrl" placeholder="https://example.com/blog-post-with-backlinks" style="min-height:80px;"></textarea>
            <div style="margin-top:10px;">
              <label for="dofollowFilterDomain">目标域名（只显示指向该域名的链接）</label>
              <input class="text" id="dofollowFilterDomain" placeholder="yoursite.com" />
            </div>
            <div style="margin-top:8px;">
              <label class="check-row" for="dofollowExcludeInternal" style="display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:8px 12px;background:rgba(255,255,255,0.03);color:#c9c3b4;font-size:12px;font-weight:650;cursor:pointer;">
                <input id="dofollowExcludeInternal" type="checkbox" checked style="width:14px;height:14px;" />
                排除内部链接（只看外部出站链接）
              </label>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;align-items:center;">
              <button class="primary" type="button" id="runDofollowCheckBtn">检测 Dofollow</button>
              <button type="button" id="clearDofollowCheckBtn">清空</button>
              <button type="button" id="exportDofollowBtn" disabled>导出结果 CSV</button>
              <span id="dofollowCheckProgress" style="font-size:12px;color:var(--muted);"></span>
            </div>
            <div id="dofollowCheckResults" style="margin-top:16px;display:none;">
              <div id="dofollowSummary" style="padding:10px 14px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);margin-bottom:12px;font-size:12px;color:#c9c3b4;"></div>
              <div style="overflow:auto;max-height:520px;border:1px solid var(--border);border-radius:12px;">
                <table id="dofollowCheckTable" style="width:100%;border-collapse:collapse;font-size:12px;min-width:800px;">
                  <thead><tr style="background:#edf4ff;">
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;width:40px;">#</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;">来源页面</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;">锚文本</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;">目标 URL</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:90px;">Dofollow</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:90px;">rel 属性</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:80px;">Sponsored</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:60px;">UGC</th>
                  </tr></thead>
                  <tbody id="dofollowCheckTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="ext-panel" id="panelRegexTool" style="display:none;">
          <div class="card-body">
            <div style="display:flex;gap:0;margin-bottom:16px;border:1px solid var(--border);border-radius:10px;overflow:hidden;" id="regexSubTabBar">
              <button type="button" class="regex-sub-tab active" data-subtab="gsc" id="subtabGsc" style="flex:1;border:0;padding:10px 8px;font-size:13px;font-weight:700;background:var(--primary);color:#1a1509;box-shadow:none;border-radius:0;">GSC URL 正则匹配</button>
              <button type="button" class="regex-sub-tab" data-subtab="ga4" id="subtabGa4" style="flex:1;border:0;padding:10px 8px;font-size:13px;font-weight:700;background:rgba(255,255,255,0.04);color:#c9c3b4;box-shadow:none;border-radius:0;">GA4 AI 爬虫正则</button>
            </div>
            <div id="subpanelGsc" style="display:block;">
              <p style="margin:0 0 12px;color:#b0aa9c;font-size:13px;line-height:1.6;">输入多条 URL，生成精准匹配的正则表达式。</p>
              <label for="gscUrlList">URL 列表（每行一个）</label>
              <textarea class="textarea" id="gscUrlList" placeholder="https://example.com/blog/seo-tips&#10;https://example.com/services/link-building&#10;https://example.com/about" style="min-height:120px;"></textarea>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;">
                <div>
                  <label for="gscMatchMode">匹配模式</label>
                  <select class="text" id="gscMatchMode">
                    <option value="exact" selected>精准匹配（完整 URL）</option>
                    <option value="path">仅匹配路径部分</option>
                    <option value="flexible">灵活匹配（忽略协议和 www）</option>
                  </select>
                </div>
                <div>
                  <label for="gscTrailingSlash">尾部斜杠</label>
                  <select class="text" id="gscTrailingSlash">
                    <option value="both" selected>有无斜杠都匹配</option>
                    <option value="as-is">按原样</option>
                  </select>
                </div>
              </div>
              <div style="display:flex;gap:10px;margin-top:12px;">
                <button class="primary" type="button" id="generateGscRegexBtn">生成正则表达式</button>
                <button type="button" id="copyGscRegexBtn" disabled>复制正则</button>
                <button type="button" id="clearGscBtn">清空</button>
              </div>
              <div id="gscRegexResult" style="margin-top:14px;display:none;">
                <label>生成的正则表达式（直接粘贴到 GSC）</label>
                <div id="gscRegexOutput" style="padding:12px 14px;border-radius:10px;background:rgba(52,211,153,0.14);border:1px solid rgba(52,211,153,0.3);font-family:'Courier New',monospace;font-size:13px;word-break:break-all;line-height:1.6;color:#34d399;user-select:all;max-height:200px;overflow:auto;"></div>
                <div id="gscRegexInfo" style="margin-top:8px;font-size:12px;color:var(--muted);line-height:1.5;"></div>
              </div>
            </div>
            <div id="subpanelGa4" style="display:none;">
              <p style="margin:0 0 14px;color:#b0aa9c;font-size:13px;line-height:1.6;">勾选平台，合并该品牌下所有爬虫 UA 生成正则表达式。下方附完整爬虫参考表。</p>
              <label>选择 AI 平台</label>
              <div id="aiBrandList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-top:8px;"></div>
              <div style="display:flex;gap:10px;margin-top:14px;">
                <button type="button" id="selectAllBrandsBtn" style="font-size:12px;">全选</button>
                <button type="button" id="deselectAllBrandsBtn" style="font-size:12px;">取消全选</button>
              </div>
              <div style="display:flex;gap:10px;margin-top:14px;">
                <button class="primary" type="button" id="generateGa4RegexBtn">生成正则</button>
                <button type="button" id="copyGa4RegexBtn" disabled>复制正则</button>
              </div>
              <div id="ga4RegexResult" style="margin-top:14px;display:none;">
                <label>User-Agent 正则表达式</label>
                <div id="ga4RegexOutput" style="padding:12px 14px;border-radius:10px;background:rgba(52,211,153,0.14);border:1px solid rgba(52,211,153,0.3);font-family:'Courier New',monospace;font-size:13px;word-break:break-all;line-height:1.6;color:#34d399;user-select:all;max-height:200px;overflow:auto;"></div>
                <div id="ga4RegexInfo" style="margin-top:8px;font-size:12px;color:var(--muted);line-height:1.6;"></div>
              </div>
              <div style="margin-top:24px;border-top:1px solid var(--border);padding-top:18px;">
                <label style="font-size:14px;font-weight:700;color:#f1ede4;">📋 AI 爬虫参考表</label>
                <p style="margin:6px 0 12px;color:#9aa1b8;font-size:12px;">各 AI 平台已知的所有爬虫 User-Agent，供参考了解。</p>
                <div style="overflow:auto;max-height:520px;border:1px solid var(--border);border-radius:12px;">
                  <table id="aiBotRefTable" style="width:100%;border-collapse:collapse;font-size:12px;min-width:750px;">
                    <thead><tr style="background:rgba(212,171,104,0.10);position:sticky;top:0;z-index:1;">
                      <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;width:140px;color:#d4ab68;">品牌</th>
                      <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;width:180px;color:#d4ab68;">爬虫 UA</th>
                      <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;color:#d4ab68;">用途说明</th>
                      <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:90px;color:#d4ab68;">robots.txt</th>
                    </tr></thead>
                    <tbody id="aiBotRefTableBody"></tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== Panel: Index Check ===== -->
        <div class="ext-panel" id="panelIndexCheck" style="display:none;">
          <div class="card-body">
            <div style="display:flex;align-items:center;gap:14px;padding:20px;border-radius:16px;background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(124,108,255,0.10));border:1px solid rgba(251,191,36,0.25);margin-bottom:18px;">
              <div style="font-size:28px;">🛠️</div>
              <div>
                <div style="font-size:15px;font-weight:700;color:#fbbf24;margin-bottom:4px;">该功能正在优化中，暂未开放</div>
                <div style="font-size:12.5px;color:var(--muted);line-height:1.6;">现有的 Google/Bing site: 查询方式误判率偏高，正在评估更准确的收录检测方案（如 Search Console API 接入）。下方界面保留供预览，暂不可用，敬请期待更新。</div>
              </div>
            </div>
            <div style="opacity:.4;pointer-events:none;filter:grayscale(.3);">
            <p style="margin:0 0 12px;color:#b0aa9c;font-size:13px;line-height:1.6;">通过 Google / Bing 的 <code>site:</code> 查询 + 页面可索引性分析 + robots.txt 检测，多信号综合判断 URL 是否已被搜索引擎收录。</p>

            <!-- 搜索引擎选择 -->
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;align-items:flex-end;">
              <div>
                <label style="font-size:12px;font-weight:600;color:#c9c3b4;">检测引擎</label>
                <div style="display:flex;gap:8px;margin-top:4px;">
                  <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;"><input type="checkbox" id="idxUseGoogle" checked /> Google</label>
                  <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;"><input type="checkbox" id="idxUseBing" checked /> Bing</label>
                </div>
              </div>
              <div>
                <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;"><input type="checkbox" id="idxAnalyzePage" checked /> 同时分析页面可索引性（meta robots / canonical / robots.txt）</label>
              </div>
            </div>

            <!-- 并发控制 -->
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;align-items:center;">
              <div style="display:flex;align-items:center;gap:6px;">
                <label for="idxConcurrency" style="font-size:12px;font-weight:600;color:#c9c3b4;white-space:nowrap;">并发数</label>
                <input type="range" id="idxConcurrencyRange" min="1" max="5" value="1" style="width:80px;cursor:pointer;" />
                <input type="number" id="idxConcurrency" min="1" max="5" value="1" style="width:48px;padding:4px 6px;font-size:12px;text-align:center;border:1px solid #cbd5e1;border-radius:6px;" />
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <label for="idxDelay" style="font-size:12px;font-weight:600;color:#c9c3b4;white-space:nowrap;">请求间隔</label>
                <input type="range" id="idxDelayRange" min="1000" max="10000" step="500" value="3000" style="width:100px;cursor:pointer;" />
                <input type="number" id="idxDelay" min="500" max="30000" step="500" value="3000" style="width:64px;padding:4px 6px;font-size:12px;text-align:center;border:1px solid #cbd5e1;border-radius:6px;" />
                <span style="font-size:11px;color:#9aa1b8;">ms</span>
              </div>
              <span style="font-size:11px;color:#fb7185;line-height:1.4;font-weight:600;">⚠️ 收录查询需请求 Google/Bing，并发过高会被封 IP，强烈建议并发 ≤ 2、间隔 ≥ 3s</span>
            </div>

            <!-- URL 输入 -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label for="idxUrlList" style="font-size:12px;font-weight:600;color:#c9c3b4;">URL 列表（每行一个）</label>
              <span id="idxUrlCount" style="font-size:11px;color:var(--muted);">0 条 URL</span>
            </div>
            <textarea class="textarea" id="idxUrlList" placeholder="https://yoursite.com/page-1&#10;https://yoursite.com/page-2&#10;https://yoursite.com/blog/article-title" style="min-height:120px;"></textarea>

            <!-- 操作按钮 -->
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;align-items:center;">
              <button class="primary" type="button" id="runIndexCheckBtn">🔍 开始查询</button>
              <button type="button" id="stopIndexCheckBtn" disabled style="color:#fb7185;">⏹ 停止</button>
              <button type="button" id="clearIndexCheckBtn">清空</button>
              <button type="button" id="exportIndexCheckBtn" disabled>导出结果 CSV</button>
              <span id="idxProgress" style="font-size:12px;color:var(--muted);"></span>
            </div>

            <!-- 汇总统计 -->
            <div id="idxSummaryBar" style="display:none;margin-top:14px;padding:12px 16px;background:linear-gradient(135deg,rgba(52,211,153,0.14),rgba(52,211,153,0.08));border:1px solid rgba(52,211,153,0.35);border-radius:10px;">
              <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;font-weight:600;">
                <span>共 <b id="idxStatTotal">0</b> 条</span>
                <span style="color:#34d399;">✅ 已收录 <b id="idxStatIndexed">0</b></span>
                <span style="color:#fb7185;">❌ 未收录 <b id="idxStatNotIndexed">0</b></span>
                <span style="color:#fbbf24;">⚠️ 不可索引 <b id="idxStatNotIndexable">0</b></span>
                <span style="color:#c4b5fd;">🤖 robots 阻止 <b id="idxStatRobotsBlocked">0</b></span>
                <span style="color:#9aa1b8;">❓ 受限/未知 <b id="idxStatUncertain">0</b></span>
              </div>
              <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="idx-filter-btn active" data-filter="all" style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(201,161,91,0.5);background:rgba(201,161,91,0.85);color:#1a1509;cursor:pointer;">全部</button>
                <button type="button" class="idx-filter-btn" data-filter="indexed" style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);color:#c9c3b4;cursor:pointer;">✅ 已收录</button>
                <button type="button" class="idx-filter-btn" data-filter="not_indexed" style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);color:#c9c3b4;cursor:pointer;">❌ 未收录</button>
                <button type="button" class="idx-filter-btn" data-filter="problem" style="font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.03);color:#c9c3b4;cursor:pointer;">⚠️ 有问题</button>
              </div>
            </div>

            <!-- 结果表格 -->
            <div id="idxResults" style="margin-top:16px;display:none;">
              <div style="overflow:auto;max-height:600px;border:1px solid var(--border);border-radius:12px;">
                <table id="idxTable" style="width:100%;border-collapse:collapse;font-size:12px;min-width:1000px;">
                  <thead><tr style="background:rgba(52,211,153,0.08);position:sticky;top:0;z-index:1;">
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;width:36px;">#</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;min-width:220px;">URL</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:80px;">综合判定</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:70px;">Google</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:70px;">Bing</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:60px;">HTTP</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:70px;">可索引</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;font-weight:700;width:70px;">robots</th>
                    <th style="padding:10px 8px;border-bottom:1px solid var(--border);text-align:left;font-weight:700;min-width:180px;">问题 / 备注</th>
                  </tr></thead>
                  <tbody id="idxTableBody"></tbody>
                </table>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>
    </div>

  </main>

  <!-- Auth system -->
  

  

  

  <!-- ===== SEO Tools Extension Script ===== -->`;

export default function HomePage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: bodyHTML }} />
  );
}