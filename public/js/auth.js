// 共用驗證函式庫
class AuthManager {
    constructor() {
        this.user = null;
        this.liff = null;
        this.LIFF_ID = '2008786875-F7ifLsbN'; // 你的 LIFF ID
    }
    
    // 初始化 LIFF
    async initLiff() {
        if (typeof liff === 'undefined') {
            console.warn('LIFF SDK 未載入，使用模擬模式');
            return this.initMockLiff();
        }
        
        try {
            await liff.init({ liffId: this.LIFF_ID });
            this.liff = liff;
            console.log('LIFF 初始化成功，環境:', liff.isInClient() ? 'Line App' : '外部瀏覽器');
            return true;
        } catch (error) {
            console.error('LIFF 初始化失敗，使用模擬模式:', error);
            return this.initMockLiff();
        }
    }
    
    // 模擬 LIFF（開發用）
    initMockLiff() {
        console.log('使用模擬 LIFF 模式');
        this.liff = {
            init: () => Promise.resolve(),
            isLoggedIn: () => false,
            isInClient: () => false,
            login: () => {
                alert('模擬登入：請在 Line Developers 設定正確的 LIFF ID');
                return Promise.resolve();
            },
            getProfile: () => Promise.resolve({
                userId: 'mock_' + Date.now(),
                displayName: '測試使用者',
                pictureUrl: '',
                statusMessage: '這是測試帳號'
            }),
            getIDToken: () => 'mock_token_' + Math.random().toString(36).substr(2),
            logout: () => Promise.resolve()
        };
        return true;
    }
    
    // 檢查登入狀態
    checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
        const userData = localStorage.getItem('user_data');
        
        if (isLoggedIn && userData) {
            try {
                this.user = JSON.parse(userData);
                return true;
            } catch (e) {
                console.error('解析使用者資料失敗:', e);
            }
        }
        
        return false;
    }
    
    // 取得當前使用者
    getCurrentUser() {
        if (!this.user) {
            this.checkLoginStatus();
        }
        return this.user;
    }
    
    // 更新使用者資料
    updateUserData(newData) {
        const currentData = this.getCurrentUser() || {};
        const updatedData = { ...currentData, ...newData };
        
        this.user = updatedData;
        localStorage.setItem('user_data', JSON.stringify(updatedData));
        return updatedData;
    }
    
    // Line 登入
    async lineLogin() {
        try {
            if (!this.liff) {
                await this.initLiff();
            }
            
            if (!this.liff.isLoggedIn()) {
                await this.liff.login();
            }
            
            const profile = await this.liff.getProfile();
            const idToken = this.liff.getIDToken ? this.liff.getIDToken() : null;
            
            const userData = {
                userId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl || '',
                statusMessage: profile.statusMessage || '',
                idToken: idToken,
                loginMethod: 'line',
                loginTime: new Date().toISOString()
            };
            
            this.user = userData;
            localStorage.setItem('user_data', JSON.stringify(userData));
            localStorage.setItem('is_logged_in', 'true');
            
            return userData;
            
        } catch (error) {
            console.error('Line 登入失敗:', error);
            
            // 如果失敗，使用體驗模式
            if (confirm('Line 登入失敗，是否使用體驗模式？')) {
                return this.demoLogin();
            }
            
            throw error;
        }
    }
    
    // 體驗模式（開發用）
    demoLogin() {
        const demoUser = {
            userId: 'demo_' + Date.now(),
            displayName: '體驗會員',
            pictureUrl: '',
            statusMessage: '這是體驗帳號',
            loginMethod: 'demo',
            loginTime: new Date().toISOString()
        };
        
        this.user = demoUser;
        localStorage.setItem('user_data', JSON.stringify(demoUser));
        localStorage.setItem('is_logged_in', 'true');
        
        alert('已進入體驗模式！');
        return demoUser;
    }
    
    // 登出
    logout() {
        // 如果使用 LIFF 登入，呼叫 LIFF 登出
        if (this.liff && this.liff.logout && this.liff.isLoggedIn()) {
            this.liff.logout();
        }
        
        // 清除本地儲存
        localStorage.removeItem('user_data');
        localStorage.removeItem('is_logged_in');
        localStorage.removeItem('return_url');
        this.user = null;
        
        // 跳轉到登入頁
        window.location.href = '/Sports/auth/login.html';
    }
    
    // 檢查權限
    isAdmin() {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        // 這裡可以設定管理員名單
        const adminUsers = [
            'U1234567890abcdef1234567890abcdef', // 範例管理員 ID
            'demo_001' // 體驗模式管理員
        ];
        
        return adminUsers.includes(user.userId) || user.role === 'admin';
    }
    
    // 要求登入
    requireLogin(redirectUrl = '/Sports/auth/login.html') {
        if (this.checkLoginStatus()) {
            return true;
        }
        
        // 儲存當前頁面，登入後可以返回
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('return_url', currentUrl);
        
        // 跳轉到登入頁
        window.location.href = redirectUrl;
        return false;
    }
    
    // 要求管理員權限
    requireAdmin(redirectUrl = '/Sports/dashboard/index.html') {
        if (!this.requireLogin()) {
            return false;
        }
        
        if (!this.isAdmin()) {
            alert('此功能需要管理員權限');
            window.location.href = redirectUrl;
            return false;
        }
        
        return true;
    }
    
    // 檢查是否在 Line App 內
    isInLineApp() {
        return this.liff && this.liff.isInClient ? this.liff.isInClient() : false;
    }
}

// 建立全域實例
const auth = new AuthManager();

// 自動檢查登入狀態
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化 LIFF
    await auth.initLiff();
    
    // 檢查登入狀態
    auth.checkLoginStatus();
    
    // 如果有返回網址，登入後跳轉回去
    if (auth.checkLoginStatus() && localStorage.getItem('return_url')) {
        const returnUrl = localStorage.getItem('return_url');
        
        // 確認不是當前頁面
        if (returnUrl && returnUrl !== window.location.pathname) {
            localStorage.removeItem('return_url');
            setTimeout(() => {
                window.location.href = returnUrl;
            }, 100);
        }
    }
    
    // 全域登出函式
    window.logout = () => auth.logout();
});
