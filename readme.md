## errorLog

- 1、介绍

errorLog是一个小型模块提供给测试开发、以及实际上线上的错误监控，快速错定错误信息，提高开发效率的工具。

- 2、实现功能

1）、提供handle函数，对异步函数再封装，让你摆脱书写try catch语句。

2）、利用window.addEventlistner实现错误监听，即时捕获代码执行错误、文件加载错误，并提交后台记录。

3）、不依赖其他模块，利用原生xhr对象实现数据上传。

4）、实现当前页面内错误对象缓存，防止相同错误重复触发而重复提交。

5）、允许try catch语句封装后传入回调，进行降级或错误方案处理。

6）、跨域脚本监听需要设置JS文件crossorigin，同时设置响应头。

- 3、API汇总


1）、errorLog.init(boolean [,Object ])

boolean参数：true表示开启全局监听，false表示不开启。

Object参数：配置option参数，包括后台url、请求方法method。（默认为get方法提交错误信息）

```
{
    url:'url',
    method:'get'|'post'
}
```

2）、errorLog.handle(Object)

Object参数：传入要处理的对象，以及对象上对应的属性数组。允许传入回调函数降级处理错误。

```
{
    target：Object,
    prop:['someProp'],
    cb: [[Function]]
}
```

3）、errorLog.handleCallback(Function)

function参数：对传入函数进行再封装，多一层try catch捕获。

- 4、demo示例
```
// 初始化
errorLog.init(true, {
    // 请在这里填入服务器地址
    url: '/logErrorInfor',
    type: 'get'
})


// 绑定try catch
errorLog.handle({
    target: window,
    prop: ['setTimeout', 'setInterval'],
    cb: function() {
        console.log('try callback');
    }
})


// 测试错误监听
setTimeout(function() {
    throw new Error('etst1');
}, 200)
```

- 5、实际意义

通过导入模块，监听页面错误，再实际上线部署上存在重要意义，可以第一时间通过后台日志锁定错误，并快速解决。
通过对try catch的再封装，让用户不再写冗余的try catch 代码，让你的代码更加优雅！

- 6、致谢

谢谢观看