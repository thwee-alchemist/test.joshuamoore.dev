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
    {name: 'picture', type: 'Text'},
    {name: 'text', type: 'Text', ph: "Write something brilliant"}
  ];

  $scope.groupFields = [
    {name: 'name', type: 'String', ph: "What is the group called?"},
    {name: 'picture', type: 'Text', ph: 'Paste an image URL or base64 encoded image here'},
    {name: 'from', type: 'Date'},
    {name: 'until', type: 'Date'},
    {name: 'text', type: 'Text', ph: "Write something brilliant"}
  ];


  $scope.relationshipFields = [
    {name: 'source', type: 'Select', options: {model: $scope.persons, displayField: 'name', valueField: 'name'}},
    {name: 'type', type: 'Select', options: {model: $scope.relationshipTypes, displayField: 'name', valueField: 'id'}},
    {name: 'target', type: 'Select', options: {model: $scope.groups, displayField: 'name', valueField: 'name'}},
    {name: 'picture', type: 'Text', ph: 'Paste an image URL or base64 encoded image here'},
    {name: 'from', type: 'Date', ph: undefined},
    {name: 'until', type: 'Date', ph: undefined},
    {name: 'text', type: 'Text', ph: "Write something brilliant"}    
  ];



}

testApp.controller('testCtrl', TestCtrl)