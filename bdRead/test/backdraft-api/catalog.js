require(["bdRead"], function(bdRead) {
  //a catalog is nothing more than an instance of document type "com/altoviso/bdReadCatalog"...
  var 
    docName= "com/altoviso/bdRead/catalog",
    docType= "com/altoviso/bdReadCatalog",
    doc= bdRead.root.members[docName] || new bdRead.doc({name:docName, type:docType});
  doc.finishLoad([
    {
      //id...
      displayName:"ALTOVISO Public Document Catalog",
      sdoc: ["This catalog lists all documents published by ALTOVISO available for free of charge."]
    },{
      "com/altoviso/backdraft/api/ref": {
        type:"com/altoviso/javaScriptApiRef",
        displayName:"Backdraft Application Programming Interface Reference Manual",
        sdoc: ["Contains the reference documentation for all namespaces, types, functions, classes, constants, and variables defined by the of the Backdraft browser application framework."],
        //autoload: true,
        //url:"/bdRead/test/test-docs/backdraft-api-ref.js"
        url:"../test/backdraft-api/com.altoviso.backdraft.api.ref.js"
      }
    }
  ]);
});
