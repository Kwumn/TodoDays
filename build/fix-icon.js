/**
 * 图标水印修复脚本：用 Electron 离屏 Canvas 处理 build/icon-src.png → build/icon.png
 * 运行：npx electron build/fix-icon.js
 */
const { app, BrowserWindow } = require('electron')
const { writeFileSync } = require('node:fs')
const path = require('node:path')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: false, webSecurity: false, contextIsolation: true }
  })
  await win.loadFile(path.join(__dirname, 'fix-icon.html'))

  let dataUrl = null
  let err = null
  for (let i = 0; i < 60 && !dataUrl; i++) {
    await new Promise((r) => setTimeout(r, 200))
    err = await win.webContents.executeJavaScript('window.__err || null')
    dataUrl = await win.webContents.executeJavaScript('window.__result || null')
    if (err) break
  }

  if (!dataUrl) {
    console.error('ICON_FAILED:', err ?? 'timeout')
    app.exit(1)
    return
  }
  const base64 = dataUrl.split(',')[1]
  writeFileSync(path.join(__dirname, 'icon.png'), Buffer.from(base64, 'base64'))
  console.log('ICON_OK size=', Buffer.from(base64, 'base64').length)
  app.exit(0)
})
