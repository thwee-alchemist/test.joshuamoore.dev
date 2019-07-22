var testApp = angular.module('testApp', []);


/*
  TestCtrl
*/
function TestCtrl($scope){
  $scope.persons = [];
  $scope.groups = [];
  $scope.relationships = [];

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
    {name: 'type', type: 'hidden', ph: 'person'}
  ];

  $scope.groupFields = [
    {name: 'name', type: 'String', ph: "What is the group called?"},
    {name: 'picture', type: 'Text', ph: 'Paste an image URL or base64 encoded image here'},
    {name: 'from', type: 'Date'},
    {name: 'until', type: 'Date'},
    {name: 'text', type: 'Text', ph: "A place for notes..."},
    {name: 'type', type: 'hidden', ph: 'group'}
  ];


  $scope.relationshipFields = [
    {name: 'source', type: 'Select', options: {model: $scope.persons, displayField: 'name', valueField: 'name'}},
    {name: 'type', type: 'Select', options: {model: $scope.relationshipTypes, displayField: 'name', valueField: 'id'}},
    {name: 'target', type: 'Select', options: {model: $scope.groups, displayField: 'name', valueField: 'name'}},
    {name: 'picture', type: 'Text', ph: 'Paste an image URL or base64 encoded image here'},
    {name: 'from', type: 'Date', ph: undefined},
    {name: 'until', type: 'Date', ph: undefined},
    {name: 'text', type: 'Text', ph: "A place for notes..."},
  ];

  $scope.edit_open = true;

  $scope.socket = io();


  /*
    Set up scope and socket events. 
  */
  setupCrypto($scope);

  $scope.socket.on('refresh', function(){
    alert("An error occured, most likely the server has been restarted. Don't worry, sign back in, and you'll be good to go!");
    location.href = '/';
  });

  $scope.$on('item added', (e, item) => {
    // todo revisit this function
    var newItem = {};
    for(var field in item){
      newItem[field] = $scope.encryptMsg(item[field]);
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

  $scope.graphs =  [];

  
  $scope.socket.on('graphs response', result => {
    console.log('fresh graphs', result)
    $scope.graphs = result.map(g => {
      return {
        id: g._id,
        name: g._name
      }
    });

    if($scope.graphs.length > 0){
      $scope.graph = $scope.graphs[0];
    }

    $scope.$apply();
  });

  $scope.socket.on('persons response', result => {
    console.log('fresh people', result);

    $scope.persons = result.map(p => {
      return {
        name: p._name,
        picture: p._texture,
        type: 'person',
        from: p._from,
        until: p._until,
        text: p._text,
        data: p._data // todo json parse
      }
    });

    $scope.$apply();
  })

  $scope.socket.emit('graphs');

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
    console.log('select graph arguments', arguments);

    $scope.socket.emit('persons', $scope.graph.id)
  }
}



testApp.controller('testCtrl', TestCtrl)
