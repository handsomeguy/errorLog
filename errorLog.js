/*
 * @Author: Jackson 
 * @Date: 2018-03-14 19:46:42 
 * @Last Modified by: Jackson
 * @Last Modified time: 2018-03-16 17:50:29
 */

;
(function(global, factory) {
    "use strict";
    if (typeof module === "object" && typeof module.exports === "object") {

        module.exports = global.document ?
            factory(global, true) :
            function(w) {
                return factory(w);
            };
    } else {
        factory(global);
    }
    // Pass this if window is not defined yet
})(typeof window !== "undefined" ? window : this, function(window, noGlobal) {

    var errorLog = {
        // 缓存对象
        errCache: {
            codeError: {},
            fileLoading: {}
        },
        opts: {
            url: ''
        }
    };

    function isObject(object) {
        return Object.prototype.toString.call(object) === '[object Object]';
    }

    function isEvent(e) {
        return e instanceof Event;
    }
    // 属性浅复制
    function extend(origin, copy) {
        for (var p in copy) {
            if (!origin[p]) {
                origin[p] = copy[p];
            }
        }
    }

    function isErrorEvent(e) {
        return e instanceof ErrorEvent;
    }

    // try catch 提交的错误对象 还需要预处理 转换为错误对象
    // 通过正则提取出错误的url以及出错的行号 列号
    errorLog.transformToError = function(e) {
        var arr = e.stack.match(/at (\S+)/g);
        var url = arr[0].slice(3);
        var index = url.lastIndexOf(':');
        var colno = url.slice(index + 1);
        url = url.slice(0, index);
        index = url.lastIndexOf(':');
        var lineno = url.slice(index + 1);
        url = url.slice(0, index);

        // 创建错误事件对象
        var instance = new ErrorEvent('error');
        // 定义属性  直接对属性赋值是无效的
        Object.defineProperties(instance, {
            message: {
                value: e.message
            },
            filename: {
                value: url
            },
            lineno: {
                value: lineno
            },
            colno: {
                value: colno
            }
        })
        return instance;
    }


    errorLog.patchError = function(e) {
        if (!isEvent(e) || !isErrorEvent(e)) {
            e = errorLog.transformToError(e);
        }

        if (isEvent(e) || isErrorEvent(e)) {
            errorLog.processError(e);
            return true;
        }
        return false;
    }

    errorLog.processError = function(e) {

        var typeJudge = isErrorEvent(e);
        var type = typeJudge ? 'codeError' : 'fileLoading';
        var errorRecord = {
            type: type,
            time: new Date().getTime()
        }

        if (typeJudge) {
            extend(errorRecord, {
                line: e.lineno,
                col: e.colno,
                filename: e.filename,
                message: e.message,
                id: 'line:' + e.lineno + 'col:' + e.colno + ',' + e.filename
            })
        } else {
            extend(errorRecord, {
                baseUri: e.target.baseURI, //页面url
                whref: e.target.href, //加载出错的资源url
                nodeName: e.target.nodeName.toLowerCase(), //资源对应标签
                id: e.target.href
            })
        }

        // 判断缓存对象中是否已存在该错误对象
        // 已存在不上报错误至服务器
        if (errorLog.judgeCache(errorRecord)) {
            errorLog.uploadError(errorRecord);
        }

        // 输出错误登记对象 以供开发调试使用
        console.log(errorRecord);
        return true;
    }


    errorLog.uploadError = function(errorRecord) {

        var message = JSON.stringify(errorRecord);
        if (errorLog.opts.url == '') {
            console.log('未指定服务器提交地址，无法提交错误信息')
            return;
        }

        // 上传错误对象信息
        var xhr = createXHR();
        var method = errorLog.opts.method || 'get';
        var url = errorLog.opts.url;
        xhr.open(method, url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                console.log(xhr.responseText);
            }
        }
        xhr.send('message=' + message);
    }

    // 兼容不同浏览器的xhr对象
    // 创建失败则返回
    function createXHR() {
        if (typeof XMLHttpRequest != 'undefined') {
            return new XMLHttpRequest();
        } else if (typeof ActiveXObject != 'undefined') {
            //IE6 采用 ActiveXObject， 兼容IE6  
            //由于MSXML库有3个版本，因此都要考虑 
            var versions = [
                'MSXML2.XMLHttp.6.0',
                'MSXML2.XMLHttp.3.0',
                'MSXML2.XMLHttp'
            ];
            for (var i = 0; i < versions.length; i++) {
                try {
                    return new ActiveXObject(versions[i]);
                } catch (e) {
                    throw new Error('您的浏览器不支持XHR对象');
                }
            }
        } else {
            throw new Error('您的浏览器不支持XHR对象');
        }
    }



    errorLog.judgeCache = function(errorRecord) {
        // true 表示为新的错误对象 
        // 更新缓存对象 并提示上报错误 false不上报
        if (typeof errorLog.errCache[errorRecord.type][errorRecord.id] === 'undefined') {
            errorLog.updateCache(errorRecord);
            return true;
        }
        return false;
    }

    // 更新缓存对象
    errorLog.updateCache = function(errorRecord) {
        errorLog.errCache[errorRecord.type][errorRecord.id] = errorRecord;
        return true;
    }

    // 开启全局环境下的错误监听
    // 监听JS执行错误以及文件加载的错误
    errorLog.monitor = function() {

        // 方法检测
        if (window && window.addEventListener) {
            window.addEventListener('error', errorListener, true);
        } else {
            window.onerror = errorListener
        }

        function errorListener(e) {

            if (!e || !isEvent(e)) {
                return true;
            }
            //无法确定错误文件 不收集无效数据
            if (e.message == "Script error.") {
                return true;
            }
            errorLog.processError(e);
            return true;
        };
    }

    // 初始化对象信息  
    // 是否开启全局监听 以及 opts的设置
    errorLog.init = function(mark, opts) {
        if (mark) {
            errorLog.monitor();
        }
        // 更新对象设置
        errorLog.opts = opts;
    }

    function handleCallback(cb, errorCb) {
        return function() {
            try {
                cb();
            } catch (e) {
                errorLog.patchError(e);
                if (typeof errorCb == 'function') {
                    errorCb();
                }
                return;
            }
        }
    }

    function handleFirstParam(async, func) {
        return function(cb) {
            var args = [].slice.call(arguments, 1);
            return async(handleCallback(cb, func), args);
        }
    }

    function handleLastParam(async, func) {
        return function() {
            var args = [].slice.call(arguments);
            var cb = args.pop();
            args.push(handleCallback(cb, func));
            return async.apply(null, args);
        }
    }

    function handleAsyncObj(obj, bool, func) {
        for (var p in obj.prop) {
            (function() {
                var cp = obj.target[obj.prop[p]];
                obj.target[obj.prop[p]] = bool === false ? handleLastParam(cp, func) : handleFirstParam(cp, func);
            })()
        }
    }

    errorLog.handleCallback = handleCallback;

    errorLog.handle = function(obj, bool) {
        if (bool == undefined || bool == true || bool == false) {
            handleAsyncObj(obj, bool, obj.cb);
            return true;
        }
        console.log('param error');
        return false;
    }


    window.errorLog = {
        init: errorLog.init,
        handleCallback: errorLog.handleCallback,
        handle: errorLog.handle,
        patchError: errorLog.patchError,
        errorCache: errorLog.errCache
    }

    return window.errorLog;

})