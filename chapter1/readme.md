## JavaScript 编译

当 JavaScript 引擎在编译代码时，会进行词法分析，将字符串的代码拆分为足够小的词法单元，
并根据对应的规则，将这些单元转换为对应的 `抽象语法树(AST)`。最后根据抽象语法树，生成对应的
机器码。

## 作用域

当引擎根据代码需要对某一变量进行引用时，就需要对变量进行查找。
查找分为 `LHS`(Left Hand Side) 和 `RHS` 查找。
即查看变量是否为的左值还是右值，相当于变量在赋值语句的左边还是右边.

### 左值还是右值

通俗的理解，对于 `var a = 10;` 这一条语句来说，可以这么简单地认为：
按照等号语句切开，左边的 `a` 出现在赋值等号的左边，即左值，同理 `10` 为语句中的右值

深入来看这一现象，变量 `a` 其实是某一地址的引用，即某一内存空间地址，
`a = 10` 的操作，实质上是将值 `10` 存入至别名为 `a` 的地址空间中去。
`a` 在语句中代表的是地址，即所谓的左值。

再看紧接着下一条语句 `var b = a;`。在这条语句`JavaScript`中为：将变量`a`的
值取出，存入变量`b`的地址空间去。这里的 `a` 不像是 `var a = 10;` 语句中的代表地址，
而更像是代表值`10`，因此作为右值。

可以这样认为，当语句中需要的内容为地址 / 引用时，变量在此作左值，而语句中需要的内容
为"值"时，变量在此作右值。

**# 示例**

```javascript
// 将 10 存入 a 指向的内存地址，a 为左值
var a = 10;
// 左值，*不考虑变量提升的情况下*，和下类声明方法效果一致
function func() {}
// 同上，两个 func 都为左值，
// 同时注意函数中存在隐式的赋值情况，当调用 func 函数，并传入参数时，
// 会产生 var val = param; 的隐式语句，此时 val 为左值
var func = function(val) {
  // 取出 val 真实值，val 作为右值
  return val + 1;
}

// 获得 func 函数的调用结果值，为右值，result 为左值
let result = func(a);
```

综上，需要获得变量地址，并对地址进行操作的，变量作为左值；而获得变量`真实值`充当表达式，
则变量作右值。

### LHS 和 RHS

当编译器需要使用变量时，根据变量的左右值情况，分别进行 LHS 和 RHS 查找。两者均由内层
作用域开始进行查找，直到查找至最外层的全局作用域 `globalThis` 为止。

如果将作用域由内向外"拉直"，并像链表一样链接在一起，则构成了`作用域链`，对变量的查找
将从最内侧的作用域链开始，遍历整条作用域链。

**# 示例**

```javascript
// 进行赋值操作，进行 LHS
const message = 'Hello,World!';
// 当调用函数时，str 形参会被赋值，发生一次 LHS
function printSomething(str) {
    // 调用 str，str 在 printSomething 中进行一次 RHS
    // 而在 console.log 内部, 某一形参被 str 赋值，这一形参进行 LHS
    console.log(str);
    // 内层作用域不存在 message, 查找外层作用域
    console.log(message);
}
// 调用函数，将参数传递，进行 RHS
printSomething(message);
```

对于查找失败的情况，引擎对于 LHS 和 RHS 所采取的方式略有不同。

- 当 RHS 查找失败时，引擎抛出 `ReferenceError`
- 当 LHS 查找失败时，如果不处于严格模式下，引擎会在全局作用域（失败时已遍历作用域至全局作用域）创建
一个同名遍历，并继续执行语句。如处于严格模式，则抛出 `ReferenceError`

```javascript
// a 作右值，抛出 ReferenceError
console.log(a);
// a 作为左值，如在浏览器运行，则创建全局变量 a 并赋值
b = 10;
function strictFunc() {
    'use strict';
    // 严格模式，抛出 ReferenceError
    c = 10;
}
```

当 RHS 查找成功，但进行错误的访问，会抛出 `TypeError` 异常：

```javascript
    let a = null;
    // 访问 null / undefined 的属性
    console.log(a.value);
    a = undefined;
    console.log(a.value);
    // 将非函数变量作为函数使用
    a();
```


## 实际的常见问题

### 意外生成全局变量

为了保证代码健壮性，尽可能使用严格模式开发，尽可能避免误创建全局变量，
导致行为默认失败，但不抛出异常，难以 debug

```javascript
const arr = [1,2,3];
// Python 转 JS 常见错误
for(a in arr){}
function fetchData() {
  fetch('url').then((data)=>{
    // 忘记使用 this，导致创建全局变量
    mydata = data;
  })
}
```

### 操作对象不存在的值并获取属性

经常出现在 DOM 操作、处理 ajax 操作返回数据时，使用了对象中不存在的属性作为对象，
并访问其属性导致 `TypeError`

### this 指针

在使用对象内的函数访问对象的其他成员时，常需要使用 `this` 来进行访问，原因在于
JavaScript 中只存在 `全局作用域`、`函数作用域` 和 `块级作用域`
（感觉更像是编译器级别IIFE，因为存在暂时性死区问题），对象的 `{}` 不构成单独作用域，
因此需要存在 `this` 机制指向这个对象，从而"扩充"函数可作用范围。
