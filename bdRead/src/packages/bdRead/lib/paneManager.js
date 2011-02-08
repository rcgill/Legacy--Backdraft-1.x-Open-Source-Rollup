///
// AMD id = bdRead/panManager
define(["bd", "./kernel"], function(bd, bdRead) {

bdRead.paneManager= {

  history:[],

  historyPointer:-1,

  recentList:[],

  display:function(
    uid
  ) {
    //TODO: if already being shown, just return
    var showing= bd.top.get("center");
    if (showing && showing.uid===uid) {
      return;
    } else if (uid) {
      this.pushHistoryItem(uid);
      this.show(uid);
    } else {
      //all the documents have been removed...
      bd.top.set("center", 0);
      this.history= [];
      this.historyPointer= -1;
      this.recentList= [];
    }
  },

  pushHistoryItem:function(
    uid
  ){
    this.history.splice(this.historyPointer+1);
    this.history.push(uid);
    this.historyPointer= this.history.length - 1;
  },

  back:function(){
    if (this.historyPointer>0) {
      this.bringHistoryItemToTop(--this.historyPointer);
    }
  },

  forward:function(){
    if (this.historyPointer < this.history.length-1) {
      this.bringHistoryItemToTop(++this.historyPointer);
    }
  },

  bringHistoryItemToTop:function(
    historyIndex
  ) {
    this.show(this.history[historyIndex]);
  },

  show:function(
    uid
  ) {
    var doci= bdRead.getDociByUid(uid);
    if (!doci) {
      console.error("Unknown document object demanded; uid= " + uid);
    }
  
    var type= (doci.owner && doci.owner.type) //a page in a document
              || doci.type; //the document root

    var pageTypeDescriptor=
      type && 
      bdRead.docTypes[type] && 
      bdRead.docTypes[type].getPageDescriptor && 
      bdRead.docTypes[type].getPageDescriptor(doci);
    if (!pageTypeDescriptor) {
      pageTypeDescriptor= {className:"bdRead:pageTypes.document"};
      //TODO...watch for the document type to load and then refresh the page
    }

    var descriptor= bd.mix(
      {},
      pageTypeDescriptor,
      {parentSpace:{regionInfo:{region:"center"}}}
    );

    var pane= bd.createWidget(
      {parent:"main", descriptor:descriptor, key:{uid:uid}}, 
      bd.hitch(this, function(pane) { this.updateRecent(pane.mruText, uid); })
    );
  },

  refresh:function() {
    this.bringHistoryItemToTop(this.historyPointer);
  },

  updateRecent:function(
    title,
    uid
  ){
    var
      recentList= this.recentList,
      i= 0, end= recentList.length;
    while (i<end) {
      if (recentList[i].uid===uid) {
        recentList.splice(i, 1);
        break;
      }
      i++;
    }
    recentList.unshift({title:title, uid:uid});
  },

  //for showRecent and populateRecentMenu, we don't consider the current displaying object
  //that's the reason behing the -1/+1 business

  showRecent:function(
    index
  ) {
    if (index<this.recentList.length-1) {
      this.display(this.recentList[index+1].uid);
    }
  },

  populateRecentMenu: function(menu) {
    if (menu.menuId==="recent" || menu.menuId==="toplevelRecent") {
      var contents= {};
      for (var recentList= this.recentList, i= 0; i<10 && i<recentList.length-1; i++) {
        var commandId= "recent" + i;
        bd.command.itemCache.get(commandId).htmlText= recentList[i+1].title;
        contents[commandId]= 1;
      }
      menu.contents= contents;
    }
  },

  onDocAmmended: function(
    doc,
    section
  ) {
    if (this.historyPointer!=-1) {
      //there is something on top
      var docOnTop= bdRead.getDociByUid(this.history[this.historyPointer]);
      if (docOnTop && (docOnTop===doc || (docOnTop.owner===doc && docOnTop.section===section))) {
        //the current displaying item was in the section that was refreshed; therefore...
        this.refresh();
      }
    }
  }
};

bd.subscribe("bdOpenMenu", "populateRecentMenu", bdRead.paneManager);
bd.subscribe("bdRead.docSectionLoaded", "onDocAmmended", bdRead.paneManager);

});
// Copyright (c) 2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.

