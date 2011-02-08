///
// AMD id = bdRead/command
define(["dojo", "bd", "./kernel", "i18n!bd/nls/command", "bd/widget/messageBox", "bd/dijit/textBox", "./paneManager"], function(dojo, bd, bdRead, stockCommandItems) {
var
  loadDialog= function() {
    var descriptor= {
      className:'bd:widget.dialog',
      title:"Load Document",
      "class":"load",
      onOk: function(e) {
        require.injectModule(this.getChild("url").get("child").get("value"));
        this.endDialog(e);
      },
      children:[{
        className:"bd:widget.labeled",
        name:"url",
        "class":"url",
        label:"Enter the document URL:",
        labelPosit:"bl-tl",
        childPosit:"tl-tl",
        tabIndex:1,
        child:{
          className:"bd:dijit.textBox",
          trim:true
        }
      },{
        className:'bd:dijit.button',
        name:"cancel",
        "class":"messageBoxButton cancel",
        label:"Cancel",
        tabIndex:3,
        onClick:function(e) {
          this.parent.onCancel(e);
        }
      },{
        className:'bd:dijit.button',
        name:"ok",
        "class":"messageBoxButton ok",
        label:"OK",
        tabIndex:2,
        onClick:function(e) {
          this.parent.onOk(e);
        }
      }]
    };
    bd.createWidget({descriptor:descriptor}, function(dialog) { dialog.show(); });
  };

// add the stock localized command items to the backdraft command cach; we don't
// use many of them, but it's easiest to include them all rather than search
// the program for every use of a command
bd.forEachHash(stockCommandItems, function(item) {
  bd.command.addItem(item);
});

var
  // a bit of shorthand...
  bc= bd.command,
  C= bc.roles.command,
  M= bc.roles.menu,
  G= bc.roles.group,

  // the items below are command items unique to this application
  // Note: these could be localized, but for now we'll just define them in English
  commandItems=
    //
    // id                   icon  text                    type parent      groupId             accel  accel  itemOrder         statusText
    //                                                         menuId                          key    shift
    // [0]                  [1]   [1]                     [2]  [3]         [4]                 [5]    [6]    [7]               [8]
    //-+--------------------+-----+-----------------------+----+-----------+-------------------+------+------+-----------------+-----
    [
      //these are the back, forward, and recent buttons that will be the first 3 items on the main menu (we can't use built-in back/forward/recent since they have a different parent menu and group
      ["toplevelBack",      1,    "",                     C,   "top",     "top",               0,     0,      1,                bc.itemCache.get("back").statusText],
      ["toplevelForward",   1,    "",                     C,   "top",     "top",               0,     0,      2,                bc.itemCache.get("forward").statusText],
      ["toplevelRecent",    1,    "",                     M,   "top",     "top",               0,     0,      3,                bc.itemCache.get("recent").statusText],

      //these are the other commands unique to bdRead (i.e., not in bd.resources.commandItems)
      ["navigatePanes",     0,    "Move Between Panes",   C,   "navigate", "navigateOps",      9,     'C',   "previous",       "Move the cursor to the other pane"],
      ["searchResults",     0,    "Show Search Results",  C,   "navigate", "navigateOps",      's',   0,     "navigatePanes",  "Show the search results pane"],
      ["search",            0,    "Search",               C,   "navigate", "navigateOps",      's',   'C',   "searchResults",  "Show the search results pane"],
      ["new",               0,    "\\New",                C,   "file",     "filePrimaryOps",   0,     0,     0,                "Open a new document in another window"],
      ["spawn",             0,    "\\Spawn",              C,   "file",     "filePrimaryOps",   0,     0,     0,                "Open a fresh copy of this document set in another window"],

      ["fileLoadOps",       0,    "",                     G,   "",         "",                 0,     0,     "filePrimaryOps"],
      ["load",              0,    "\\Load",               C,   "file",     "fileLoadOps",      0,     0,     0,                "Load a new document"],
      ["reload",            0,    "\\Reload",             C,   "file",     "fileLoadOps",      82,   "C",    0,                "Reload the current document"],
      ["unload",            0,    "\\Unload",             C,   "file",     "fileLoadOps",      0,     0,     0,                "Unload the current document"],

      ["indexes",           0,    "\\Indexes",            M,   "top",      "top",              0,     0,     "file"],
      ["indexTypes",        0,    "",                     G,   "",         "",                 0,     0,     "navigateOps"],
      ["all",               0,    "\\All",                C,   "indexes",  "indexTypes",      'a',    "C",   0,                "Show index of all top-level objects"],
      ["namespaces",        0,    "\\Namespaces",         C,   "indexes",  "indexTypes",      'n',    "C",   0,                "Show index of all namespaces"],
      ["functions",         0,    "\\Functions",          C,   "indexes",  "indexTypes",      'p',    "C",   0,                "Show index of all functions"],
      ["classes",           0,    "\\Classes",            C,   "indexes",  "indexTypes",      'c',    "C",   0,                "Show index of all classes"],
      ["variables",         0,    "\\Variables",          C,   "indexes",  "indexTypes",      'v',    "C",   0,                "Show index of all global variables"],
      ["types",             0,    "\\Types",              C,   "indexes",  "indexTypes",      't',    "C",   0,                "Show index of all types"]
    ];

// add the application command items
bc.addItems(bd.map(commandItems, function(item) {
  return {
    id:item[0],
    enabledIcon:!!item[1],
    text:item[2],
    role:item[3],
    parentMenuId:item[4],
    groupId:item[5]||null,
    accelKey:item[6]||0,
    accelShift:item[7]||0,
    accelText:item[0]=="navigatePanes" ? "control+tab" : -1,
    statusText:item[9]||bd.defaultValue,
    itemOrder:(bd.isString(item[8]) ? {reference:item[8], offset:"after"} : item[8])};
}));

// create the command items "recent0" .. "recent9", publish to command framework, and hook to handler
for (var i= 0; i<10; i++) {
  var id= "recent" + i;
  bc.addItem({
    id:id,
    parentMenuId:"recent",
    role:bc.roles.command,
    groupOrder:0,
    itemOrder:i
  });
  bc.connect(id, bd.hitch(bdRead.paneManager, "showRecent", i));
}

//the default next/previous commands are hooked to tab/shift-tab accelerators
//therefore, install a command handler to take over tab navigation machinery
bc.connect("next", bd.navigator.commandHandler);
bc.connect("previous", bd.navigator.commandHandler);

//the next flag will completely disable default browser tab navigation...even if our machinery results in a no-op
bd.navigator.commandHandler.unconditionallyStopEvent= true;

//the command "navigatePanes" is hooked up in the main widget tree definition because it's easier to write the function in that context

bc.connect("back", function() { bdRead.paneManager.back(); });
bc.connect("forward", function() { bdRead.paneManager.forward(); });
bc.connect("toplevelBack", function() { bdRead.paneManager.back(); });
bc.connect("toplevelForward", function() { bdRead.paneManager.forward(); });

bc.connect("load", loadDialog);
bc.connect("reload", function() {
  var 
    current= bd.top.get("center"),
    doci= current && current.uid && bdRead.getDociByUid(current.uid);
  if (doci) {
    if (doci.owner) {
      doci.owner.load([doci.section.name]);
    } else {
      var sections= [];
      bd.forEachHash(doci.loadedSections, function(section) {
        sections.push(section.name);
      });
      doci.load(sections);
    }
  }
});
bc.connect("unload", function() {
  var 
    current= bd.top.get("center"),
    doci= current && current.uid && bdRead.getDociByUid(current.uid);
  doci && bdRead.delDoc(doci.owner || doci);
});

bc.connect("about", function() {
  bd.widget.messageBox("About",
    "BdRead is built on top of the <a href='http://localhost:4242/backdraft.htm' target='_blank'>Backdraft</a> browser application framework.<br/><br/>"
    + "BdRead and Backdraft are copyright &copy; 2009 Altoviso, Inc. licensed under the new BSD license (<a href='asdf' target='_blank'>view license</a>).<br/>",
  ["OK"]);
});

// hook up F10 to navigate the main menu...
bc.connect("focusMainMenu", function() { bd.top.get("top").child.focus(); });
bd.command.insertAccel("focusMainMenu", dojo.keys.F10, "");

});
// Copyright (c) 2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.

