var path = require('path')
, gutil = require('gulp-util')
, through = require('through2')
, crypto = require('crypto')
, fs = require('fs')
, glob = require('glob');

module.exports = function (size, ifile, option) {
    size = size | 0;
    option = option || {};
    var md5_mapping = {};//save file mapping
    return through.obj(function (file, enc, cb) {
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-debug', 'Streaming not supported'));
            return cb();
        }

        if(!file.contents){
            return cb();
        }

        var d = calcMd5(file, size)
        , filename = path.basename(file.path)
        , relativepath = path.relative(file.base ,file.path)
        , sub_namepath = relativepath.replace(new RegExp(filename) , "").split(path.sep).join('/')
        , dir;
        if(file.path[0] == '.'){
            dir = path.join(file.base, file.path);
        } else {
            dir = file.path;
        }
        dir = path.dirname(dir);

        var md5_filename = filename.split('.').map(function(item, i, arr){
            return i == arr.length-2 ? item + '_'+ d : item;
        }).join('.');
        var levelDir = "";
        if(option.dirLevel){
            levelDir = getLevelDir(dir,option.dirLevel).join(path.sep);
        }

        md5_mapping[filename] = md5_filename;//add mappinig to json;

        var l_filename = path.join(levelDir,filename);
        var l_md5_filename = path.join(levelDir,md5_filename);

        if(Object.prototype.toString.call(ifile) == "[object Array]"){
            ifile.forEach(function(i_ifile){
                i_ifile && glob(i_ifile,function(err, i_files){
                    if(err) return console.log(err);
                    i_files.forEach(function(i_ilist){
                      var fileComponents = path.parse(l_filename);
                      var fileRegex = new RegExp('/' + fileComponents.dir + fileComponents.name + '[a-zA-Z_0-9]*' + fileComponents.ext, "g");
                      var result = fs.readFileSync(i_ilist,'utf8').replace(fileRegex, function(sfile_name){
                          return sfile_name.replace(fileRegex, '/' + l_md5_filename);
                      });
                      fs.writeFileSync(i_ilist, result, 'utf8');
                    })
                })
            })
        }else{
            ifile && glob(ifile,function(err, files){
                if(err) return console.log(err);
                files.forEach(function(ilist){
                  var fileComponents = path.parse(l_filename);
                  var fileRegex = new RegExp('/' + fileComponents.dir + fileComponents.name + '[a-zA-Z_0-9]*' + fileComponents.ext, "g");
                  var result = fs.readFileSync(ilist,'utf8').replace(fileRegex, function(sfile_name){
                      return sfile_name.replace(fileRegex, '/' + l_md5_filename);
                  });
                  fs.writeFileSync(ilist, result, 'utf8');
                })
            })
        }

        file.path = path.join(dir, md5_filename);

        this.push(file);
        cb();
    }, function (cb) {
        if(option.mappingFile){//output mapping json to file
            fs.writeFileSync(option.mappingFile, JSON.stringify(md5_mapping) , 'utf8');
        }
        cb();
    });
};

function getLevelDir(dir,level){
    var dirs = dir.split(path.sep);
    if(dirs && dirs.length >= level){
        return dirs.slice(dirs.length - level)
    }else{
        return ""
    }
}

function calcMd5(file, slice){
    var md5 = crypto.createHash('md5');
    md5.update(file.contents, 'utf8');

    return slice >0 ? md5.digest('hex').slice(0, slice) : md5.digest('hex');
}
