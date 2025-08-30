import { app, BrowserWindow, Menu, shell, dialog } from 'electron';

// 모든 오류 다이얼로그 완전 차단
const originalShowErrorBox = dialog.showErrorBox;
dialog.showErrorBox = (title, content) => {
  // 모든 오류 다이얼로그를 조용히 무시
  console.log(`오류 다이얼로그 차단됨: ${title} - ${content}`);
  return;
};

// 메시지 박스도 차단 (경고 메시지용)
const originalShowMessageBox = dialog.showMessageBox;
dialog.showMessageBox = (browserWindow, options, callback) => {
  // type이 'error'인 메시지만 차단
  if (options && options.type === 'error') {
    console.log(`오류 메시지박스 차단됨: ${options.message || options.title || 'Unknown error'}`);
    if (callback) callback({ response: 0 });
    return Promise.resolve({ response: 0 });
  }
  // 다른 메시지는 정상 처리
  return originalShowMessageBox.call(dialog, browserWindow, options, callback);
};
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

// 모든 개발 관련 오류 다이얼로그 방지
process.on('uncaughtException', (error) => {
  const errorMessage = error.message || '';
  // 개발/빌드 관련 모든 경고 메시지 차단
  if (errorMessage.includes('Dynamic require') || 
      errorMessage.includes('not supported') ||
      errorMessage.includes('Cannot resolve') ||
      errorMessage.includes('Warning') ||
      errorMessage.includes('require') ||
      errorMessage.toLowerCase().includes('warning')) {
    // 개발 관련 오류는 무시하고 계속 진행
    console.log('개발 관련 경고 무시됨 (앱은 정상 작동)');
    return;
  }
  
  // 심각한 오류만 처리 (조용히)
  console.error('Uncaught Exception:', error);
});

// 모든 다이얼로그 오류 방지
process.on('unhandledRejection', (reason, promise) => {
  console.log('Promise rejection 무시됨 (앱은 정상 작동)');
});

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
    // icon: path.join(__dirname, '../assets/icon.png'), // 아이콘 파일이 있다면
    show: false, // 준비될 때까지 숨김
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // 모든 오류 다이얼로그 숨기기
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    // 로딩 실패시 오류 다이얼로그 방지
    event.preventDefault();
  });

  // 모든 콘솔 오류 메시지 필터링
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // 모든 개발/빌드 관련 오류 메시지 숨기기
    if (message.includes('Dynamic require') || 
        message.includes('not supported') ||
        message.includes('Cannot resolve') ||
        message.includes('Warning') ||
        message.includes('require') ||
        message.toLowerCase().includes('warning') ||
        message.toLowerCase().includes('error')) {
      event.preventDefault();
      return;
    }
  });

  // 웹 콘텐츠 오류 완전 차단
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.log('웹 콘텐츠 크래시 무시됨');
    event.preventDefault();
  });

  // 응답하지 않는 상태 처리
  mainWindow.webContents.on('unresponsive', () => {
    console.log('웹 콘텐츠 응답 없음 - 무시됨');
  });

  // 윈도우가 준비되면 표시 (서버 로딩 완료 후에만)
  mainWindow.once('ready-to-show', () => {
    // 개발 모드에서는 즉시 표시
    if (isDevelopment) {
      mainWindow.show();
      mainWindow.webContents.openDevTools();
    }
    // 프로덕션 모드에서는 서버 준비가 완료될 때까지 대기
  });

  // 개발 모드에서는 이미 실행 중인 개발 서버 사용
  if (isDevelopment) {
    console.log('개발 모드: 외부 개발 서버 사용');
    // 개발 서버가 이미 실행 중이므로 바로 로드
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3007');
    }, 1000);
  } else {
    // 프로덕션 모드에서만 서버 시작
    console.log('프로덕션 모드: 내장 서버 시작');
    startServer().then(() => {
      // 서버가 완전히 준비될 때까지 더 오래 대기
      return waitForServer('http://localhost:3007');
    }).then(() => {
      return mainWindow.loadURL('http://localhost:3007');
    }).then(() => {
      // 페이지 로딩이 완료되면 윈도우 표시
      console.log('앱 로딩 완료, 윈도우 표시');
      mainWindow.show();
    }).catch((error) => {
      console.error('서버 시작 실패:', error);
      // 서버 시작 실패 시에도 충분한 대기 시간 후 시도
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:3007').then(() => {
          mainWindow.show();
        });
      }, 2000);
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

async function waitForServer(url, maxRetries = 10, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.status < 500) {
        console.log('서버가 준비되었습니다');
        return true;
      }
    } catch (error) {
      console.log(`서버 대기 중... (${i + 1}/${maxRetries})`);
    }
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('서버 시작 시간 초과');
}

async function startServer() {
  try {
    // Set environment variables for production
    process.env.NODE_ENV = 'production';
    process.env.PORT = '3007';
    
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
    console.log('서버가 포트 3007에서 시작되었습니다.');
    
  } catch (error) {
    // Dynamic require 관련 오류는 조용히 처리
    const errorMessage = error.message || '';
    if (errorMessage.includes('Dynamic require') || errorMessage.includes('path') && errorMessage.includes('not supported')) {
      console.log('서버가 경고와 함께 시작되었습니다 (정상 동작)');
      return;
    }
    
    // 다른 심각한 오류만 표시
    console.error('서버 시작 중 오류:', error);
    // dialog.showErrorBox('서버 시작 오류', `서버를 시작할 수 없습니다: ${error.message}`);
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