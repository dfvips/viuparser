let fragment = document.createDocumentFragment();
inject();
console.log('inj');

function inject(){
  // createScript('js/jquery.min.js');
  createScript('js/jszip/jszip.min.js');
  createScript('js/jszip/FileSaver.js');
  createScript('js/ajax.js');
  createScript('js/index.js');
  document.head.appendChild(fragment);
}

function createScript(url){
  var t = document.createElement("script");
  t.src = chrome.runtime.getURL(url);
  fragment.appendChild(t);
}

function sendMsg(msg){
  chrome.runtime.sendMessage(msg,function (response) {
    console.log(response);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse("success");
    if(request == "one" || request == 'tabone'){
        document.dispatchEvent(new CustomEvent('downOneListener'));
    }else if(request == "all" || request == 'taball'){
        document.dispatchEvent(new CustomEvent('downAllListener'));
    }
});