///
// AMD id = bdRead/search
define(["dojo", "bd", "./kernel", "dojo/data/ItemFileWriteStore", "bd/descriptor/processor"], function(dojo, bd, bdRead) {

var searchSection= function(section, regex) {
  if (section) for (var chunk, match, i= 0, end= section.length; i<end;) {
    chunk= section[i++];
    if (chunk.charAt) {
      if ((match= chunk.match(regex))) return match;
    } else {
      if ((match= chunk[1].match(regex))) return match;
    }
  }
  return 0;
};

bdRead.search= bd.mix(bdRead.search || {}, {
  interval: 10,
  timeLimit: 10,
  maxSearchesToKeep: 25,
  sectionSearchers: {
    name:function(o, regex) {
      var match= o.name && o.name.match(regex);
      return match ? {uid:o.uid, match:match[0], text:o.name} : 0;
    },
    summary:function(o, regex) {
      var  match= o.sdoc && searchSection(o.sdoc, regex);
      return match ? {uid:o.uid, match:match[0], text:o.name} : 0;
    },
    "main body":function(o, regex) {
      var  match= o.ldoc && searchSection(o.ldoc, regex);
      return match ? {uid:o.uid, match:match[0], text:o.name} : 0;
    }
  }
});

bdRead.search.resultsTable= bd.declare(
  ///
  // A trivial widget that displays items found by a search with a convenient interface for initializing a new search and adding items.

  //superclasses
  [bd.visual],

  //members
  {
  cssStatefulBases: 
    {searchResults:0},

  appendResult: function(result) {
    if (bd.isString(result)) {
      dojo.create("p", {innerHTML:result, "class":"status"}, this.domNode, "last");
    } else {
      var 
        o= idMap[result.uid],
        text= "<span class='match'>" + result.match + "</span>  " + result.text.substr(0, 80) + "<br />" +
              "<span class='name click_" + result.uid + "'>" + (o.displayName || o.name) + ": </span>" + bdRead.util.genSection(o, o.sdoc, false);
      dojo.create("p", {innerHTML:text}, this.domNode, "last");
    }
  },

  clear:function(
    initialMessage
  ) {
    this.domNode.innerHTML= "";
    initialMessage && this.appendResult(initialMessage);
  }
});

var 
  searchResultsPane= 0,
  getSearchResultsPane= function() {
    if (!searchResultsPane) {
      searchResultsPane= bd.createWidget({descriptor:{
        className:"bdRead:search.resultsTable",
        name:"searchResults",
        "class":"searchResults",
        parentSpace:{regionInfo:{region:"center"}}
      }});
      bd.command.connect("searchResults", function() { bd.top.set("center", searchResultsPane); });
    }
    return searchResultsPane;
  };

// connect up the searchResults command to show the results pane

//
// define the search algorithms and the dialog boxes for specifying a search
//

var
idMap= bdRead.uidMap,

LANG_REGEX= 1,
LANG_GLOB= 3,
LANG_EXACT= 4,

searches= [],

searchTimerId= 0,

getAllSectionSearcherNames= function() {
  var result= [];
  bd.forEachHash(bdRead.search.sectionSearchers, function(item, name) {
    result.push(name);
  });
  return result.sort();
},

doSearch= function(regex, sectionsToSearch, dociSet, start, timeLimit, onMatch, onTimeExpired, onComplete ) {
  var
    chunk= 100,
    i= start,
    chunkTimeLimit= timeLimit / 10,
    totalTime= 0,
    match, o, chunkEnd, chunkStartTime, elapsedTime,
    startTime= bd.getTime(),
    tasks= [];

  bd.forEach(sectionsToSearch, function(sectionToSearch, i) {
    if (bdRead.search.sectionSearchers[sectionToSearch]) {
      tasks.push(bdRead.search.sectionSearchers[sectionToSearch]);
    }
  });
  var taskLength= tasks.length;

  while (true) {
    chunkEnd= Math.min(dociSet.length, i + chunk);
    chunkStartTime= bd.getTime();
    while (i<chunkEnd) {
      o= idMap[dociSet[i++]];
      if (o) for (var j= 0; j<taskLength; j++) {
        var result= tasks[j](o, regex);
        if (result) {
          onMatch(result);
          break;
        }
      }
    }
    var time= bd.getTime();
    elapsedTime= time - chunkStartTime;
    totalTime= time - startTime;
    if (i==dociSet.length) {
      onComplete(totalTime);
      return;
    }
    if (totalTime>timeLimit) {
      onTimeExpired(i, totalTime);
      return;
    }
    if (elapsedTime>chunkTimeLimit) {
      chunk= Math.max(chunk / 2, 100);
    } else {
      chunk= chunk * 2;
    }
  }
},

getRegEx_= function(expr, language, ignoreCase) {
  var regex= "";
  switch (language) {
    case LANG_GLOB:
      //escape special regex chars, change non-escaped *, ? to .* and .{1}
      //TODO: "??bla" doesn't replace as expected on FF.
      return new RegExp(expr.replace(/([\^\$\.\+\=\!\:\|\\\/\(\)\[\]\{\}])/g, "\\$1").replace(/(^|[^\\])\*/g, "$1.*").replace(/(^|[^\\])\?/g, "$1.{1}"), ignoreCase ? "i" : "");

    case LANG_EXACT:
      //escape special regex chars
      return new RegExp(expr.replace(/([\^\$\.\+\=\!\:\|\\\/\(\)\[\]\{\}])/g, "\\$1"), ignoreCase ? "i" : "");

    case LANG_REGEX:
    default:
    return new RegExp(expr, ignoreCase ? "i" : "");
  }
},

getRegEx= function(expr, language, ignoreCase) {
  var result= getRegEx_(expr, language, ignoreCase);
  console.log(result.source);
  return result;
},

getDociSet= function(roots) {
  var 
    set= [],
    traverse= function(doci) {
      set.push(doci.uid);
      bd.forEachHash(doci.members, traverse);
    };
  bd.forEach(roots, function(uid) {
    traverse(bdRead.getDociByUid(uid));
  });
  return set;
},

onMatch= function(search, item) {
  search.results.push(item);
  if (search.onMatch) {
    search.onMatch(item);
  }
},

onTimeExpired= function(search, nextStart, timeUsed) {
  search.nextStart= nextStart;
  search.totalTime+= timeUsed;
},

onComplete= function(search, timeUsed) {
  search.totalTime+= timeUsed;
  search.completed= true;
  search.onComplete(search.results.length, search.totalTime);
},

doSomeSearching= function() {
  for (var i= 0; i<searches.length; i++) {
    var search= searches[i];
    if (!search.completed) {
      //this is the highest priority search...
      doSearch(
        search.regex,
        search.sectionsToSearch,
        search.dociSet,
        search.nextStart,
        bdRead.search.timeLimit,
        bd.partial(onMatch, search),
        bd.partial(onTimeExpired, search),
        bd.partial(onComplete, search));
      if (!searchTimerId) {
        setInterval(doSomeSearching, bdRead.search.interval);
      }
      return;
    }
  }
  // there is nothing to search for; clear the timer...
  clearInterval(searchTimerId);
},

search= function(expr, ignoreCase, language, sectionsToSearch, treesToSearch) {
  var 
    results= getSearchResultsPane(),
    onMatch= function(item) { results.appendResult(item); },
    onComplete= function(matchCount, totalTime) { 
      results.appendResult("Search completed: " + matchCount + " matches found in " + (totalTime / 1000) + " seconds."); 
    };

  results.clear(getSearchDescription(expr, ignoreCase, language, sectionsToSearch, treesToSearch));
  sectionsToSearch.sort();
  treesToSearch.sort();
  for (var i= 0, end= searches.length; i<end; i++) {
    var search= searches[i];
    if (
      search.expr===expr &&
      search.language===language &&
      search.ignoreCase===ignoreCase &&
      bd.equal(search.sectionsToSearch, sectionsToSearch) &&
      bd.equal(search.treesToSearch, treesToSearch)
    ) {
      // already did (or are doing) this search...

      // return the results that have already been calculated..
      bd.forEach(search.results, onMatch);

      if (!search.completed) {
        // the search was started but interrupted by another search; it's been running in th background
        search.onMatch= onMatch;
        search.onComplete= onComplete;
      } else {
        // the search was already done so it didn't take any time!
        onComplete(search.results.length, 0);
      }
      searches.splice(i, 1);
      searches.unshift(search);
      updateStores();
      doSomeSearching();
      return;
    }
  }

  //a new search...
  //cancel publishing results of the current search (if any)...
  if (searches.length) {
    searches[0].onMatch= null;
    searches[0].onComplete= null;
  }
  search= {
    expr:expr,
    language:language,
    ignoreCase:ignoreCase,
    sectionsToSearch:bd.clone(sectionsToSearch),
    treesToSearch:bd.clone(treesToSearch),
    regex:getRegEx(expr, language, ignoreCase),
    nextStart:0,
    dociSet:getDociSet(treesToSearch),
    onMatch:onMatch,
    onComplete:onComplete,
    completed:false,
    totalTime:0,
    results:[]
  };
  searches.unshift(search);
  if (searches.length>bdRead.search.maxSearchesToKeep) {
    searches.pop();
  }
  updateStores();
  doSomeSearching();
},

getSearchDescription= function(expr, ignoreCase, language, sectionsToSearch, treesToSearch) {
  var
    result= "Searching ",
    treesToSearchCount= treesToSearch.length,
    sectionsToSearchCount= sectionsToSearch.length;

  if (treesToSearchCount==1 && treesToSearch[0]==1) {
    result+= "everything";
  } else if (treesToSearchCount==1) {
    result+= idMap[treesToSearch[0]].fullName;
  } else if (treesToSearchCount==2) {
    result+= idMap[treesToSearch[0]].fullName + " and " + idMap[treesToSearch[1]].fullName;
  } else {
    result+= bd.map(treesToSearch.slice(0, treesToSearchCount-1), function(uid) {
      return idMap[uid].fullName;
    }).join(", ") + ", and " + idMap[treesToSearch[treesToSearchCount-1]].fullName;
  }

  result+= " for the ";
  switch (language) {
    case LANG_REGEX:
      result+= "regular expression";
      break;
    case LANG_GLOB:
      result+= "glob expression";
      break;
    case LANG_EXACT:
      result+= "exact match";
      break;
  }
  result+= ' "' + expr + '"';
  if (ignoreCase) {
    result+= " (ignore case) ";
  } else {
    result+= " (case sensitive) ";
  }
  result+= ", ";

  if (!sectionsToSearchCount) {
    result+= " in all page sections";
  } else if (sectionsToSearchCount==1) {
    result+= " in section " + sectionsToSearch[0];
  } else if (sectionsToSearchCount==2) {
    result+= "in sections  " + sectionsToSearch[0] + " and " + sectionsToSearch[1];
  } else {
    result+= bd.map(sectionsToSearch.slice(0, sectionsToSearchCount-1), function(sectionToSearch) { return sectionToSearch; }).join(", ") + ", and " + sectionsToSearch[sectionsToSearchCount-1];
  }
  result+= ".";
  return result;
},

exprStore = new dojo.data.ItemFileWriteStore({data:{
  label: "value",
  items: [//e.g., {value:"*", searchOrder:1}
  ]
}}),

sectionsToSearchStore = new dojo.data.ItemFileWriteStore({data:{
  label: "value",
  items: [//e.g., {value:"all", searchOrder:1}
  ]
}}),

treesToSearchStore = new dojo.data.ItemFileWriteStore({data:{
  label: "value",
  items: [//e.g., {value:"all", searchOrder:1}
  ]
}}),

searchOrder= 1,
updateStores= function() {
  // put the current search expr, sectionsToSearch, and treesToSearch in the appropriate store if required
  // update the searchOrder attribute for each of these items so that they are at the top of the dropdown list
  var
    updateStore= function(store, value) {
      store.fetch({
        query:{value:value},
        onComplete:function(items, theRequest) {
          if (items[0]) {
            // the item was already in the store; just update its sort order...
            store.setValue(items[0], "searchOrder", ++searchOrder);
          } else {
            // this is a brand new search item ...
            store.newItem({value:value, searchOrder:++searchOrder});
          }
        }
      });
    },
    currentSearch= searches[0],
    current;

  current= currentSearch.expr;
  (current===getAllSectionSearcherNames().sort().join(", ")) && (current= "*");
  updateStore(exprStore, current);

  current= currentSearch.sectionsToSearch.join(", ");
  current==="root" && (current= "*");
  updateStore(sectionsToSearchStore, current);

  current= bd.map(currentSearch.treesToSearch, function(uid) {
    var o= idMap[uid];
    return o.displayName || o.name;
  }).join(", ");
  updateStore(treesToSearchStore, current);
},

sectionSelectDialog= function(
  theSectionControl
) {
  var
    sections= getAllSectionSearcherNames(),
    current= theSectionControl.getSectionsToSearch(),
    descriptor= {
      className:'bd:widget.dialog',
      title:"Choose Sections to Search",
      children:[]
    },
    top= 10;

  var maxLength= [0, 0], px= "px";
  bd.forEach(sections, function(name, i) {
    maxLength[i%2]= Math.max(maxLength[i%2], name.length);
  });
  var 
    lstyle= bd.mix(bd.css.box({l:10, h:20, w:(maxLength[0] * 8) + 20}), {position:"absolute"}),
    rstyle= bd.mix(bd.css.box({r:10, h:20, w:(maxLength[1] * 8) + 20}), {position:"absolute", textAlign:"right"});

  bd.forEach(sections, function(name, i) {
    var rightColumn= i%2;
    descriptor.children.push({
      className:"bd:widget.checkBox",
      name:name,
      label:name,
      style:bd.mix({top:top+px}, (rightColumn ? rstyle : lstyle)),
      format:(rightColumn ? "cr-cr-r-cr-cr" : "cl-cl-l-cl-cl"),
      value: bd.indexOf(current, name)==-1 ? false : true
    });
    rightColumn && (top+= 30);
  });
  (sections.length % 2) && (top+= 30);

  descriptor.children.push({
    className:'bd:dijit.button',
    label:"OK",
    "class":"messageBoxButton",
    style:{bottom:"10px", right:"10px", position:"absolute"},
    width:{width:"50px"},
    onClick:function(e) {
      var parent= this.parent;
      bd.forEach(sections, function(section) {
        var
          sectionChecked= parent.getChild(section).get("value"),
          indexInCurrent= bd.indexOf(current, section);
        if (sectionChecked && indexInCurrent==-1) {
          current.push(section);
        } else if (!sectionChecked && indexInCurrent!=-1) {
          current.splice(indexInCurrent, 1);
        }
      });
      if (!current.length) {
        current= ["full-name"];
      }
      theSectionControl.set("value", current.join(", "));
      parent.endDialog(e);
    }
  },{
    className:'bd:dijit.button',
    label:"Cancel",
    style:{bottom:"10px", right:"80px", position:"absolute"},
    width:{width:"50px"},
    "class":"messageBoxButton",
    onClick:function(e) {
      this.parent.onCancel(e);
    }
  });
  descriptor.frameSize= {height:(top+40)+px, width: (((maxLength[0] + maxLength[1]) * 8 ) + 80) + px};
  bd.descriptor.processor(descriptor, ["setTabs"]);
  bd.createWidget({descriptor:descriptor}, function(dialog) { dialog.show(); });
};


bdRead.search.listItem= bd.declare(
  ///
  // A trivial widget that:
  // 
  //  * displays a focusable, read-only string
  //  * gives feedback for hovered, focused, and selected states by changing the DOM class attribute
  //  * toggles selected state on mousae click or space bar
  //  * advises parent upon select state change, including any shift keys
  
  //superclasses
  [bd.visual, bd.focusable, bd.mouseable],

  //members
  bd.attr("selected", false),

  bd.makeDeferredConnects(0, bd.visual, bd.focusable, bd.mouseable),

  {
  cssStatefulBases: 
    {bdReadListItem:0},

  cssStatefulWatch: 
    {hover:1, focused:2, selected:3},

  getCreateDomAttributes: function() {
    return bd.mix(this.inherited(arguments), {innerHTML:this.text});
  },

  postcreateDom: function() {
    this.inherited(arguments);
    dojo.setSelectable(this.domNode, false);
  },

  onClick: function(e) {
    var value= !this.selected;
    this.set("selected", value);
    this.parent.adviseSelected(this, value, e.ctrlKey, e.shiftKey);
    dojo.stopEvent(e);
  },

  onKeyPress: function(e) {
    if (e.charCode==dojo.keys.SPACE) {
      this.onClick(e);
      dojo.stopEvent(e);
    }
  }
});


bdRead.search.list= bd.declare(
  ///
  // A trivial widget that manages a sorted list of items that can be selected, control-selected, shift-selected, and/or deselected.

  //superclasses
  [bd.visual, bd.focusable, bd.mouseable, bd.container],

  //members
  {
  cssStatefulBases: 
    {bdReadListbox:0},

  addItem: function(
    text,
    docId
  ) {
    bd.createWidget({parent:this, descriptor:{
      className:"bdRead:search.listItem",
      text:text,
      docId:docId,
      name:"_"+docId
    }});
  },

  addChild: function(child) {
    var 
      children= this.children,
      end= children.length;
    if (end) {
      var 
        lowerCaseText= child.text.toLowerCase(),
        i= 0;
      while (i<end && children[i].text.toLowerCase()<lowerCaseText) i++;
      if (i<end) {
        dojo.place(child.domNode, children[i].domNode, "before");
      } else {
        dojo.place(child.domNode, this.domNode, "last");
      }
      children.splice(i, 0, child);
    } else {
      //the first item...
      dojo.place(child.domNode, this.domNode);
      children.push(child);
    }
  },

  deleteSelected: function(
    docId
  ) {
    var deleteList= [];
    bd.forEach(this.children, function(child) {
      child.get("selected") && deleteList.push(child);
    });
    bd.forEach(deleteList, bd.hitch(this, "removeChild"));
  },

  adviseSelected: function(
    child,   //(object) The widget that is signaling 
    select,   //(boolean) true if child is selected, false if the child is deselected
    control, //(boolean) true if the control key way pressed during the select
    shift    //(boolean) true if the shilf key was pressed during the select
  ) {
    var 
      children= this.children, 
      end= this.children.length;
    if (select) {
      if (control) {
        //don't select/deselect anything else
      } else if (shift) {
        //look for a range to select
        for (var i= 0; i<end && children[i]!==child; i++);
        if (i!=end) {
          //look for an already-selected item before child...
          for (var j= i-1; j>=0 && !children[j].selected; j--);
          if (j>=0) {
            for (var k= 0; k<end; k++) children[k].set("selected", j<=k && k<=i);
            return;
          }
          //look for an already-selected item after child...
          for (j= i+1; j<end && !children[j].selected; j++);
          if (j<=end) {
            for (var k= 0; k<end; k++) children[k].set("selected", i<=k && k<=j);
            return;
          }
        }
      } else {
        //neither control nor shift; therefore, deselect everything else
        for (var i= 0; i<end; i++) children[i]!==child && children[i].set("selected", false);
      }
    } // else deselecting, just let that one item deselect without affecting the other items
  }
});

var
lastSelectSearchTreesDialogFrameSize= 0,
selectSearchTreesDialog= function(
  current,
  onOK
) {
  var
    rememberFrameSize= function(dialog) {
      lastSelectSearchTreesDialogFrameSize= dojo.marginBox(dialog.containerNode);
    },
    descriptor= {
      className:'bd:widget.dialog',
      title:"Choose Trees to Search",
      "class":"selectSearchTrees",
      onCreate:function() {
        var list= this.getChild("list");
        bd.forEach(current, function(uid) {
          //don't put this in...what's the point of adding root when the user is selecting subtrees
          if (uid!==bdRead.root.uid) {
            var doci= idMap[uid];
            list.addItem(doci.displayName || doci.name, doci.uid);
          }
        });
      },
      layout:function() {
        var
          px= "px",
          box= dojo.marginBox(this.containerNode),
          buttonBox= dojo.marginBox(this.getChild("add").domNode),
          padding= buttonBox.h / 2,          
          treeHeight= (box.h - (9 * padding)) / 2;
        this.getChild("tree").set("style", {top:padding+px, left:padding+px, right:padding+px, height:treeHeight+px});
        this.getChild("add").set("style", {top:(2*padding + treeHeight)+px, left:(2*padding)+px});
        this.getChild("sub").set("style", {top:(2*padding + treeHeight)+px, right:(2*padding)+px});
        this.getChild("list").set("style", {top:(5*padding + treeHeight)+px, left:padding+px, right:padding+px, height:treeHeight+px});
        this.getChild("ok").set("style", {bottom:padding+px, right:padding+px});
        this.getChild("cancel").set("style", {bottom:padding+px, right:((2*padding) + dojo.marginBox(this.getChild("ok").domNode).w)+px});
      },
      children:[{
        className:"bd:dijit.tree",
        name:"tree",
        persist:false,
        showRoot:false,
        model:bdRead.navigatorModel
      },{
        className:'bd:dijit.button',
        name:"add",
        label:"Add",
        "class":"messageBoxButton",
        onClick:function(e) {
          dojo.stopEvent(e);
          var doci= idMap[this.parent.getChild("tree").lastFocused.item];
          this.parent.getChild("list").addItem(doci.displayName || doci.name, doci.uid);
        }
      },{
        className:'bd:dijit.button',
        name:"sub",
        label:"Sub",
        "class":"messageBoxButton",
        onClick:function(e) {
          dojo.stopEvent(e);
          this.parent.getChild("list").deleteSelected();
        }
      },{
        className:'bdRead:search.list',
        name:"list"
      },{
        className:'bd:dijit.button',
        name:"cancel",
        label:"Cancel",
        "class":"messageBoxButton",
        onClick:function(e) {
          rememberFrameSize(this.parent);
          this.parent.onCancel(e);
        }
      },{
        className:'bd:dijit.button',
        name:"ok",
        label:"OK",
        "class":"messageBoxButton",
        onClick:function(e) {
          rememberFrameSize(this.parent);
          onOk(bd.map(this.parent.getChild("list").items, function(item) { return item.text; }).join(", ") || "*");
          this.parent.endDialog(e);
        }
      }]
    };
  if (lastSelectSearchTreesDialogFrameSize) {
    descriptor.frameSize= bd.css.box(lastSelectSearchTreesDialogFrameSize);
  }
  bd.descriptor.processor(descriptor, ["setTabs", "setClass"]);
  bd.createWidget({descriptor:descriptor}, function(dialog) { dialog.show(); });
},

searchDialogDescriptor= {
  className:'bd:widget.dialog',
  title:"Search",
  "class":"search",
  cycleNavigation:true,
  persist:true,
  frameSize: {height:"270px", width:"650px"},
  children:[{
    className:"bd:widget.staticText",
    name:"searchFor",
    value:"Search For"
  },{
    className:"bd:dijit.comboBox",
    name:"expr",
    trim:true,
    autoComplete:false,
    store: exprStore,
    fetchProperties:{sort:[{attribute:"searchOrder", descending:true}]},
    searchAttr:"value",
    labelAttr:"value"
  },{
    className:'bd:dijit.button',
    name:"go",
    label:"Go!",
    onClick:function(e) {
      dojo.stopEvent(e);
      var 
        v= bd.hitch(this.parent, "getChild"),
        expr             =v("expr").get("value"),
        ignoreCase       =v("ignoreCase").get("value"),
        language         =v("language").get("value"),
        sectionsToSearch =v("sectionsToSearch").getSectionsToSearch(),
        treesToSearch    =v("treesToSearch").getTreesToSearch();
      if (!expr) {
        bd.widget.messageBox("Information", "Missing search expression; please say what you're searching for.", ["OK"]);
      } else {
        this.parent.onOk();
        bd.top.set("center", getSearchResultsPane());
        search(expr, ignoreCase, language, sectionsToSearch, treesToSearch);
      }
    }
  },{
    className:"bd:widget.radioGroup",
    name: "language",
    buttons: [[LANG_REGEX, "Regular Expression"], [LANG_GLOB, "Blob"], [LANG_EXACT, "Exact Match"]],
    value:LANG_REGEX
    //TODO: make sure this can't be unchecked
  },{
    className:"bd:widget.checkBox",
    name:"ignoreCase",
    label:"Ignore Case"
  },{
    className:"bd:widget.staticText",
    name:"searchTrees",
    value:"Search Trees"
  },{
    className:"bd:dijit.comboBox",
    name:"treesToSearch",
    trim:true,
    autoComplete:false,
    store: treesToSearchStore,
    fetchProperties:{sort:[{attribute:"searchOrder", descending:true}]},
    searchAttr:"value",
    labelAttr:"value",
    value:"*",
    getTreesToSearch:function() {
      var text= bd.trim(this.get("value")||"");
      if (!text || text==="*") {
        return [bdRead.root.uid];
      } else {
        var result= [];
        bd.forEach(text.match(/[^,]+/g), function(fullName) {
          var doci= bdRead.getDociByName(bd.trim(fullName));
          doci && result.push(doci.uid);
        });
        return result;
      }
    }
  },{
    className:'bd:dijit.button',
    name:"setTrees",
    label:"set...",
    onClick:function() {
      var treesToSearch= this.parent.getChild("treesToSearch");
      selectSearchTreesDialog(treesToSearch.getTreesToSearch(), bd.hitch(treesToSearch, "set", "value"));
    }
  },{
    className:"bd:widget.staticText",
    name:"searchSections",
    value:"Search Sections"
  },{
    className:"bd:dijit.comboBox",
    name:"sectionsToSearch",
    trim:true,
    autoComplete:false,
    store: sectionsToSearchStore,
    fetchProperties:{sort:[{attribute:"searchOrder", descending:true}]},
    searchAttr:"value",
    labelAttr:"value",
    value:"*",
    getSectionsToSearch:function() {
      var text= bd.trim(this.get("value")||"");
      if (!text) {
        return  ["full-name"];
      } else if (text==="*") {
        return bd.mapHash(bdRead.search.sectionSearchers, function(item, name) { return name; });
      } else {
        var 
          sectionNames= getAllSectionSearcherNames(),
          result= [];
        bd.forEach(text.match(/[^,]+/g), function(item) {
          (item= bd.trim(item)) && (bd.indexOf(sectionNames, item)!=-1) && result.push(item);
        });
        return result;
      }
    }
  },{
    className:'bd:dijit.button',
    name:"setSections",
    label:"set...",
    onClick:function() {
      sectionSelectDialog(this.parent.getChild("sectionsToSearch"));
    }
  }]
},
searchDialog= 
  // the search dialog will live forever since its descriptor sets the persist attribute to true
  // this variable hold the dialog after its created below
  0;
bd.descriptor.processor(searchDialogDescriptor, ["setTabs", "setClass"]);
bd.createWidget({descriptor:searchDialogDescriptor}, function(dialog) { searchDialog= dialog; });
bd.command.connect("search", function() { searchDialog && searchDialog.show(); });

});
// Copyright (c) 2000-2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.

