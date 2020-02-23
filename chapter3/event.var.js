for (var i = 0; i < 5; i++) {
    var btn = document.createElement("button");
    btn.innerText = "Test";
    btn.addEventListener("click", () => {
        console.log(i);
    });
    document.body.append(btn);
}

for (var i = 0; i < 5; i++) {
    (function(i){
        var btn = document.createElement("button");
        btn.innerText = "Test";
        btn.addEventListener("click", () => {
            console.log(i);
        });
        document.body.append(btn); 
    })(i);
}
