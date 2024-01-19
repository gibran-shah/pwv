function signIn() {
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    ajax(
      'auth/signin',
      'POST',
      { username: username.value, password: password.value },
      (response) => {
        const responseObj = JSON.parse(response);
        const { accessToken, expirationTime } = responseObj;
        if (accessToken && expirationTime) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('expirationTime', expirationTime);
          window.location.href = `${frontend}/signedIn.html`;
        } else {
          console.log('Could not log in');
        }
      }
    );
}