var testApp = angular.module('testApp', []);


/*
  TestCtrl
*/
function TestCtrl($scope){
  $scope.persons = [];
  $scope.groups = [];
  $scope.relationships = [];

  $scope.graphs =  [];
  $scope.graph = {
    id: -1,
    name: 'loading...'
  };

  $scope.relationshipTypes = [
    {name: 'is-part-of', id: 1},
    {name: 'is-super-of', id: 2},
    {name: 'is-a', id: 3},
    {name: "is", id: 4},
    {name: "was", id: 5},
    {name: 'reports-to', id: 6},
    {name: 'collaborates-with', id: 7}
  ];

  $scope.entityToString = function(){
    return this.name;
  }

  $scope.relationshipToString = function(){
    return `${this.source.name} ${this.type.name} ${this.target.name}`;
  }

  $scope.personFields = [
    {name: 'name', type: 'String', ph: "Full Name"},
    {name: 'picture', type: 'Text', ph: 'Paste an image URL or base64 encoded image here'},
    {name: 'from', type: 'Date'},
    {name: 'until', type: 'Date'},
    {name: 'text', type: 'Text', ph: "A place for notes..."},
    {name: 'type', type: 'hidden', ph: 'person'},
    {name: 'graph_id', type: 'hidden', ph: $scope.graph.id}
  ];

  $scope.groupFields = [
    {name: 'name', type: 'String', ph: "What is the group called?"},
    {name: 'picture', type: 'Text', ph: 'Paste an image URL or base64 encoded image here'},
    {name: 'from', type: 'Date'},
    {name: 'until', type: 'Date'},
    {name: 'text', type: 'Text', ph: "A place for notes..."},
    {name: 'type', type: 'hidden', ph: 'group'},
    {name: 'graph_id', type: 'hidden', ph: $scope.graph.id}
  ];


  $scope.relationshipFields = [
    {name: 'source', type: 'Select', options: {model: $scope.persons, displayField: 'name', valueField: 'name'}},
    {name: 'type', type: 'Select', options: {model: $scope.relationshipTypes, displayField: 'name', valueField: 'id'}},
    {name: 'target', type: 'Select', options: {model: $scope.groups, displayField: 'name', valueField: 'name'}},
    {name: 'picture', type: 'Text', ph: 'Paste an image URL or base64 encoded image here'},
    {name: 'from', type: 'Date', ph: undefined},
    {name: 'until', type: 'Date', ph: undefined},
    {name: 'text', type: 'Text', ph: "A place for notes..."},
    {name: 'graph_id', type: 'hidden', ph: $scope.graph.id}
  ];

  $scope.edit_open = true;

  $scope.socket = io();


  /*
    Set up scope and socket events. 
  */
  setupCrypto($scope);

  $scope.socket.on('refresh', function(){
    alert("The server and your browser are out of sync, probably because I restarted the server. You'll be redirected and can log back in.");
    location.href = '/';
  });

  $scope.$on('item added', async (e, item) => {
    // todo revisit this function
    var newItem = {};

    console.log('item added', item, e)

    for(var field in item){
      newItem[field] = !(field in ['graph_id', 'id', 'source', 'target', 'type']) && item[field]  ?
        JSON.stringify(await $scope.encryptMsg(item[field])) : 
        item[field]; // can be extended to in
    }

    $scope.socket.off('item added response');
    $scope.socket.on('item added response', (result) => {
      console.log('item added response');
      newItem.id = result.id;
    })

    $scope.socket.emit('item added', newItem);
    console.log('item added emitted', newItem);
  })

  $scope.$on('item updated', (e, item) => {
    $scope.socket.emit('item updated', item);
    e.stopPropagation();
  });

  $scope.$on('deleting item', (e, item) =>{
    $scope.socket.emit('deleting item', item);
    e.stopPropagation();
  });

  $scope.onFileInput = (file) => {
    var input;
    if(file){
      input = file;
    }else{
      input = $document('.file').files[0];
    }
  
    var reader = new FileReader();

    reader.onload = (e) => {
      input = reader.result;
      input = JSON.parse(input);
    };
    
    reader.readAsText(input);
  };

  
  /* fetch graphs */
  $scope.socket.on('graphs response', result => {
    console.log('fresh graphs', result)

    if(result.length > 0){
      $scope.graphs = result.map(g => {
        return {
          id: g._id,
          name: g._name
        }
      });
  
      $scope.graph = $scope.graphs[0];
      $scope.socket.emit('persons', $scope.graph.id);
    }

    $scope.$apply();
  });

  $scope.socket.on('persons response', result => {
    console.log('fresh people', result);

    $scope.persons = result.map(async p => {
      var entity = {
        name: p._name ? (await $scope.decryptMsg(p._name, 'self')) : null,
        picture: p._texture ? (await $scope.decryptMsg(p._texture, 'self')) : null,
        type: 'person',
        from: p._from ? (await $scope.decryptMsg(p._from, 'self')): null,
        until: p._until ? (await $scope.decryptMsg(p._until, 'self')) : null,
        text: p._text ? (await $scope.decryptMsg(p._text, 'self')) : null,
        data: p._data ? (await $scope.decryptMsg(p._data, 'self')) : null // todo json parse
      };

      console.log('decrypted', entity);

      return entity;
    });

    $scope.$apply();
  })

  $scope.socket.emit('graphs');

  $scope.addGraph = function(){
    var name = prompt("Please enter a name for the graph:");
    if(name){
      $scope.socket.off('add graph response')
      $scope.socket.on('add graph response', id => {
        $scope.socket.emit('select graph')
        
        var graph = {
          'id': id,
          'name': name
        };
        $scope.graphs.push(graph)
        $scope.graph = graph;

        $scope.socket.emit('persons')

        $scope.$apply();
      });

      $scope.socket.emit('add graph', name);
    }
  };

  $scope.selectGraph = function(){
    console.log('selection changed')
    $scope.socket.emit('persons', $scope.graph.id);
  }

  $scope.socket.on('error', console.alert)
}



testApp.controller('testCtrl', TestCtrl)
