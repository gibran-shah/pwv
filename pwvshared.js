function pageLoad() {
    if (isSignedIn()) {
      if (window.location.pathname === '/index.html') {
        window.location.href = frontend + '/signedIn.html';
      } else {
        wireElements();
      }
      //importFile();
    } else if (window.location.pathname !== '/index.html') {
      window.location.href = frontend + '/index.html';
    }
}
  
function isSignedIn() {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        const expirationTime = localStorage.getItem('expirationTime');
        if (expirationTime) {
        return parseInt(expirationTime) > Date.now();
        }
        return false;
    }

    return false;
}

function ajax(endpoint, method, payload, callback, errorCallback) {
    const xhttp = new XMLHttpRequest();
    const params = payload ? new URLSearchParams(payload) : null;
    const url = backend + endpoint + (params ? `?${params}` : '');
  
    xhttp.onreadystatechange = function() {
      if (this.readyState === 4) {
        if (this.status === 200) {
          if (callback instanceof Function) {
            callback(this.response);
          }
        } else {
          console.log('error: ', JSON.stringify(this));
          if (errorCallback) {
            errorCallback(this.response);
          }
        }
      }  
    };
    xhttp.open(method.toUpperCase(), url, true);
    xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    if (params && method === 'POST') {
      xhttp.send(params);
    } else {
      xhttp.send();
    }
}