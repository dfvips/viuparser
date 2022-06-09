//发送请求
async function sendAxio(api,myheaders){
    //参数
    var requestOptions = {
        method: 'GET',
        referrer: "about:client",
        referrerPolicy: "strict-origin-when-cross-origin",
        mode: "cors", 
        credentials: "same-origin",
        cache: "default",
        redirect: "follow",
        integrity: "",
        keepalive: false,
    };
    //请求头
    if(typeof myheaders !== 'undefined') {
        var headers = new Headers(),
        keys = Object.keys(myheaders);
        for (key of keys) {
            let val = myheaders[key];
            headers.append(key, val);
        }
        requestOptions.headers = headers;
    }
    
    try {
        let res = await fetch(api, requestOptions),
        txt = await res.text();
        return txt;
    } catch(e) {
        return 'error';
    }
}
