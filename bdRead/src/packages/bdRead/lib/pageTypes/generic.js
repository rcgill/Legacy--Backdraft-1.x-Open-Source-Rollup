///
// AMD id = bdRead/pateTypes/generic
define(["bd", "../kernel", "bd/widget/pane", "bdRead/util"], function(bd, bdRead) {

bdRead.pageTypes.generic= bd.declare(
  // supers
  [bd.widget.pane], 

  // prototype
  {
  "class": "bdReadPage bdReadPageGeneric",

  getCreateDomAttributes:
    function() {
      var 
        doc= bdRead.getDociByUid(this.key.uid),
        program= [
          ["genTitle", "", doc.name],
          ["genSdoc", doc.sdoc]
        ];
  
      this.uid= doc.uid;
      this.mruText= doc.name;
      return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
    }
});

});
// Copyright (c) 2000-2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.

