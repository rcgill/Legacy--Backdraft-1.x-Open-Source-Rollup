///
// AMD id = bdRead/pageTypes/catalogPage
define(["bd", "../kernel", "bd/widget/pane", "bdRead/util"], function(bd, bdRead) {
var

getDocUid= function(doc) {
  return bd.findHash(
    bdRead.root.members, 
    function(item) { return item.name==doc.name; },
    function(item) { return item.uid; });
},

creatDocRow= function(doc) {
  var 
    loadClass,
    loadMsg,
    docUid= getDocUid(doc);

  if (docUid===bd.notFound) {
    loadClass= "notLoaded name_" + doc.uid;
    loadMsg= "load";
  } else {
    loadClass= "loaded name_" + docUid;
    loadMsg= "read";
  }

  return bdRead.util.format(
    '<tr><td class="%1" rowspan="2">%2</td><td class="doctitle">%3</td></tr>'
    + '<tr><td>%4</td></tr>',
    loadClass, loadMsg, doc.displayName || doc.name, bdRead.util.genSection(doc, doc.sdoc, false));
},

createDocTable= function(catalog) {
  var docs= [];
  bd.forEachHash(catalog.items, function(item) { docs.push(item); });
  docs.sort(function(lhs, rhs) {
    lhs= lhs.displayName || lhs.name;
    rhs= rhs.displayName || rhs.name;
    return (lhs<rhs ? -1 : (lhs>rhs ? 1 : 0));
  });
  return '<table class="d1 catalogListing">' + bd.map(docs, creatDocRow).join("\n") + "</table>";
};


bdRead.pageTypes.catalogPage= bd.declare(
  // supers
  [bd.widget.pane, bd.mouseable], 

  // prototype
  {
  "class": "bdReadPage bdReadPageCatalogPage",

  getCreateDomAttributes:
    function() {
      var 
        doc= bdRead.getDociByUid(this.key.uid),
        program= [
          ["genTitle", "Catalog", bdRead.getDisplayName(doc)],
          ["genSdoc", doc.sdoc],
          ["genH2Section", "Documents", 0, createDocTable(doc)]
        ];
      this.uid= doc.uid;
      this.mruText= "Catalog: " + bdRead.getDisplayName(doc);
      return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
    },

  onClick: function(e) {
    var 
      classString= e.target.className + "",
      match= classString.match(/^loaded name_(.+)/);
    if (match) {
      bdRead.paneManager.display(Number(match[1]));
      return;
    }
    match= classString.match(/^notLoaded name_(.+)/);
    if (match) {
      var catalogPage= bdRead.getDociByUid(Number(match[1]));
      if (getDocUid(catalogPage)===bd.notFound) {
        new bdRead.doc(catalogPage);
      }
      return;
    }
  }

});

});
// Copyright (c) 2000-2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.

