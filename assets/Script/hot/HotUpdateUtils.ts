/**
 * Created by jsroads on 2020/9/7.7:36 下午
 * Note:
 */


export default class HotUpdateUtils {

    public static getHotUpdateAssetsManager(): jsb.AssetsManager {
        // Hot update is only available in Native build
        if (!cc.sys.isNative) {
            return;
        }
        let storagePath: string, am: jsb.AssetsManager;
        storagePath = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : "/") + "blackjack-remote-asset");
        console.log("Storage path for remote asset : " + storagePath);
        // Init with empty manifest url for testing custom manifest
        am = new jsb.AssetsManager('', storagePath, HotUpdateUtils.versionCompare);
        // Setup the verification callback, but we don"t have md5 check function yet, so only print some message
        // Return true if the verification passed, otherwise return false
        am.setVerifyCallback((path, asset) => {
            // When asset is compressed, we don"t need to check its md5, because zip file have been deleted.
            let compressed = asset.compressed;
            // Retrieve the correct md5 value.
            let expectedMD5 = asset.md5;
            // asset.path is relative path and path is absolute.
            let relativePath = asset.path;
            // The size of asset file, but this value could be absent.
            let size = asset.size;
            if (compressed) {
                console.log("Verification passed : " + relativePath);
                return true;
            } else {
                console.log("Verification passed : " + relativePath + " (" + expectedMD5 + ")");
                return true;
            }
        });
        return am
    }

    /**
     * 检查是否有更新
     */
    public static checkHotUpdate(am: jsb.AssetsManager, nativeUrl: string, callback: Function) {
        console.log('检查更新');
        if (am.getState() === jsb.AssetsManager.State.UNINITED) {
            // Resolve md5 url
            let url = nativeUrl;
            if (cc.loader.md5Pipe) {
                url = cc.loader.md5Pipe.transformURL(url);
            }
            am.loadLocalManifest(url);
        }
        if (!am.getLocalManifest() || !am.getLocalManifest().isLoaded()) {
            console.log("Failed to load local manifest ...");
            return;
        }
        am.setEventCallback((event: jsb.EventAssetsManager) => {
            console.log(`Code: ${event.getEventCode()}`);
            let code: number = -1,totalByteStr:string = "";
            switch (event.getEventCode()) {
                case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                    console.log("No local manifest file found, hot update skipped.")
                    code = event.getEventCode();
                    break;
                case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
                case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                    console.log("Fail to download manifest file, hot update skipped.")
                    code = event.getEventCode();
                    break;
                case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                    console.log("Already up to date with the latest remote version.")
                    code = event.getEventCode();
                    break;
                case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                    console.log("New version found, please try to update.")
                    code = event.getEventCode();
                    let totalByte: number = am.getTotalBytes();
                    let totalFiles: number = am.getTotalFiles();
                    totalByteStr = this.formatSize(totalByte,2);
                    console.log("totalByte:", totalByte);
                    console.log("totalByte:", this.formatSize(totalByte,2));
                    console.log("totalFiles:", totalFiles);
                    break;
                case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                case jsb.EventAssetsManager.ASSET_UPDATED:
                case jsb.EventAssetsManager.ERROR_UPDATING:
                    code = -1;
                    break;
                default:
                    break;
            }
            if(code>=0){
                callback && callback(code,totalByteStr)
                am.setEventCallback(null);
            }
        });
        am.checkUpdate();
    }

    // Setup your own version compare handler, versionA and B is versions in string
    // if the return value greater than 0, versionA is greater than B,
    // if the return value equals 0, versionA equals to B,
    // if the return value smaller than 0, versionA is smaller than B.
    public static versionCompare(versionA: string, versionB: string) {
        console.log("JS Custom Version Compare: version A is " + versionA + ", version B is " + versionB);
        let vA: string[] = versionA.split(".");
        let vB: string[] = versionB.split(".");
        for (let i = 0; i < vA.length; ++i) {
            let a = parseInt(vA[i]);
            let b = parseInt(vB[i]) || 0;
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
    }

    /**
     *
     * @param size {Number} size 文件大小
     * @param pointLength {Number} [pointLength=2] 精确到的小数点数。
     * @param units {Array} [units=[ 'B', 'K', 'M', 'G', 'TB' ]] 单位数组。从字节，到千字节，一直往上指定。
     * 如果单位数组里面只指定了到了K(千字节)，同时文件大小大于M, 此方法的输出将还是显示成多少K.
     * @private
     */
    public static formatSize(size: number, pointLength: number, units?: string[]): string {
        let unit;
        units = units || ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        while ((unit = units.shift()||unit) && size > 1024) {
            size = size / 1024;
        }
        return (unit === 'Bytes' ? size : size.toFixed(pointLength === undefined ? 2 : pointLength)) + unit;
    }

    public static getFileExtension(str:string):string{
       return str.replace(/^[0-9]\d*\.?\d*|0\.\d*[1-9]\d*$/,"")
    }
    /**
     * 微信版本基础库对比
     * @param v1
     * @param v2
     * @returns {number} 0:v1/v2相同  1:v1高于v2 -1:v1低于v2
     */
    public static compareVersion(v1, v2) {
        v1 = v1.split('.');
        v2 = v2.split('.');
        const len = Math.max(v1.length, v2.length);

        while (v1.length < len) {
            v1.push('0')
        }
        while (v2.length < len) {
            v2.push('0')
        }
        for (let i = 0; i < len; i++) {
            const num1 = parseInt(v1[i]);
            const num2 = parseInt(v2[i]);
            if (num1 > num2) {
                return 1
            } else if (num1 < num2) {
                return -1
            }
        }
        return 0
    }
    //TODO
    public static transformURL(url) {
        return url
    }
}