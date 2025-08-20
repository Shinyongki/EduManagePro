import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object
let mainWindow;
let serverProcess;

const isDevelopment = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'), // 아이콘 파일이 있다면
    show: false, // 준비될 때까지 숨김
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 개발 모드에서는 개발자 도구 열기
    if (isDevelopment) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 개발 모드에서는 이미 실행 중인 개발 서버 사용
  if (isDevelopment) {
    console.log('개발 모드: 외부 개발 서버 사용');
    // 개발 서버가 이미 실행 중이므로 바로 로드
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3006');
    }, 1000);
  } else {
    // 프로덕션 모드에서만 서버 시작
    console.log('프로덕션 모드: 내장 서버 시작');
    startServer().then(() => {
      // 서버 시작 후 잠시 대기 후 로드
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:3006');
      }, 1000);
    }).catch((error) => {
      console.error('서버 시작 실패:', error);
      // 서버 시작 실패 시 외부 서버 시도
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:3006');
      }, 1000);
    });
  }

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 윈도우가 닫힐 때
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startServer() {
  try {
    // Set environment variables for production
    process.env.NODE_ENV = 'production';
    process.env.PORT = '5000';
    
    const serverPath = path.join(__dirname, '../dist/index.js');
    
    if (!fs.existsSync(serverPath)) {
      dialog.showErrorBox('서버 파일을 찾을 수 없습니다', '애플리케이션을 다시 설치해주세요.');
      return;
    }

    // Import and start the server module directly in the main process
    console.log('서버 시작 중...');
    // Convert Windows path to file:// URL for ES module import
    const serverUrl = new URL(`file:///${serverPath.replace(/\\/g, '/')}`).href;
    await import(serverUrl);
    console.log('서버가 포트 5000에서 시작되었습니다.');
    
  } catch (error) {
    console.error('서버 시작 중 오류:', error);
    dialog.showErrorBox('서버 시작 오류', `서버를 시작할 수 없습니다: ${error.message}`);
  }
}

// 애플리케이션 메뉴 설정
function createMenu() {
  const template = [
    {
      label: '파일',
      submenu: [
        {
          label: '새로 고침',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        },
        {
          label: '개발자 도구',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        { type: 'separator' },
        {
          label: '종료',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '정보',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '교육-종사자 연동분석 시스템',
              message: '교육-종사자 연동분석 시스템',
              detail: '버전: 1.0.0\n교육 데이터와 종사자 데이터를 연동하여 종합적인 분석을 제공합니다.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 앱이 준비되면 윈도우 생성
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    // macOS에서 독에서 앱 아이콘을 클릭할 때
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 윈도우가 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 앱이 종료될 때
app.on('before-quit', () => {
  console.log('애플리케이션 종료');
});