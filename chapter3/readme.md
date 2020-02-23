# 提升、IIFE 和块级作用域

## 提升

在 JavaScript 引擎编译时，会所有作用域内的变量和函数声明语句都会被提至该作用域最顶部，这就是所谓的提升。

```javascript
// func 的声明被提升至调用之前
func();
function func() {
    // a变量的声明提升至打印前，undefined
    console.log(a);
    var a = 10;
}
```

**提升只会提升声明**，这就导致在初始化前使用变量的语句会获得默认的 `undefined`

### 变量的提升

当引擎编译至声明语句时，将其放置在当前作用域的最顶部，并赋值 `undefined`

```javascript
// undefined
console.log(a);
var a; // 提升至作用域最顶部，即 console.log 的上一句
```

当引擎编译至初始化赋值语句时，将其视为声明语句 + 赋值语句，即：

```javascript
// undefined
console.log(a);
var a = 10;
```

相当于

```javascript
var a;
console.log(a);
a = 10;
```

### 函数的提升

同样，函数的声明也会存在提升的情况：

```javascript
// 正常运行
func();
function func() {
    console.log("func run");
}
```

对于函数表达式，根据 [MDN 关于函数表达式的介绍](https://developer.mozilla.org/zh-CN/docs/web/JavaScript/Reference/Operators/function)，函数表达式不存在提升的情况。

```javascript
func();
let func = function b() {
    console.log("func run");
};
```

提升只会提升声明，对于 `funtion func(){}` 语句显然是适用的，因为其为函数的声明，但如果在外加上括号，作为函数的表达式（`(function (){})`），则不存在提升情况。函数表达式更倾向于“取值”的行为，而非声明（通过函数表达式声明函数必须赋值至一变量，且函数表达式上的名称仅在内部有效）

**函数声明相比变量声明，会优先提升，会比变量声明更靠近表达式顶部**

### 类不存在提升

类不存在提升，以确保继承正确性。如果在类声明前使用，将抛出 `ReferenceError`。

```javascript
// 抛出 ReferenceError
new A();
class A {}
```

引用 [阮一峰 ECMAScript 6 教程](http://es6.ruanyifeng.com/#docs/class) 中的一段话

> 类不存在变量提升（hoist），这一点与 ES5 完全不同。ES6 不会把类的声明提升到代码头部。这种规定的原因与下文要提到的继承有关，必须保证子类在父类之后定义。

引用 [MDN 对类的描述](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes)

> 函数声明和类声明之间的一个重要区别是函数声明会提升，类声明不会。你首先需要声明你的类，然后访问它，否则像下面的代码会抛出一个 ReferenceError

**因为上述的提升原因，所以尽可能将需要声明的变量放置在作用域的最顶部**

## IIFE

IIFE 即立即调用的函数表达式（Immediately Invocation Function Expression），常用于充当闭包，防止污染作用域，有的时候在导入一些包时用来执行一些带有副作用的操作。

```javascript
(function() {
    console.log("run");
})();
```

需要注意的是，当 `function` 出现在行首时，将被直接解释为语句，导致解析错误抛出 `SyntaxError`。如果出现紧挨着的多个 IIFE，则需要使用分号分隔，否则下一个 IIFE 会被当做上一个 IIFE 的参数调用。

通常将 IIFE 作为模块代码使用，防止对全局对象产生污染（引入无关变量或导致页面本身变量产生变化从而导致不可预料的运行失败），
如油猴插件的脚本就是写在一个 IIFE 内。

```javascript
(function() {
    let _value = 0;
    return {
        getValue() {
            return _value;
        },
        setValue(val) {
            _value = val;
        }
    };
})();
```

### 使用 IIFE 配合 var 循环

对于 var 声明的变量来说，只存在函数作用域和全局作用域。如果在`for循环`中的**初始化语句**上使用 `var` 初始化变量，那么每次循环都会反复使用当前作用域内的变量（这个变量被反复用`var`声明，并且值不断被修改），如果循环体涉及异步的内容，而这些异步的语句又需要使用这个计数变量，那么当异步语句真正执行的时候，计数变量早已变为终止值。

```javascript
// 如果使用 var 循环，因为缺少块级作用域，以下访问的值均为循环结束后的变量值
for (var i = 0; i < 5; i++) {
    var btn = document.createElement("button");
    btn.innerText = "Test";
    btn.addEventListener("click", () => {
        // 当按钮真正 click 的时候，循环早已结束，i = 5
        // 此时 i 的值为 5
        console.log(i);
    });
    document.body.append(btn);
}
```

相当于

```javascript
var i;
for (i = 0; i < 5; i++) {
    // 如果代码异步访问 i，则 i 将变为终止值 5
    ...
}
```

这时候可以用 IIFE 来对遍历值进行"绑定"，即将计数变量作为 IIFE 参数传入，每次循环都会产生独立的 IIFE，并传入对应计数值绑定，使得当异步代码执行时，也能取到正确值：

```javascript
for (var i = 0; i < 5; i++) {
    (function(i) {
        // 每次循环的 i 被固定下来
        var btn = document.createElement("button");
        btn.innerText = "Test";
        btn.addEventListener("click", () => {
            // 这里 i 沿作用域链开始查找，在IIFE的作用域找到
            console.log(i);
        });
        document.body.append(btn);
    })(i);
}
```

## 块级作用域

在 ES6 中，新增加了 `let` 和 `const` 关键字，使得 JavaScript 产生了 `块级作用域` 这一概念。用 `let` 和 `const` 声明的变量仅在最靠近声明的`{}`内可被访问。感觉起来和 IIFE 非常相似，包含了 let 和 const 的作用域，在编译器可能的实现原理如下：

```javascript
{
    let a = 10;
    console.log(a);
}
// a 不可在其所声明的块级作用域外被使用
console.log(a); // ReferenceError

// 常见的 for 循环，如果使用 var 将导致污染全局作用域
// 如果是 var 且有异步循环使用同名变量将产生无法预料的错误
for (let i = 0; i < 10; i++) {
    console.log(i);
}
// 不可访问
console.log(i);
```

内部可能的实现：

```javascript
(function() {
    var a = 10;
    console.log(a);
})()(function() {
    var i;
    for (i = 0; i < 10; i++) {
        console.log(i);
    }
})();

// 不可访问
console.log(i);
```
