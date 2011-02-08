///
// AMD id = bdRead/docManager
define(["dojo", "bd", "./kernel"], function(dojo, bd, bdRead) {
///
// Contains machinery that manages all loaded documents.

var
 DEFAULT=
   // a nameless section in a single-section document
  "default";

dojo.mixin(bdRead, {
  uidMap:
    // Creates a map from document item to a session-unique integer identifier.
    ///
    // The map guarantees
    //c doci.uid===i
    // if and only if
    //c bdRead.uidMap[i]===doci
    //
    // `note bdRead.uidMap[0] is never assigned.
    // `note bdRead.uidMap may contain null entries after reloading full or partial documents.
    [null],

  docTypes:
    // Map from document type name to document type metadata.
    ///
    {}
});

bdRead.doc= bd.declare(null, {
  // A single loaded document.
  name: 
    //(bdRead.doc.name) The formal name of the document
    "",

  type:
    //(string) The type of the document.
    "",

  displayName:
    //(string) The name to display to the user.
    // `note This name need not be unique within the set of loaded documents.
    "",

  sdoc:
    //(bdRead.doc.section) Short description of the document.
    [],

  url:
    //(string) The base URL from which to retrieve the document sections.
    ///
    // 
    // A particular section resource resides at <url><section-name>. For example, given
    // 
    // `code
    // url:"http://library.altoviso.com/backdraft/api/",
    // sections: {
    //   "core.js": ["core", [[MD, "The Backdraft Core API"]]]
    //   //etc...
    // }
    /// 
    // The core section resource would be found at "http://library.altoviso.com/backdraft/api/core.js"
    //
    "",

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
    //(hash of name -> doci) The set of top-level items (items that don't imply a parent and child) loaded into this document
    {},

  url:
    //(string) The URL being used to source the document sections.
    "",

  inTransit:
    //(hash of section-name -> dojo.deferred) The set of sections whos resources have been requested.
    {},

  constructor: function(
    id,             //(hash) Initial values for instance attributes; must include attributes name, type, and sections.
    sectionsToLoad, //(vector of section-name(string)) Lists the sections found at id.sections to load.
                    //(falsy) Load all sections.
    url             //(string) The URL from which to load document resources.
                    //(falsy) No URL is available; the document is presumably manually loaded by some module
  ) {
    //initialize member data...
    dojo.mixin(this, id, {
      using:[],
      loadedSections:{},
      items:{},
      members:{},
      url:url || id.url || "",
      inTransit:{}
    });

    //when a catalog creats a doc with one of its items, it has owner set which is 
    //technically incorrect since the owner should never exist in a document; 
    //therefore, clear it...
    delete this.owner;

    bdRead.setUid(this);
    if (id.name=="root") {
      //the root's contents is loaded as each document is loaded and it doesn't have a doctype; therefore...
      this.parent= null;
      return;
    } else {
      this.parent= bdRead.root;
      bdRead.insDoc(this);
    }
    this.load(sectionsToLoad);
  },

  load: function(
    sections //(vector of section-name(string)) Lists the sections found at sections to load.
             //(falsy) Load all sections.
  ) {
    if (!this.url) {
      //the document didn't include a url; probably loaded directly (catalogs do this)
      return;
    }
    if (!sections) {
      sections= [];
      bd.forEachHash(this.sections, function(item, name) {
        sections.push(name);
      });
      if (!sections.length) {
        sections= [DEFAULT];
      }
    }
    
    dojo.forEach(sections, function(sectionName) {
      if (!this.inTransit[sectionName]) {
        dojo.publish("bdRead.docSectionRetrieving", [this, sectionName]);
        require([sectionName==DEFAULT ? this.url : this.url+sectionName]);
      }
    }, this);
  },

  loadError: function(
    sectionName
  ) {
    dojo.publish("bdRead.docSectionLoadFailed", [this, sectionName]);
    bd.widget.messageBox("Load Failure", "Failed to load document section \"" + sectionName + "\" at URL \"" + (sectionName==DEFAULT ? this.url : this.url+sectionName) + "\".", ["OK"]);
    delete this.inTransit[sectionName];
  },

  finishLoad: function(
    sectionName, //(string) The section contained by text
    rawDoc          //(any) The raw resource as received by the server.
  ) {
    if (!rawDoc) {
      rawDoc= sectionName;
      sectionName= DEFAULT;
    }
    if (dojo.isArray(rawDoc)) {
      this.mergeCorePropValues(rawDoc[0]);
    }
    bdRead.getLoader(this.type)(this, sectionName, rawDoc);
    delete this.inTransit[sectionName];
    dojo.publish("bdRead.docSectionLoaded", [this, this.loadedSections[sectionName]]);
  },

  mergeCorePropValues: function(
    props
  )  {
    ///
    // Merge new property values in with existing values.
    if (props) {
      var changesFound= false;

      if (props.type && !this.type) {
        //note: the pane manager and name resolver needs the document type, but it
        //is possible to demand a document load without knowing it's type
        this.type= props.type;
      }

      //if non-null displayName/sdoc/ldoc are in the props, assume they are more correct...
      dojo.forEach(["displayName","sdoc","ldoc"], function(p) {
        if (props[p] && !bd.equal(props[p], this[p])) {
          this[p]= props[p];
          changesFound= true;
        }
      }, this);

      //if any individual section in props is new or different, assume they are more correct...
      bd.forEachHash(props.sections, function(section, sectionName) {
        if (!this.sections[sectionName] || !bd.equal(section, this.sections[sectionName])) {
          this.sections[sectionName]= section;
          changesFound= true;
        }
      }, this);

      dojo.forEach(props.using, function(docName) {
        if (bd.findFirst(this.using, bd.equivP(docName))==-1) {
          this.using.push(docName);
        }
      }, this);

      if (changesFound) {
        dojo.publish("bdRead.docIdPropsUpdated", [this]);
      }
    }
  }
});

dojo.mixin(bdRead, {
  adviseDocSection: function(
    docName,
    sectionName,
    rawDoc
  ) {
    if (!rawDoc) {
      rawDoc= sectionName;
      sectionName= DEFAULT;
    }
    var doc= bdRead.root.members[docName];
    if (doc) {
      doc.finishLoad(sectionName, rawDoc);
    } else {
      //TODO--?
      console.log("failed to find document to finish load section");
    }
  },

  genericNameResolver: function(
    name //(string) TODO
  ) {
    // Resolves names into parent-child components.
    ///
    // As a default, parent-child names are separated by a "/"; for example:
    // `code
    // "someName"               => ["someName", null]          
    // "someParent/someChild"   => ["someParent", "someChild"] 
    // 
    // //notice the only character showing a relationship is "/"...
    // "some.Parent/some.Child" => ["someParent", "someChild"]
    // 
    var result= name.match(/(.+)(\/)([^\/]+)$/);
    // one or more of anything followed by "/" followed by one or more of anything other than "/" followed by eol
    return result ? [result[1], result[3]] : [name, null];
  },

  getNameResolver: function(
    type
  ) {
    return (type && bdRead.docTypes[type] && bdRead.docTypes[type].nameResolver) || bdRead.genericNameResolver;
  },
    
  genericLoader: function(
    doc,
    sectionName,
    rawDoc
  ) {
    var 
      docis= dojo.isArray(rawDoc) ? rawDoc[1] : rawDoc,
      nameResolver= bdRead.getNameResolver(doc.type),
      section= doc.loadedSections[sectionName],
      reload= !!section,
      dociNames= [],
      thisDocItems= doc.items;

    var adviseParent= function(name, item) {
      var 
        parent,
        names= nameResolver(name);
      if (names[1]) {
        //if we have a child name, then we must have a parent; prefer the already-existing items...
        parent= thisDocItems[p] || docis[names[0]];
        if (!parent) {
          //this is not normal, but we manufacture a container so we can still load the document section...
          dojo.publish("bdRead.docSectionMissingParent", [doc. name]);
          var parentName= names[0];
          parent= {
            name: parentName,
            sdoc: ["Generic container."]
          };
          dociNames.push(parentName); //this guarantees the new item is processed in the main loop below
          docis[parentName]= parent;
          adviseParent(parentName, parent);
        }
        (parent.members || (parent.members={}))[names[1]]= item;
        item.parent= parent;
      } else {
        //top-level item
        doc.members[names[0]]= item;
        item.parent= doc;
      }
    };

    if (!section) {
      section= doc.loadedSections[sectionName]= {name: sectionName};
    } else {
      //reloading; mark all items in the section as pending delete...
      bd.forEachHash(doc.items, function(item) {
        if (item.section===section) {
          item.pendingDelete= true;
        }
      });
    }
    
    //move contents of docItmes into doc; decorate them along the way...
    //since we may be adding synthetic parents, we can't just enumerate docis...
    for (var p in docis) {
      dociNames.push(p);
    }
    for (var i= 0; i<dociNames.length; i++) {
      p= dociNames[i];
      var item= docis[p];
      if (reload) {
        var originalItem= thisDocItems[p];
        if (originalItem) {
          dojo.mixin(originalItem, item);
          delete originalItem.pendingDelete;
          continue;
        }
      }
      
      //a new object...
      bdRead.setUid(item);
      item.name= p;
      item.owner= doc;
      item.section= section;
      adviseParent(p, item);
      thisDocItems[p]= item;
    }
  
    //if this was a reload, then delete all items that were not mentioned in the reloaded section....
    if (reload) {
      var
        itemNotPendingDelete= function(item) { return !item.pendingDelete; },
        deleteItems= [];
      bd.forEachHash(doc.items, function(item) {
        if (item.pendingDelete && bd.findHash(item.members, itemNotPendingDelete)===bd.notFound) {
          deleteItems.push(item.uid);
        }
      });
      dojo.forEach(deleteItems, function(uid) {
        dojo.publish("bdRead.deleteItemOnReload", [uid]);
        var 
          item= bdRead.uidMap[uid],
          name= item.name;
        if (item.parent) {
          delete item.parent.members[name];
        }
        if (item.owner) {
          delete thisDocItems[name];
        }
        bdRead.uidMap[uid]= null;
      });
    }
  },

  getLoader: function(
    type
  ) {
    return (type && bdRead.docTypes[type] && bdRead.docTypes[type].loader) || bdRead.genericLoader;
  },

  setUid: function(
    item
  ) {
    var uid= bdRead.uidMap.length;
    item.uid= uid;
    bdRead.uidMap.push(item);
    //console.log(uid);
  },

  insDoc: function(
    doc //(bdRead.doc) The document to add to the set of documents avilable for reading.
  ) {
    bdRead.root.members[doc.name]= doc;
    dojo.publish("bdRead.docAdded", [doc]);
  },
  
  delDoc: function(
    doc //(bdRead.doc) The document to add to the set of documents avilable for reading.
  ) {
    delete bdRead.root.members[doc.name];
    dojo.publish("bdRead.docDeleted", [doc]);
  },
  
  getNames: function(
    doci //(bdRead.doci) The document item from which to derive the parent.
  ) {
    if (!doci.owner) {
      return [doci.name];
    } else {
      return bdRead.getNameResolver(doci.owner.type)(doci.name);
    }
  },
  
  getParentName: function(
    doci //(bdRead.doci) The document item from which to derive the parent.
  ) {
    if (!doci.owner) {
      return doci.name;
    } else {
      var names= bdRead.getNames(doci);
      return names[1] && names[0];
    }
  },
  
  getChildName: function(
    doci //(bdRead.doci) The document item from which to derive the parent.
  ) {
    if (!doci.owner) {
      return doci.name;
    } else {
      var names= bdRead.getNames(doci);
      return names[1] || names[0];
    }
  },

  getOwningDoc: function(
    doci
  ) {
    while (doci.parent!=bdRead.root) {
      doci= doci.parent;
    }
    return doci;
  },

  getDisplayName: function(
    doci //bdRead.doci ) The document item from which to derive the display name.
  ){
    return doci.displayName || (doci.owner && bdRead.getChildName(doci)) || doci.name || "?";
  },

  getDociByUid: function(
    uid
  ) {
    return bdRead.uidMap[uid];
  },

  getDociByName: function(
    name, //(string) The document item name to lookup.
    doc   //(doci | bdRead.doc) Search only the document items of this document and it's usings.
          //(undefined) Search all documents.
  ) {
    //TODO chanaged return to say bd.notFound instead of false; check client usage
    //the simple, normal case...
    doc= doc && bdRead.getOwningDoc(doc);
    var result= (doc && doc.items && doc.items[name]);
    if (result) {
      return result;
    }
  
    if (doc) {
      return bd.findFirst(doc.using, function(docName) {
        var doc= bdRead.root.members[docName];
        return doc && doc.items[name];
      });
    } else {
      //search all docs
      return bd.findHash(bdRead.root.members, function(doc) { return doc.items[name]; });
    }
  
    return null;
  }
});

bdRead.root= 
  //TODO
  new bdRead.doc({
    name:"root",
    type:"root",
    displayName:"root",
    sections:{}
  });

bdRead.docTypes["com/altoviso/bdReadCatalog"]= {
  nameResolver: function (
    name
  ) {
    //never a parent child relationship for a document name..
    return [name, null];
  },

  loader: function(
    doc,
    sectionName,
    rawDoc
  ) {
    //load this catalog...
    bdRead.genericLoader(doc, sectionName, rawDoc);

    //catalogs don't display a page for each document mentioned...
    doc.members= {};

    //if this catalog calls for any autoload, do them now...
    bd.forEachHash(doc.items, function(item) {
      if (item.autoload) {
        new bdRead.doc(item);
      }
    });

    dojo.publish("bdRead.docSectionLoaded", [doc, doc.loadedSections[sectionName]]);
  },

  getPageDescriptor: function(
    doci
  ) {
    if (!doci.owner) {
      return {className:"bdRead:pageTypes.catalogPage"};
    } else {
      //should never get here...
      return {className:"bdRead:pageTypes.generic"};
    }
  },

  loaded: true
};

bdRead.navigatorModel= {
  // The model used for the tree widget.
  ///
  // Nodes are identified as follows:
  //   * rootItem: the root.
  //   * string: a document name as found id bdRead.docSetMap.
  //   * integer: the uid of a document item and resolved via bdRead.uidMap.
  getRoot: function(
    onItem
  ) {
    onItem(bdRead.root.uid);
  },

  mayHaveChildren: function(
    item
  ) {
    item= bdRead.uidMap[item];
    return item && !bd.isEmptyHash(item.members);
  },

  getChildren_: function(
    parentItem
  ) {
    var 
      result= [],
      children= [],
      item= bdRead.uidMap[parentItem];
    if (item) {
      bd.forEachHash(item.members, function(item) {
        children.push({uid:item.uid, sortName:bdRead.getDisplayName(item)});
      });
      children.sort(function(lhs, rhs) {
        return lhs.sortName<rhs.sortName ? -1 : (lhs.sortName>rhs.sortName ? 1 : 0);
      });
    }
    return dojo.map(children, function(item) { return item.uid; });
  },

  getChildren: function(
    parentItem,
    onComplete
  ) {
    onComplete(this.getChildren_(parentItem));
  },

  getIdentity: function(
    item
  ) {
    return item;
  },

  getLabel: function(
    item
  ) {
    item= bdRead.uidMap[item];
    return item && (item.displayName || bdRead.getChildName(item) || item.name);
  },

  addDocument: function(
  ) {
    var rootUid= bdRead.root.uid;
    this.onChildrenChange(rootUid, this.getChildren_(rootUid));
  },

  delDocument: function(
  ) {
    var rootUid= bdRead.root.uid;
    this.onChildrenChange(rootUid, this.getChildren_(rootUid));
  },

  refreshChildren: function(
    parentUid
  ) {
    this.onChildrenChange(parentUid, this.getChildren_(parentUid));
  },

  onChange: function(
    item
  ) {
  },

  onChildrenChange: function(
    parentUid,
    newChildrenList
  ) {
  },

  onDelete: function(
    parentUid,
    newChildrenList
  ) {
  }
};

});
// Copyright (c) 2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.

