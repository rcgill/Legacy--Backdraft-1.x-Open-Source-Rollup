///
// AMD id = bdRead/pageTypes/document
define(["bd", "../kernel", "bd/widget/pane", "bdRead/util"], function(bd, bdRead) {

bdRead.pageTypes.document= bd.declare(
  // supers
  [bd.widget.pane], 

  // prototype
  {
  "class": "bdReadPage bdReadPageDocument",

  getCreateDomAttributes:
    function() {
      var 
        doc= bdRead.getDociByUid(this.key.uid),
        program= [
          ["genTitle", "Document", bdRead.getDisplayName(doc)],
          ["genSdoc", doc.sdoc],
          ["genLdoc", doc.ldoc]
       ];
      this.uid= doc.uid;
      this.mruText= "Document: " + bdRead.getDisplayName(doc);
      return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
    }
});
/*
  TODO:

  type:
    //(string) The type of the document.
    "",

  displayName:
    //(string) The name to display to the user.
    // `note This name need not be unique within the set of loaded documents.
    "",

  urls:
    //(vector of url) The base URLs from which to retrieve the document sections.
    ///
    // Typically, the vector will contain a single URL; however, high-demand documents
    // may be mirrored at several servers and this vector gives a way to publish this to the user.
    // 
    // A particular section resource resides at <url><section-name>. For example, given
    // 
    // `code
    // urls: ["http://library.altoviso.com/backdraft/api/"],
    // sections: {
    //   "core.js": ["core", [[MD, "The Backdraft Core API"]]]
    //   //etc...
    // }
    /// 
    // The core section resource would be found at "http://library.altoviso.com/backdraft/api/core.js"
    //
    [],

  sections:
    //(hash of section-name to pair of (display-name(string), short-description(bdRead.doc.section))) Gives
    // the list of sections contained by the document.
    ///
    // * display-name is the name that's presented to the user.
    // * short-description describes the section.
    //
    {},

  ldoc:
    //(document-section) Long description of the document.
    null,

  using:
    //(vector of string) List of other document names that this document may cross reference.
    [],

  loadedSections:
    //(hash of section-name -> {name:<section-name>}) Says which sections are loaded
    // Each doci's "section" property references the {name:<section-name>} object.\
    {},

  items:
    //(hash of name -> doci) The set of document items loaded into this document.
    {},

  members:
    //(hash of name -> doci) The set of top-level items (items that don't imply a parent and childe) loaded into this document
    {},

  url:
    //(string) The URL being used to source the document sections.
    "",

  inTransit:
    //(hash of section-name -> dojo.deferred) The set of sections whos resources have been requested.
    {},
*/

});
// Copyright (c) 2000-2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.

