/**
 * Created by jsroads on 2020/6/11.7:25 下午
 * Note:
 */

export default class Browser {
    //本地时间和服务器时间间隔
    public static timeInterval: number = 0;
    /** 是否用户id和密码登录 环境（待定）。*/
    public static onUserKey: boolean = false;
    /** 是否Android 环境。*/
    public static onAndroid: boolean = true;
    /** 是否Web 环境。*/
    public static onWeb: boolean = false;
    /** 是否iOS 环境。*/
    public static onIOS: boolean = true;

    public static get now(): number {
        return Math.floor(cc.sys.now() / 1000) + Browser.timeInterval;
    }

    public static get designWidth(): number {
        return cc.view.getCanvasSize().width;
    }

    public static get designHeight(): number {
        return cc.view.getCanvasSize().height;
    }

    public static get width(): number {
        return cc.view.getDesignResolutionSize().width;
    }

    public static get height(): number {
        return Browser.width * (Browser.designHeight / Browser.designWidth);
    }


    /** 是否小游戏环境（微信，头条，QQ，百度，Vivo，OPPO ）。*/
    public static get onMiniGame(): boolean {
        return cc.sys.platform === cc.sys.WECHAT_GAME;
        // return cc.sys.browserType === cc.sys.BROWSER_TYPE_WECHAT_GAME;
    }

    public static init() {
        if (cc.sys.isNative) {
            console.log("本地平台");
            if (cc.sys.isMobile) {
                console.log("本地移动平台");
                if (cc.sys.os == cc.sys.OS_ANDROID) {
                    console.log("本地Android平台");
                    Browser.onAndroid = true;
                    return true;
                } else if (cc.sys.os == cc.sys.OS_IOS) {
                    console.log("本地ios平台");
                    Browser.onIOS = true;
                    return false;
                }
            } else {
                console.log("Web平台");
                Browser.onWeb = true;
                return false;
            }
        } else {
            console.log("未知Web平台");
            Browser.onWeb = true;
            return false;
        }
    }
}