import Browser from "./Browser";
import HotUpdateUtils from "./hot/HotUpdateUtils";
import HotUpdateHelper from "./hot/HotUpdateHelper";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Helloworld extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null;
    @property(cc.Asset)
    manifestUrl: cc.Asset = null;
    @property(cc.Prefab)
    hotNode: cc.Prefab = null;
    @property
    text: string = 'hello';
    /* useIosUpdate 使用IOS 原生弹板检测更新 useHotUpdate 使用热更新策略*/
    private updateInfo: any = {useIosUpdate: false, useHotUpdate: false}

    start() {
        // init logic
        this.label.string = this.text;
        /*平台初始化*/
        Browser.init();
        /*下一帧渲染*/
        this.scheduleOnce(this.initGame, 0);
    }

    private initGame() {
        if (Browser.onIOS) {
            if (this.updateInfo.useIosUpdate) {
                //IOS 检查更新规则 先检查 大版本号
                // 版本号和线上对比 如果第一位（首位）不相等 就强制弹出 去商店 更新
                // 然后返回 检查 剩下的版本号
                // Platform.i.api.checkUpdateGames();
            } else {
                this.checkNativeHotUpdate(()=>{
                    this.initComponents();
                });
            }
        } else if (Browser.onAndroid) {
            this.checkNativeHotUpdate(()=>{
                this.initComponents();
            });
        } else {
            this.initComponents();
        }
    }
    private initComponents() {
        console.log("initComponents login")
        // this.login();
        let count = 5;
        this.schedule(()=>{
            count--;
            this.label.string = `倒计时进入 剩余 ${count} 秒`;
            if(count==0){
                console.log("倒计时 OVER!")
                cc.director.loadScene("main");
            }
        },1,5)

    }
    /**
     * App 原生检测 没有更新 检测热更新 如果有弹出更新框 如果没有继续进入游戏
     * @param callback
     */
    private checkNativeHotUpdate(callback: Function) {
        let am:jsb.AssetsManager = HotUpdateUtils.getHotUpdateAssetsManager();
        let previousVersion = cc.sys.localStorage.getItem('currentVersion');
        console.log("previousVersion:", previousVersion);
        HotUpdateUtils.checkHotUpdate(am, this.manifestUrl.nativeUrl, (code: number,totalByteStr:string) => {
            if (code === jsb.EventAssetsManager.NEW_VERSION_FOUND) {
                console.log("需要更新：" + code);
                let node = cc.instantiate(this.hotNode)
                this.node.addChild(node);
                let comp:HotUpdateHelper = node.getComponent("HotUpdateHelper");
                comp.initData(totalByteStr);
            } else {
                console.log("不需需要更新：" + code);
                callback && callback();
            }
        })
    }
}
