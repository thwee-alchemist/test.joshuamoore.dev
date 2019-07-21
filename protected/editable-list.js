var testApp = angular.module('testApp')

/*
  EditableList
*/
function EditableListCtrl($scope){

  $scope.editing = -1;

  this.$onInit = function(){
    this.templateObj = {};
    this.fields.forEach(field => {

      switch(field.type){
        case 'String':
        case 'Number':
          this.templateObj[field.name] = Reflect.construct(eval(field.type), []);
          break;

        case 'Date':
        default:
          this.templateObj[field.name] = null;
      }
    })

    this.item = Object.create(this.templateObj);
  };

  this.addItem = function(item){
    this.model.push(item);
    $scope.$emit('item added', item);
    this.item = Object.assign({}, this.templateObj);
  };

  this.editItem = function(idx){
    this.item = Object.assign({}, this.model[idx]);
    $scope.editing = idx;
  };

  this.saveEdit = function(item){
    Object.assign(this.model[$scope.editing], item);
    this.item = Object.assign({}, this.templateObj);
    $scope.$emit('item updated', item);
    $scope.editing = -1;
  };

  this.cancelEdit = function(){
    this.item = Object.assign({}, this.templateObj);
    $scope.editing = -1;
  };

  this.removeItem = function(idx){
    $scope.$emit('deleting item', this.model[idx]);
    this.model.splice(idx, 1);
  };
}

testApp.filter('capitalize', function() {
  return function(input) {
    return (angular.isString(input) && input.length > 0) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : input;
  }
});

testApp.component('editableList', {
  bindings: {
    model: '=',
    fields: '<',
    itemToString: '<'
  },
  controller: ['$scope', EditableListCtrl],
  templateUrl: 'editable-list.html',
  controllerAs: '$ctrl'
});