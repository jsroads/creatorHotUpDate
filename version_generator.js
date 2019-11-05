/**
 * Created by jsroads on 2019/10/29 . 1:35 下午
 * Note: 此模块用于热更新工程清单文件的生成
 * node 命令 例如
 * node version_generator.js
 *
 */
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

let native = "native";//原生平台
let platform = "ios";//ios or android
let gameName = "creatorHotUpDate";//develop or debug or release
/**
 * develop 正在开发的版本
 * debug 对内发布的测试版本
 * release 对外发布的线上版本
 * @type {string}
 */
let versionMode = "release";//develop or debug or release
let version = "1.0.1";//版本号
let cdnDir = "http://172.16.28.99:8888";
let packageUrlList = [cdnDir,gameName,native,platform,versionMode];
let remoteManifestUrlList = [cdnDir,gameName,native,platform,versionMode,"project.manifest"];
let remoteVersionUrlList = [cdnDir,gameName,native,platform,versionMode,"version.manifest"];
var manifest = {
    packageUrl: packageUrlList.join("/"),
    remoteManifestUrl: remoteManifestUrlList.join("/"),
    remoteVersionUrl: remoteVersionUrlList.join("/"),
    version: version,
    assets: {},
    searchPaths: []
};

//生成的manifest文件存放目录
var dest = 'assets/';
//项目构建后资源的目录
var src = 'build/jsb-link/';

/**
 *node version_generator.js -v 1.0.2 -u http://localhost:8888/你的游戏目录/ -s build/jsb-link/ -d assets/
 */
// Parse arguments
var i = 2;
while ( i < process.argv.length) {
    var arg = process.argv[i];

    switch (arg) {
        case '--url' :
        case '-u' :
            var url = process.argv[i+1];
            manifest.packageUrl = url;
            manifest.remoteManifestUrl = url + 'project.manifest';
            manifest.remoteVersionUrl = url + 'version.manifest';
            i += 2;
            break;
        case '--version' :
        case '-v' :
            manifest.version = process.argv[i+1];
            i += 2;
            break;
        case '--src' :
        case '-s' :
            src = process.argv[i+1];
            i += 2;
            break;
        case '--dest' :
        case '-d' :
            dest = process.argv[i+1];
            i += 2;
            break;
        default :
            i++;
            break;
    }
}


function readDir (dir, obj) {
    var stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
        return;
    }
    var subpaths = fs.readdirSync(dir), subpath, size, md5, compressed, relative;
    for (var i = 0; i < subpaths.length; ++i) {
        if (subpaths[i][0] === '.') {
            continue;
        }
        subpath = path.join(dir, subpaths[i]);
        stat = fs.statSync(subpath);
        if (stat.isDirectory()) {
            readDir(subpath, obj);
        }
        else if (stat.isFile()) {
            // Size in Bytes
            size = stat['size'];
            md5 = crypto.createHash('md5').update(fs.readFileSync(subpath)).digest('hex');
            compressed = path.extname(subpath).toLowerCase() === '.zip';

            relative = path.relative(src, subpath);
            relative = relative.replace(/\\/g, '/');
            relative = encodeURI(relative);
            obj[relative] = {
                'size' : size,
                'md5' : md5
            };
            if (compressed) {
                obj[relative].compressed = true;
            }
        }
    }
}

var mkdirSync = function (path) {
    try {
        fs.mkdirSync(path);
    } catch(e) {
        if ( e.code != 'EEXIST' ) throw e;
    }
}

// Iterate res and src folder
readDir(path.join(src, 'src'), manifest.assets);
readDir(path.join(src, 'res'), manifest.assets);

var destManifest = path.join(dest, 'project.manifest');
var destVersion = path.join(dest, 'version.manifest');

mkdirSync(dest);

fs.writeFile(destManifest, JSON.stringify(manifest), (err) => {
    if (err) throw err;
    console.log('Manifest successfully generated version:',manifest.version);
});

delete manifest.assets;
delete manifest.searchPaths;
fs.writeFile(destVersion, JSON.stringify(manifest), (err) => {
    if (err) throw err;
    console.log('Version successfully generatedversion:',manifest.version);
});