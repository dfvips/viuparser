function sedReq(t){
	chrome.tabs.query({
	  active: true,
	  currentWindow: true
	}, (tabs) => {
	  chrome.tabs.sendMessage(tabs[0].id, t, res => {
	    console.log(res)
	  })
	})
}