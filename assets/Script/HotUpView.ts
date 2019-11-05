/**
 * Created by jsroads on 2019/11/4 . 11:40 上午
 * Note:
 */
import GameHelper from "./GameHelper";

const {ccclass, property} = cc._decorator;
@ccclass
export default class HotUpView extends cc.Component {
    get storagePath() {
        return this._storagePath;
    }

    set storagePath(value) {
        this._storagePath = value;
    }

    @property({
        type: cc.Label
    })
    byteLabel = null;
    @property({
        type: cc.Label
    })
    fileLabel = null;
    @property({
        type: cc.ProgressBar
    })
    byteProgress = null;
    @property({
        type: cc.ProgressBar
    })
    fileProgress = null;
    @property({
        type: cc.Label
    })
    infoLabel = null;
    @property({
        type: cc.Asset
    })
    manifestUrl = null;

    private _am;
    private _updateListener;
    private _checkListener;
    private versionCompareHandle;
    private _updating;
    private _canRetry;
    private _storagePath;
    private _failCount;

    private info: any;

    updateCb(event) {
        var needRestart = false;
        var failed = false;
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                this.infoLabel.string = 'No local manifest file found hot update skipped.';
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                this.byteProgress.progress = event.getPercent();
                this.fileProgress.progress = event.getPercentByFile();

                this.fileLabel.string = event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
                this.byteLabel.string = event.getDownloadedBytes() + ' / ' + event.getTotalBytes();

                var msg = event.getMessage();
                if (msg) {
                    this.infoLabel.string = 'Updated file: ' + msg;
                    // cc.log(event.getPercent()/100 + '% : ' + msg);
                }
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                this.infoLabel.string = 'Fail to download manifest file hot update skipped.';
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                this.infoLabel.string = 'Already up to date with the latest remote version.';
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                this.infoLabel.string = 'Update finished. ' + event.getMessage();
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                this.infoLabel.string = 'Update failed. ' + event.getMessage();
                // this.panel.retryBtn.active = true;
                this._updating = false;
                this._canRetry = true;
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                this.infoLabel.string = 'Asset update error: ' + event.getAssetId() + ' ' + event.getMessage();
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                this.infoLabel.string = event.getMessage();
                break;
            default:
                break;
        }

        if (failed) {
            this._am.setEventCallback(null);
            this._updateListener = null;
            this._updating = false;
        }

        if (needRestart) {
            this._am.setEventCallback(null);
            this._updateListener = null;
            // Prepend the manifest's search path
            var searchPaths = jsb.fileUtils.getSearchPaths();
            var newPaths = this._am.getLocalManifest().getSearchPaths();
            console.log(JSON.stringify(newPaths));
            Array.prototype.unshift.apply(searchPaths, newPaths);
            // This value will be retrieved and appended to the default search path during game startup
            // please refer to samples/js-tests/main.js for detailed usage.
            // !!! Re-add the search paths in main.js is very important otherwise new scripts won't take effect.
            cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
            jsb.fileUtils.setSearchPaths(searchPaths);
            let list = this.info.version.split("."), currentVersion = 0;
            list.forEach((value, index, array) => {
                if (index < array.length - 1) {
                    currentVersion += parseInt(value) * Math.pow(10, array.length - index)
                }
            });
            console.log("new currentVersion:", JSON.stringify(currentVersion));
            cc.sys.localStorage.setItem(GameHelper.currentVersion,JSON.stringify(currentVersion));
            cc.audioEngine.stopAll();
            cc.game.restart();
        }
    }

    retry() {
        if (!this._updating && this._canRetry) {
            // this.panel.retryBtn.active = false;
            this._canRetry = false;

            this.infoLabel.string = 'Retry failed Assets...';
            this._am.downloadFailedAssets();
        }
    }


    hotUpdate() {
        if (this._am && !this._updating) {
            this._am.setEventCallback(this.updateCb.bind(this));

            if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
                // Resolve md5 url
                var url = this.manifestUrl.nativeUrl;
                if (cc.loader.md5Pipe) {
                    url = cc.loader.md5Pipe.transformURL(url);
                }
                this._am.loadLocalManifest(url);
            }

            this._failCount = 0;
            this._am.update();
            // this.panel.updateBtn.active = false;
            this._updating = true;
        }
    }

    onLoad() {
        this.storagePath = GameHelper.getStoragePath();
        console.log('Storage path for remote asset : ' + this.storagePath);


        // Init with empty manifest url for testing custom manifest
        this._am = new jsb.AssetsManager('', this.storagePath, this.versionCompareHandle);

        // Setup the verification callback but we don't have md5 check function yet so only print some message
        // Return true if the verification passed otherwise return false
        this._am.setVerifyCallback((path, asset) => {
            // When asset is compressed we don't need to check its md5 because zip file have been deleted.
            var compressed = asset.compressed;
            // Retrieve the correct md5 value.
            var expectedMD5 = asset.md5;
            // asset.path is relative path and path is absolute.
            var relativePath = asset.path;
            // The size of asset file but this value could be absent.
            var size = asset.size;
            if (compressed) {
                this.infoLabel.string = "Verification passed : " + relativePath;
                return true;
            } else {
                this.infoLabel.string = "Verification passed : " + relativePath + ' (' + expectedMD5 + ')';
                return true;
            }
        });

        this.infoLabel.string = 'Hot update is ready please check or directly update.';
        if (cc.sys.os === cc.sys.OS_ANDROID) {
            // Some Android device may slow down the download process when concurrent tasks is too much.
            // The value may not be accurate please do more test and find what's most suitable for your game.
            this._am.setMaxConcurrentTask(2);
            this.infoLabel.string = "Max concurrent tasks count have been limited to 2";
        }
        this.fileProgress.progress = 0;
        this.byteProgress.progress = 0;
    }

    public initHotDate(msg: any) {
        this.info = msg;
        this.infoLabel.string = this.info.infoLabel;
    }

    public close() {
        this.node.removeFromParent();
    }

    public onDestroy() {
        if (this._updateListener) {
            this._am.setEventCallback(null);
            this._updateListener = null;
        }
    }
}
