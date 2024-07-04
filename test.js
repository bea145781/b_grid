const ipAddress = 'api64.ipify.org?format=json'; // 替换成你想要请求的 IP 地址

fetch(`http://${ipAddress}`)
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json(); // 或者根据返回的数据类型选择合适的方法处理响应
  })
  .then(data => {
    console.log('请求成功', data);
  })
  .catch(error => {
    console.error('请求出错', error);
  });