// https://github.com/mdn/dom-examples/blob/master/web-crypto/derive-key/ecdh.js
// https://crypto.stackexchange.com/questions/41601/aes-gcm-recommended-iv-size-why-12-bytes


async function encrypt(message, secretKey){
  if(message.length % 2 !== 0){
    message += ' ';
  }
  console.log(secretKey);
  let iv = crypto.getRandomValues(new Uint8Array(12));
  let encoded = (new TextEncoder).encode(message);

  ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    secretKey, 
    encoded
  )

  return {ciphertext: ciphertext, 'iv': iv};
  // return {ciphertext: ciphertext, iv: iv}
}

function string2buffer(str, size=16) {
  console.log(str);
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  if(size == 16){
    var bufView = new Uint16Array(buf);
  }else{
    var bufView = new Uint8Array(buf);
  }
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function buffer2string(buf, size=16){
  if(size==16){
    return String.fromCharCode.apply(null, new Uint16Array(buf));
  }else{
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }
}

async function decrypt(ciphertext, secretKey, iv){
  console.log('decrypt', arguments)
  try{
    var decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      secretKey, 
      ciphertext
    );
  }catch(e){
    console.error(e)
  }

  let dec = new TextDecoder();
  return dec.decode(decrypted);
}

async function _deriveSecretKey(privateKey, publicKey) {
  console.log('privateKey', privateKey);
  console.log('publicKey', publicKey)
  return await crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function generateKeyPair(){
  return crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-384'
    },
    true,
    ['deriveKey']
  )
}

async function importKeyPair(keyData){

  const privateKey = await crypto.subtle.importKey('jwk', keyData.privateKey, {
    name: 'ECDH',
    namedCurve: 'P-384'
  }, true, ['deriveKey'])

  const publicKey = await crypto.subtle.importKey('jwk', keyData.publicKey, {
    name: 'ECDH',
    namedCurve: 'P-384'
  }, true, []);

  return {'publicKey': publicKey, 'privateKey': privateKey};
}

async function setupCrypto($scope){
  $scope.keyPair = null;
  $scope.publicKeys = [];
  $scope.messages = [];

  $scope.socket.on('publicKeys', (publicKeys) => {
    $scope.publicKeys = publicKeys;
    $scope.$apply();
  });

  $scope.socket.on('publicKey', (publicKey) => {
    console.log(publicKey);
    $scope.publicKeys.push(publicKey)
    $scope.$apply();
  })

  $scope.socket.on('left', (id) => {
    $scope.publicKeys = $scope.publicKeys.splice($scope.publicKeys.findIndex(key => id == key.id), 1);
    $scope.$apply();
  })

  // key stuff
  $scope.generateKeyPair = function(){
    generateKeyPair().then(keyPair => {
      $scope.keyPair = keyPair;
      $scope.prepareDownload($scope.keyPair);
      $scope.$apply();
    });
  }

  if(!localStorage.getItem('keyPair')){
    $scope.generateKeyPair();
  }else{
    var keyData = JSON.parse(localStorage.getItem('keyPair'));
    $scope.keyPair = await importKeyPair(keyData);
  }


  $scope.deriveSecretKey = async function(from){
    var publicKey;
    if(from != "self"){
      var otherId = from ? from : document.querySelector('input[type=radio]:checked').id
      var publicKeyData = $scope.publicKeys.find(key => key.id == otherId);
      console.assert(publicKeyData.key)
      publicKey = await crypto.subtle.importKey('jwk', publicKeyData.key, {
        name: 'ECDH',
        namedCurve: 'P-384'
      }, true, []);  
    }else{
      publicKey = $scope.keyPair.publicKey;
    }
    $scope.secretKey = await _deriveSecretKey($scope.keyPair.privateKey, publicKey)

    return $scope.secretKey;
  }

  $scope.prepareDownload = async function(keyPair){
    var dl = document.querySelector('#downloadKeyPair');
    if(keyPair){
      const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      const privateKey =  await crypto.subtle.exportKey('jwk', keyPair.privateKey);
      const exported = {'publicKey': publicKey, 'privateKey': privateKey};

      localStorage.setItem('keyPair', JSON.stringify(exported));
      dl.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exported)));
      dl.disabled = false;
    }else{
      dl.disabled = true;
    }
  }

  $scope.submitPublicKey = async function(keyPair){
    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    $scope.socket.emit('publicKey', publicKey);
  }

  var keyPairUpload = document.querySelector('#keyPairUpload');
  keyPairUpload.addEventListener('change', async function(){
    if(keyPairUpload.files.length > 0){
      const file = keyPairUpload.files[0];

      const reader = new FileReader();
      reader.onload = async function(){
        const rawKeys = reader.result;
        const keyData = JSON.parse(rawKeys)

        $scope.keyPair = await importKeyPair(keyData);

        $scope.prepareDownload();
      };
      reader.readAsText(file);
    }
  })

  $scope.encryptMsg = async function(cleartext){
    var ciphertext;
    if(!$scope.secretKey){
      try{
        $scope.secretKey = await $scope.deriveSecretKey('self'); // Thanks Britney!
      }catch(e){
        console.error(e);
      }
    }

    try{
      var r = await encrypt(cleartext, $scope.secretKey);
      ciphertext = buffer2string(r.ciphertext);
      console.log('ciphertext', ciphertext)
    }catch(e){
      console.error(e)
    }

    return r;
  }

  $scope.decryptMsg = async function(msg, other){
    console.assert(msg, other);

    if(other == 'self'){ // that breaks the current fourd
      var secretKey = $scope.deriveSecretKey('self');

    }
    var ciphertext = await decrypt(msg.ciphertext, secretKey, msg.iv)
    return ciphertext;
  }

  $scope.send = async function(){
    var otherId = document.querySelector('input[type=radio]:checked').id
    var publicKey = $scope.publicKeys.find(key => key.id == otherId);
    publicKey = await crypto.subtle.importKey('jwk', publicKey.key, {
      name: 'ECDH',
      namedCurve: 'P-384'
    }, false, []);
    var secretKey = await $scope.deriveSecretKey(other);

    var result = await encrypt($scope.text, secretKey);
    var toBeSent = {to: otherId, msg: result.ciphertext, iv: result.iv};
    $scope.socket.binary(true).emit('message', toBeSent);

    $scope.messages.push({from: 'me', to: otherId, time: (new Date()).toLocaleTimeString(), text: $scope.text});
    $scope.$apply();
  }

  $scope.socket.on('publicKeyResponse', (results) => {
    console.log('pk response', results)
  });

  $scope.downloadKeyPair = function(){
    $scope.prepareDownload();
    $('#downloadKeyPair').click();
  }

  return null;
}

