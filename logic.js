function pageLoad() {
    console.log('hello');
}

function importFile() {
    console.log('import file');
    const xhttp = new XMLHttpRequest();
    const url = 'http://localhost:3000/import';

    xhttp.onreadystatechange = function() {
      console.log('readyState: ', this.readyState);
      if (this.readyState === 4) {
        if (this.status === 200) {
            console.log('success!');
        } else {
            console.log('error: ', JSON.stringify(this));
        }
      }  
    };
    xhttp.open('GET', url, true);
    xhttp.send();
}