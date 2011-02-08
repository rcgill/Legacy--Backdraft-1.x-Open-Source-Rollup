///
// AMD id = bdRead/main
define([
  "dojo", 
  "dijit", 
  "bd", 
  "./kernel",
  "bd/command/accelerators",
  "bd/widget/menu",
  "./docManager",
  "./util",
  "./command",
  "./search",
  "./paneManager",
  "./showdown",
  "./pageTypes/catalogPage",
  "./pageTypes/document",
  "./pageTypes/generic"
], function(dojo, dijit, bd, bdRead) {

// Here we describe the initial widget tree. It consists of a border container
// with a menu at the top, a statusbar at the bottom, a tree widget on the left for navigation,
// and a center pane used to display the current document object.
// 
// Widget trees are described by defining bd.descriptors. The entire tree could be defined
// in a single descriptor with nested children; however, it's arguably more readable to break
// out the top-level children as we've done below.

var 
  menu= {
    className:"bd:widget.menubar",
    contents: {
      toplevelBack:1,
      toplevelForward:1,
      toplevelRecent:1,
      file:{load:1, reload:1, unload:1},
      navigate:{back:1, forward:1, next:1, previous:1, navigatePanes:1, recent:1, search:1, searchResults:1},
      help:{appHelp:1, appNews:1, about:1}
    },
    insertAccels:true,
    parentSpace:{
      regionInfo: {
        region:"top",
        delegateSize:1,
        min:0
      }
    }
  },

  navigator= {
    className:"bd:dijit.tree",
    name:"navigator",
    persist:false,
    style:{overflow:"auto"},
    showRoot:false,
    openOnClick: false,
    openOnDblClick: true,
    model:bdRead.navigatorModel,
    parentSpace:{
      regionInfo: {
        region:"left",
        size:"20%",
        min:0,
        splitter:true
      }
    },
    onCreate:function(theTree) {
      // define how the tree widget behaves upon certain stimuli...
      var
        onFocusNode= function(node) {
          // show the document object associated with a node (if it's not already being shown)
          var current= bd.top.get("center");
          (!current || current.uid!==node.item) && bdRead.paneManager.display(node.item);
        },

        selectedNode= 0,
        onSelectNode= function(node) {
          // if node matches the page being shown, scroll it into view
          var current= bd.top.get("center");
          if (current && current.uid && node && current.uid===node.item) {
            selectedNode= node;
            //this is a little tricky: if node is the parent of the current node
            //then without going to the labelNode first, we may never scroll
            //since the parent node is technically visible when a child is showing
            //even though the label may not be showing.
            dojo.window.scrollIntoView(node.labelNode);
            dojo.window.scrollIntoView(node.domNode);
          }
        },

        onNavigatePanes= function() {
          //toggle navigate between the navigator pane and the document pane
          if (dojo.isDescendant(dijit._curFocus, theTree.domNode)) {
            bd.top.get("center").focus();
          } else {
            selectedNode && theTree.focusNode(selectedNode);
          }
        },
 
        onAddDocument= function(doc) {
          bdRead.navigatorModel.addDocument();
          bdRead.navigatorModel.onChange(doc.uid);
        },

        onDelDocument= function(doc) {
          bdRead.navigatorModel.delDocument();
          bdRead.navigatorModel.getChildren(bdRead.root.uid, function(children) {
            if (children.length) {
              bdRead.paneManager.display(children[0]);
            } else {
              bdRead.paneManager.display(false);
            }
          });
        },

        onLoadDocumentSection= function(doc) {
          //adding a section may cause the document name to change...
          bdRead.navigatorModel.addDocument();
         
          //now traverse any open nodes
          var refreshChildren= function(parent) {
            bdRead.navigatorModel.onChange(parent.item);
            bdRead.navigatorModel.refreshChildren(parent.item);
            if (parent.isExpanded) {
              bd.forEach(parent.getChildren(), function(child) {
                refreshChildren(child);
              });
            }
          };
          bd.findFirst(
            theTree.rootNode.getChildren(), 
            function(child) { return child.item==doc.uid; },
            refreshChildren);
          !bd.top.get("center") && bdRead.paneManager.display(doc.uid);
        };

      // hook up the handlers...
      bd.connect(this, "focusNode", onFocusNode);
      bd.connect(this, "onSelectNode", onSelectNode);
      bd.command.connect("navigatePanes", onNavigatePanes);
      bd.subscribe("bdRead.docAdded", onAddDocument);
      bd.subscribe("bdRead.docDeleted", onDelDocument);
      bd.subscribe("bdRead.docSectionLoaded", onLoadDocumentSection);
    }
  },
  
  statusbar=  {
    className:"bd:widget.statusbar",
    parentSpace:{
      regionInfo: {
        region:"bottom",
        delegateSize:1,
        min:0
      }
    },
    children:[{
      className:"bd:widget.staticText",
      "class":"message",
      value:"ready...",
      onCreate: function(thisPane) {
        var
          currentMessage= 0,
          currentAnimation= 0,
          setMessage= function(message) {
            if (message!=currentMessage) {
              currentMessage= message;
              currentAnimation && currentAnimation.stop();
              thisPane.set("value", message);
              currentAnimation= dojo.animateProperty({node:thisPane.domNode, duration:1000, properties:{backgroundColor:{start:"yellow", end:"white"}}});
              currentAnimation.onEnd= function() {
                setTimeout(function() {
                  thisPane.set("value", "ready...");
                  currentMessage= 0;
                  currentAnimation= 0;
                }, 3000);
              };
              currentAnimation.play();
            }
          };        

        bd.subscribe("bdRead.docSectionRetrieving", function(doc, sectionName) {
          setMessage("Downloading section \"" + sectionName + "\" in document \"" + bdRead.getDisplayName(doc) + "\".");
        });

        bd.subscribe("bdRead.docSectionLoadFailed", function(doc, sectionName) {
          bd.widget.messageBox("Load Failure", "Failed to load document section \"" + sectionName + "\" at URL \"" + (sectionName==DEFAULT ? doc.url : doc.url+sectionName) + "\".", ["OK"]);
        });

        bd.subscribe("bdRead.docSectionLoaded", function(doc, section) {
          setMessage("Loaded section \"" + bdRead.getDisplayName(section) + "\" in document \"" + bdRead.getDisplayName(doc) + "\".");
        });

        bd.subscribe("bdRead.docAdded", function(doc) {
          setMessage("Added document \"" + bdRead.getDisplayName(doc) + "\".");
        });

        bd.subscribe("bdRead.docDeleted", function(doc) {
          setMessage("Deleted document \"" + bdRead.getDisplayName(doc) + "\".");
        });
      }
    },{
      className:"bd:widget.staticText",
      "class":"block",
      onCreate: function(thisPane) {
        // we've included a clock just for fun...
        var
          format= function(n){ return (n < 10) ? "0" + n : n; },
          updateTime= function() {
            var now= new Date();
            thisPane.set("value", format(now.getHours()) + ":" + format(now.getMinutes()) + ":" + format(now.getSeconds()));
          };
        setInterval(updateTime, 500);
      }
   }]
  },

  initialWidgetTree= {
    parent: 
      // the parent of the top-level object is always "root" which corresponds to the html body element
      "root",
  
    descriptor:{
      className:"bd:widget.borderContainer",
      name:"main",
      id:"main",
      style:"width:100%; height:100%; position:absolute; top:0; left:0; z-index:-5;",
      design:"headline",
      children:[navigator, menu, statusbar],
      onCreate:function() {
        // opens the path to the currently displayed page
        this.watch("center", function(child) {
          //the left child is the navigator (a tree widget)
          var navigator= this.get("left").child;
          if (!navigator || !child || !child.uid) {
            return;
          }
          // decorate the tree node that corresponds to the document item in the center pane
          var 
            uid= child.uid,
            path= [],
            doci= bdRead.getDociByUid(uid);
          while (doci) {
            path.unshift(doci.uid);
            doci= doci.parent;
          }
          navigator.set("path", path);
        }, this);
  
        // This single handler causes clicking on any item that contains a class that looks like "click_<uid>"
        // to navigate to the document object given by that uid. This is a really nice way to control
        // navigation without having spinkle anchors and/or handlers all over the place.
        bd.connect(this.domNode, "click", function(e){
          var match= e.target.className.match(/(^|\s)click_(\d+)($|\s)/);
          if (match) {
            bdRead.paneManager.display(Number(match[2]));
          };
        });
      }
    }
  };

//
// STARTUP ROUTINE
//
// The bd.start can be thought of as the entry point to the program (i.e., one can think of it as
// being analogous to "main" in a c/c++ program). See bd.start for details.
//
bd.start({topCreateArgs:initialWidgetTree}, function() {
  // load documents demanded on the command line...
  // here are some example urls...
  // http://localhost:4242/bdRead-dev/bdRead.html?doc=./catalog.js
  // http://localhost:4242/bdRead-dev/bdRead.html?doc=./catalog.js&doc=http://www.altoviso.com:3000/backdraftAPI
  // http://bdRead.altoviso.com?doc=./catalog.js
  var doc= bd.queryArgs.doc || "../test/backdraft-api/catalog.js";
  require(bd.isString(doc) ? [doc] : doc);
});

return bdRead;

});
// Copyright (c) 2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.
