# 闭包及其常见应用

## 什么是闭包

[MDN 对于闭包的解释](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Closures)

> 函数与对其状态即词法环境（lexical environment）的引用共同构成闭包（closure）。也就是说，闭包可以让你从内部函数访问外部函数作用域。在 JavaScript，函数在每次创建时生成闭包。

这样的解释有点隐晦难懂，很多时候，闭包具象的表现为**返回函数的函数**

```javascript
// 闭包函数
function wrapper(value) {
    function wrappered() {
        // 访问外部函数作用域的变量
        console.log(value);
    }
    return wrappered;
}
// 返回一个包装了的函数
let wrappered = wrapper(1);
// 1
wrappered();
```

闭包的特殊之处在于，调用结束后，外部函数不会被销毁，因为内部函数仍然持有对外部函数作用域的引用。这就使得内部函数仍然可以正常使用外部函数作用域内的变量。

## 闭包的作用

闭包比较常见的两个作用：`函数的增强` 和 `封装变量`

### 闭包实现函数增强

函数增强在各类 web 框架中应用相当广泛，常见的中间件、拦截器，基本都是基于闭包来实现的。主要原理便是：框架并不直接执行你所定义的函数，而是先进行函数的增强，为函数执行前和执行后插入对应的前置后置行为，调用返回的增强后的函数。

假设这里正在为某一后端应用添加响应函数，当 web 框架通过路由查找至对应函数时，将请求传入，返回响应并将响应传回请求者。

```javascript
// 可能是一个采用中间件的web后端框架的某一响应函数
function getUserInfo(req) {
    // 通过数据库查询，并返回用户信息
    return Database.getUserInfo();
}
```

在这个场景中，并不是所有人都有权限对用户信息进行访问的（访问个人信息只能是个人，或者管理员等有权限的人），那么我们需要对请求进行校验。

```javascript
function getUserInfo(req) {
    // 在数据库中查询访问者
    let user = Database.findUser(req.user);
    // 如果具有权限，则返回信息，否则返回错误信息
    if (isAllowReq(user)) {
        // 通过数据库查询，并返回用户信息
        return Database.getUserInfo();
    } else {
        return {
            data: "权限不足，无法访问",
            code: 401
        };
    }
}
```

这里很好地解决了权限问题，但新的问题引出，便是需要进行权限鉴定的响应函数肯定不止一个，如果每一个都需要添加代码，则非常麻烦。

这时候就可以使用 web 框架内置的中间件来进行处理了，将鉴权步骤放置在中间件中，当请求来临时，会依次通过前置中间件，执行响应函数，再依次通过后置中间件返回响应。(具体可参考 Koa 的洋葱圈模型）这一操作的背后便是闭包：

```javascript
function handleRequest(url) {
    let responseFunc = router.getResponseFunc(url);
    // 对函数增强，首先调用前置中间件的函数，再执行响应函数，最后执行后置中间件
    enhanseFunction(beforeMiddleware, responseFunc, afterMiddleware)();
}

// 函数增强器，相当于中间件，分别传入前置中间件，响应函数和后置中间件
function enhanseFunction(before, func, after) {
    return function() {
        if (before instanceof Array) {
            before.forEach(beforeHandle => {
                beforeHandle();
            });
        }
        func();
        if (after instanceof Array) {
            after.forEach(afterHandle => {
                afterHandle();
            });
        }
    };
}
```

这样，响应函数就被包装处理了起来。只需要将鉴权函数放置在前置中间件中，当请求到来时，会首先经过这个中间件鉴权，不满足的直接拦截返回。在响应函数中就不需要涉及任何权限处理，专心针对业务即可。

另一个常用函数增强的情况便是前端的节流和防抖。

在前端开发时，经常需要监听事件并进行处理。但不是每一种行为都需要立刻处理，如 input 联动的 ajax 请求、重新调整窗口、监听滚动等。就拿 input 联动 ajax 来说，如果如果写成下面这样，虽然效果上没有任何问题，但是会给后端带来非常大的压力。如果后端设置有请求限制，甚至可能会被后台拉黑。

```javascript
function handleInputSearch(event) {
    ajax(url, event.target.value).then(data => {
        showSelection(data);
    });
}

let input = document.querySelector("#search");
input.addEventListener("input", handleInputSearch);
```

当每按下一个键时，都会触发 `input` 事件，导致一个 ajax 请求发出。这时候可以设置一个计时器来防止在非常短时间内的重复触发：

```javascript
const delay = 1000;
let timeOut = null;
function handleInputSearch(event) {
    // 如果在延迟期间，又产生新的事件，则上次触发的事件对应的处理行为无效
    clearTimeout(timeOut);
    // 延迟发送 ajax
    timeOut = setTimeout(() => {
        ajax(url, event.target.value).then(data => {
            showSelection(data);
        });
    }, delay);
}

let input = document.querySelector("#search");
// 最后效果是，只有当停止了输入，才会发送请求
input.addEventListener("input", handleInputSearch);
```

虽然是解决了请求频繁的问题，但引入的 delay 和 timeout 污染作用域，并且同作用域编写多个处理函数还会造成命名冲突，这里使用闭包构建防抖函数：

```javascript
// 防抖函数
function debounce(func, delay) {
    let timeOut = null;
    return function(args) {
        clearTimeout(timeOut);
        timeOut = setTimeout(() => {
            // 当然，你也可以在这里放置增强器，来对函数增强
            func(args);
        }, delay);
    };
}

function handleSearchInput(event) {
    ajax(url, event.target.value).then(data => {
        showSelection(data);
    });
}

let input = document.querySelector("#search");
input.addEventListener("input", debounce(handleInputSearch, 1000));
```

这里使用闭包将防抖单独抽取了出来，事件处理函数就不需要操心防抖问题了。在闭包函数内部，由于闭包的特性，`timeOut` 变量会被持续保留，这保证了每次重复调用都会将上次设置的定时器清除，也就取消了上一次的延迟 ajax 请求。

### 封装变量

由于在 JavaScript 中，对标识符的查找是由内层作用域向外层作用域进行的，因此外层作用域无法访问内层作用域。借此，可以创建“私有成员”

```javascript
function privateValue(){
    // _value 在外部无法访问，只能通过返回的内部函数调用进行访问
    let _value = 1;
    return function (){
            return _value;
        }
}

let getValue = privateValue();
getValue();
```

这一点保证了包内的变量不被修改，从而提升了包的可靠性。不少 UMD 包都是通过 IIFE 或 闭包，来实现对包的调用，并防止污染全局作用域和过多暴露接口。

参考阮一峰的博客中的 [thunk 函数与自动执行的 generator](http://www.ruanyifeng.com/blog/2015/05/thunk.html)，其中 thunk 函数实质上也是一个闭包函数。
