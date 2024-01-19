let lineToDelete = null;
let searchString = '';
const hostname = window.location.hostname;
const frontend = (
  (hostname === '127.0.0.1' || hostname === 'localhost')
    ? 'http://localhost:5500'
    : 'http://planetshah/pwv'
);
const backend = (
  (hostname === '127.0.0.1' || hostname === 'localhost')
    ? 'http://localhost'
    : 'http://ec2-18-223-71-133.us-east-2.compute.amazonaws.com'
) + ':3000/';