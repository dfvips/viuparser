let optIdOne = chrome.contextMenus.create({
    "title" : "单集下载",
    "contexts" : ["page","image"],
    "onclick" : downOneBymenu
});
let optIdTwo = chrome.contextMenus.create({
    "title" : "全集下载",
    "contexts" : ["page","image"],
    "onclick" : downAllBymenu
});
function downOneBymenu(info) {
	sedReq("one");
}
function downAllBymenu(info) {
	sedReq("all");
}