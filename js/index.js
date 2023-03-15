let epId,//视频编号
episodes,currentEpInfo,
datas = Object.values(__NEXT_DATA__.props.pageProps.initialProps.fallback)[1],
epdatas = datas.data,
current_product = epdatas.current_product,
series = epdatas.series,
epTitle = series.name,epCurrent,flag = false,
series_id = series.series_id,
global_area_id = datas.server.area.area_id;

async function epConfig() {
    let url = window.location.href,
    pageId = url.replace(/.*\/([^\/]+\/[^\/]+)$/, '$1').replace(/\/.*/g,'');//基本信息
    flag = false;
    if(typeof current_product.product_id !== 'undefined') {
        epId = String(current_product.product_id);
        if(epId != pageId) {
            epId = pageId;
            epdatasApi = getSubApi(epId);
            epdatas = await sendAxio(epdatasApi);//当前视频全部信息
            epdatas = JSON.parse(epdatas).data;
            current_product = epdatas.current_product;
            series = epdatas.series;
            epTitle = series.name;
            series_id = series.series_id;
        }
    }else {
        epId = pageId;
    }
}

epConfig();

//获取全集id
async function getEps(){
   let api = getApi(series_id);//Api
   currentEpInfo = await sendAxio(api); //获取视频全部信息
   currentEpInfo = JSON.parse(currentEpInfo);
//    let series = currentEpInfo.data.series; //全集信息
//    let series = currentEpInfo.data.product_list; //全集信息
//    epTitle = series.name;//剧名
//    episodes = series.product; //全集编号
   episodes = currentEpInfo.data.product_list; //全集编号
//    if (episodes instanceof Array) {
//        episodes = episodes.reverse();//反转顺序
//    }
   epCurrent = Object.values(episodes).filter(ep => ep.product_id === epId);//过滤当前剧集
};
//开始任务
async function startTask (type){
    await getEps();
    if(type === 0) {
        done(epCurrent);//单个下载
    }else {
        done(episodes);//全部下载
    }
}
//开始执行
async function done (eps){
    let episodes = await sortList(eps);
    startDown(episodes);
}
//解析并获取全部数据
async function sortList (eps){
    let results = eps.map(async ep => {
        let epData,curId = ep.product_id,api = getSubApi(curId);//当前数据
        // if(curId !== epId) {
            epData = await sendAxio(api);
            epData = JSON.parse(epData);
        // }else {
        //     epData = currentEpInfo;//当前视频
        // }
        let current_product = epData.data.current_product,//当前播放
        ccs_product_id = current_product.ccs_product_id, //视频序列号
        subtitles = current_product.subtitle, //字幕 Array
        num = addZero(current_product.number,String(episodes.length)), //集
        synopsis = current_product.synopsis,
        curTitle = `${epTitle} ${num} ${synopsis}`,
        vodApi = getVodApi(ccs_product_id), //m3u Api
        // secondSublistApi = getSecondSub(epId), //second subtitle Api
        // secondSublistsData = {},
        authorization = getCookie("token"),token = `Bearer ${authorization}`,//token
        header = {
            'authorization':token, //请求头
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-encoding': 'gzip, deflate, br'
        },
        vodData = await sendAxio(vodApi,header); //请求
        vodData = JSON.parse(vodData);
        // secondSubData = await sendAxio(secondSublistApi,header); //请求
        // secondSubData = JSON.parse(secondSubData);
        // try {
        //     secondSublistsData = secondSubData.data.current_product.subtitle;
        //     secondSublistsData = secondSublistsData.filter(obj => obj.second_subtitle_url !== '');
        // }catch(e){
        //     secondSublistsData = [];
        // }
        let urls,url,obj;
        if(typeof vodData.data !== 'undefined') {
            urls = vodData.data.stream.url;
            url = Object.values(urls).reverse()[0];
        }else {
            flag = true;
            vodApi = getVodApi(ccs_product_id) + '&duration=180&duration_start=0';
            vodData = await sendAxio(vodApi,header); //请求
            vodData = JSON.parse(vodData);
            urls = vodData.data.stream.url;
            url = Object.values(urls).reverse()[0];
        }
        obj = {
            'title': curTitle,
            'url': url,
            'subtitles': subtitles,
            // 'secondSub': secondSublistsData
        };
        return obj;
    });
    let epsAll = await Promise.all(results);
    return epsAll;
}
//开始下载
async function startDown(arr){
    let batContent = 'chcp 65001',
    newBatContent = 'chcp 65001',
    shContent = '';
    zip = new JSZip(),
    zipName = '',
    batName = '',
    newBatName = '',
    shName = '',
    subtitlesArr = [];
    for (ep of arr) {
        let url = ep.url,
        title = ep.title,
        subtitles = ep.subtitles;
        // subtitles = subtitles.concat(ep.secondSub);
        console.log(subtitles);
        if(ep.url != undefined) {
            batContent += '\r\n' + `N_m3u8DL-CLI "${url}" --saveName "${title}" --enableDelAfterDone --enableBinaryMerge`;
            newBatContent += '\r\n' + `N_m3u8DL-RE "${url}" --save-name "${title}" --auto-select --mp4-real-time-decryption -M format=mp4 -mt`
        }
        if(subtitles instanceof Array) {
            for (sub of subtitles) {
                let name = `${title} ${sub.name} ${sub.code}.vtt`,
                url = sub.url;
                newBatContent += ` --mux-import path="${name}":lang=${sub.code}:name="${sub.name}"`;
                subtitlesArr.push({'name':name,'url':url});
                if(typeof sub.second_subtitle_url != 'undefined' && sub.second_subtitle_url !== '') {
                    let name = `${title} ${sub.name} ${sub.code} describe.vtt`,
                    url = sub.second_subtitle_url;
                    newBatContent += ` --mux-import path="${name}":lang=${sub.code}:name="${sub.name} describe"`;
                    subtitlesArr.push({'name':name,'url':url});
                }
            }
        }
    };
    shContent = newBatContent.replace('chcp 65001\r\n','');
    let results = subtitlesArr.map(async sub => {
        let url = sub.url,
        name = sub.name,
        content = await sendAxio(url);
        zip.file(name,content);
    });
    await Promise.all(results).then(() => {
        if(arr.length === 1){
            let o = arr[0];
            batName = `${o.title}.bat`;
            newBatName = `${o.title}_RE.bat`;
            shName = `${o.title}_RE.sh`;
            zipName = `${o.title}.zip`;
        }else {
            batName = `${epTitle}.bat`;
            newBatName = `${epTitle}_RE.bat`;
            shName = `${epTitle}_RE.sh`;
            zipName = `${epTitle}.zip`;
        }
        if (batContent !== 'chcp 65001') {
            zip.file(batName, batContent);
            zip.file(newBatName, newBatContent);
            zip.file(shName, shContent);
            zip.generateAsync({type:'blob'}).then(function(content) {
                // see FileSaver.js
                saveAs(content, zipName);
            });    
        }else {
            alert('error');
        }
    });
}
function getSubApi(id) {
    let api = `https://api-gateway-global.viu.com/api/mobile?platform_flag_label=web&area_id=${global_area_id}&language_flag_id=${global_area_id}&platformFlagLabel=web&areaId=${global_area_id}&languageFlagId=${global_area_id}&ut=0&r=%2Fvod%2Fdetail&product_id=${id}&os_flag_id=1`;
    return api;
}

function getApi(series_id) {
  // let api = `https://www.viu.com${web_api_url}&product_id=${epId}&ut=0`.replace('&r=','&r=vod/ajax-detail&platform_flag_label=web');
    let api = `https://api-gateway-global.viu.com/api/mobile?platform_flag_label=web&area_id=${global_area_id}&language_flag_id=${global_area_id}&platformFlagLabel=web&areaId=${global_area_id}&languageFlagId=${global_area_id}&r=%2Fvod%2Fproduct-list&os_flag_id=1&series_id=${series_id}&size=-1&sort=asc`;
    return api;
}

function getVodApi(cId) {
    let api = `https://api-gateway-global.viu.com/api/playback/distribute?cpreference_id=&ccs_product_id=${cId}&language_flag_id=${global_area_id}`;
    if(flag) {
        api += '&duration=180&duration_start=0';
    }
    return api;
}

// function getSecondSub(epId) {
//     let api = `https://api-gateway-global.viu.com/api/mobile?r=/series/detail&platform_flag_label=web&area_id=${global_area_id}&language_flag_id=${global_area_id}&cpreference_id=&product_id=${epId}&ut=0`;
//     return api;
// }

//监听hash变化
class Dep {                  // 订阅池
    constructor(name){
        this.id = new Date() //这⾥简单的运⽤时间戳做订阅池的ID
        this.subs = []       //该事件下被订阅对象的集合
    }
    defined(){              // 添加订阅者
        Dep.watch.add(this);
    }
    notify() {              //通知订阅者有变化
        this.subs.forEach((e, i) => {
            if(typeof e.update === 'function'){
                try {
                   e.update.apply(e)  //触发订阅者更新函数
                } catch(err){
                    console.warr(err)
                }
            }
        })
    }
}
Dep.watch = null;
class Watch {
    constructor(name, fn){
        this.name = name;       //订阅消息的名称
        this.id = new Date();   //这⾥简单的运⽤时间戳做订阅者的ID
        this.callBack = fn;     //订阅消息发送改变时->订阅者执⾏的回调函数
    }
    add(dep) {                  //将订阅者放⼊dep订阅池
       dep.subs.push(this);
    }
    update() {                  //将订阅者更新⽅法
        let cb = this.callBack; //赋值为了不改变函数内调⽤的this
        cb(this.name);          
    }
}

let addHistoryMethod = (function(){
	let historyDep = new Dep();
	return function(name) {
		if(name === 'historychange'){
			return function(name, fn){
				let event = new Watch(name, fn)
				Dep.watch = event;
				historyDep.defined();
				Dep.watch = null;       //置空供下⼀个订阅者使⽤
			}
		} else if(name === 'pushState' || name === 'replaceState') {
			let method = history[name];
			return function(){
				method.apply(history, arguments);
				historyDep.notify();
			}
		}
	}
}());

//监听地址变化
window.addHistoryListener = addHistoryMethod('historychange');
history.pushState =  addHistoryMethod('pushState');
history.replaceState =  addHistoryMethod('replaceState');
window.addHistoryListener('history',function(){
    epConfig();
});

function getCookie(cookie_name) {
    var allcookies = document.cookie;
    //索引长度，开始索引的位置
    var cookie_pos = allcookies.indexOf(cookie_name);
    // 如果找到了索引，就代表cookie存在,否则不存在
    if (cookie_pos != -1) {
        // 把cookie_pos放在值的开始，只要给值加1即可
        //计算取cookie值得开始索引，加的1为“=”
        cookie_pos = cookie_pos + cookie_name.length + 1;
        //计算取cookie值得结束索引
        var cookie_end = allcookies.indexOf(";", cookie_pos);
        if (cookie_end == -1) {
            cookie_end = allcookies.length;
        }
        //得到想要的cookie的值
        var value = unescape(allcookies.substring(cookie_pos, cookie_end));
    }
    return value;
}

function addZero(str1,str2) {
    let l = str2.length;
    while (str1.length < l || str1.length < 2) {
        str1 = `0${str1}`;
    }
    return str1;
}

//监听单集
document.addEventListener('downOneListener', function (event) {
    startTask(0);
});
//监听全集
document.addEventListener('downAllListener', function (event) {
    startTask(1);
});
