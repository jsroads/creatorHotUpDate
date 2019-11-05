/**
 * Created by jsroads on 2019/11/4 . 4:53 下午
 * Note:
 */
export default class GameHelper {
    public static getStoragePath(){
        return ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'mygame-remote-asset');
    }
    static currentVersion = "currentVersion";
}
