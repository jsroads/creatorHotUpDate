/**
 * Created by jsroads on 2020/9/7.7:36 下午
 * Note:
 */
import HotUpdateUtils from "./HotUpdateUtils";

const {ccclass, property} = cc._decorator;

@ccclass
export default class HotUpdateHelper extends cc.Component {
    @property({
        type: cc.Label,
        tooltip: "状态信息文本"
    })
    instruction: cc.Label = null;
    @property(cc.Asset)
    manifestUrl: cc.Asset = null;
    @property(cc.ProgressBar)
    byteProgress: cc.ProgressBar = null;
    @property(cc.ProgressBar)
    fileProgress: cc.ProgressBar = null;
    @property(cc.Label)
    byteLabel: cc.Label = null;
    @property(cc.Label)
    fileLabel: cc.Label = null;
    updating: boolean = false;
    canRetry: boolean = false;
    storagePath: string = "";
    updateListener: any = null;
    callbackFun: Function = null;
    am: jsb.AssetsManager = null;

    private totalBytes: number = 0;

    initData(totalByteStr: string) {
        this.byteLabel.string = totalByteStr;
    }

    start() {
        // Hot update is only available in Native build
        if (!cc.sys.isNative) {
            return;
        }
        this.am = HotUpdateUtils.getHotUpdateAssetsManager();
        console.log('检查更新');
        if (this.updating) {
            this.instruction.string = "Checking or updating ...";
            return;
        }
        this.updating = true;
        if (this.am.getState() === jsb.AssetsManager.State.UNINITED) {
            // Resolve md5 url
            let url = this.manifestUrl.nativeUrl;
            if (cc.loader.md5Pipe) {
                url = cc.loader.md5Pipe.transformURL(url);
            }
            this.am.loadLocalManifest(url);
        }
        if (!this.am.getLocalManifest() || !this.am.getLocalManifest().isLoaded()) {
            this.instruction.string = "Failed to load local manifest ...";
            return;
        }
        this.am.setEventCallback(this.checkCb.bind(this));
        this.am.checkUpdate();
        // if (cc.sys.os === cc.sys.OS_ANDROID) {
        //     // Some Android device may slow down the download process when concurrent tasks is too much.
        //     // The value may not be accurate, please do more test and find what"s most suitable for your game.
        //     this.am.setMaxConcurrentTask(2); // actually not supported
        //     this.instruction.string = "Max concurrent tasks count have been limited to 2";
        // }
        this.byteProgress.progress = 0;
        this.fileProgress.progress = 0;
        this.byteLabel.string = `0KB/3.00KB`;
        this.fileLabel.string = "0%";
        this.instruction.string = "初始化完毕,等待检查";
    }

    private checkCb(event: jsb.EventAssetsManager) {
        console.log(`Code: ${event.getEventCode()}`);
        let code: number = -1;
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                console.log("No local manifest file found, hot update skipped.")
                this.instruction.string = "本地文件丢失";
                code = event.getEventCode();
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                console.log("Fail to download manifest file, hot update skipped.")
                this.instruction.string = "下载远程mainfest文件错误";
                code = event.getEventCode();
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                console.log("Already up to date with the latest remote version.")
                this.instruction.string = "已经是最新版本";
                code = event.getEventCode();
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                console.log("New version found, please try to update.")
                code = event.getEventCode();
                this.totalBytes = this.am.getTotalBytes();
                let totalFiles: number = this.am.getTotalFiles();
                console.log("totalBytes:", this.totalBytes);
                console.log("totalFiles:", totalFiles);
                let totalByteStr: string = HotUpdateUtils.formatSize(this.totalBytes, 2)
                let fileExtension: string = HotUpdateUtils.getFileExtension(totalByteStr)
                this.byteLabel.string = `0${fileExtension}/${totalByteStr}`;
                this.byteProgress.progress = 0;
                this.fileProgress.progress = 0;
                this.fileLabel.string = "0%";
                this.instruction.string = `有新版本发现，请点击更新`;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
            case jsb.EventAssetsManager.ASSET_UPDATED:
            case jsb.EventAssetsManager.ERROR_UPDATING:
                code = -1;
                break;
            default:
                break;
        }
        if (code >= 0) {
            if (this.callbackFun) this.callbackFun(code);
            this.am.setEventCallback(null);
            // this._checkListener = null;
            this.updating = false;
        }
    }

    private updateCb(event: jsb.EventAssetsManager) {
        let needRestart: boolean = false;
        let failed: boolean = false;
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                console.log("No local manifest file found, hot update skipped.");
                this.instruction.string = "本地版本文件丢失，无法更新";
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                // console.log(event.getPercent());
                // console.log(event.getPercentByFile());
                // console.log(event.getDownloadedFiles() + " / " + event.getTotalFiles());
                // console.log(event.getDownloadedBytes() + " / " + event.getTotalBytes());
                // this.fileLabel.string = event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
                let downloadedBytes: number = event.getDownloadedBytes();
                this.totalBytes = event.getTotalBytes() || this.totalBytes;
                let totalByteStr: string = HotUpdateUtils.formatSize(this.totalBytes, 2)
                let FileExtension: string = HotUpdateUtils.getFileExtension(totalByteStr);
                let downloadedBytesStr: string = HotUpdateUtils.formatSize(downloadedBytes, 2, [FileExtension])
                this.byteLabel.string = `${downloadedBytesStr}/${totalByteStr}`;
                if (downloadedBytes == 0) {
                    this.byteProgress.progress = 0;
                    this.fileProgress.progress = 0;
                    this.fileLabel.string = "0%";
                } else {
                    this.byteProgress.progress = event.getPercent();
                    this.fileProgress.progress = event.getPercentByFile();
                    this.fileLabel.string = `${event.getPercentByFile().toFixed(2)}%`;
                }
                // let msg = event.getMessage();
                // if (msg) {
                //     // this.instruction.string = "Updated file: " + msg;
                //     console.log("Updated file: " + msg);
                //     console.log(event.getPercent() / 100 + "% : " + msg);
                // }
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                console.log("Fail to download manifest file, hot update skipped.");
                this.instruction.string = "下载远程版本文件失败";
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                console.log("Already up to date with the latest remote version.");
                this.instruction.string = "当前为最新版本";
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                console.log("Update finished. " + event.getMessage());
                this.instruction.string = '更新完成. ' + event.getMessage();
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                console.log("Update failed. " + event.getMessage());
                this.instruction.string = '更新失败. ' + event.getMessage();
                this.updating = false;
                this.canRetry = true;
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                console.log('Asset update error: ' + event.getAssetId() + ', ' + event.getMessage());
                this.instruction.string = '资源更新错误: ' + event.getAssetId() + ', ' + event.getMessage();
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                console.log(event.getMessage());
                this.instruction.string = event.getMessage();
                break;
            default:
                break;
        }

        if (failed) {
            this.am.setEventCallback(null);
            this.updateListener = null;
            this.updating = false;
        }

        if (needRestart) {
            this.am.setEventCallback(null);
            this.updateListener = null;
            // Prepend the manifest"s search path
            let searchPaths = jsb.fileUtils.getSearchPaths();
            let newPaths = this.am.getLocalManifest().getSearchPaths();
            console.log("newPaths", JSON.stringify(newPaths));
            // console.log("searchPaths", JSON.stringify(searchPaths));
            Array.prototype.unshift.apply(searchPaths, newPaths);
            // This value will be retrieved and appended to the default search path during game startup,
            // please refer to samples/js-tests/main.js for detailed usage.
            // !!! Re-add the search paths in main.js is very important, otherwise, new scripts won"t take effect.
            cc.sys.localStorage.setItem("HotUpdateSearchPaths", JSON.stringify(searchPaths));

            let currentVersion = this.am.getLocalManifest().getVersion();
            // 之前保存在 local Storage 中的版本号，如果没有，则认为是新版本
            let storagePath = this.am.getStoragePath();
            let previousVersion = cc.sys.localStorage.getItem('currentVersion');
            // game.currentVersion 为当前版本的版本号
            console.log("storagePath:", storagePath);
            console.log("currentVersion:", currentVersion);
            console.log("previousVersion:", previousVersion);
            if (previousVersion && HotUpdateUtils.compareVersion(currentVersion, previousVersion) > 0) {
                // 热更新的储存路径，如果旧版本中有多个，可能需要记录在列表中，全部清理
                console.log("清理过期版本");
                // let idx = searchPaths.indexOf(storagePath)
                // if (idx != -1) {
                //     searchPaths.splice(idx, 1);
                // }
                jsb.fileUtils.removeDirectory(storagePath);
            }
            cc.sys.localStorage.setItem("currentVersion", currentVersion);
            jsb.fileUtils.setSearchPaths(searchPaths);
            cc.audioEngine.stopAll();
            cc.game.restart();
        }
    }

    private loadCustomManifest() {
        // if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
        //     let manifest = new jsb.Manifest(customManifestStr, this._storagePath);
        //     this._am.loadLocalManifest(manifest, this._storagePath);
        //     this.instruction.string = "Using custom manifest";
        // }
    }

    private retry() {
        if (!this.updating && this.canRetry) {
            // this.retryBtn.active = false;
            this.canRetry = false;

            this.instruction.string = "Retry failed Assets...";
            this.am.downloadFailedAssets();
        }
    }

    /**
     * 开始更新
     */
    private hotUpdate() {
        if (this.am && !this.updating) {
            this.am.setEventCallback(this.updateCb.bind(this));

            if (this.am.getState() === jsb.AssetsManager.State.UNINITED) {
                // Resolve md5 url
                let url = this.manifestUrl.nativeUrl;
                if (cc.loader.md5Pipe) {
                    url = cc.loader.md5Pipe.transformURL(url);
                }
                this.am.loadLocalManifest(url);
            }
            this.am.update();
            this.updating = true;
        }
    }

    onDestroy() {
        if (this.updateListener) {
            this.am.setEventCallback(null);
            this.updateListener = null;
        }
    }
}