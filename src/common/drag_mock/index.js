
var DragDropAction = require('./DragDropAction');


function call(instance, methodName, args) {
  return instance[methodName].apply(instance, args);
}

function triggerDragEvent (element, target) {
  var getXpathOfElement = function (element) {
      if (element == null) {
          return 'null';
      }
      if (element.parentElement == null) {
          return '/' + element.tagName;
      }

      var siblingElement = element.parentElement.children;
      var tagCount = 0;
      var totalTagCount = 0;
      var isFound = false;

      for (var i = 0; i < siblingElement.length; i++) {
          if (siblingElement[i].tagName == element.tagName && !isFound) {
              tagCount++;
              totalTagCount++;
          } else if (siblingElement[i].tagName == element.tagName) {
              totalTagCount++;
          }
          if (siblingElement[i] == element) {
              isFound = true;
          }
      }

      if (totalTagCount > 1) {
          return getXpathOfElement(element.parentElement) + "/" + element.tagName + "[" + tagCount + "]";
      }

      return getXpathOfElement(element.parentElement) + "/" + element.tagName;
  };
  var script = "                                              \
      function simulateDragDrop(sourceNode, destinationNode){\
      function createCustomEvent(type) {                     \
          var event = new CustomEvent('CustomEvent');        \
          event.initCustomEvent(type, true, true, null);     \
          event.dataTransfer = {                             \
              data: {                                        \
              },                                             \
              setData: function(type, val) {                 \
                  this.data[type] = val;                     \
              },                                             \
              getData: function(type) {                      \
                  return this.data[type];                    \
              }                                              \
          };                                                 \
          return event;                                      \
      }                                                      \
      function dispatchEvent(node, type, event) {            \
          if (node.dispatchEvent) {                          \
              return node.dispatchEvent(event);              \
          }                                                  \
          if (node.fireEvent) {                              \
              return node.fireEvent('on' + type, event);     \
          }                                                  \
      }                                                      \
      var event = createCustomEvent('dragstart');            \
      dispatchEvent(sourceNode, 'dragstart', event);         \
                                                             \
      var dropEvent = createCustomEvent('drop');             \
      dropEvent.dataTransfer = event.dataTransfer;           \
      dispatchEvent(destinationNode, 'drop', dropEvent);     \
                                                             \
      var dragEndEvent = createCustomEvent('dragend');       \
      dragEndEvent.dataTransfer = event.dataTransfer;        \
      dispatchEvent(sourceNode, 'dragend', dragEndEvent);    \
  }                                                          \
  simulateDragDrop(document.evaluate('" + getXpathOfElement(element) + "', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue, document.evaluate('" + getXpathOfElement(target) + "', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue);\
  ";
  var win = window;
  var doc = win.document;
  var scriptTag = doc.createElement("script");
  scriptTag.type = "text/javascript";
  scriptTag.text = script;
  doc.body.appendChild(scriptTag);
}


var dragMock = {
  dragStart: function(targetElement, eventProperties, configCallback) {
    return call(new DragDropAction(), 'dragStart', arguments);
  },
  dragEnter: function(targetElement, eventProperties, configCallback) {
    return call(new DragDropAction(), 'dragEnter', arguments);
  },
  dragOver: function(targetElement, eventProperties, configCallback) {
    return call(new DragDropAction(), 'dragOver', arguments);
  },
  dragLeave: function(targetElement, eventProperties, configCallback) {
    return call(new DragDropAction(), 'dragLeave', arguments);
  },
  drop: function(targetElement, eventProperties, configCallback) {
    return call(new DragDropAction(), 'drop', arguments);
  },
  delay: function(targetElement, eventProperties, configCallback) {
    return call(new DragDropAction(), 'delay', arguments);
  },

  triggerDragEvent,

  // Just for unit testing:
  DataTransfer: require('./DataTransfer'),
  DragDropAction: require('./DragDropAction'),
  eventFactory: require('./eventFactory')
};

module.exports = dragMock;
