(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-582QBDMV');

// 全局辅助函数：给需要登录才能调用的接口（fetch-page / check-url / check-index）
  // 自动附加 Authorization 头，避免每处手写 token 读取逻辑。
  window.authHeaders = function authHeaders() {
    const token = sessionStorage.getItem('blh_auth_token') || localStorage.getItem('blh_auth_token');
    return token ? { Authorization: 'Bearer ' + token } : {};
  };

(function initAuth() {
    const AUTH_TOKEN_KEY = 'blh_auth_token';
    const authModal = document.getElementById('authModal');
    const authUserBar = document.getElementById('authUserBar');

    // Hide/show sections based on user's allowed sections list
    // Reads data-section attributes from the DOM — no hardcoded mapping needed
    function applyPerms(sections) {
      const s = sections || [];
      const isAll = s.includes('__all__');
      document.querySelectorAll('[data-section]').forEach(el => {
        const name = el.getAttribute('data-section');
        el.style.display = (isAll || s.includes(name)) ? '' : 'none';
      });
    }

    function hideAllSections() {
      document.querySelectorAll('[data-section]').forEach(el => { el.style.display = 'none'; });
    }

    function showUserBar(username, sections) {
      document.getElementById('authUserLabel').textContent = username;
      const badge = document.getElementById('authRoleBadge');
      const isAll = (sections || []).includes('__all__');
      if (isAll) {
        badge.textContent = '管理员'; badge.style.background = 'rgba(201,161,91,0.18)'; badge.style.color = '#c9a15b';
      } else if (sections && sections.length) {
        badge.textContent = sections.join(', '); badge.style.background = 'rgba(255,255,255,0.06)'; badge.style.color = '#c9c3b4';
      } else {
        badge.textContent = '基础'; badge.style.background = 'rgba(255,255,255,0.04)'; badge.style.color = '#9aa1b8';
      }
      authUserBar.style.display = 'block';
    }

    function showLogin() { authModal.style.display = 'flex'; hideAllSections(); }
    function hideLogin() { authModal.style.display = 'none'; }

    async function checkAuthStatus() {
      try {
        const resp = await fetch('/api/auth?action=status');
        const data = await resp.json();
        if (!data.authEnabled) { hideLogin(); return; }
      } catch { hideLogin(); return; }

      const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        try {
          const resp = await fetch('/api/auth?action=verify&token=' + encodeURIComponent(token));
          const data = await resp.json();
          if (data.success) {
            hideLogin();
            applyPerms(data.sections);
            showUserBar(data.username, data.sections);
            return;
          }
        } catch {}
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      showLogin();
    }

    document.getElementById('authLoginBtn').addEventListener('click', async () => {
      const user = document.getElementById('authUser').value.trim();
      const pass = document.getElementById('authPass').value;
      const errEl = document.getElementById('authError');
      errEl.textContent = '';
      if (!user || !pass) { errEl.textContent = '请输入用户名和密码'; return; }
      const btn = document.getElementById('authLoginBtn');
      btn.disabled = true; btn.textContent = '登录中…';
      try {
        const resp = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({user,pass}) });
        const data = await resp.json();
        if (data.success) {
          sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
          hideLogin();
          applyPerms(data.sections);
          showUserBar(data.username, data.sections);
          document.getElementById('authPass').value = '';
        } else { errEl.textContent = data.error || '登录失败'; }
      } catch { errEl.textContent = '网络错误，请重试'; }
      btn.disabled = false; btn.textContent = '登 录';
    });

    document.getElementById('authPass').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('authLoginBtn').click(); });
    document.getElementById('authUser').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('authPass').focus(); });

    document.getElementById('authLogoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      authUserBar.style.display = 'none';
      showLogin();
      document.getElementById('authUser').value = '';
      document.getElementById('authPass').value = '';
    });

    checkAuthStatus();
  })();

const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const tableBody = document.getElementById('tableBody');
    const statusEl = document.getElementById('status');
    const summaryEl = document.getElementById('summary');
    const applyMetaBtn = document.getElementById('applyMetaBtn');
    const stripHashBtn = document.getElementById('stripHashBtn');
    const applyBulkUrlsBtn = document.getElementById('applyBulkUrlsBtn');
    const clearBulkUrlsBtn = document.getElementById('clearBulkUrlsBtn');
    const applyAuthorityMapBtn = document.getElementById('applyAuthorityMapBtn');
    const clearAuthorityMapBtn = document.getElementById('clearAuthorityMapBtn');
    const sourcePageUrlsEl = document.getElementById('sourcePageUrls');
    const extractFromUrlsBtn = document.getElementById('extractFromUrlsBtn');
    const clearSourceUrlsBtn = document.getElementById('clearSourceUrlsBtn');
    const urlLogPanel = document.getElementById('urlLogPanel');
    const urlLogSummary = document.getElementById('urlLogSummary');
    const urlLogList = document.getElementById('urlLogList');
    const urlProgressBar = document.getElementById('urlProgressBar');
    const clearUrlLogBtn = document.getElementById('clearUrlLogBtn');
    const urlLinkScopeEl = document.getElementById('urlLinkScope');
    const skipNavigationLinksEl = document.getElementById('skipNavigationLinks');
    const targetDomainFilterEl = document.getElementById('targetDomainFilter');
    const failedPlaceholderRowsEl = document.getElementById('failedPlaceholderRows');
    const urlConcurrencyChoicesEl = document.getElementById('urlConcurrencyChoices');
    const bulkPublishedUrlsEl = document.getElementById('bulkPublishedUrls');
    const domainAuthorityMapEl = document.getElementById('domainAuthorityMap');
    const projectTitleHeader = document.getElementById('projectTitleHeader');
    const projectBaseNameEl = document.getElementById('projectBaseName');
    const projectYearEl = document.getElementById('projectYear');
    const projectMonthEl = document.getElementById('projectMonth');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');
    const copyAllVisualBtn = document.getElementById('copyAllVisualBtn');
    const clearBtn = document.getElementById('clearBtn');
    const fileListEl = document.getElementById('fileList');

    let articles = [];
    const DEFAULT_URL_READ_CONCURRENCY = 6;
    const URL_READ_RETRY_COUNT = 1;
    const URL_READ_RETRY_DELAY_MS = 0;
    const URL_API_TIMEOUT_MS = 9000;

    const headers = [
      '外链种类', '序号', '文章标题', 'URL',
      '网站权重', '锚文本', '跳转URL', '是否dofollow'
    ];

    const footerNoteText = '外链的文案内容和品牌、产品高度相关，从站外相关性较高的文章指向目标网站，不仅利于网站权重的积累，还可以向搜索引擎传递关键词信息，对促进目标关键词排名起着重要的作用。另外，文章的文案内容在品牌营销方面起到积极作用。';

    const mammothStyleMap = [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='标题'] => h1:fresh",
      "p[style-name='题目'] => h1:fresh",
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='标题 1'] => h1:fresh",
      "p[style-name='标题1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='标题 2'] => h2:fresh",
      "p[style-name='标题2'] => h2:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "p[style-name='副标题'] => h2:fresh"
    ];

    function setStatus(message, type = '') {
      statusEl.textContent = message;
      statusEl.className = 'status ' + type;
    }

    function escapeHtml(str = '') {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function decodeXml(str = '') {
      return String(str)
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replaceAll('&amp;', '&');
    }

    function normalizeText(str = '') {
      return String(str)
        .replace(/\u00A0/g, ' ')
        .replace(/[ \t\r\n]+/g, ' ')
        .trim();
    }

    function normalizeUrl(url = '') {
      return String(url)
        .trim()
        .replace(/^about:blank/i, '')
        .replace(/\s+/g, '')
        .trim();
    }

    function fileNameWithoutExt(filename = '') {
      return filename.replace(/\.[^.]+$/, '').trim();
    }

    function shouldSkipUrl(url = '') {
      const value = String(url).trim();
      if (!value) return true;
      if (value.startsWith('#')) return true;
      if (/^javascript:/i.test(value)) return true;
      if (/^about:blank#?/i.test(value)) return true;
      return false;
    }

    function dedupeLinks(items) {
      const seen = new Set();
      const output = [];

      for (const item of items) {
        const anchorText = normalizeText(item.anchorText || '');
        const targetUrl = normalizeUrl(item.targetUrl || '');

        if (!anchorText || shouldSkipUrl(targetUrl)) continue;

        const key = `${anchorText.toLowerCase()}||${targetUrl}`;
        if (seen.has(key)) continue;

        seen.add(key);
        output.push({
          anchorText,
          targetUrl,
          source: item.source || 'unknown'
        });
      }

      return output;
    }

    async function fileToArrayBuffer(file) {
      return await file.arrayBuffer();
    }

    async function convertDocxToHtml(arrayBuffer) {
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: mammothStyleMap,
          includeDefaultStyleMap: true,
          ignoreEmptyParagraphs: false,
          convertImage: mammoth.images.inline(async function() {
            return { src: "" };
          })
        }
      );

      return {
        html: result.value || '',
        messages: result.messages || []
      };
    }

    function getTextOfNode(node) {
      return normalizeText(node ? node.textContent || '' : '');
    }

    function hasAnchor(node) {
      return !!(node && node.querySelector && node.querySelector('a[href]'));
    }

    function countWords(text = '') {
      const englishWords = text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) || [];
      const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
      return englishWords.length + Math.ceil(chineseChars.length / 2);
    }

    function hasSentenceEnding(text = '') {
      return /[。！？!?；;.]$/.test(text.trim());
    }

    function normalizeHashTitleText(text = '') {
      return normalizeText(text)
        .replace(/^＃/, '#')
        .replace(/^#\s+/, '#')
        .trim();
    }

    function isHashArticleTitle(text = '') {
      const value = normalizeHashTitleText(text);

      // 支持：
      // #1
      // # 1
      // ＃1
      // #1.
      // #1:
      // #1：Article title
      // #1000 - Article Title
      // 为避免误判，必须出现在段落开头。
      return /^#\d{1,5}(\s*$|[\s.:：、，,-]|[）)]|[．。])/.test(value);
    }

    function extractHashNumber(text = '') {
      const value = normalizeHashTitleText(text);
      const match = value.match(/^#(\d{1,5})/);
      return match ? Number(match[1]) : null;
    }

    function stripHashNumberFromTitle(title = '') {
      const normalized = normalizeHashTitleText(title);

      // 清理示例：
      // #1 -> ''
      // #1. Article Title -> Article Title
      // #1：Article Title -> Article Title
      // #1000 - Article Title -> Article Title
      // # 12、标题 -> 标题
      return normalized
        .replace(/^#\d{1,5}\s*([.:：、，,\-–—）)．。])?\s*/, '')
        .trim();
    }

    function getDisplayTitleAfterStrip(article) {
      const stripped = stripHashNumberFromTitle(article.title);
      // 如果标题只有 #1 这种编号，去除后为空；为了避免空标题，保留文件名+篇序号作为兜底。
      return stripped || `${fileNameWithoutExt(article.fileName) || '未命名文件'} - 文章${article.articleIndexInFile}`;
    }

    function looksLikeTitleCase(text = '') {
      const words = text.match(/[A-Za-z][A-Za-z0-9'-]*/g) || [];
      if (words.length < 3) return false;

      const ignored = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'with', 'by']);
      let titleish = 0;
      let checked = 0;

      for (const word of words) {
        const lower = word.toLowerCase();
        if (ignored.has(lower)) continue;
        checked += 1;
        if (/^[A-Z0-9]/.test(word)) titleish += 1;
      }

      return checked >= 3 && titleish / checked >= 0.6;
    }

    function looksLikeNumberedTitle(text = '') {
      return /^(\d+[\.\)、)]|[一二三四五六七八九十]+[、.．]|chapter\s+\d+|article\s+\d+)/i.test(text.trim());
    }

    function looksLikeChineseTitle(text = '') {
      const trimmed = text.trim();
      const chineseChars = (trimmed.match(/[\u4e00-\u9fa5]/g) || []).length;
      if (chineseChars < 4) return false;
      if (trimmed.length > 80) return false;
      if (hasSentenceEnding(trimmed)) return false;
      return true;
    }

    function isLikelyTitleNode(node, options = {}) {
      const mode = options.mode || 'auto';
      const minTitleLength = Number(options.minTitleLength || 2);
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      const text = getTextOfNode(node);

      if (!text) return false;
      if (text.length < minTitleLength) return false;
      if (hasAnchor(node)) return false;
      if (/^(https?:\/\/|www\.)/i.test(text)) return false;
      if (/^by\s+|^author\s*[:：]|^date\s*[:：]/i.test(text)) return false;

      // #编号是最高优先级，无论是否应用标题样式，都作为文章标题。
      if (isHashArticleTitle(text)) return true;

      if (tag === 'h1' || tag === 'h2') return true;
      if (mode === 'headings' || mode === 'hash') return false;

      if (!['p', 'div', 'h3'].includes(tag)) return false;
      if (text.length > 150) return false;
      if (countWords(text) > 22) return false;

      const strongLike =
        node.querySelector &&
        node.children.length > 0 &&
        Array.from(node.children).some(child => ['strong', 'b'].includes(child.tagName.toLowerCase()));

      if (looksLikeNumberedTitle(text)) return true;
      if (looksLikeTitleCase(text) && !hasSentenceEnding(text)) return true;
      if (looksLikeChineseTitle(text)) return true;
      if (strongLike && !hasSentenceEnding(text) && countWords(text) <= 18) return true;

      return false;
    }

    function parseLinksFromContainer(container) {
      const anchors = Array.from(container.querySelectorAll('a[href]'));

      return dedupeLinks(anchors.map(a => {
        const rawHref = a.getAttribute('href') || '';
        const text = normalizeText(a.textContent || a.getAttribute('title') || rawHref);

        return {
          anchorText: text,
          targetUrl: rawHref,
          source: 'htmlSegmentAnchor'
        };
      }));
    }

    function getFallbackTitleFromContainer(container, fallbackFilename) {
      const heading = container.querySelector('h1, h2, h3');
      const headingText = heading ? getTextOfNode(heading) : '';
      if (headingText && headingText.length <= 160) return headingText;

      const firstMeaningful = Array.from(container.querySelectorAll('p, div'))
        .map(getTextOfNode)
        .find(text => {
          if (!text) return false;
          if (text.length < 2 || text.length > 140) return false;
          if (/^(https?:\/\/|www\.)/i.test(text)) return false;
          return true;
        });

      return firstMeaningful || fileNameWithoutExt(fallbackFilename) || '未识别标题';
    }

    function splitHtmlIntoArticleSegments(html = '', fallbackFilename = '', options = {}) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<main id="doc-root">${html}</main>`, 'text/html');
      const root = doc.getElementById('doc-root');
      const nodes = Array.from(root.children);
      const mode = options.mode || 'hash';

      let titleIndexes = [];

      // #编号强制切分：只认 #1/#2/#1000 这种编号标题。
      // 自动模式：仍然优先找 #编号；如果找不到，再启用通用标题识别。
      const hashIndexes = [];
      nodes.forEach((node, index) => {
        const text = getTextOfNode(node);
        if (isHashArticleTitle(text) && !hasAnchor(node)) {
          hashIndexes.push(index);
        }
      });

      if (mode === 'hash') {
        titleIndexes = hashIndexes;
      } else if (mode === 'auto' && hashIndexes.length) {
        titleIndexes = hashIndexes;
      } else {
        nodes.forEach((node, index) => {
          if (isLikelyTitleNode(node, options)) {
            titleIndexes.push(index);
          }
        });
      }

      if (!titleIndexes.length || mode === 'single') {
        const title = getFallbackTitleFromContainer(root, fallbackFilename);
        return [{
          title,
          hashNumber: extractHashNumber(title),
          nodes,
          links: parseLinksFromContainer(root),
          segmentation: 'single-document'
        }];
      }

      const segments = [];

      titleIndexes.forEach((titleIndex, position) => {
        const nextTitleIndex = titleIndexes[position + 1] ?? nodes.length;
        const titleNode = nodes[titleIndex];
        const rawTitle = getTextOfNode(titleNode) || `${fileNameWithoutExt(fallbackFilename)} - 文章 ${position + 1}`;
        const title = normalizeHashTitleText(rawTitle);
        const hashNumber = extractHashNumber(title);

        const segmentNodes = nodes.slice(titleIndex + 1, nextTitleIndex);
        const segmentContainer = doc.createElement('section');
        segmentNodes.forEach(node => segmentContainer.appendChild(node.cloneNode(true)));

        const titleLinks = parseLinksFromContainer(titleNode);
        const bodyLinks = parseLinksFromContainer(segmentContainer);
        const allLinks = dedupeLinks([...titleLinks, ...bodyLinks]);

        segments.push({
          title,
          hashNumber,
          nodes: segmentNodes,
          links: allLinks,
          segmentation: hashNumber !== null ? 'hash-number-segmented' : 'title-segmented'
        });
      });

      // 对 #编号模式：保留空文章也有意义，因为可以暴露 #17 没有识别到外链。
      // 对自动标题模式：过滤空段，减少误判。
      if (mode === 'hash' || hashIndexes.length) {
        return segments;
      }

      const nonEmptySegments = segments.filter(segment => segment.links.length > 0);

      if (!nonEmptySegments.length) {
        const title = getFallbackTitleFromContainer(root, fallbackFilename);
        return [{
          title,
          hashNumber: extractHashNumber(title),
          nodes,
          links: parseLinksFromContainer(root),
          segmentation: 'single-document-fallback'
        }];
      }

      return nonEmptySegments;
    }

    function parseAttributes(tagOrAttrs = '') {
      const attrs = {};
      const attrRegex = /([\w:.-]+)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(tagOrAttrs)) !== null) {
        attrs[match[1]] = decodeXml(match[2]);
      }
      return attrs;
    }

    function collectTextFromXml(xmlFragment = '') {
      const texts = [];

      const textRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
      let match;
      while ((match = textRegex.exec(xmlFragment)) !== null) {
        texts.push(decodeXml(match[1]));
      }

      if (/<w:tab\b[^>]*\/?>/.test(xmlFragment)) texts.push(' ');
      if (/<w:br\b[^>]*\/?>/.test(xmlFragment)) texts.push(' ');

      return normalizeText(texts.join(''));
    }

    function parseRelationshipTargets(relsXml = '') {
      const map = {};
      if (!relsXml) return map;

      const relationshipRegex = /<Relationship\b[^>]*\/?>/g;
      let match;

      while ((match = relationshipRegex.exec(relsXml)) !== null) {
        const attrs = parseAttributes(match[0]);
        if (attrs.Id && attrs.Target) {
          map[attrs.Id] = {
            target: normalizeUrl(attrs.Target),
            type: attrs.Type || '',
            targetMode: attrs.TargetMode || ''
          };
        }
      }

      return map;
    }

    function parseStandardHyperlinksFromXml(documentXml, relMap) {
      const found = [];
      const hyperlinkRegex = /<w:hyperlink\b([^>]*)>([\s\S]*?)<\/w:hyperlink>/g;
      let match;

      while ((match = hyperlinkRegex.exec(documentXml)) !== null) {
        const attrs = parseAttributes(match[1]);
        const relId = attrs['r:id'] || attrs['id'];
        const anchor = attrs['w:anchor'];
        const tooltip = attrs['w:tooltip'] || '';
        const text = normalizeText(collectTextFromXml(match[2]) || tooltip);

        let url = '';
        if (relId && relMap[relId]) {
          url = relMap[relId].target;
        } else if (anchor) {
          url = '#' + anchor;
        }

        if (text && url) {
          found.push({
            anchorText: text,
            targetUrl: url,
            source: 'xmlStandardHyperlink'
          });
        }
      }

      return found;
    }

    function parseFieldCodeHyperlinksFromXml(documentXml) {
      const found = [];
      const paragraphRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
      let pMatch;

      while ((pMatch = paragraphRegex.exec(documentXml)) !== null) {
        const p = pMatch[0];
        if (!/HYPERLINK/i.test(p)) continue;

        const runs = p.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g) || [];
        let inField = false;
        let afterSeparate = false;
        let instr = '';
        let displayXml = '';
        const fieldGroups = [];

        for (const run of runs) {
          if (/<w:fldChar\b[^>]*w:fldCharType="begin"/.test(run)) {
            inField = true;
            afterSeparate = false;
            instr = '';
            displayXml = '';
            continue;
          }

          if (!inField) continue;

          const instrMatch = run.match(/<w:instrText\b[^>]*>([\s\S]*?)<\/w:instrText>/);
          if (instrMatch) {
            instr += ' ' + decodeXml(instrMatch[1]);
          }

          if (/<w:fldChar\b[^>]*w:fldCharType="separate"/.test(run)) {
            afterSeparate = true;
            continue;
          }

          if (/<w:fldChar\b[^>]*w:fldCharType="end"/.test(run)) {
            fieldGroups.push({ instr, displayXml });
            inField = false;
            afterSeparate = false;
            instr = '';
            displayXml = '';
            continue;
          }

          if (afterSeparate) {
            displayXml += run;
          }
        }

        for (const group of fieldGroups) {
          const urlMatch =
            group.instr.match(/HYPERLINK\s+["']([^"']+)["']/i) ||
            group.instr.match(/HYPERLINK\s+([^\s\\]+)/i);

          if (!urlMatch) continue;

          const url = normalizeUrl(urlMatch[1]);
          const text = normalizeText(collectTextFromXml(group.displayXml));

          if (text && url) {
            found.push({
              anchorText: text,
              targetUrl: url,
              source: 'xmlFieldCodeHyperlink'
            });
          }
        }
      }

      return found;
    }

    async function fallbackExtractLinksFromXml(arrayBuffer) {
      const zip = await JSZip.loadAsync(arrayBuffer.slice(0));
      const documentFile = zip.file('word/document.xml');
      const relsFile = zip.file('word/_rels/document.xml.rels');

      if (!documentFile) return [];

      const documentXml = await documentFile.async('string');
      const relsXml = relsFile ? await relsFile.async('string') : '';
      const relMap = parseRelationshipTargets(relsXml);

      return dedupeLinks([
        ...parseStandardHyperlinksFromXml(documentXml, relMap),
        ...parseFieldCodeHyperlinksFromXml(documentXml)
      ]);
    }


    function ensureAbsoluteUrl(url = '') {
      const value = String(url).trim();
      if (!value) return '';
      if (/^https?:\/\//i.test(value)) return value;
      if (/^\/\//.test(value)) return 'https:' + value;
      return 'https://' + value;
    }

    function parseSourcePageUrls(text = '') {
      return String(text)
        .split(/\r?\n/)
        .map(line => ensureAbsoluteUrl(line.trim()))
        .filter(Boolean);
    }

    function resolveHref(rawHref = '', baseUrl = '') {
      const href = String(rawHref || '').trim();
      if (!href) return '';
      if (/^(javascript:|mailto:|tel:|data:|blob:|sms:|weixin:)/i.test(href)) return '';
      if (href.startsWith('#')) return '';

      try {
        return new URL(href, baseUrl).href;
      } catch (error) {
        return normalizeUrl(href);
      }
    }

    function getReadableAnchorText(anchor, href = '') {
      const directText = normalizeText(anchor.textContent || '');
      if (directText) return directText;

      const aria = normalizeText(anchor.getAttribute('aria-label') || anchor.getAttribute('title') || '');
      if (aria) return aria;

      const img = anchor.querySelector && anchor.querySelector('img');
      const imgText = img ? normalizeText(img.getAttribute('alt') || img.getAttribute('title') || '') : '';
      if (imgText) return imgText;

      return href;
    }

    function isInsideSkippedArea(anchor) {
      if (!skipNavigationLinksEl || !skipNavigationLinksEl.checked) return false;
      return !!anchor.closest('nav, footer, aside, header, .nav, .navbar, .menu, .footer, .sidebar, .breadcrumb, [role="navigation"], [role="banner"], [role="contentinfo"]');
    }

    function isExternalUrl(targetUrl = '', pageUrl = '') {
      try {
        const target = new URL(targetUrl);
        const page = new URL(pageUrl);
        return normalizeDomain(target.hostname) !== normalizeDomain(page.hostname);
      } catch (error) {
        return false;
      }
    }

    function parseTargetDomains(text = '') {
      return String(text)
        .split(/\r?\n|[,，;；|]/)
        .map(item => normalizeDomain(item))
        .filter(Boolean);
    }

    function isUrlMatchedTargetDomains(url = '', domains = []) {
      if (!domains.length) return true;

      const urlDomain = extractDomainFromUrl(url);
      if (!urlDomain) return false;

      return domains.some(domain => {
        const cleanDomain = normalizeDomain(domain);
        if (!cleanDomain) return false;
        return urlDomain === cleanDomain || urlDomain.endsWith('.' + cleanDomain);
      });
    }

    function filterLinksByTargetDomains(links = [], domains = []) {
      if (!domains.length) return { links, removedCount: 0 };

      const filtered = links.filter(link => isUrlMatchedTargetDomains(link.targetUrl, domains));
      return {
        links: filtered,
        removedCount: Math.max(0, links.length - filtered.length)
      };
    }

    function getTargetDomainSummary(domains = []) {
      if (!domains.length) return '未启用目标域名过滤';
      return `目标域名：${domains.join('、')}`;
    }

    function getFailedPlaceholderRowCount() {
      const value = Number(failedPlaceholderRowsEl ? failedPlaceholderRowsEl.value : 3);
      if (!Number.isFinite(value)) return 3;
      return Math.min(5, Math.max(1, Math.floor(value)));
    }

    function getUrlReadConcurrency() {
      const checked = urlConcurrencyChoicesEl ? urlConcurrencyChoicesEl.querySelector('input[name="urlReadConcurrency"]:checked') : null;
      const value = Number(checked ? checked.value : DEFAULT_URL_READ_CONCURRENCY);
      if (!Number.isFinite(value)) return DEFAULT_URL_READ_CONCURRENCY;
      return Math.min(12, Math.max(1, Math.floor(value)));
    }

    function ensureArticleLink(article, linkIndex) {
      if (!article || Number.isNaN(linkIndex) || linkIndex < 0) return null;
      if (!Array.isArray(article.links)) article.links = [];
      while (article.links.length <= linkIndex) {
        article.links.push({ anchorText: '', targetUrl: '', source: 'manualPlaceholder' });
      }
      return article.links[linkIndex];
    }

    function isManualPlaceholderArticle(article) {
      return !!(article && article.keepEmptyRow && Number(article.manualPlaceholderRows || 0) > 0);
    }

    function getContentRoot(doc) {
      return doc.querySelector('article') ||
        doc.querySelector('main') ||
        doc.querySelector('[role="main"]') ||
        doc.querySelector('.content, .post-content, .entry-content, .article-content, .page-content, #content, #main') ||
        doc.body || doc;
    }

    function extractTitleFromPage(doc, fallbackUrl = '') {
      const candidates = [
        doc.querySelector('h1'),
        doc.querySelector('meta[property="og:title"]'),
        doc.querySelector('meta[name="twitter:title"]'),
        doc.querySelector('title')
      ];

      for (const item of candidates) {
        if (!item) continue;
        const value = normalizeText(item.getAttribute && item.getAttribute('content') || item.textContent || '');
        if (value) return value.replace(/\s*[|｜-]\s*[^|｜-]{2,60}$/g, '').trim() || value;
      }

      try {
        const parsed = new URL(fallbackUrl);
        const slug = decodeURIComponent(parsed.pathname.replace(/^\/+|\/+$/g, '').split('/').pop() || '');
        return slug.replace(/[-_]+/g, ' ') || parsed.hostname || 'URL 页面';
      } catch (error) {
        return fallbackUrl || 'URL 页面';
      }
    }

    function extractLinksFromMarkdown(markdown = '', pageUrl = '') {
      const found = [];
      const regex = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
      let match;
      while ((match = regex.exec(String(markdown || ''))) !== null) {
        const text = normalizeText(match[1]);
        const href = resolveHref(match[2], pageUrl);
        if (text && href) {
          found.push({ anchorText: text, targetUrl: href, source: 'urlPageMarkdownLink' });
        }
      }
      return dedupeLinks(found);
    }

    function extractLinksFromPageHtml(html = '', pageUrl = '', options = {}) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(html || ''), 'text/html');
      const title = extractTitleFromPage(doc, pageUrl);
      const scope = options.scope || (urlLinkScopeEl ? urlLinkScopeEl.value : 'content');
      const root = scope === 'all' || scope === 'external' ? doc : getContentRoot(doc);
      const anchors = Array.from(root.querySelectorAll('a[href]'));

      const links = dedupeLinks(anchors.map(anchor => {
        if (isInsideSkippedArea(anchor)) return null;
        const href = resolveHref(anchor.getAttribute('href') || '', pageUrl);
        if (!href || shouldSkipUrl(href)) return null;
        if (scope === 'external' && !isExternalUrl(href, pageUrl)) return null;

        const text = getReadableAnchorText(anchor, href);
        return {
          anchorText: text,
          targetUrl: href,
          source: 'urlPageAnchor'
        };
      }).filter(Boolean));

      return { title, links, scannedAnchors: anchors.length };
    }

    function resetUrlLog(total = 0, scopeText = '') {
      if (!urlLogPanel || !urlLogSummary || !urlLogList || !urlProgressBar) return;
      urlLogPanel.classList.add('show');
      urlLogSummary.textContent = total ? `准备读取 ${total} 个页面。读取范围：${scopeText}；并发数：${Math.min(getUrlReadConcurrency(), total)}；反爬/超时快速跳过` : '等待读取。';
      urlLogList.innerHTML = '';
      urlProgressBar.style.width = '0%';
    }

    function appendUrlLog(message, type = 'warn') {
      if (!urlLogPanel || !urlLogList) return;
      urlLogPanel.classList.add('show');
      const item = document.createElement('div');
      item.className = `url-log-item ${type}`;
      item.textContent = message;
      urlLogList.appendChild(item);
      urlLogList.scrollTop = urlLogList.scrollHeight;
    }

    function updateUrlLogProgress(done, total, summaryText = '') {
      if (urlProgressBar && total) {
        urlProgressBar.style.width = `${Math.round((done / total) * 100)}%`;
      }
      if (urlLogSummary && summaryText) {
        urlLogSummary.textContent = summaryText;
      }
    }

    async function fetchPageHtml(url) {
      const finalUrl = ensureAbsoluteUrl(url);
      const apiUrl = `${window.location.origin}/api/fetch-page?url=${encodeURIComponent(finalUrl)}&fast=1`;
      const errors = [];

      if (location.protocol === 'http:' || location.protocol === 'https:') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), URL_API_TIMEOUT_MS);

        try {
          const response = await fetch(apiUrl, {
            cache: 'no-store',
            signal: controller.signal,
            headers: { Accept: 'application/json', ...window.authHeaders() }
          });

          const rawText = await response.text();
          let data = null;
          try {
            data = JSON.parse(rawText);
          } catch (parseError) {
            data = null;
          }

          if (response.ok && data) {
            if (data.success === true && Array.isArray(data.links)) {
              return {
                html: data.html || '',
                links: dedupeLinks(data.links.map(link => ({
                  anchorText: link.anchorText || link.text || '',
                  targetUrl: link.targetUrl || link.href || link.url || '',
                  source: link.source || 'vercelApiLink'
                }))),
                title: data.title || data.pageTitle || '',
                finalUrl: data.finalUrl || data.url || finalUrl,
                via: data.via || 'vercel-api-links',
                contentType: data.contentType || '',
                isMarkdown: false,
                warnings: data.warnings || [],
                scannedAnchors: data.scannedAnchors || data.totalAnchors || data.linkCount || 0
              };
            }

            if (data.success !== false && (data.html || data.text)) {
              return {
                html: data.html || data.text || '',
                finalUrl: data.finalUrl || data.url || finalUrl,
                via: data.via || 'vercel-api-html',
                contentType: data.contentType || '',
                isMarkdown: !!data.isMarkdown,
                warnings: data.warnings || []
              };
            }

            const message = data.error || data.message || `API HTTP ${response.status}`;
            const fastError = new Error(message);
            fastError.blocked = !!data.blocked;
            fastError.statusCode = data.statusCode || data.httpStatus || null;
            throw fastError;
          }

          throw new Error(`API HTTP ${response.status}${rawText ? `：${rawText.slice(0, 120)}` : ''}`);
        } catch (error) {
          if (error && error.name === 'AbortError') {
            errors.push(`API ${Math.round(URL_API_TIMEOUT_MS / 1000)} 秒超时，已快速跳过`);
          } else {
            errors.push(error.message || 'API请求失败');
          }
        } finally {
          clearTimeout(timer);
        }
      } else {
        errors.push('当前不是 http/https 页面，无法调用 Vercel API');
      }

      // 线上使用时不再做浏览器直连兜底：多数站点会 CORS 失败，反而拖慢整批读取。
      // 读取失败会保留表格空行，方便后续手动补充。
      throw new Error(errors.join('；') || '读取失败');
    }

    async function runUrlReadQueue(items, worker, concurrency = getUrlReadConcurrency()) {
      const results = new Array(items.length);
      let nextIndex = 0;
      let completed = 0;

      async function runner() {
        while (nextIndex < items.length) {
          const index = nextIndex;
          nextIndex += 1;

          try {
            results[index] = await worker(items[index], index);
          } catch (error) {
            results[index] = {
              success: false,
              error
            };
          } finally {
            completed += 1;
            updateUrlLogProgress(
              completed,
              items.length,
              `已完成 ${completed}/${items.length} 个页面读取。并发数：${Math.min(concurrency, items.length)}`
            );
          }
        }
      }

      const runnerCount = Math.min(Math.max(1, concurrency), items.length);
      await Promise.all(Array.from({ length: runnerCount }, () => runner()));
      return results;
    }

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isRetryableUrlError(error) {
      const message = String(error && error.message || error || '');
      return /HTTP\s*(401|403|429|500|502|503|504)|请求超时|timeout|network|fetch/i.test(message);
    }

    function getFriendlyUrlError(error) {
      const message = String(error && error.message || error || '读取失败');
      if (/HTTP\s*401|HTTP 401|目标页面 HTTP 401/i.test(message)) {
        return '目标站启用了人机验证/访问校验（HTTP 401）。浏览器等待几秒能打开，是因为浏览器执行了验证脚本并拿到临时 Cookie；工具的服务端请求无法完成这种验证。';
      }
      if (/HTTP\s*403|HTTP 403|目标页面 HTTP 403/i.test(message)) {
        return '目标站拒绝服务端访问（HTTP 403），通常是反爬或访问权限限制。';
      }
      if (/HTTP\s*429|HTTP 429/i.test(message)) {
        return '目标站触发限流（HTTP 429），建议降低并发或稍后重试。';
      }
      if (/Cloudflare|Just a moment|Checking your browser|反爬|人机验证/i.test(message)) {
        return '目标站启用了 Cloudflare/人机验证，普通服务端读取无法通过。';
      }
      return message;
    }

    async function fetchPageHtmlWithRetry(url, logIndex, total) {
      let lastError = null;

      for (let attempt = 1; attempt <= URL_READ_RETRY_COUNT; attempt += 1) {
        try {
          return await fetchPageHtml(url);
        } catch (error) {
          lastError = error;
          const friendly = getFriendlyUrlError(error);
          const retryable = isRetryableUrlError(error);

          if (attempt < URL_READ_RETRY_COUNT && retryable) {
            appendUrlLog(`↻ ${logIndex}/${total}. ${url}：第 ${attempt} 次读取失败，立即重试。原因：${friendly}`, 'warn');
            if (URL_READ_RETRY_DELAY_MS > 0) await sleep(URL_READ_RETRY_DELAY_MS);
            continue;
          }

          const finalError = new Error(friendly);
          finalError.originalMessage = String(error && error.message || error || '');
          throw finalError;
        }
      }

      throw lastError || new Error('读取失败');
    }

    async function extractSingleArticleFromUrl(url, index, total, targetDomains) {
      const current = index + 1;
      appendUrlLog(`⏳ ${current}. 开始读取：${url}`, 'warn');

      try {
        const fetched = await fetchPageHtmlWithRetry(url, current, total);
        const parsed = Array.isArray(fetched.links)
          ? {
              title: fetched.title || extractTitleFromPage(new DOMParser().parseFromString('', 'text/html'), fetched.finalUrl || url),
              links: fetched.links,
              scannedAnchors: fetched.scannedAnchors || fetched.links.length
            }
          : fetched.isMarkdown
            ? { title: extractTitleFromPage(new DOMParser().parseFromString('', 'text/html'), fetched.finalUrl || url), links: extractLinksFromMarkdown(fetched.html, fetched.finalUrl || url), scannedAnchors: 0 }
            : extractLinksFromPageHtml(fetched.html, fetched.finalUrl || url, { scope: urlLinkScopeEl ? urlLinkScopeEl.value : 'content' });

        const originalLinkCount = parsed.links.length;
        const domainFilterResult = filterLinksByTargetDomains(parsed.links, targetDomains);
        parsed.links = domainFilterResult.links;

        const article = {
          fileName: fetched.finalUrl || url,
          articleIndexInFile: 1,
          hashNumber: null,
          title: parsed.title,
          links: parsed.links,
          source: 'urlReader',
          segmentation: 'url-page',
          customPublishedUrl: fetched.finalUrl || url,
          customAuthority: getAuthorityForUrl(fetched.finalUrl || url),
          keepEmptyRow: true,
          manualPlaceholderRows: parsed.links.length ? 0 : getFailedPlaceholderRowCount(),
          warningCount: 0,
          messages: []
        };

        const filterText = targetDomains.length ? `，域名过滤 ${originalLinkCount} → ${parsed.links.length}` : '';
        const logLine = `✅ ${current}/${total}. ${fetched.finalUrl || url}：识别到 ${parsed.links.length} 条链接（${fetched.via}${parsed.scannedAnchors ? `，扫描 ${parsed.scannedAnchors} 个链接` : ''}${filterText}）`;
        appendUrlLog(logLine, parsed.links.length ? 'ok' : 'warn');
        if (!targetDomains.length && parsed.links.length > 100) {
          appendUrlLog(`⚠ ${current}/${total}. 该页面链接数量异常偏多（${parsed.links.length} 条）。建议填写"客户网址"，只保留目标站外链。`, 'warn');
        }

        return {
          success: true,
          article,
          logLine,
          removedByDomain: domainFilterResult.removedCount
        };
      } catch (error) {
        const article = {
          fileName: url,
          articleIndexInFile: 1,
          hashNumber: null,
          title: '',
          links: [],
          source: 'urlReaderFailed',
          segmentation: 'url-page-failed',
          customPublishedUrl: url,
          customAuthority: getAuthorityForUrl(url),
          keepEmptyRow: true,
          manualPlaceholderRows: getFailedPlaceholderRowCount(),
          warningCount: 1,
          messages: [{ type: 'error', message: error.message }]
        };

        const logLine = `❌ ${current}/${total}. ${url}：读取失败，${error.message}`;
        appendUrlLog(logLine, 'fail');

        return {
          success: false,
          article,
          logLine,
          removedByDomain: 0
        };
      }
    }

    async function extractArticlesFromUrls(urls) {
      const total = urls.length;
      const targetDomains = parseTargetDomains(targetDomainFilterEl ? targetDomainFilterEl.value : '');
      const concurrency = Math.min(getUrlReadConcurrency(), total);

      updateUrlLogProgress(0, total, `正在快速读取 ${total} 个页面，并发数：${concurrency}。反爬或超时页面会快速保留空行。`);

      const results = await runUrlReadQueue(
        urls,
        (url, index) => extractSingleArticleFromUrl(url, index, total, targetDomains),
        concurrency
      );

      const extracted = results.map(result => result.article).filter(Boolean);
      const logs = results.map(result => result.logLine).filter(Boolean);
      const totalRemovedByDomain = results.reduce((sum, result) => sum + (result.removedByDomain || 0), 0);

      return { articles: extracted, logs, targetDomains, totalRemovedByDomain };
    }

    async function handleSourceUrls() {
      const urls = parseSourcePageUrls(sourcePageUrlsEl.value);

      if (!urls.length) {
        setStatus('请先粘贴一个或多个页面 URL，每行一个。', 'warn');
        return;
      }

      extractFromUrlsBtn.disabled = true;
      const scopeText = urlLinkScopeEl ? urlLinkScopeEl.selectedOptions[0].textContent : '优先正文区域';
      const targetDomains = parseTargetDomains(targetDomainFilterEl ? targetDomainFilterEl.value : '');
      resetUrlLog(urls.length, `${scopeText}；${getTargetDomainSummary(targetDomains)}`);
      setStatus(`正在读取 ${urls.length} 个页面...`);

      const result = await extractArticlesFromUrls(urls);
      articles = result.articles;
      renderTable();

      const totalLinks = articles.reduce((sum, article) => sum + article.links.length, 0);
      const failedCount = articles.filter(article => article.source === 'urlReaderFailed').length;
      const statusType = totalLinks && !failedCount ? 'ok' : failedCount ? 'warn' : 'warn';

      const filterSummary = result.targetDomains && result.targetDomains.length
        ? `已启用目标域名过滤，过滤掉 ${result.totalRemovedByDomain || 0} 条非目标域名链接。`
        : '';
      const finalSummary = `URL 读取完成：共 ${articles.length} 个页面，识别到 ${totalLinks} 条链接。${filterSummary}${failedCount ? `其中 ${failedCount} 个页面已快速跳过并保留空行，请手动补充。` : ''}`;
      updateUrlLogProgress(articles.length, articles.length, finalSummary);
      setStatus(finalSummary, statusType);

      extractFromUrlsBtn.disabled = false;
    }

    async function extractArticlesFromDocx(file) {
      const arrayBuffer = await fileToArrayBuffer(file);
      const segmentMode = document.getElementById('segmentMode').value;
      const minTitleLength = Number(document.getElementById('minTitleLength').value || 2);

      let html = '';
      let messages = [];
      let segments = [];
      let source = 'html-segmented';

      try {
        const converted = await convertDocxToHtml(arrayBuffer.slice(0));
        html = converted.html;
        messages = converted.messages;

        segments = splitHtmlIntoArticleSegments(html, file.name, {
          mode: segmentMode,
          minTitleLength
        });
      } catch (error) {
        messages.push({
          type: 'error',
          message: `HTML 转换失败：${error.message}`
        });
      }

      let extracted = segments.map((segment, index) => ({
        fileName: file.name,
        articleIndexInFile: index + 1,
        hashNumber: segment.hashNumber,
        title: segment.title,
        links: segment.links,
        source,
        segmentation: segment.segmentation,
        warningCount: messages.length,
        messages
      }));

      const totalHtmlLinks = extracted.reduce((sum, article) => sum + article.links.length, 0);

      if (!totalHtmlLinks && segmentMode !== 'hash') {
        const fallbackLinks = await fallbackExtractLinksFromXml(arrayBuffer.slice(0));
        extracted = [{
          fileName: file.name,
          articleIndexInFile: 1,
          hashNumber: null,
          title: fileNameWithoutExt(file.name) || '未识别标题',
          links: fallbackLinks,
          source: fallbackLinks.length ? 'xmlFallback' : 'none',
          segmentation: 'xml-whole-document-fallback',
          warningCount: messages.length,
          messages
        }];
      }

      // 如果 #编号切分出了文章但都没链接，仍然保留这些编号文章，方便检查是否某些编号段落没有外链。
      return extracted;
    }

    function makeRowsForArticle(article, globalArticleIndex) {
      const linkType = document.getElementById('linkType').value;
      const pageUrl = document.getElementById('pageUrl').value.trim();
      const dofollowValue = document.getElementById('dofollowValue').value;
      const baseRow = {
        articleId: `${globalArticleIndex}-${article.fileName}-${article.articleIndexInFile}`,
        fileName: article.fileName,
        '外链种类': article.customLinkType || linkType,
        '序号': article.customSequence || String(globalArticleIndex + 1),
        '文章标题': article.title || '',
        'URL': article.customPublishedUrl || pageUrl,
        '网站权重': article.customAuthority || "",
        '是否dofollow': article.customDofollow || dofollowValue
      };

      if (isManualPlaceholderArticle(article)) {
        const placeholderRows = Math.max(Number(article.manualPlaceholderRows || 0), article.links.length || 0);
        return Array.from({ length: placeholderRows }, (_, linkIndex) => {
          const link = article.links[linkIndex] || { anchorText: '', targetUrl: '' };
          return {
            ...baseRow,
            isPlaceholderRow: !link.anchorText && !link.targetUrl,
            '锚文本': link.anchorText || '',
            '跳转URL': link.targetUrl || ''
          };
        });
      }

      if (!article.links.length && article.keepEmptyRow) {
        return [{
          ...baseRow,
          isPlaceholderRow: true,
          '锚文本': '',
          '跳转URL': ''
        }];
      }

      return article.links.map((link) => ({
        ...baseRow,
        '锚文本': link.anchorText,
        '跳转URL': link.targetUrl
      }));
    }

    function flattenRows() {
      const rows = [];
      articles.forEach((article, articleIndex) => {
        rows.push(...makeRowsForArticle(article, articleIndex));
      });
      return rows;
    }

    function renderFileList(files) {
      const fileNames = Array.from(files || []).map(file => file.name);

      if (!fileNames.length) {
        fileListEl.style.display = 'none';
        fileListEl.innerHTML = '';
        return;
      }

      fileListEl.style.display = 'block';
      fileListEl.innerHTML = fileNames.map(name => `<div>${escapeHtml(name)}</div>`).join('');
    }

    function renderTable() {
      const rows = flattenRows();
      projectTitleHeader.textContent = getProjectTitle();

      if (!rows.length) {
        const emptyArticleCount = articles.length;
        tableBody.innerHTML = `
          <tr>
            <td colspan="8">
              <div class="empty-state">
                ${emptyArticleCount ? `已识别到 ${emptyArticleCount} 篇文章，但未识别到外链。` : '暂无识别结果。'}
              </div>
            </td>
          </tr>
        `;
      } else {
        let html = '';

        articles.forEach((article, articleIndex) => {
          const articleRows = makeRowsForArticle(article, articleIndex);
          const rowspan = Math.max(articleRows.length, 1);

          if (!articleRows.length) {
            return;
          }

          articleRows.forEach((row, linkIndex) => {
            html += '<tr>';

            if (linkIndex === 0) {
              html += `<td rowspan="${rowspan}" contenteditable="true" class="merged-link-type" data-article="${articleIndex}" data-link-type="true">${escapeHtml(row['外链种类'])}</td>`;
            }

            if (linkIndex === 0) {
              html += `<td rowspan="${rowspan}" contenteditable="true" class="merged-sequence" data-article="${articleIndex}" data-sequence="true">${escapeHtml(row['序号'])}</td>`;
            }

            if (linkIndex === 0) {
              html += `<td rowspan="${rowspan}" contenteditable="true" class="merged-title" data-article="${articleIndex}" data-title="true">${escapeHtml(article.title)}</td>`;
            }

            if (linkIndex === 0) {
              html += `<td rowspan="${rowspan}" contenteditable="true" class="url-cell merged-url" data-article="${articleIndex}" data-published-url="true">${escapeHtml(row['URL'])}</td>`;
            }

            if (linkIndex === 0) {
              html += `<td rowspan="${rowspan}" contenteditable="true" class="merged-authority" data-article="${articleIndex}" data-authority="true">${escapeHtml(row['网站权重'])}</td>`;
            }

            html += `<td contenteditable="true" data-article="${articleIndex}" data-link="${linkIndex}" data-key="锚文本">${escapeHtml(row['锚文本'])}</td>`;
            html += `<td contenteditable="true" class="url-cell" data-article="${articleIndex}" data-link="${linkIndex}" data-key="跳转URL">${escapeHtml(row['跳转URL'])}</td>`;

            if (linkIndex === 0) {
              html += `<td rowspan="${rowspan}" contenteditable="true" class="merged-dofollow" data-article="${articleIndex}" data-dofollow="true">${escapeHtml(row['是否dofollow'])}</td>`;
            }

            html += '</tr>';
          });
        });

        html += `<tr><td colspan="8" class="footer-note-row">${escapeHtml(footerNoteText)}</td></tr>`;
        tableBody.innerHTML = html;
      }

      const articleCount = articles.length;
      const linkCount = articles.reduce((sum, article) => sum + article.links.length, 0);
      const placeholderCount = rows.filter(row => row.isPlaceholderRow).length;
      const hashCount = articles.filter(article => article.segmentation === 'hash-number-segmented').length;
      const fallbackCount = articles.filter(article => article.source === 'xmlFallback').length;
      const modeText = document.getElementById('segmentMode').selectedOptions[0].textContent;

      summaryEl.innerHTML = `
        <span class="pill"><b>${articleCount}</b><em>文章数</em></span>
        <span class="pill"><b>${linkCount}</b><em>已识别外链</em></span>
        <span class="pill"><b>${hashCount}</b><em>#编号文章</em></span>
        <span class="pill"><b>${fallbackCount}</b><em>XML兜底</em></span>
        <span class="pill pill-text"><em>切分方式</em><b class="pill-b-text">${escapeHtml(modeText)}</b></span>
        ${placeholderCount ? `<span class="pill"><b>${placeholderCount}</b><em>待手动补充</em></span>` : ''}
      `;

      applyMetaBtn.disabled = !articles.length;
      stripHashBtn.disabled = !articles.length;
      applyBulkUrlsBtn.disabled = !articles.length;
      applyAuthorityMapBtn.disabled = !articles.length;
      downloadCsvBtn.disabled = !rows.length;
      downloadExcelBtn.disabled = !rows.length;
      copyAllVisualBtn.disabled = !rows.length;
      document.querySelectorAll('.copy-col-btn[data-copy-column]').forEach(button => {
        button.disabled = !rows.length;
      });
      clearBtn.disabled = !articles.length;
    }

    tableBody.addEventListener('input', (event) => {
      const td = event.target.closest('td');
      if (!td) return;

      const articleIndex = Number(td.dataset.article);
      if (Number.isNaN(articleIndex) || !articles[articleIndex]) return;

      if (td.dataset.title === 'true') {
        articles[articleIndex].title = td.textContent.trim();
        return;
      }

      if (td.dataset.sequence === 'true') {
        articles[articleIndex].customSequence = td.textContent.trim();
        return;
      }

      if (td.dataset.publishedUrl === 'true') {
        articles[articleIndex].customPublishedUrl = td.textContent.trim();
        articles[articleIndex].customAuthority = getAuthorityForUrl(td.textContent.trim()) || articles[articleIndex].customAuthority || '';
        return;
      }

      if (td.dataset.authority === 'true') {
        articles[articleIndex].customAuthority = td.textContent.trim();
        return;
      }

      if (td.dataset.dofollow === 'true') {
        articles[articleIndex].customDofollow = td.textContent.trim();
        return;
      }

      if (td.dataset.linkType === 'true') {
        articles[articleIndex].customLinkType = td.textContent.trim();
        return;
      }

      const linkIndex = Number(td.dataset.link);
      const key = td.dataset.key;

      if (Number.isNaN(linkIndex) || !key) return;

      const link = ensureArticleLink(articles[articleIndex], linkIndex);
      if (!link) return;

      if (key === '锚文本') {
        link.anchorText = td.textContent.trim();
      }

      if (key === '跳转URL') {
        link.targetUrl = td.textContent.trim();
      }
    });

    async function handleFiles(fileList) {
      const files = Array.from(fileList || []).filter(file => file.name.toLowerCase().endsWith('.docx'));

      renderFileList(files);

      if (!files.length) {
        setStatus('请上传一个或多个 .docx 格式的 Word 文件。', 'danger');
        return;
      }

      setStatus(`正在解析 ${files.length} 个 Word 文件...\n当前策略：Word → HTML → #编号标题切分 → 分段内解析 a[href]。`);

      const parsedArticles = [];
      const logs = [];

      for (const [index, file] of files.entries()) {
        try {
          const extractedFromFile = await extractArticlesFromDocx(file);
          parsedArticles.push(...extractedFromFile);

          const fileArticleCount = extractedFromFile.length;
          const fileLinkCount = extractedFromFile.reduce((sum, article) => sum + article.links.length, 0);
          const hashCount = extractedFromFile.filter(article => article.segmentation === 'hash-number-segmented').length;

          logs.push(
            `✅ ${index + 1}. ${file.name}：识别为 ${fileArticleCount} 篇文章，其中 #编号文章 ${hashCount} 篇，共 ${fileLinkCount} 条外链`
          );

          extractedFromFile.slice(0, 12).forEach((article) => {
            const label = article.hashNumber !== null ? `#${article.hashNumber}` : article.articleIndexInFile;
            logs.push(`   - ${label}. ${article.title}：${article.links.length} 条`);
          });

          if (extractedFromFile.length > 12) {
            logs.push(`   - 其余 ${extractedFromFile.length - 12} 篇文章已省略日志显示`);
          }
        } catch (err) {
          console.error(err);
          logs.push(`❌ ${index + 1}. ${file.name}：解析失败，${err.message}`);
        }
      }

      articles = parsedArticles;
      renderTable();

      const totalLinks = parsedArticles.reduce((sum, article) => sum + article.links.length, 0);
      const totalHash = parsedArticles.filter(article => article.segmentation === 'hash-number-segmented').length;
      const statusType = totalLinks ? 'ok' : 'warn';
      const prefix = totalLinks
        ? `解析完成：共识别到 ${parsedArticles.length} 篇文章，其中 #编号文章 ${totalHash} 篇；共 ${totalLinks} 条外链。`
        : `解析完成：识别到 ${parsedArticles.length} 篇文章，但暂未识别到外链。`;

      setStatus(`${prefix}\n\n${logs.join('\n')}`, statusType);
    }

    fileInput.addEventListener('change', (event) => {
      handleFiles(event.target.files);
    });

    extractFromUrlsBtn.addEventListener('click', handleSourceUrls);

    clearSourceUrlsBtn.addEventListener('click', () => {
      sourcePageUrlsEl.value = '';
      if (targetDomainFilterEl) targetDomainFilterEl.value = '';
      setStatus('已清空 URL 和目标域名。');
    });

    if (clearUrlLogBtn) {
      clearUrlLogBtn.addEventListener('click', () => {
        if (urlLogList) urlLogList.innerHTML = '';
        if (urlLogSummary) urlLogSummary.textContent = '日志已清空。';
        if (urlProgressBar) urlProgressBar.style.width = '0%';
      });
    }


    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      const files = event.dataTransfer.files;
      handleFiles(files);
    });

    applyMetaBtn.addEventListener('click', () => {
      renderTable();
      setStatus('已应用基础设置。', 'ok');
    });

    stripHashBtn.addEventListener('click', () => {
      let changedCount = 0;

      articles = articles.map(article => {
        const cleanedTitle = getDisplayTitleAfterStrip(article);
        if (cleanedTitle !== article.title) {
          changedCount += 1;
        }

        return {
          ...article,
          originalHashTitle: article.originalHashTitle || article.title,
          title: cleanedTitle
        };
      });

      renderTable();
      setStatus(`已去除 ${changedCount} 个文章标题开头的 #编号。识别分段结果不会受影响；如需重新查看原始 #编号，请重新上传 Word 文件。`, 'ok');
    });

    document.getElementById('segmentMode').addEventListener('change', () => {
      if (articles.length) {
        setStatus('切分模式已变更，请重新上传 Word。', 'warn');
      }
      renderTable();
    });

    
    function populateProjectDateOptions() {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

      const startYear = Math.min(currentYear - 3, 2024);
      const endYear = 2030;

      projectYearEl.innerHTML = Array.from(
        { length: endYear - startYear + 1 },
        (_, index) => {
          const year = startYear + index;
          return `<option value="${year}">${year}年</option>`;
        }
      ).join('');

      projectMonthEl.innerHTML = Array.from(
        { length: 12 },
        (_, index) => {
          const month = String(index + 1).padStart(2, '0');
          return `<option value="${month}">${month}月</option>`;
        }
      ).join('');

      projectYearEl.value = String(Math.min(Math.max(currentYear, startYear), endYear));
      projectMonthEl.value = currentMonth;
    }

    function getProjectTitle() {
      const baseName = projectBaseNameEl.value.trim();
      const year = projectYearEl.value || '';
      const month = projectMonthEl.value || '';
      const yearMonth = year && month ? `${year}年${month}月` : '';
      const parts = [];

      if (baseName) parts.push(baseName);
      if (yearMonth) parts.push(yearMonth);
      parts.push('外链汇总');

      return parts.join(' ');
    }

    function updateProjectTitleHeader() {
      projectTitleHeader.textContent = getProjectTitle();
    }

    populateProjectDateOptions();
    updateProjectTitleHeader();

    projectBaseNameEl.addEventListener('input', updateProjectTitleHeader);
    projectYearEl.addEventListener('change', updateProjectTitleHeader);
    projectMonthEl.addEventListener('change', updateProjectTitleHeader);


    document.getElementById('linkType').addEventListener('change', () => {
      articles = articles.map(article => ({ ...article, customLinkType: document.getElementById('linkType').value }));
      renderTable();
    });

    document.getElementById('dofollowValue').addEventListener('change', () => {
      articles = articles.map(article => ({ ...article, customDofollow: document.getElementById('dofollowValue').value }));
      renderTable();
    });

    domainAuthorityMapEl.addEventListener('input', () => {
      applyAuthorityMapBtn.disabled = !articles.length;
    });



    
    function normalizeDomain(domain = '') {
      let value = String(domain).trim().toLowerCase();
      if (!value) return '';

      value = value.replace(/^https?:\/\//, '');
      value = value.replace(/^\/\//, '');
      value = value.split('/')[0];
      value = value.split('?')[0];
      value = value.split('#')[0];
      value = value.replace(/:\d+$/, '');
      value = value.replace(/^www\./, '');

      return value;
    }

    function extractDomainFromUrl(url = '') {
      let value = String(url).trim();
      if (!value) return '';

      if (!/^https?:\/\//i.test(value) && !/^\/\//.test(value)) {
        value = 'https://' + value;
      }

      try {
        const parsed = new URL(value);
        return normalizeDomain(parsed.hostname);
      } catch (error) {
        return normalizeDomain(value);
      }
    }

    function parseAuthorityMap(text = '') {
      const map = new Map();

      String(text)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .forEach(line => {
          const parts = line.split(/[,，\t|]/).map(part => part.trim()).filter(Boolean);
          if (parts.length < 2) return;

          const domain = normalizeDomain(parts[0]);
          const authority = parts.slice(1).join(' ').trim();

          if (domain && authority) {
            map.set(domain, authority);
          }
        });

      return map;
    }

    function getAuthorityForUrl(url = '') {
      const domain = extractDomainFromUrl(url);
      if (!domain) return '';

      const map = parseAuthorityMap(domainAuthorityMapEl.value);
      if (!map.size) return '';

      if (map.has(domain)) return map.get(domain);

      // 支持 www.example.com / blog.example.com 匹配 example.com
      const domainParts = domain.split('.');
      for (let i = 1; i < domainParts.length - 1; i++) {
        const parentDomain = domainParts.slice(i).join('.');
        if (map.has(parentDomain)) return map.get(parentDomain);
      }

      return '';
    }

    function applyAuthorityMapToArticles() {
      if (!articles.length) {
        setStatus('请先识别数据。', 'warn');
        return;
      }

      const map = parseAuthorityMap(domainAuthorityMapEl.value);
      if (!map.size) {
        setStatus('请先填写域名与权重。', 'warn');
        return;
      }

      let matchedCount = 0;
      let missingCount = 0;

      articles = articles.map(article => {
        const url = article.customPublishedUrl || document.getElementById('pageUrl').value.trim();
        const authority = getAuthorityForUrl(url);

        if (authority) {
          matchedCount += 1;
          return { ...article, customAuthority: authority };
        }

        missingCount += 1;
        return article;
      });

      renderTable();

      let message = `已根据发布 URL 自动映射 ${matchedCount} 篇文章的网站权重。`;
      if (missingCount) {
        message += `\n还有 ${missingCount} 篇文章未匹配到域名，请检查 URL 或映射表。`;
      }

      setStatus(message, missingCount ? 'warn' : 'ok');
    }

    applyAuthorityMapBtn.addEventListener('click', applyAuthorityMapToArticles);

    clearAuthorityMapBtn.addEventListener('click', () => {
      domainAuthorityMapEl.value = '';
      setStatus('已清空域名与网站权重映射表。');
    });

function parseBulkPublishedUrls(text = '') {
      return String(text)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    }

    function applyBulkPublishedUrls() {
      const urls = parseBulkPublishedUrls(bulkPublishedUrlsEl.value);

      if (!articles.length) {
        setStatus('请先识别数据。', 'warn');
        return;
      }

      if (!urls.length) {
        setStatus('请先粘贴 URL。', 'warn');
        return;
      }

      const applyCount = Math.min(urls.length, articles.length);

      articles = articles.map((article, index) => ({
        ...article,
        customPublishedUrl: index < urls.length ? urls[index] : article.customPublishedUrl,
        customAuthority: index < urls.length ? (getAuthorityForUrl(urls[index]) || article.customAuthority || '') : article.customAuthority
      }));

      renderTable();

      const extraCount = Math.max(0, urls.length - articles.length);
      const missingCount = Math.max(0, articles.length - urls.length);
      let message = `已将 ${applyCount} 个发布 URL 应用到 URL 列。`;

      if (missingCount) {
        message += `\n还有 ${missingCount} 篇文章没有对应 URL，已保持为空或原值。`;
      }

      if (extraCount) {
        message += `\n你粘贴的 URL 比文章数多 ${extraCount} 个，多出的 URL 暂未使用。`;
      }

      setStatus(message, missingCount || extraCount ? 'warn' : 'ok');
    }

    applyBulkUrlsBtn.addEventListener('click', applyBulkPublishedUrls);

    clearBulkUrlsBtn.addEventListener('click', () => {
      bulkPublishedUrlsEl.value = '';
      sourcePageUrlsEl.value = '';
      domainAuthorityMapEl.value = '';
      setStatus('已清空 URL 文本框。');
    });

    bulkPublishedUrlsEl.addEventListener('input', () => {
      if (!articles.length) return;
      const urlCount = parseBulkPublishedUrls(bulkPublishedUrlsEl.value).length;
      const articleCount = articles.length;
      summaryEl.innerHTML = summaryEl.innerHTML.replace(/<span class="pill"><b>[^<]*\/[^<]*<\/b><em>待应用URL<\/em><\/span>/, '');
      summaryEl.innerHTML += `<span class="pill"><b>${urlCount}/${articleCount}</b><em>待应用URL</em></span>`;
    });



    function escapeHtmlForExcel(value = '') {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    }

    function escapeXml(value = '') {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
    }

    const excelColumnWidthsPx = [87, 54, 487, 350, 69, 157, 478, 118];
    const excelRowHeights = {
      title: 32,
      header: 23,
      body: 15,
      note: 23
    };

    function getExportFileBaseName() {
      return getProjectTitle().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || '外链汇总结果';
    }

    function getExcelColGroupHtml() {
      return '<colgroup>' + excelColumnWidthsPx.map(width => '<col style="width:' + width + 'px;mso-width-source:userset;">').join('') + '</colgroup>';
    }

    function getExcelCellStyle(kind = 'normal') {
      const base = [
        'border:0.5pt solid #000000',
        'padding:0 4px',
        'vertical-align:middle',
        'mso-number-format:"\\@"',
        'white-space:normal',
        'word-break:break-word',
        'overflow-wrap:anywhere',
        'color:#000000'
      ];

      if (kind === 'project') {
        return base.concat([
          'height:32px',
          'line-height:32px',
          'font-family:DengXian,等线,"Microsoft YaHei",sans-serif',
          'font-size:15.75pt',
          'font-weight:700',
          'text-align:center',
          'background:#BDD7EE'
        ]).join(';');
      }

      if (kind === 'header') {
        return base.concat([
          'height:23px',
          'line-height:23px',
          'font-family:DengXian,等线,"Microsoft YaHei",sans-serif',
          'font-size:12pt',
          'font-weight:700',
          'text-align:center',
          'background:#8EA9DB'
        ]).join(';');
      }

      const body = base.concat([
        'height:15px',
        'line-height:15px',
        'font-family:"Times New Roman",宋体,SimSun,serif',
        'font-size:11pt',
        'font-weight:400',
        'background:#FFFFFF'
      ]);

      if (kind === 'note') {
        return base.concat([
          'height:23px',
          'line-height:23px',
          'font-family:DengXian,等线,"Microsoft YaHei",sans-serif',
          'font-size:12pt',
          'font-weight:700',
          'text-align:center',
          'background:#8EA9DB'
        ]).join(';');
      }

      if (kind === 'center') return body.concat(['text-align:center']).join(';');
      return body.concat(['text-align:left']).join(';');
    }

    function buildExcelPlainText() {
      const lines = [];
      lines.push([getProjectTitle(), '', '', '', '', '', '', ''].join('\t'));
      lines.push(headers.join('\t'));

      flattenRows().forEach(row => {
        lines.push(headers.map(header => String(row[header] ?? '')).join('\t'));
      });

      return lines.join('\n');
    }

    function isExcelNumber(value) {
      const text = String(value ?? '').trim();
      return /^-?\d+(?:\.\d+)?$/.test(text);
    }

    function excelXmlCell(value, styleId, extraAttrs = '') {
      const raw = String(value ?? '');
      const trimmed = raw.trim();
      const type = isExcelNumber(trimmed) && ['sCenter', 'sNumber'].includes(styleId) ? 'Number' : 'String';
      const safeValue = type === 'Number' ? trimmed : escapeXml(raw);
      return `<Cell ss:StyleID="${styleId}"${extraAttrs}><Data ss:Type="${type}">${safeValue}</Data></Cell>`;
    }

    function blankExcelXmlCell(styleId) {
      return `<Cell ss:StyleID="${styleId}"/>`;
    }

    function buildSpreadsheetXmlWorkbook() {
      const rows = [];
      const merges = [];
      let currentRow = 1;

      rows.push(`<Row ss:Height="${excelRowHeights.title}">${excelXmlCell(getProjectTitle(), 'sProject', ' ss:MergeAcross="7"')}</Row>`);
      currentRow += 1;

      rows.push(
        `<Row ss:Height="${excelRowHeights.header}">` +
        headers.map(header => excelXmlCell(header, 'sHeader')).join('') +
        `</Row>`
      );
      currentRow += 1;

      articles.forEach((article, articleIndex) => {
        const articleRows = makeRowsForArticle(article, articleIndex);
        const rowspan = Math.max(articleRows.length, 1);
        if (!articleRows.length) return;

        articleRows.forEach((row, linkIndex) => {
          const mergeDown = rowspan > 1 && linkIndex === 0 ? ` ss:MergeDown="${rowspan - 1}"` : '';
          const cells = [];

          if (linkIndex === 0) {
            cells.push(excelXmlCell(row['外链种类'], 'sCenter', mergeDown));
            cells.push(excelXmlCell(row['序号'], 'sCenter', mergeDown));
            cells.push(excelXmlCell(row['文章标题'], 'sText', mergeDown));
            cells.push(excelXmlCell(row['URL'], 'sText', mergeDown));
            cells.push(excelXmlCell(row['网站权重'], 'sCenter', mergeDown));
          } else {
            cells.push(blankExcelXmlCell('sCenter'));
            cells.push(blankExcelXmlCell('sCenter'));
            cells.push(blankExcelXmlCell('sText'));
            cells.push(blankExcelXmlCell('sText'));
            cells.push(blankExcelXmlCell('sCenter'));
          }

          cells.push(excelXmlCell(row['锚文本'], 'sText'));
          cells.push(excelXmlCell(row['跳转URL'], 'sText'));

          if (linkIndex === 0) {
            cells.push(excelXmlCell(row['是否dofollow'], 'sCenter', mergeDown));
          } else {
            cells.push(blankExcelXmlCell('sCenter'));
          }

          rows.push(`<Row ss:Height="${excelRowHeights.body}">${cells.join('')}</Row>`);
          currentRow += 1;
        });
      });

      rows.push(`<Row ss:Height="${excelRowHeights.note}">${excelXmlCell(footerNoteText, 'sFooterNote', ' ss:MergeAcross="7"')}</Row>`);
      currentRow += 1;

      const columns = excelColumnWidthsPx
        .map(width => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`)
        .join('');

      return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>外链汇总辅助</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>9000</WindowHeight>
  <WindowWidth>16000</WindowWidth>
  <ProtectStructure>False</ProtectStructure>
  <ProtectWindows>False</ProtectWindows>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Times New Roman" x:CharSet="134" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="sProject">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="等线" x:CharSet="134" ss:Size="15.75" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#BDD7EE" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="@"/>
  </Style>
  <Style ss:ID="sHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#8EA9DB" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="@"/>
  </Style>
  <Style ss:ID="sCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="Times New Roman" x:CharSet="134" ss:Size="11" ss:Color="#000000"/>
   <NumberFormat ss:Format="@"/>
  </Style>
  <Style ss:ID="sText">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="Times New Roman" x:CharSet="134" ss:Size="11" ss:Color="#000000"/>
   <NumberFormat ss:Format="@"/>
  </Style>
  <Style ss:ID="sNumber">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="Times New Roman" x:CharSet="134" ss:Size="11" ss:Color="#000000"/>
   <NumberFormat ss:Format="0"/>
  </Style>

  <Style ss:ID="sFooterNote">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="等线" x:CharSet="134" ss:Size="12" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#8EA9DB" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="@"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="外链汇总">
  <Table ss:ExpandedColumnCount="8" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">
   ${columns}
   ${rows.join('\n   ')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Layout x:Orientation="Landscape"/>
   </PageSetup>
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>2</SplitHorizontal>
   <TopRowBottomPane>2</TopRowBottomPane>
   <ActivePane>2</ActivePane>
   <Panes>
    <Pane><Number>3</Number></Pane>
    <Pane><Number>2</Number></Pane>
   </Panes>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
    }

    function buildExcelHtmlTable() {
      const rowsHtml = [];
      rowsHtml.push('<tr style="height:32px;mso-height-source:userset;"><td colspan="8" style="' + getExcelCellStyle('project') + '">' + escapeHtmlForExcel(getProjectTitle()) + '</td></tr>');
      rowsHtml.push(
        '<tr style="height:23px;mso-height-source:userset;">' +
        headers.map(header => '<th style="' + getExcelCellStyle('header') + '">' + escapeHtmlForExcel(header) + '</th>').join('') +
        '</tr>'
      );

      articles.forEach((article, articleIndex) => {
        const articleRows = makeRowsForArticle(article, articleIndex);
        const rowspan = Math.max(articleRows.length, 1);
        if (!articleRows.length) return;

        articleRows.forEach((row, linkIndex) => {
          const cells = [];
          if (linkIndex === 0) {
            cells.push('<td rowspan="' + rowspan + '" style="' + getExcelCellStyle('center') + '">' + escapeHtmlForExcel(row['外链种类']) + '</td>');
            cells.push('<td rowspan="' + rowspan + '" style="' + getExcelCellStyle('center') + '">' + escapeHtmlForExcel(row['序号']) + '</td>');
            cells.push('<td rowspan="' + rowspan + '" style="' + getExcelCellStyle('text') + '">' + escapeHtmlForExcel(row['文章标题']) + '</td>');
            cells.push('<td rowspan="' + rowspan + '" style="' + getExcelCellStyle('text') + '">' + escapeHtmlForExcel(row['URL']) + '</td>');
            cells.push('<td rowspan="' + rowspan + '" style="' + getExcelCellStyle('center') + '">' + escapeHtmlForExcel(row['网站权重']) + '</td>');
          }
          cells.push('<td style="' + getExcelCellStyle('text') + '">' + escapeHtmlForExcel(row['锚文本']) + '</td>');
          cells.push('<td style="' + getExcelCellStyle('text') + '">' + escapeHtmlForExcel(row['跳转URL']) + '</td>');
          if (linkIndex === 0) {
            cells.push('<td rowspan="' + rowspan + '" style="' + getExcelCellStyle('center') + '">' + escapeHtmlForExcel(row['是否dofollow']) + '</td>');
          }
          rowsHtml.push('<tr style="height:15px;mso-height-source:userset;">' + cells.join('') + '</tr>');
        });
      });

      rowsHtml.push('<tr style="height:23px;mso-height-source:userset;"><td colspan="8" style="' + getExcelCellStyle('note') + '">' + escapeHtmlForExcel(footerNoteText) + '</td></tr>');

      return `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; table-layout: fixed; font-family: "Times New Roman", 宋体, SimSun, serif; font-size: 11pt; }
              td, th { border: .5pt solid #000000; vertical-align: middle; mso-number-format:"\\@"; }
              .xlTitle { background:#BDD7EE; font-family: 等线, DengXian, sans-serif; font-size:15.75pt; font-weight:700; text-align:center; }
              .xlHeader { background:#8EA9DB; font-family: 等线, DengXian, sans-serif; font-size:12pt; font-weight:700; text-align:center; }
            </style>
            <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>外链汇总</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
          </head>
          <body>
            <table style="border-collapse:collapse;border-spacing:0;table-layout:fixed;font-family:'Times New Roman',宋体,SimSun,serif;font-size:11pt;color:#000000;">
              ${getExcelColGroupHtml()}
              ${rowsHtml.join('')}
            </table>
          </body>
        </html>
      `;
    }

    function fallbackCopyHtmlToClipboard(html, plainText = '') {
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.background = '#fff';
      container.style.zIndex = '-1';
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      let success = false;
      try {
        success = document.execCommand('copy');
      } catch (error) {
        success = false;
      }

      selection.removeAllRanges();
      document.body.removeChild(container);

      if (!success && plainText) {
        const textarea = document.createElement('textarea');
        textarea.value = plainText;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      return success;
    }

    async function copyTextToClipboard(text, successMessage) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        setStatus(successMessage, 'ok');
      } catch (error) {
        console.error(error);
        setStatus('复制失败。当前浏览器可能限制剪贴板权限。部署到 Vercel 后请使用 HTTPS 页面访问。', 'danger');
      }
    }

    async function copyExcelTableToClipboard() {
      const rows = flattenRows();
      if (!rows.length) {
        setStatus('当前没有可复制的数据，请先上传 Word 并识别外链。', 'warn');
        return;
      }

      const htmlTable = buildExcelHtmlTable();
      const plainText = buildExcelPlainText();

      try {
        if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
          const item = new ClipboardItem({
            'text/html': new Blob([htmlTable], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' })
          });
          await navigator.clipboard.write([item]);
        } else {
          const success = fallbackCopyHtmlToClipboard(htmlTable, plainText);
          if (!success) throw new Error('兼容复制失败');
        }
        setStatus('已复制完整表格。部署到 Vercel 的 HTTPS 环境后，复制到 Excel 可保留更多样式；最稳定的完整格式请使用“导出为 Excel”。', 'ok');
      } catch (error) {
        console.error(error);
        const success = fallbackCopyHtmlToClipboard(htmlTable, plainText);
        setStatus(success ? '已使用兼容模式复制完整表格。' : '复制失败，请使用“导出为 Excel”。', success ? 'ok' : 'danger');
      }
    }

    function buildColumnPlainText(header) {
      const rows = flattenRows();
      return rows.map(row => String(row[header] ?? '')).join('\n');
    }

    function copyColumn(header) {
      const text = buildColumnPlainText(header);
      if (!text.trim()) {
        setStatus(`当前 ${header} 列没有可复制内容。`, 'warn');
        return;
      }
      copyTextToClipboard(text, `已复制 ${header} 列。`);
    }

    function downloadStyledExcel() {
      const rows = flattenRows();
      if (!rows.length) {
        setStatus('当前没有可导出的数据，请先上传 Word 并识别外链。', 'warn');
        return;
      }

      const xml = buildSpreadsheetXmlWorkbook();
      const blob = new Blob(['\ufeff' + xml], {
        type: 'application/vnd.ms-excel;charset=utf-8;'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getExportFileBaseName()}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('已导出为 Excel。此版本使用 Excel XML 格式，能更稳定保留列宽、行高、合并单元格、边框、颜色、字体和垂直居中。', 'ok');
    }

    copyAllVisualBtn.addEventListener('click', copyExcelTableToClipboard);
    downloadExcelBtn.addEventListener('click', downloadStyledExcel);
    document.getElementById('resultTable').addEventListener('click', (event) => {
      const button = event.target.closest('.copy-col-btn[data-copy-column]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      copyColumn(button.dataset.copyColumn);
    });


    function csvEscape(value) {
      const str = String(value ?? '');
      if (/[",\n\r]/.test(str)) {
        return `"${str.replaceAll('"', '""')}"`;
      }
      return str;
    }

    downloadCsvBtn.addEventListener('click', () => {
      const rows = flattenRows();

      const projectName = getProjectTitle();
      const csv = [
        [csvEscape(projectName), '', '', '', '', '', '', ''].join(','),
        headers.join(','),
        ...rows.map(row => headers.map(header => csvEscape(row[header])).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '外链汇总结果.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    clearBtn.addEventListener('click', () => {
      articles = [];
      fileInput.value = '';
      bulkPublishedUrlsEl.value = '';
      domainAuthorityMapEl.value = '';
      renderFileList([]);
      renderTable();
      setStatus('已清空。');
    });

    renderTable();

(function() {
    'use strict';

    /* ========== Tab Switching ========== */
    const extTabBar = document.getElementById('extTabBar');
    const panels = {
      healthCheck: document.getElementById('panelHealthCheck'),
      dofollowCheck: document.getElementById('panelDofollowCheck'),
      regexTool: document.getElementById('panelRegexTool'),
      indexCheck: document.getElementById('panelIndexCheck')
    };
    extTabBar.addEventListener('click', e => {
      const btn = e.target.closest('.ext-tab');
      if (!btn) return;
      const tab = btn.dataset.tab;
      extTabBar.querySelectorAll('.ext-tab').forEach(t => {
        const isActive = t.dataset.tab === tab;
        t.style.borderBottomColor = isActive ? 'var(--primary)' : 'transparent';
        t.style.color = isActive ? 'var(--primary)' : 'var(--muted)';
      });
      Object.entries(panels).forEach(([key, panel]) => { panel.style.display = key === tab ? 'block' : 'none'; });
    });
    const regexSubTabBar = document.getElementById('regexSubTabBar');
    regexSubTabBar.addEventListener('click', e => {
      const btn = e.target.closest('.regex-sub-tab');
      if (!btn) return;
      const sub = btn.dataset.subtab;
      regexSubTabBar.querySelectorAll('.regex-sub-tab').forEach(t => {
        const isActive = t.dataset.subtab === sub;
        t.style.background = isActive ? 'var(--primary)' : 'rgba(255,255,255,0.04)';
        t.style.color = isActive ? '#1a1509' : '#c9c3b4';
      });
      document.getElementById('subpanelGsc').style.display = sub === 'gsc' ? 'block' : 'none';
      document.getElementById('subpanelGa4').style.display = sub === 'ga4' ? 'block' : 'none';
    });

    /* ========== Helpers ========== */
    function extEscapeHtml(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function extEnsureAbsoluteUrl(url) { const v=String(url||'').trim(); if(!v)return''; if(/^https?:\/\//i.test(v))return v; if(/^\/\//.test(v))return'https:'+v; return'https://'+v; }
    function extParseUrls(text) { return String(text||'').split(/\r?\n/).map(l=>extEnsureAbsoluteUrl(l.trim())).filter(Boolean); }
    function extCsvEscape(v) { const s=String(v??''); return/[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
    async function extCopyText(text,el,msg) { try { if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);}else{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);} if(el)el.textContent=msg||'已复制'; } catch(e){ if(el)el.textContent='复制失败'; } }
    function extDownloadCsv(filename,csv) { const b=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u;a.download=filename; document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u); }
    function extNormalizeDomain(d) { let v=String(d||'').trim().toLowerCase(); v=v.replace(/^https?:\/\//,'').replace(/^\/\//,''); v=v.split('/')[0].split('?')[0].split('#')[0]; v=v.replace(/:\d+$/,'').replace(/^www\./,''); return v; }

    /* ========== Module 1: Backlink Survival Check (Integrated) ========== */
    let healthCheckData = [];
    let blGroups = {}; // { groupName: { urls: string[], created: timestamp } }
    let blCurrentGroup = '';
    const BL_STORAGE_KEY = 'blSurvivalGroups';
    const BL_DOMAIN_KEY = 'blTargetDomain';

    // --- Persistence ---
    function blLoadGroups() {
      try { blGroups = JSON.parse(localStorage.getItem(BL_STORAGE_KEY) || '{}'); } catch { blGroups = {}; }
      const saved = localStorage.getItem(BL_DOMAIN_KEY);
      if (saved) document.getElementById('blTargetDomain').value = saved;
    }
    function blSaveGroups() { localStorage.setItem(BL_STORAGE_KEY, JSON.stringify(blGroups)); }
    function blSaveDomain() { localStorage.setItem(BL_DOMAIN_KEY, document.getElementById('blTargetDomain').value.trim()); }

    // --- Group UI ---
    function blRenderGroupSelect() {
      const sel = document.getElementById('blGroupSelect');
      const names = Object.keys(blGroups).sort((a,b) => (blGroups[b].created||0) - (blGroups[a].created||0));
      sel.innerHTML = '<option value="">— 未分组（直接输入） —</option>' + names.map(n => `<option value="${extEscapeHtml(n)}"${n===blCurrentGroup?' selected':''}>${extEscapeHtml(n)}（${(blGroups[n].urls||[]).length} 条）</option>`).join('');
    }
    function blSwitchGroup(name) {
      blCurrentGroup = name;
      const ta = document.getElementById('healthCheckUrls');
      if (name && blGroups[name]) { ta.value = (blGroups[name].urls || []).join('\n'); }
      blUpdateUrlCount();
    }
    function blUpdateUrlCount() {
      const urls = extParseUrls(document.getElementById('healthCheckUrls').value);
      document.getElementById('blUrlCount').textContent = `${urls.length} 条 URL`;
    }

    document.getElementById('blGroupSelect').addEventListener('change', function() { blSwitchGroup(this.value); });
    document.getElementById('healthCheckUrls').addEventListener('input', blUpdateUrlCount);

    document.getElementById('blAddGroupBtn').addEventListener('click', () => {
      const inp = document.getElementById('blNewGroupName');
      const name = inp.value.trim();
      if (!name) return inp.focus();
      if (blGroups[name]) return alert('分组名已存在');
      blGroups[name] = { urls: [], created: Date.now() };
      blSaveGroups(); blCurrentGroup = name; blRenderGroupSelect(); blSwitchGroup(name);
      inp.value = '';
    });

    document.getElementById('blRenameGroupBtn').addEventListener('click', () => {
      if (!blCurrentGroup) return alert('请先选择一个分组');
      const newName = prompt('输入新的分组名称：', blCurrentGroup);
      if (!newName || newName.trim() === blCurrentGroup) return;
      if (blGroups[newName.trim()]) return alert('该分组名已存在');
      blGroups[newName.trim()] = blGroups[blCurrentGroup];
      delete blGroups[blCurrentGroup];
      blCurrentGroup = newName.trim();
      blSaveGroups(); blRenderGroupSelect(); blSwitchGroup(blCurrentGroup);
    });

    document.getElementById('blDeleteGroupBtn').addEventListener('click', () => {
      if (!blCurrentGroup) return alert('请先选择一个分组');
      if (!confirm(`确定删除分组「${blCurrentGroup}」及其所有 URL？`)) return;
      delete blGroups[blCurrentGroup];
      blCurrentGroup = '';
      blSaveGroups(); blRenderGroupSelect(); blSwitchGroup('');
    });

    document.getElementById('blSaveGroupBtn').addEventListener('click', () => {
      if (!blCurrentGroup) {
        const name = prompt('输入分组名称以保存：');
        if (!name || !name.trim()) return;
        blCurrentGroup = name.trim();
        if (!blGroups[blCurrentGroup]) blGroups[blCurrentGroup] = { urls: [], created: Date.now() };
      }
      blGroups[blCurrentGroup].urls = extParseUrls(document.getElementById('healthCheckUrls').value);
      blSaveGroups(); blRenderGroupSelect();
      alert(`已保存 ${blGroups[blCurrentGroup].urls.length} 条 URL 到「${blCurrentGroup}」`);
    });

    // CSV import
    document.getElementById('blImportCsvBtn').addEventListener('click', () => document.getElementById('blImportCsvFile').click());
    document.getElementById('blImportCsvFile').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const lines = text.split(/\r?\n/).map(l => l.split(',')[0].trim().replace(/^["']|["']$/g,'')).filter(l => /^https?:\/\//i.test(l));
        const ta = document.getElementById('healthCheckUrls');
        const existing = ta.value.trim();
        ta.value = existing ? existing + '\n' + lines.join('\n') : lines.join('\n');
        blUpdateUrlCount();
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // --- Core check: integrated health + link existence ---
    async function checkSingleUrl(url) {
      // Use mode=links to get both health info AND all links on the page
      const apiUrl = `${window.location.origin}/api/check-url?url=${encodeURIComponent(url)}&mode=links`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try { const resp = await fetch(apiUrl,{signal:controller.signal,cache:'no-store',headers:window.authHeaders()}); return await resp.json(); }
      catch(err) { return err.name==='AbortError'?{success:false,url,error:'请求超时',chain:[],finalStatus:0,links:[]}:{success:false,url,error:err.message,chain:[],finalStatus:0,links:[]}; }
      finally { clearTimeout(timer); }
    }

    function getStatusLabel(code) {
      if(!code) return{text:'失败',color:'#fb7185',bg:'rgba(251,113,133,0.14)'};
      if(code>=200&&code<300) return{text:'正常',color:'#34d399',bg:'rgba(52,211,153,0.14)'};
      if(code>=300&&code<400) return{text:'重定向',color:'#fbbf24',bg:'rgba(251,191,36,0.14)'};
      if(code===404) return{text:'死链',color:'#fb7185',bg:'rgba(251,113,133,0.14)'};
      if(code>=400&&code<500) return{text:'客户端错误',color:'#fb7185',bg:'rgba(251,113,133,0.14)'};
      if(code>=500) return{text:'服务器错误',color:'#f87171',bg:'rgba(248,113,113,0.14)'};
      return{text:'未知',color:'#9aa1b8',bg:'rgba(255,255,255,0.06)'};
    }

    function formatChain(chain) { if(!chain||chain.length<=1)return'—'; return chain.slice(0,-1).map(h=>`<span style="color:#fbbf24;font-weight:600;">${h.statusCode}</span> → `).join('')+`<span style="color:#34d399;font-weight:600;">${chain[chain.length-1].statusCode}</span>`; }
    function formatChainDetail(chain) { if(!chain||chain.length<=1)return''; return chain.map((h,i)=>`[${h.statusCode}] ${h.url}${i<chain.length-1?' →':''}`).join('\n'); }

    // Find user's link in the page's extracted links
    function findMyLink(links, targetDomain) {
      if (!targetDomain || !links || !links.length) return null;
      const td = extNormalizeDomain(targetDomain);
      const matches = links.filter(link => {
        const ld = extNormalizeDomain(link.targetUrl);
        return ld === td || ld.endsWith('.' + td) || td.endsWith('.' + ld);
      });
      if (!matches.length) return null;
      // Prefer dofollow match
      const df = matches.find(m => m.dofollow === 'Yes');
      return df || matches[0];
    }

    // --- Filter buttons ---
    document.querySelectorAll('.bl-filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.bl-filter-btn').forEach(b => { b.classList.remove('active'); b.style.background='rgba(255,255,255,0.03)'; b.style.color='#c9c3b4'; });
        this.classList.add('active'); this.style.background='rgba(201,161,91,0.85)'; this.style.color='#1a1509';
        const filter = this.dataset.filter;
        const rows = document.querySelectorAll('#healthCheckTableBody tr');
        rows.forEach(row => {
          if (filter === 'all') { row.style.display = ''; return; }
          const cat = row.dataset.category || '';
          row.style.display = cat === filter ? '' : 'none';
        });
      });
    });

    // --- Main run ---
    document.getElementById('runHealthCheckBtn').addEventListener('click', async () => {
      const urls = extParseUrls(document.getElementById('healthCheckUrls').value);
      if (!urls.length) return alert('请输入至少一个 URL');
      const targetDomain = document.getElementById('blTargetDomain').value.trim();
      blSaveDomain();

      const btn=document.getElementById('runHealthCheckBtn'), progress=document.getElementById('healthCheckProgress'), resultsDiv=document.getElementById('healthCheckResults'), tbody=document.getElementById('healthCheckTableBody'), exportBtn=document.getElementById('exportHealthCheckBtn');
      btn.disabled=true; healthCheckData=[]; tbody.innerHTML=''; resultsDiv.style.display='block'; exportBtn.disabled=true;
      document.getElementById('blSummaryBar').style.display='none';
      // Reset filter
      document.querySelectorAll('.bl-filter-btn').forEach(b => { b.classList.remove('active'); b.style.background='rgba(255,255,255,0.03)'; b.style.color='#c9c3b4'; });
      document.querySelector('.bl-filter-btn[data-filter="all"]').classList.add('active');
      document.querySelector('.bl-filter-btn[data-filter="all"]').style.background='#93c5fd';
      document.querySelector('.bl-filter-btn[data-filter="all"]').style.color='#fff';

      let done=0;
      const concurrency=Math.max(1,Math.min(10,parseInt(document.getElementById('blConcurrency').value)||3));
      const delayMs=Math.max(0,parseInt(document.getElementById('blDelay').value)||0);
      const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      async function worker(url,index) {
        if(delayMs>0 && index>0) await sleep(delayMs);
        const result = await checkSingleUrl(url); done++;
        progress.textContent=`检测进度：${done}/${urls.length}`;
        const finalStatus=result.finalStatus||0, label=getStatusLabel(finalStatus);
        const chain=result.chain||[], hasRedirect=chain.length>1;
        const noindex=result.noindex;
        const links=result.links||[];
        const myLink = findMyLink(links, targetDomain);

        // Determine category for filtering
        let category='dead', linkStatus='—', linkAttr='—', anchorText='—';
        if(finalStatus>=200 && finalStatus<300) {
          if(!targetDomain) { category='alive'; linkStatus='未设置域名'; }
          else if(myLink) { category='alive'; linkStatus='✅ 存在'; linkAttr=myLink.dofollow==='Yes'?'Dofollow':'Nofollow'; anchorText=myLink.anchorText||'—'; }
          else { category='linklost'; linkStatus='⚠️ 未找到'; }
        } else if(finalStatus>=300 && finalStatus<400) {
          category='redirect';
          if(myLink) { linkStatus='✅ 存在'; linkAttr=myLink.dofollow==='Yes'?'Dofollow':'Nofollow'; anchorText=myLink.anchorText||'—'; }
          else if(targetDomain) { linkStatus='⚠️ 未找到'; }
        }

        healthCheckData[index]={url,finalStatus,statusLabel:label.text,chain,finalUrl:result.finalUrl||url,noindex:noindex?'Yes':'No',chainText:formatChainDetail(chain),error:result.error||'',linkFound:myLink?'Yes':'No',dofollow:myLink?myLink.dofollow:'—',anchorText:anchorText==='—'?'':anchorText,category,group:blCurrentGroup};

        const row=document.createElement('tr');
        row.dataset.category=category;
        const linkStatusColor = linkStatus.includes('存在')?'#34d399':linkStatus.includes('未找到')?'#fbbf24':'#9aa1b8';
        const linkStatusBg = linkStatus.includes('存在')?'rgba(52,211,153,0.14)':linkStatus.includes('未找到')?'rgba(251,191,36,0.14)':'rgba(255,255,255,0.05)';
        const dfColor = linkAttr==='Dofollow'?'#34d399':linkAttr==='Nofollow'?'#fb7185':'#9aa1b8';
        const dfBg = linkAttr==='Dofollow'?'rgba(52,211,153,0.14)':linkAttr==='Nofollow'?'rgba(251,113,133,0.14)':'rgba(255,255,255,0.05)';

        row.innerHTML=`<td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);">${index+1}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);word-break:break-all;color:#93c5fd;max-width:260px;font-size:11px;"><a href="${extEscapeHtml(url)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">${extEscapeHtml(url)}</a></td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;font-weight:700;color:${label.color};">${finalStatus||'ERR'}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;"><span style="display:inline-block;padding:3px 8px;border-radius:6px;background:${label.bg};color:${label.color};font-weight:600;font-size:11px;">${label.text}</span></td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;"><span style="display:inline-block;padding:3px 8px;border-radius:6px;background:${linkStatusBg};color:${linkStatusColor};font-weight:600;font-size:11px;">${linkStatus}</span></td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;"><span style="display:inline-block;padding:3px 8px;border-radius:6px;background:${dfBg};color:${dfColor};font-weight:600;font-size:11px;">${linkAttr}</span></td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);max-width:150px;font-size:11px;word-break:break-all;">${extEscapeHtml(anchorText)}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:11px;">${hasRedirect?formatChain(chain):'—'}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;color:${noindex?'#fb7185':'#9aa1b8'};font-weight:${noindex?'700':'400'};">${noindex?'Yes':'—'}</td>`;
        tbody.appendChild(row);
      }
      let nextIdx=0;
      async function runner(){while(nextIdx<urls.length){const i=nextIdx++;await worker(urls[i],i);}}
      await Promise.all(Array.from({length:Math.min(concurrency,urls.length)},()=>runner()));
      btn.disabled=false; exportBtn.disabled=false;

      // Update summary
      const valid = healthCheckData.filter(Boolean);
      const aliveCount = valid.filter(d=>d.category==='alive').length;
      const linklostCount = valid.filter(d=>d.category==='linklost').length;
      const deadCount = valid.filter(d=>d.category==='dead').length;
      const redirectCount = valid.filter(d=>d.category==='redirect').length;
      const dfCount = valid.filter(d=>d.dofollow==='Yes').length;
      const nfCount = valid.filter(d=>d.dofollow==='No').length;
      document.getElementById('blStatTotal').textContent=valid.length;
      document.getElementById('blStatAlive').textContent=aliveCount;
      document.getElementById('blStatLinkLost').textContent=linklostCount;
      document.getElementById('blStatDead').textContent=deadCount;
      document.getElementById('blStatRedirect').textContent=redirectCount;
      document.getElementById('blStatDofollow').textContent=dfCount;
      document.getElementById('blStatNofollow').textContent=nfCount;
      document.getElementById('blSummaryBar').style.display='block';
      progress.textContent=`检测完成`;
    });

    document.getElementById('clearHealthCheckBtn').addEventListener('click',()=>{document.getElementById('healthCheckUrls').value='';document.getElementById('healthCheckTableBody').innerHTML='';document.getElementById('healthCheckResults').style.display='none';document.getElementById('healthCheckProgress').textContent='';document.getElementById('exportHealthCheckBtn').disabled=true;document.getElementById('blSummaryBar').style.display='none';healthCheckData=[];blUpdateUrlCount();});

    document.getElementById('exportHealthCheckBtn').addEventListener('click',()=>{
      if(!healthCheckData.length)return;
      const groupLabel = blCurrentGroup || '未分组';
      const rows=healthCheckData.filter(Boolean).map(d=>[extCsvEscape(groupLabel),extCsvEscape(d.url),extCsvEscape(d.finalStatus),extCsvEscape(d.statusLabel),extCsvEscape(d.linkFound),extCsvEscape(d.dofollow),extCsvEscape(d.anchorText),extCsvEscape(d.chainText||'无重定向'),extCsvEscape(d.finalUrl||''),extCsvEscape(d.noindex),extCsvEscape(d.error)].join(','));
      extDownloadCsv(`外链存活检测_${groupLabel}_${new Date().toISOString().slice(0,10)}.csv`,['分组,外链页面URL,最终状态码,页面状态,链接存活,Dofollow,锚文本,Redirect Chain,最终URL,Noindex,错误信息',...rows].join('\n'));
    });

    // Init groups on load
    blLoadGroups(); blRenderGroupSelect(); blUpdateUrlCount();

    // --- Concurrency & delay control sync ---
    document.getElementById('blConcurrencyRange').addEventListener('input', function(){ document.getElementById('blConcurrency').value=this.value; });
    document.getElementById('blConcurrency').addEventListener('input', function(){ const v=Math.max(1,Math.min(10,parseInt(this.value)||1)); this.value=v; document.getElementById('blConcurrencyRange').value=v; });
    document.getElementById('blDelayRange').addEventListener('input', function(){ document.getElementById('blDelay').value=this.value; });
    document.getElementById('blDelay').addEventListener('input', function(){ const v=Math.max(0,Math.min(10000,parseInt(this.value)||0)); this.value=v; document.getElementById('blDelayRange').value=Math.min(v,5000); });

    /* ========== Module 2: Dofollow / Nofollow ========== */
    let dofollowData = [];
    async function checkDofollowSingle(url) {
      const apiUrl=`${window.location.origin}/api/check-url?url=${encodeURIComponent(url)}&mode=links`;
      const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),15000);
      try{const resp=await fetch(apiUrl,{signal:controller.signal,cache:'no-store',headers:window.authHeaders()});return await resp.json();}
      catch(err){return{success:false,url,error:err.message,links:[]};}
      finally{clearTimeout(timer);}
    }
    document.getElementById('runDofollowCheckBtn').addEventListener('click', async () => {
      const urls=extParseUrls(document.getElementById('dofollowCheckUrl').value);
      if(!urls.length) return;
      const filterDomain=extNormalizeDomain(document.getElementById('dofollowFilterDomain').value);
      const btn=document.getElementById('runDofollowCheckBtn'), progress=document.getElementById('dofollowCheckProgress'), resultsDiv=document.getElementById('dofollowCheckResults'), tbody=document.getElementById('dofollowCheckTableBody'), summaryDiv=document.getElementById('dofollowSummary'), exportBtn=document.getElementById('exportDofollowBtn');
      btn.disabled=true; dofollowData=[]; tbody.innerHTML=''; resultsDiv.style.display='block'; exportBtn.disabled=true;
      let totalDofollow=0,totalNofollow=0,totalSponsored=0,totalUgc=0,globalIdx=0; let pageNofollowPages=[];
      for(let i=0;i<urls.length;i++){
        progress.textContent=`正在检测第 ${i+1}/${urls.length} 个页面...`;
        const result=await checkDofollowSingle(urls[i]);
        if(!result.success||!result.links){const row=document.createElement('tr');row.innerHTML=`<td colspan="8" style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.08);color:#fb7185;font-size:12px;">❌ ${extEscapeHtml(urls[i])}：${extEscapeHtml(result.error||'检测失败')}</td>`;tbody.appendChild(row);continue;}
        if(result.pageNofollow) pageNofollowPages.push(urls[i]);
        let links=result.links||[];

        // Exclude internal links (same domain as source page)
        const excludeInternal=document.getElementById('dofollowExcludeInternal').checked;
        if(excludeInternal){
          const sourceDomain=extNormalizeDomain(urls[i]);
          links=links.filter(link=>{const td=extNormalizeDomain(link.targetUrl);return td!==sourceDomain&&!td.endsWith('.'+sourceDomain)&&!sourceDomain.endsWith('.'+td);});
        }

        // Filter by target domain
        if(filterDomain){links=links.filter(link=>{const ld=extNormalizeDomain(link.targetUrl);return ld===filterDomain||ld.endsWith('.'+filterDomain);});}

        links.forEach(link=>{
          globalIdx++;const isDf=link.dofollow==='Yes';if(isDf)totalDofollow++;else totalNofollow++;if(link.sponsored)totalSponsored++;if(link.ugc)totalUgc++;
          dofollowData.push({sourcePage:urls[i],anchorText:link.anchorText,targetUrl:link.targetUrl,dofollow:link.dofollow,rel:link.rel||'',sponsored:link.sponsored?'Yes':'',ugc:link.ugc?'Yes':''});
          const row=document.createElement('tr');
          row.innerHTML=`<td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);">${globalIdx}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);word-break:break-all;max-width:180px;font-size:11px;color:#9aa1b8;">${extEscapeHtml(urls[i])}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);max-width:180px;">${extEscapeHtml(link.anchorText)}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);word-break:break-all;color:#93c5fd;max-width:250px;">${extEscapeHtml(link.targetUrl)}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;"><span style="display:inline-block;padding:3px 8px;border-radius:6px;font-weight:600;font-size:11px;background:${isDf?'rgba(52,211,153,0.14)':'rgba(251,113,133,0.14)'};color:${isDf?'#34d399':'#fb7185'};">${isDf?'Dofollow':'Nofollow'}</span></td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;font-size:11px;color:#9aa1b8;">${extEscapeHtml(link.rel)||'—'}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;color:${link.sponsored?'#fbbf24':'#565e78'};">${link.sponsored?'⚠ Yes':'—'}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;color:${link.ugc?'#c4b5fd':'#565e78'};">${link.ugc?'Yes':'—'}</td>`;
          tbody.appendChild(row);
        });
      }
      const filterNote=filterDomain?`（已过滤，仅显示指向 ${filterDomain} 的链接）`:'';
      const pageNfNote=pageNofollowPages.length?`<br>⚠ 以下页面设置了页面级 meta nofollow，所有链接均被视为 nofollow：${pageNofollowPages.map(u=>'<b>'+extEscapeHtml(u)+'</b>').join('、')}`:'';
      summaryDiv.innerHTML=`共检测 <b>${urls.length}</b> 个页面，发现 <b>${globalIdx}</b> 条外部链接${filterNote}：<span style="color:#34d399;font-weight:700;">${totalDofollow} Dofollow</span> / <span style="color:#fb7185;font-weight:700;">${totalNofollow} Nofollow</span>${totalSponsored?` / <span style="color:#fbbf24;">${totalSponsored} Sponsored</span>`:''}${totalUgc?` / <span style="color:#c4b5fd;">${totalUgc} UGC</span>`:''}${pageNfNote}`;
      btn.disabled=false;exportBtn.disabled=false;progress.textContent='检测完成';
    });
    document.getElementById('clearDofollowCheckBtn').addEventListener('click',()=>{document.getElementById('dofollowCheckUrl').value='';document.getElementById('dofollowFilterDomain').value='';document.getElementById('dofollowCheckTableBody').innerHTML='';document.getElementById('dofollowCheckResults').style.display='none';document.getElementById('dofollowCheckProgress').textContent='';document.getElementById('dofollowSummary').innerHTML='';document.getElementById('exportDofollowBtn').disabled=true;dofollowData=[];});
    document.getElementById('exportDofollowBtn').addEventListener('click',()=>{if(!dofollowData.length)return;const rows=dofollowData.map(d=>[extCsvEscape(d.sourcePage),extCsvEscape(d.anchorText),extCsvEscape(d.targetUrl),extCsvEscape(d.dofollow),extCsvEscape(d.rel),extCsvEscape(d.sponsored),extCsvEscape(d.ugc)].join(','));extDownloadCsv('Dofollow检测结果.csv',['来源页面,锚文本,目标URL,Dofollow,rel属性,Sponsored,UGC',...rows].join('\n'));});

    /* ========== Module 3: Regex Generator ========== */

    // --- GSC ---
    function escapeRegexForGsc(str){return str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
    function generateGscRegex(urls,mode,trailingSlash){
      if(!urls.length)return'';
      const parts=urls.map(url=>{let part='';try{const p=new URL(url);if(mode==='path'){part=escapeRegexForGsc(p.pathname);}else if(mode==='flexible'){const d=p.hostname.replace(/^www\./,'');part='https?://(www\\.)?'+escapeRegexForGsc(d)+escapeRegexForGsc(p.pathname);}else{part=escapeRegexForGsc(url.replace(/\/$/,''));}}catch{part=escapeRegexForGsc(url);}part=part.replace(/\\\/$/, '');if(trailingSlash==='both'){part+='/?';}return part+'$';});
      if(parts.length===1)return parts[0]; return'('+parts.join('|')+')';
    }
    document.getElementById('generateGscRegexBtn').addEventListener('click',()=>{
      const urls=extParseUrls(document.getElementById('gscUrlList').value);if(!urls.length)return;
      const mode=document.getElementById('gscMatchMode').value,ts=document.getElementById('gscTrailingSlash').value;
      const regex=generateGscRegex(urls,mode,ts);
      document.getElementById('gscRegexOutput').textContent=regex;document.getElementById('gscRegexResult').style.display='block';document.getElementById('copyGscRegexBtn').disabled=false;
      const cl=regex.length,ul=urls.length,ok=cl<=4096;
      document.getElementById('gscRegexInfo').innerHTML=`共 <b>${ul}</b> 条 URL → 正则长度 <b>${cl}</b> 字符 ${ok?'<span style="color:#34d399;">（在 GSC 4096 字符限制内 ✓）</span>':'<span style="color:#fb7185;">（⚠ 超过 GSC 4096 字符限制，建议拆分为多次查询）</span>'}<br>使用方式：GSC → 效果 → 页面筛选 → 自定义(正则) → 粘贴上方正则`;
    });
    document.getElementById('copyGscRegexBtn').addEventListener('click',()=>{extCopyText(document.getElementById('gscRegexOutput').textContent,document.getElementById('gscRegexInfo'),'已复制正则表达式到剪贴板 ✓');});
    document.getElementById('clearGscBtn').addEventListener('click',()=>{document.getElementById('gscUrlList').value='';document.getElementById('gscRegexResult').style.display='none';document.getElementById('gscRegexOutput').textContent='';document.getElementById('gscRegexInfo').innerHTML='';document.getElementById('copyGscRegexBtn').disabled=true;});

    // --- GA4 AI Bot Regex (Brand-level keyword) ---
    const AI_BRANDS = [
      { brand:'ChatGPT (OpenAI)', icon:'🟢', keyword:'chatgpt', bots:[{ua:'GPTBot',desc:'GPT 模型训练与搜索爬虫'},{ua:'ChatGPT-User',desc:'ChatGPT 对话中的实时浏览'},{ua:'OAI-SearchBot',desc:'ChatGPT 搜索功能专用爬虫'}] },
      { brand:'Gemini (Google)', icon:'🔵', keyword:'gemini', bots:[{ua:'Google-Extended',desc:'Gemini 模型训练爬虫'},{ua:'GoogleOther',desc:'Google 非搜索用途通用爬虫'},{ua:'Google-CloudVertexBot',desc:'Vertex AI 搜索 Grounding 爬虫'}] },
      { brand:'Claude (Anthropic)', icon:'🟠', keyword:'claude', bots:[{ua:'ClaudeBot',desc:'Claude 模型训练爬虫'},{ua:'anthropic-ai',desc:'Anthropic 通用 AI 爬虫'},{ua:'Claude-Web',desc:'Claude 对话中的实时搜索爬虫'}] },
      { brand:'Copilot (Microsoft)', icon:'🟦', keyword:'copilot', bots:[{ua:'CopilotBot',desc:'Microsoft Copilot 搜索爬虫'},{ua:'BingBot',desc:'Bing 搜索爬虫，Copilot 依赖其索引'}] },
      { brand:'Perplexity', icon:'🟣', keyword:'perplexity', bots:[{ua:'PerplexityBot',desc:'Perplexity AI 搜索引擎爬虫'}] },
      { brand:'DeepSeek', icon:'🌊', keyword:'deepseek', bots:[{ua:'DeepSeekBot',desc:'DeepSeek 模型训练爬虫'},{ua:'DeepSeek',desc:'DeepSeek 对话实时搜索（部分场景）'}] },
      { brand:'Grok (xAI)', icon:'⚡', keyword:'grok', bots:[{ua:'xAI-Grok',desc:'Grok AI 模型训练爬虫'},{ua:'Grok',desc:'Grok 对话实时搜索（部分场景）'},{ua:'xAI',desc:'xAI 通用数据采集爬虫'}] },
      { brand:'豆包 Doubao (ByteDance)', icon:'🔴', keyword:'doubao|bytespider', bots:[{ua:'Bytespider',desc:'字节跳动通用爬虫，服务于豆包/TikTok/头条'},{ua:'Doubao',desc:'豆包 AI 对话爬虫'}] },
      { brand:'Meta AI', icon:'🔷', keyword:'meta', bots:[{ua:'Meta-ExternalAgent',desc:'Meta AI 模型训练爬虫'},{ua:'FacebookBot',desc:'Facebook/Meta 通用数据爬虫'},{ua:'meta-externalfetcher',desc:'Meta AI 对话实时内容抓取'}] },
      { brand:'Apple Intelligence', icon:'🍎', keyword:'applebot', bots:[{ua:'Applebot-Extended',desc:'Apple Intelligence / Siri AI 训练爬虫'},{ua:'Applebot',desc:'Apple 搜索与 Siri 通用爬虫'}] },
      { brand:'Amazon (Alexa AI)', icon:'📦', keyword:'amazonbot', bots:[{ua:'Amazonbot',desc:'Amazon Alexa AI / Amazon Q 训练爬虫'}] },
      { brand:'Cohere', icon:'🔶', keyword:'cohere', bots:[{ua:'cohere-ai',desc:'Cohere 模型训练爬虫'},{ua:'cohere-training',desc:'Cohere 训练数据专用爬虫'}] },
      { brand:'You.com', icon:'🔍', keyword:'youbot', bots:[{ua:'YouBot',desc:'You.com AI 搜索引擎爬虫'}] },
      { brand:'Common Crawl', icon:'🌐', keyword:'ccbot', bots:[{ua:'CCBot',desc:'开源 Common Crawl 数据集爬虫，被众多 AI 公司用于训练'}] },
      { brand:'Diffbot', icon:'🤖', keyword:'diffbot', bots:[{ua:'Diffbot',desc:'Diffbot AI 结构化数据提取爬虫'}] },
      { brand:'Huawei (花瓣搜索)', icon:'🌸', keyword:'petalbot', bots:[{ua:'PetalBot',desc:'华为花瓣搜索 / Celia AI 爬虫'}] },
      { brand:'Webz.io', icon:'📊', keyword:'omgili', bots:[{ua:'omgili',desc:'Webz.io 数据抓取爬虫，服务于多家 AI 公司'},{ua:'omgilibot',desc:'Omgili 论坛/讨论区爬虫'}] },
      { brand:'Hive AI', icon:'🐝', keyword:'imagesiftbot', bots:[{ua:'ImagesiftBot',desc:'Hive AI 图像/视频训练数据爬虫'}] },
      { brand:'iAsk.AI', icon:'❓', keyword:'iaskspider', bots:[{ua:'iaskspider',desc:'iAsk.AI 搜索引擎爬虫'}] },
      { brand:'Timpi', icon:'⏱', keyword:'timpibot', bots:[{ua:'Timpibot',desc:'Timpi 去中心化搜索引擎爬虫'}] },
      { brand:'Scrapy (通用框架)', icon:'🕷', keyword:'scrapy', bots:[{ua:'Scrapy',desc:'常见 Python 数据抓取框架默认 UA，被大量 AI 数据采集使用'}] }
    ];

    const aiBrandListEl = document.getElementById('aiBrandList');
    const selectedBrands = new Set();
    AI_BRANDS.forEach((brand, idx) => {
      const card = document.createElement('label');
      card.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.03);cursor:pointer;transition:.15s;font-size:12px;';
      card.innerHTML = `<input type="checkbox" value="${idx}" style="margin-top:3px;width:16px;height:16px;flex:0 0 auto;" /><div style="min-width:0;"><div style="font-weight:700;color:#f1ede4;font-size:13px;">${brand.icon} ${extEscapeHtml(brand.brand)}</div><div style="color:#93c5fd;font-size:11px;margin-top:2px;font-family:'Courier New',monospace;">${extEscapeHtml(brand.keyword)}</div></div>`;
      const cb = card.querySelector('input');
      cb.addEventListener('change', () => { if(cb.checked){selectedBrands.add(idx);card.style.borderColor='var(--primary)';card.style.background='var(--primary-soft)';}else{selectedBrands.delete(idx);card.style.borderColor='rgba(255,255,255,0.1)';card.style.background='rgba(255,255,255,0.03)';} });
      aiBrandListEl.appendChild(card);
    });
    document.getElementById('selectAllBrandsBtn').addEventListener('click',()=>{aiBrandListEl.querySelectorAll('input[type="checkbox"]').forEach(cb=>{cb.checked=true;cb.dispatchEvent(new Event('change'));});});
    document.getElementById('deselectAllBrandsBtn').addEventListener('click',()=>{aiBrandListEl.querySelectorAll('input[type="checkbox"]').forEach(cb=>{cb.checked=false;cb.dispatchEvent(new Event('change'));});});
    document.getElementById('generateGa4RegexBtn').addEventListener('click',()=>{
      if(!selectedBrands.size) return;
      const keywords=[],brandNames=[];
      Array.from(selectedBrands).sort((a,b)=>a-b).forEach(idx=>{const b=AI_BRANDS[idx];brandNames.push(b.brand);keywords.push(b.keyword);});
      const regex = keywords.join('|');
      document.getElementById('ga4RegexOutput').textContent=regex;document.getElementById('ga4RegexResult').style.display='block';document.getElementById('copyGa4RegexBtn').disabled=false;
      document.getElementById('ga4RegexInfo').innerHTML=`已选择 <b>${selectedBrands.size}</b> 个 AI 平台：${brandNames.join('、')}<br><br><b>GA4 使用方式：</b><br>1. GA4 管理 → 数据流 → 创建自定义维度（User-Agent 或 Session source）<br>2. 探索报告 → 添加过滤器 → 匹配类型选「正则匹配」→ 粘贴上方正则<br>3. 或在 GA4 数据过滤器 / Looker Studio 中使用<br><br><b>BigQuery 示例：</b><br><code style="background:rgba(212,171,104,0.14);color:#e6c98a;padding:2px 6px;border-radius:4px;">WHERE REGEXP_CONTAINS(source, r'${extEscapeHtml(regex)}')</code>`;
    });
    document.getElementById('copyGa4RegexBtn').addEventListener('click',()=>{extCopyText(document.getElementById('ga4RegexOutput').textContent,document.getElementById('ga4RegexInfo'),'已复制 GA4 正则到剪贴板 ✓');});

    // --- Build reference table ---
    const refTbody = document.getElementById('aiBotRefTableBody');
    AI_BRANDS.forEach(brand => {
      brand.bots.forEach((bot, i) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
        row.innerHTML = `<td style="padding:8px;font-weight:${i===0?'700':'400'};color:#f1ede4;">${i===0?brand.icon+' '+extEscapeHtml(brand.brand):''}</td><td style="padding:8px;font-family:'Courier New',monospace;color:#93c5fd;font-size:11px;">${extEscapeHtml(bot.ua)}</td><td style="padding:8px;color:#c9c3b4;">${extEscapeHtml(bot.desc)}</td><td style="padding:8px;text-align:center;color:#9aa1b8;font-size:11px;">可屏蔽</td>`;
        refTbody.appendChild(row);
      });
    });

    /* ========== Failed URL Recovery ========== */
    // Collect failed URLs after URL reading completes
    const _origExtractBtn = document.getElementById('extractFromUrlsBtn');
    if (_origExtractBtn) {
      const origClick = _origExtractBtn.onclick;
      // Observe the URL log for failed entries after reading completes
      const observer = new MutationObserver(() => {
        const logItems = document.querySelectorAll('#urlLogList .url-log-item.fail');
        const failedUrls = [];
        logItems.forEach(item => {
          const text = item.textContent || '';
          const urlMatch = text.match(/❌\s*\d+\/\d+\.\s*(https?:\/\/\S+?)：/);
          if (urlMatch) failedUrls.push(urlMatch[1]);
        });
        const recoveryDiv = document.getElementById('failedUrlRecovery');
        const select = document.getElementById('failedUrlSelect');
        if (failedUrls.length > 0) {
          recoveryDiv.style.display = 'block';
          select.innerHTML = '';
          failedUrls.forEach((url, i) => {
            const opt = document.createElement('option');
            opt.value = url;
            opt.textContent = `${i + 1}. ${url}`;
            select.appendChild(opt);
          });
        } else {
          recoveryDiv.style.display = 'none';
        }
      });
      const logList = document.getElementById('urlLogList');
      if (logList) observer.observe(logList, { childList: true, subtree: true });
    }

    // Copy selected failed URL
    document.getElementById('copyFailedUrlBtn').addEventListener('click', () => {
      const url = document.getElementById('failedUrlSelect').value;
      if (url) extCopyText(url, null);
    });

    // Parse pasted HTML and ADD to existing results
    document.getElementById('parseManualHtmlBtn').addEventListener('click', () => {
      const html = document.getElementById('manualHtmlInput').value.trim();
      const pageUrl = document.getElementById('failedUrlSelect').value || '';
      if (!html || !pageUrl) return;

      const summaryDiv = document.getElementById('manualHtmlSummary');
      const resultDiv = document.getElementById('manualHtmlResult');
      let manualFallbackNote = '';

      // Parse using existing function with auto-fallback
      let parsed;
      if (typeof extractLinksFromPageHtml === 'function') {
        const scope = document.getElementById('urlLinkScope') ? document.getElementById('urlLinkScope').value : 'content';
        parsed = extractLinksFromPageHtml(html, pageUrl, { scope });
        if ((!parsed.links || parsed.links.length === 0) && scope !== 'all') {
          parsed = extractLinksFromPageHtml(html, pageUrl, { scope: 'all' });
          if (parsed.links && parsed.links.length > 0) {
            manualFallbackNote = '（正文区域未识别到链接，已自动切换为整页读取）';
          }
        }
      } else {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const anchors = doc.querySelectorAll('a[href]');
        const links = []; const seen = new Set();
        anchors.forEach(a => {
          const href = a.getAttribute('href') || '';
          if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) return;
          let fullUrl = href;
          try { fullUrl = new URL(href, pageUrl).href; } catch {}
          const text = (a.textContent || '').replace(/\s+/g, ' ').trim() || fullUrl;
          const key = text.toLowerCase() + '||' + fullUrl;
          if (seen.has(key)) return; seen.add(key);
          links.push({ anchorText: text, targetUrl: fullUrl });
        });
        parsed = { title: ((doc.querySelector('h1') || doc.querySelector('title') || {}).textContent || '').replace(/\s+/g, ' ').trim(), links };
      }

      // Apply domain filter
      let links = parsed.links || [];
      let preFilterCount = links.length;
      const targetDomainFilter = document.getElementById('targetDomainFilter');
      let domainFilterActive = false;
      if (targetDomainFilter && targetDomainFilter.value.trim()) {
        const domains = targetDomainFilter.value.trim().split(/\r?\n/).map(d => extNormalizeDomain(d)).filter(Boolean);
        if (domains.length) {
          domainFilterActive = true;
          links = links.filter(link => {
            const ld = extNormalizeDomain(link.targetUrl);
            return domains.some(d => ld === d || ld.endsWith('.' + d));
          });
        }
      }
      const filterNote = (domainFilterActive && links.length === 0 && preFilterCount > 0)
        ? `<br>⚠ 页面共解析到 <b>${preFilterCount}</b> 条链接，但经域名过滤后为 0 条（该页面上没有指向你目标域名的链接）。`
        : (domainFilterActive && preFilterCount > links.length)
          ? `（域名过滤：${preFilterCount} → ${links.length}）`
          : '';

      resultDiv.style.display = 'block';

      // Add to existing articles array and re-render
      if (typeof articles !== 'undefined' && typeof renderTable === 'function') {
        // Find and replace the failed placeholder for this URL
        let replaced = false;
        for (let i = 0; i < articles.length; i++) {
          if (articles[i].source === 'urlReaderFailed' && (articles[i].customPublishedUrl === pageUrl || articles[i].fileName === pageUrl)) {
            articles[i].title = parsed.title || '';
            articles[i].links = links;
            articles[i].source = 'manualHtml';
            articles[i].segmentation = 'manual-paste';
            articles[i].manualPlaceholderRows = links.length ? 0 : 3;
            articles[i].warningCount = 0;
            articles[i].messages = [];
            replaced = true;
            break;
          }
        }
        if (!replaced) {
          articles.push({
            fileName: pageUrl, articleIndexInFile: 1, hashNumber: null,
            title: parsed.title || '', links: links, source: 'manualHtml',
            segmentation: 'manual-paste', customPublishedUrl: pageUrl,
            customAuthority: typeof getAuthorityForUrl === 'function' ? getAuthorityForUrl(pageUrl) : '',
            keepEmptyRow: true, manualPlaceholderRows: links.length ? 0 : 3,
            warningCount: 0, messages: []
          });
        }
        renderTable();
        summaryDiv.innerHTML = `✅ <b>${pageUrl}</b> → 解析到 <b>${links.length}</b> 条链接${manualFallbackNote}，已${replaced ? '替换失败记录并' : ''}添加到结果表格。${filterNote}`;
      } else {
        summaryDiv.innerHTML = `解析到 <b>${links.length}</b> 条链接${manualFallbackNote}。${filterNote}`;
      }

      // Only remove from dropdown if we got actual links after filtering
      if (links.length > 0) {
        const select = document.getElementById('failedUrlSelect');
        const optToRemove = select.querySelector(`option[value="${CSS.escape(pageUrl)}"]`);
        if (optToRemove) optToRemove.remove();
        Array.from(select.options).forEach((opt, i) => {
          opt.textContent = `${i + 1}. ${opt.value}`;
        });
        if (select.options.length === 0) {
          document.getElementById('failedUrlRecovery').style.display = 'none';
        }
      }
      // Clear the textarea for next paste
      document.getElementById('manualHtmlInput').value = '';
    });

    document.getElementById('clearManualHtmlBtn').addEventListener('click', () => {
      document.getElementById('manualHtmlInput').value = '';
      document.getElementById('manualHtmlResult').style.display = 'none';
    });

    /* ========== Operation Area Tab Switching ========== */
    (function() {
      const tabMap = {
        urlRead: document.getElementById('opPanelUrlRead'),
        baseSetting: document.getElementById('opPanelBaseSetting'),
        siteSetting: document.getElementById('opPanelSiteSetting'),
        exportSetting: document.getElementById('opPanelExportSetting')
      };
      document.querySelectorAll('.op-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.op-tab').forEach(t => {
            t.style.borderBottomColor = 'transparent';
            t.style.color = 'var(--muted)';
            t.classList.remove('active');
          });
          tab.style.borderBottomColor = 'var(--primary)';
          tab.style.color = 'var(--primary)';
          tab.classList.add('active');
          Object.values(tabMap).forEach(p => { if(p) p.style.display = 'none'; });
          const key = tab.dataset.optab;
          if(tabMap[key]) tabMap[key].style.display = 'block';
        });
      });
    })();

    /* ========== Module 4: Batch Index Check ========== */
    let idxCheckData = [];
    let idxAbortFlag = false;

    // Sync range / number inputs
    document.getElementById('idxConcurrencyRange').addEventListener('input', function(){ document.getElementById('idxConcurrency').value=this.value; });
    document.getElementById('idxConcurrency').addEventListener('input', function(){ const v=Math.max(1,Math.min(5,parseInt(this.value)||1)); this.value=v; document.getElementById('idxConcurrencyRange').value=v; });
    document.getElementById('idxDelayRange').addEventListener('input', function(){ document.getElementById('idxDelay').value=this.value; });
    document.getElementById('idxDelay').addEventListener('input', function(){ const v=Math.max(500,Math.min(30000,parseInt(this.value)||3000)); this.value=v; document.getElementById('idxDelayRange').value=Math.min(v,10000); });
    document.getElementById('idxUrlList').addEventListener('input', function(){ document.getElementById('idxUrlCount').textContent=extParseUrls(this.value).length+' 条 URL'; });

    // Filter buttons
    document.querySelectorAll('.idx-filter-btn').forEach(btn=>{
      btn.addEventListener('click',function(){
        document.querySelectorAll('.idx-filter-btn').forEach(b=>{b.classList.remove('active');b.style.background='rgba(255,255,255,0.03)';b.style.color='#c9c3b4';});
        this.classList.add('active');this.style.background='rgba(201,161,91,0.85)';this.style.color='#1a1509';
        const filter=this.dataset.filter;
        document.querySelectorAll('#idxTableBody tr').forEach(row=>{
          if(filter==='all'){row.style.display='';return;}
          const cat=row.dataset.category||'';
          if(filter==='problem') row.style.display=(cat!=='indexed')?'':'none';
          else row.style.display=cat===filter?'':'none';
        });
      });
    });

    function idxVerdictLabel(v) {
      const map = {
        indexed:        { text:'已收录', color:'#34d399', bg:'rgba(52,211,153,0.14)', icon:'✅' },
        not_indexed:    { text:'未收录', color:'#fb7185', bg:'rgba(251,113,133,0.14)', icon:'❌' },
        not_indexable:  { text:'不可索引', color:'#fbbf24', bg:'rgba(251,191,36,0.14)', icon:'⚠️' },
        robots_blocked: { text:'robots阻止', color:'#c4b5fd', bg:'rgba(196,181,253,0.14)', icon:'🤖' },
        check_limited:  { text:'查询受限', color:'#9aa1b8', bg:'rgba(255,255,255,0.06)', icon:'🚫' },
        uncertain:      { text:'待确认', color:'#9aa1b8', bg:'rgba(255,255,255,0.06)', icon:'❓' },
        error:          { text:'错误', color:'#fb7185', bg:'rgba(251,113,133,0.14)', icon:'💥' }
      };
      return map[v] || map['uncertain'];
    }
    function idxEngineLabel(status) {
      if(!status) return { text:'—', color:'#9aa1b8', bg:'rgba(255,255,255,0.06)' };
      const map = {
        indexed:     { text:'已收录', color:'#34d399', bg:'rgba(52,211,153,0.14)' },
        not_indexed: { text:'未收录', color:'#fb7185', bg:'rgba(251,113,133,0.14)' },
        blocked:     { text:'受限', color:'#fbbf24', bg:'rgba(251,191,36,0.14)' },
        uncertain:   { text:'未知', color:'#9aa1b8', bg:'rgba(255,255,255,0.06)' },
        error:       { text:'错误', color:'#fb7185', bg:'rgba(251,113,133,0.14)' }
      };
      return map[status] || map['uncertain'];
    }

    async function checkIndexSingle(url, engine, skipPage) {
      const params = new URLSearchParams({ url, engine, skipPage: skipPage?'1':'0' });
      const apiUrl = `${window.location.origin}/api/check-index?${params}`;
      const controller = new AbortController();
      const timer = setTimeout(()=>controller.abort(), 35000);
      try {
        const resp = await fetch(apiUrl, { signal:controller.signal, cache:'no-store', headers: window.authHeaders() });
        return await resp.json();
      } catch(err) {
        return { success:false, url, error: err.name==='AbortError'?'请求超时':err.message, verdict:'error' };
      } finally { clearTimeout(timer); }
    }

    document.getElementById('runIndexCheckBtn').addEventListener('click', async ()=>{
      const urls = extParseUrls(document.getElementById('idxUrlList').value);
      if(!urls.length) return alert('请输入至少一个 URL');

      const useGoogle = document.getElementById('idxUseGoogle').checked;
      const useBing = document.getElementById('idxUseBing').checked;
      if(!useGoogle && !useBing) return alert('请至少选择一个搜索引擎');
      const engine = (useGoogle && useBing) ? 'all' : useGoogle ? 'google' : 'bing';
      const analyzePage = document.getElementById('idxAnalyzePage').checked;
      const concurrency = Math.max(1, Math.min(5, parseInt(document.getElementById('idxConcurrency').value)||1));
      const delayMs = Math.max(500, parseInt(document.getElementById('idxDelay').value)||3000);

      const btn=document.getElementById('runIndexCheckBtn'), stopBtn=document.getElementById('stopIndexCheckBtn');
      const progress=document.getElementById('idxProgress'), tbody=document.getElementById('idxTableBody');
      const resultsDiv=document.getElementById('idxResults'), exportBtn=document.getElementById('exportIndexCheckBtn');

      btn.disabled=true; stopBtn.disabled=false; idxAbortFlag=false;
      idxCheckData=[]; tbody.innerHTML=''; resultsDiv.style.display='block'; exportBtn.disabled=true;
      document.getElementById('idxSummaryBar').style.display='none';
      // Reset filters
      document.querySelectorAll('.idx-filter-btn').forEach(b=>{b.classList.remove('active');b.style.background='rgba(255,255,255,0.03)';b.style.color='#c9c3b4';});
      const allBtn=document.querySelector('.idx-filter-btn[data-filter="all"]');
      allBtn.classList.add('active');allBtn.style.background='#93c5fd';allBtn.style.color='#fff';

      const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      let done=0;

      async function worker(url, index) {
        if(idxAbortFlag) return;
        if(index > 0) await sleep(delayMs);
        if(idxAbortFlag) return;

        progress.textContent=`查询进度：${done+1}/${urls.length}（正在查询第 ${index+1} 个…）`;
        const result = await checkIndexSingle(url, engine, !analyzePage);
        if(idxAbortFlag) return;
        done++;

        const verdict = result.verdict || 'error';
        const vl = idxVerdictLabel(verdict);
        const gl = result.google ? idxEngineLabel(result.google.status) : { text:'—', color:'#9aa1b8', bg:'rgba(255,255,255,0.05)' };
        const bl = result.bing ? idxEngineLabel(result.bing.status) : { text:'—', color:'#9aa1b8', bg:'rgba(255,255,255,0.05)' };
        const page = result.page || {};
        const robots = result.robots || {};
        const httpStatus = page.httpStatus || '—';
        const indexable = page.indexable===true ? '✅' : page.indexable===false ? '❌' : '—';
        const indexableColor = page.indexable===true ? '#34d399' : page.indexable===false ? '#fb7185' : '#9aa1b8';
        const robotsText = robots.blocked ? '❌ 阻止' : robots.robotsFound===false ? '—' : '✅ 允许';
        const robotsColor = robots.blocked ? '#fb7185' : '#34d399';

        // Build notes
        const notes = [];
        if(result.error) notes.push(result.error);
        if(page.blockReasons && page.blockReasons.length) notes.push(...page.blockReasons);
        if(robots.blocked) notes.push('robots.txt: ' + (robots.matchedRule||'blocked'));
        if(result.google && result.google.status==='blocked') notes.push('Google 查询受限');
        if(result.bing && result.bing.status==='blocked') notes.push('Bing 查询受限');
        if(page.canonical && !page.canonicalIsSelf) notes.push('canonical → ' + page.canonical);
        const notesStr = notes.join('；') || '—';

        // Category for filtering
        let filterCat = verdict === 'indexed' ? 'indexed' : verdict === 'not_indexed' ? 'not_indexed' : 'problem';

        idxCheckData[index] = {
          url, verdict: vl.text,
          google: gl.text, googleDetail: result.google ? result.google.detail : '',
          bing: bl.text, bingDetail: result.bing ? result.bing.detail : '',
          httpStatus, indexable: page.indexable===true?'Yes':page.indexable===false?'No':'—',
          robotsBlocked: robots.blocked?'Yes':'No',
          title: page.title||'', canonical: page.canonical||'',
          canonicalIsSelf: page.canonicalIsSelf===true?'Yes':page.canonicalIsSelf===false?'No':'—',
          noindex: page.metaRobotsNoindex?'Yes':'No',
          notes: notesStr,
          filterCat
        };

        const row = document.createElement('tr');
        row.dataset.category = filterCat;
        row.innerHTML = `
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);">${index+1}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);word-break:break-all;max-width:260px;font-size:11px;"><a href="${extEscapeHtml(url)}" target="_blank" rel="noopener" style="color:#93c5fd;text-decoration:none;">${extEscapeHtml(url)}</a>${page.title?'<br><span style="color:#9aa1b8;font-size:10px;">'+extEscapeHtml(page.title.slice(0,60))+'</span>':''}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;"><span style="display:inline-block;padding:3px 8px;border-radius:6px;background:${vl.bg};color:${vl.color};font-weight:600;font-size:11px;">${vl.icon} ${vl.text}</span></td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;"><span style="display:inline-block;padding:2px 6px;border-radius:5px;background:${gl.bg};color:${gl.color};font-size:11px;font-weight:600;" title="${extEscapeHtml(result.google?result.google.detail:'')}">${gl.text}</span></td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;"><span style="display:inline-block;padding:2px 6px;border-radius:5px;background:${bl.bg};color:${bl.color};font-size:11px;font-weight:600;" title="${extEscapeHtml(result.bing?result.bing.detail:'')}">${bl.text}</span></td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;font-weight:700;color:${httpStatus>=200&&httpStatus<300?'#34d399':httpStatus>=400?'#fb7185':'#9aa1b8'};">${httpStatus}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;color:${indexableColor};font-weight:600;">${indexable}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;color:${robotsColor};font-size:11px;font-weight:600;">${robotsText}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:11px;color:#9aa1b8;max-width:220px;word-break:break-all;">${extEscapeHtml(notesStr)}</td>
        `;
        tbody.appendChild(row);
        progress.textContent=`查询进度：${done}/${urls.length}`;
      }

      let nextIdx=0;
      async function runner(){ while(nextIdx<urls.length && !idxAbortFlag){ const i=nextIdx++; await worker(urls[i],i); } }
      await Promise.all(Array.from({length:Math.min(concurrency,urls.length)},()=>runner()));

      btn.disabled=false; stopBtn.disabled=true;
      if(idxAbortFlag) { progress.textContent=`已停止，完成 ${done}/${urls.length}`; }

      // Summary
      const valid=idxCheckData.filter(Boolean);
      document.getElementById('idxStatTotal').textContent=valid.length;
      document.getElementById('idxStatIndexed').textContent=valid.filter(d=>d.filterCat==='indexed').length;
      document.getElementById('idxStatNotIndexed').textContent=valid.filter(d=>d.filterCat==='not_indexed').length;
      document.getElementById('idxStatNotIndexable').textContent=valid.filter(d=>d.verdict==='不可索引').length;
      document.getElementById('idxStatRobotsBlocked').textContent=valid.filter(d=>d.verdict==='robots阻止').length;
      document.getElementById('idxStatUncertain').textContent=valid.filter(d=>d.verdict==='查询受限'||d.verdict==='待确认'||d.verdict==='错误').length;
      document.getElementById('idxSummaryBar').style.display='block';
      exportBtn.disabled=false;
      if(!idxAbortFlag) progress.textContent='查询完成';
    });

    document.getElementById('stopIndexCheckBtn').addEventListener('click',()=>{ idxAbortFlag=true; document.getElementById('stopIndexCheckBtn').disabled=true; });

    document.getElementById('clearIndexCheckBtn').addEventListener('click',()=>{
      document.getElementById('idxUrlList').value=''; document.getElementById('idxTableBody').innerHTML='';
      document.getElementById('idxResults').style.display='none'; document.getElementById('idxProgress').textContent='';
      document.getElementById('exportIndexCheckBtn').disabled=true; document.getElementById('idxSummaryBar').style.display='none';
      document.getElementById('idxUrlCount').textContent='0 条 URL'; idxCheckData=[];
    });

    document.getElementById('exportIndexCheckBtn').addEventListener('click',()=>{
      if(!idxCheckData.length) return;
      const header='URL,综合判定,Google,Google详情,Bing,Bing详情,HTTP状态码,可索引,robots阻止,Noindex,页面标题,Canonical,Canonical自指,问题备注';
      const rows=idxCheckData.filter(Boolean).map(d=>[
        extCsvEscape(d.url),extCsvEscape(d.verdict),extCsvEscape(d.google),extCsvEscape(d.googleDetail),
        extCsvEscape(d.bing),extCsvEscape(d.bingDetail),extCsvEscape(d.httpStatus),extCsvEscape(d.indexable),
        extCsvEscape(d.robotsBlocked),extCsvEscape(d.noindex),extCsvEscape(d.title),extCsvEscape(d.canonical),
        extCsvEscape(d.canonicalIsSelf),extCsvEscape(d.notes)
      ].join(','));
      extDownloadCsv(`收录查询结果_${new Date().toISOString().slice(0,10)}.csv`,[header,...rows].join('\n'));
    });

  })();