export const metadata = {
  title: '没什么用的助手',
  description: '外链汇总辅助工具 · SEO工具箱',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="google-site-verification" content="IrUTyoUs-anyU6ag-vf1eAqPwrIOezhubnRO1Mmmllw" />
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-582QBDMV');` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* 外部依赖库 */}
        <script src="https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js" />
        <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js" />
        {/* 主逻辑：原 index.html 里所有 <script> 内容，打包进 public/app.js */}
        <script src="/app.js" defer />
      </head>
      <body>
        {/* GTM noscript */}
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-582QBDMV" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
        </noscript>
        {children}
      </body>
    </html>
  );
}
