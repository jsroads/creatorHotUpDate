import GameHelper from "./GameHelper";

const {ccclass, property} = cc._decorator;

@ccclass
export default class Helloworld extends cc.Component {
    get storagePath(): string {
        return this._storagePath;
    }

    set storagePath(value: string) {
        this._storagePath = value;
    }

    @property(cc.Label)
    label: cc.Label = null;

    @property
    text: string = 'hello';

    @property({
        type: cc.Asset
    })
    manifestUrl: cc.Asset = null;

    private _storagePath: string;
    private assetsManager: any;

    start() {
        // init logic
        this.label.string = this.text;
        this.check();
    }

    private check() {
        if (!cc.sys.isNative) {
            return false;
        }
        this.storagePath = GameHelper.getStoragePath();
        console.log('Storage path for remote asset : ' + this.storagePath);

        // Init with empty manifest url for testing custom manifest
        this.assetsManager = new jsb.AssetsManager('', this.storagePath, (versionA: string, versionB: string) => {
            console.log("JS Custom Version Compare: version A is " + versionA + ' version B is ' + versionB);
            let vA: Array<string> = versionA.split('.');
            let vB: Array<string> = versionB.split('.');
            for (let i = 0; i < vA.length; ++i) {
                let a = parseInt(vA[i]);
                let b = parseInt(vB[i] || "0");
                if (a === b) {
                    continue;
                } else {
                    return a - b;
                }
            }
            if (vB.length > vA.length) {
                return -1;
            } else {
                return 0;
            }
        });
        console.log('Hot update is ready please check or directly update.');

        this.assetsManager.setEventCallback((event) => {
            cc.log('Code: ' + event.getEventCode());
            switch (event.getEventCode()) {
                case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                    console.log("No local manifest file found hot update skipped.");
                    this.startGame();
                    break;
                case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
                case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                    console.log("Fail to download manifest file hot update skipped.");
                    this.startGame();
                    break;
                case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                    console.log("Already up to date with the latest remote version.");
                    this.startGame();
                    break;
                case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                    console.log('New version found please try to update.');
                    this.showHotUpDateDialog();
                    break;
                default:
                    return;
            }
        });
        if (this.assetsManager.getState() === jsb.AssetsManager.State.UNINITED) {
            // Resolve md5 url
            let url = this.manifestUrl.nativeUrl;
            console.log("==========================================");
            console.log(url);
            if (cc.loader.md5Pipe) {
                url = cc.loader.md5Pipe.transformURL(url);
            }
            this.assetsManager.loadLocalManifest(url);
            //---------如果 版本号 倒数第二个更改了 清除缓存 小版本 才适合热更新 如果 自己不要要 可以注释这段
            //-----------注释开始
            // 之前版本保存在 local Storage 中的版本号，如果没有认为是旧版本
            let previousVersion = parseFloat(cc.sys.localStorage.getItem(GameHelper.currentVersion)) || 0;
            let list = this.assetsManager.getLocalManifest().getVersion().split("."), currentVersion = 0;
            list.forEach((value, index, array) => {
                if (index < array.length - 1) {
                    currentVersion += parseInt(value) * Math.pow(10, array.length - index)
                }
            })
            console.log("previousVersion:", previousVersion);
            console.log("currentVersion:", currentVersion);
            if (previousVersion < currentVersion) {
                // 热更新的储存路径，如果旧版本中有多个，可能需要记录在列表中，全部清理
                jsb.fileUtils.removeDirectory(this.storagePath);
            }
            //-----------注释结束
        }
        if (!this.assetsManager.getLocalManifest() || !this.assetsManager.getLocalManifest().isLoaded()) {
            console.log('Failed to load local manifest ...');
            return;
        }
        this.assetsManager.checkUpdate();
    }

    private showHotUpDateDialog(): void {
        cc.loader.loadRes("HotUpView", cc.Prefab, (error: Error, res: cc.Prefab) => {
            if (error) {
                console.log(error.message);
                return;
            }
            //开始实例化预制资源
            let prefab = cc.instantiate(res);
            this.node.addChild(prefab);
            prefab.getComponent('HotUpView').initHotDate({
                "infoLabel": "版本有更新，请点击OK按钮",
                "remoteManifestUrl": this.assetsManager.getRemoteManifest().getManifestFileUrl(),
                "packageUrl": this.assetsManager.getRemoteManifest().getPackageUrl(),
                "version": this.assetsManager.getRemoteManifest().getVersion(),
                "versionFileUrl": this.assetsManager.getRemoteManifest().getVersionFileUrl(),
                "searchPaths": this.assetsManager.getLocalManifest().getSearchPaths(),
                "manifestRoot": this.assetsManager.getLocalManifest().getManifestRoot(),
                "newPaths": this.assetsManager.getLocalManifest().getSearchPaths()
            });
        })
    }

    private startGame(): void {
        console.log("进入游戏啦");
    }
}
