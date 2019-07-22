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
    alert("The server and your browser are out of sync, probably because I restarted the server. You'll be redirected and can log back in. This will stabilize in the future");
    location.href = '/';
  });

  $scope.$on('item added', (e, item) => {
    // todo revisit this function
    var newItem = {};
    for(var field in item){
      newItem[field] = item[field] ? $scope.encryptMsg(item[field]) : '';
    } 
    $scope.socket.emit('item added', newItem);
    e.stopPropagation();
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
    result.map(g => {
      $scope.graphs = [];
      $scope.graphs.push({
        id: g._id,
        name: g._name
      })

    })

    $scope.graph = $scope.graphs[0];
    $scope.$apply();
  });

  $scope.socket.emit('graphs');

  /* fetch persons*/
  $scope.on('persons response', (persons) => {
    $scope.persons = persons;
  })

  $scope.addGraph = function(){
    var name = prompt("Please enter a name for the graph:");
    if(name){
      $scope.socket.emit('add graph', name);
      $scope.socket.once('add graph response', id => {
        $scope.graphs.push({
          'id': id,
          'name': name
        })

        $scope.$apply();
      });
    }
  };

  $scope.selectGraph = function(){
    $scope.socket.emit('persons');
  }
}



testApp.controller('testCtrl', TestCtrl)
