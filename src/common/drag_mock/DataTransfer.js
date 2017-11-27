
function removeFromArray(array, item) {
  var index = array.indexOf(item);

  if (index >= 0) {
    array.splice(index, 1);
  }
}


var DataTransfer = function() {
  this.dataByFormat = {};

  this.dropEffect = 'none';
  this.effectAllowed = 'all';
  this.files = [];
  this.types = [];
};

DataTransfer.prototype.clearData = function(dataFormat) {
  if (dataFormat) {
    delete this.dataByFormat[dataFormat];
    removeFromArray(this.types, dataFormat);
  } else {
    this.dataByFormat = {};
    this.types = [];
  }
};

DataTransfer.prototype.getData = function(dataFormat) {
  return this.dataByFormat[dataFormat];
};

DataTransfer.prototype.setData = function(dataFormat, data) {
  this.dataByFormat[dataFormat] = data;

  if (this.types.indexOf(dataFormat) < 0) {
    this.types.push(dataFormat);
  }

  return true;
};

DataTransfer.prototype.setDragImage = function() {
  // don't do anything (the stub just makes sure there is no error thrown if someone tries to call the method)
};

module.exports = window.DataTransfer || DataTransfer;
