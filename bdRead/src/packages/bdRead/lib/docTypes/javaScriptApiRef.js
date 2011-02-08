///
// AMD id = com/altoviso/javaScriptApiRef
define("com/altoviso/javaScriptApiRef", ["dojo", "bd", "bdRead"], function(dojo, bd, bdRead) {
///
// Defines the Altoviso JavaScript API Reference document type

var 
  typeDoc= bd.symbol("com/altoviso/javaScriptApiRef"),
  typeNamespace= bd.symbol("namespace"),
  typeConst= bd.symbol("const"),
  typeEnum= bd.symbol("enum"),
  typeType= bd.symbol("type"),
  typeVariable= bd.symbol("variable"),
  typeAttribute= bd.symbol("attribute"),
  typeFunction= bd.symbol("function"),
  typeClass= bd.symbol("class"),
  typeResources= bd.symbol("resources"),
  typeResource= bd.symbol("resource"),
  typeModules= bd.symbol("modules"),
  typeModule= bd.symbol("module"),

  flagPrivate= bd.symbol("private"),
  flagFunction= bd.symbol("function"),
  flagNoSource= bd.symbol("noSource"),
  flagReadOnlyAttr= bd.symbol("roAttr"),
  flagAttr= bd.symbol("attr"),
  flagClassAttr= bd.symbol("classAttr"),


  moduleUid= bd.uid(),
  util= bdRead.util,
  genHtml= util.genHtml,
  genClickSpan= util.genClickSpan,
  genSection= util.genSection,
  genSpan= util.genSpan,
  getDociByName= bdRead.getDociByName,
  getDociByUid= bdRead.getDociByUid,
  getNames= bdRead.getNames,
  getChildName= bdRead.getChildName,
  nonblank= /\S/,
  keywords= /(\W|^)(break|case|catch|continue|default|delete|do|else|false|finally|for|function|if|in|instanceof|new|null|return|switch|this|throw|true|try|typeof|var|void|while|with)(\W|$)/g,
  braces= /(\{|\}|\(|\))/g,
  lessthan= /</g,
  amp= /&/g,

  hasFlag= function(doc, flag) {
    for (var i= 1; i<arguments.length; i++) {
      if (bd.indexOf(doc.flags, arguments[i])!==-1) {
        return true;
      }
    }
    return false;
  },

  isPrivate= function(
    doc
  ) {
    return hasFlag(doc, flagPrivate);
  },

  calloutEtc= function(
    text
  ) {
    return text.replace(keywords, '$1<span class="keyword">$2</span>$3').replace(braces, '<span class="bold">$1</span>' );
  },

  calloutStringsAndComments= function(
    text
  ) {
    var 
      term= "\"",
      stringStart= text.indexOf("\""),
      commentStart= text.indexOf("//");
    if (stringStart==-1) {
      stringStart= text.indexOf("'");
      term= "'";
    }
    if (stringStart==-1 || (commentStart!=-1 && stringStart>commentStart)) {
      if (commentStart==-1) {
        return calloutEtc(text);
      } else {
        return calloutEtc(text.substring(0, commentStart)) + genSpan("comment", text.substring(commentStart));
      }
    } else {
      var 
        i= stringStart + 1, 
        end= text.length;
      while (i<end) {
        var c= text.charAt(i++);
        if (c==term) {
          return calloutEtc(text.substring(0, stringStart)) + genSpan("string", text.substring(stringStart, i)) + calloutStringsAndComments(text.substring(i));
        } else if (c=="\\") {
          i++;
        }
      }
      return calloutEtc(text.substring(0, stringStart)) + genSpan("string", text.substring(stringStart));
    }
  },

  formatCode= function(
    code
  ) {
    var 
      result= [],
      i= 0, end= code.length,
      line, start, prefix;
    while (i<end) {
      line= code[i].replace(amp, "&amp;").replace(lessthan, "&lt;");

      //mark contiguous lines that start with a "///" comment and have a "//" comment thereafter...
      start= line.indexOf("///");
      while (start!=-1) {
        prefix= line.substring(0, start);
        if (nonblank.test(prefix)) {
          result.push("<p>" + calloutStringsAndComments(prefix) + genSpan("docComment", line.substring(start)) + "</p>");
        } else {
          result.push('<p class="docComment">' + line + "</p>");
        }
        if (++i==end) {
          return result;
        }
        line= code[i].replace(amp, "&amp;").replace(lessthan, "&lt;");
        start= line.indexOf("//");
      }
      result.push("<p>" + calloutStringsAndComments(line) + "</p>");
      ++i;
    }
    return result;
  },

  getFormattedCode= function(
    doc
  ) {
    if (!doc || !doc.code) {
      return null;
    } else {
      return doc.formattedCode || (doc.formattedCode= formatCode(doc.code));
    }
  },

  getContainingResource= function(
    doc,
    parentDoc
  ) {
    var result= getDociByName("resources."+ (doc.src || (parentDoc && parentDoc.src) || ""), doc);
    return  result!==bd.notFound ? result : null;
  },

  getRawCodeSlice= function(
  ) {
  },

  notWhiteSpace= /\S/,

  leftTrim= function(
    code
  ) {
    var min= Number.MAX_VALUE;
    bd.forEach(code, function(line) {
      var posit= line.search(notWhiteSpace);
      if (posit!=-1) {
        min= Math.min(min, posit);
      }
    });
    if (min>0) {
      return dojo.map(code, function(line) {
        return line.substring(min);
      });
    } else {
      return code;
    }
  },
  
  blanks= "                                                                                                    ",

  getSource= function(
    doc,
    parentDoc
  ) {
    if (hasFlag(doc, flagNoSource)) {
      return null;
    }
    var
      loc= doc.loc,
      containingResource= loc && getContainingResource(doc, parentDoc),
      rawSource= containingResource && containingResource.code;
    if (rawSource) {
      var 
        startLine= loc[0],
        startChar= loc[1],
        endLine= loc[2],
        endChar= loc[3],
        code= rawSource.slice(startLine, endLine+1),
        docLocs= [];
      dojo.forEach(containingResource.docLocs, function(loc) {
        if ((startLine<=loc[0] && loc[0]<=endLine) || (startLine<=loc[1] && loc[1]<=endLine)) {
          docLocs.push([Math.max(startLine, loc[0])-startLine, Math.min(endLine, loc[1])-startLine]);
        }
      });
      docLocs.sort(function(lhs, rhs) { return rhs[0] - lhs[0]; });
      dojo.forEach(docLocs, function(loc) {
        code.splice(loc[0], loc[1]-loc[0]+1);
      });
      code[0]= blanks.substring(0, startChar) + code[0].substring(startChar);
      var length= code.length - 1;
      code[length]= code[length].substring(0, endChar);
      return formatCode(leftTrim(code)).join("\n");
    } else {
      return null;
    }
  },

  getResourceSource= function(
    doc
  ) {
    var 
      code= doc.code.slice(0),
      docLocs= doc.docLocs || [];
    if (code) {
      docLocs.sort(function(lhs, rhs) { return rhs[0] - lhs[0]; });
      dojo.forEach(docLocs, function(loc) {
        code.splice(loc[0], loc[1]-loc[0]+1);
      });
      return formatCode(leftTrim(code)).join("\n");
    } else {
      return null;
    }
  },

  getModifiedSdoc= function (doci) {
    if (doci.sdoc) {
      return doci.sdoc;
    } else if (doci.types && doci.types[0]) {
      return doci.types[0][1];
    } else {
      return undefined;
    }
  },

  getFunctionSignatures= function(
    doc
  ) {
    //recall doc.params is [name, types]
    var 
      i= 0,
      getFunctionParam= function(
        param
      ) {
        return param[0] + ((i && param[1].length) ? ("<span class=\"paramOverload\">" + (i++) + "</span>") : "");
      },
      result= ["(" + bd.map(doc && doc.params, getFunctionParam).join(", ") + ")"];
    i= 1;
    dojo.forEach(doc.overloads, function(doc) {
      result.push("(" + bd.map(doc && doc.params, getFunctionParam).join(", ") + ")");
    });
    return result;
  },

  orderByName= function(lhs, rhs) {
    return lhs.name<rhs.name ? -1 : (lhs.name>rhs.name ? 1 : 0); 
  },

  getIndexContent= function(
    collection, //(hash of doci) The set of document items to consider when filtering
    groups,     //(array of hash of {type:<type>})
    getAttributes   //(function, optional) Adds an optional second column if attribute information
  ) {
    ///
    // Filters collection by group[i].type into group[i].content.
  
    //groups.type is a bd.symbol
    //create a new, unique container for each of the types mentioned in groups...
    var uid= bd.uid();
    dojo.forEach(groups, function(group) {
      group.type[uid]= [];
    });
  
    //fill the containers with references to the objects of that type that exist in collection...
    bd.forEachHash(collection, function(doci, name) {
      var collection= doci.type[uid];
      if (collection) {
        collection.push({doci:doci, uid:doci.uid, name:name, sdoc:getModifiedSdoc(doci)});
      }
    });
  
    var nonEmptyAttributes= false;
    bd.forEach(groups, function(group) {
      var 
        rows= [],
        container= group.type[uid].sort(orderByName);
      dojo.forEach(container, function(item) {
        var 
          c1= genClickSpan(item.uid, item.name),
          c2= genSection(item.doci, item.sdoc || "", true);
        if (getAttributes) {
          var c3= getAttributes(item);
          nonEmptyAttributes= nonEmptyAttributes || c3;
          rows.push([c1, c3, c2]);
        } else {
          rows.push([c1, c2]);
        }
      });
      group.content= rows;
      delete container;
    });
    if (!nonEmptyAttributes && getAttributes) {
      //could have had some attributes, but didn't; therefore, reduce to a 2-column table
      bd.forEach(groups, function(group) {
        bd.forEach(group.content, function(row) {
          row[1]= row[2];
          row.pop();
        });
      });
    }
    return nonEmptyAttributes;
  },

  getInheritanceInfo= function(
    doc
  ) {
    if (!doc.supers || doc.supers.length==0) {
      return [{}, ""];
    }
    var
      members= {},
      linkSuperClass= {},
      linkSiblingClass= {},
      maxR= 0, maxC= 0,
      cells= [],    
      link= function(doc) {
        if (doc.uid) {
          return "<td>" + genClickSpan(doc.uid, doc.name) + "</td>";
        } else {
          return "<td>" + doc + "</td>";
        }           
      },
      dumpSupers= function(doc, r, c) {
        bd.forEachHash(doc.members, function(item) {
          var name= getNames(item)[1];
          if (!members[name] && item.imember && (item.type===typeFunction || item.type===typeVariable || item.type==typeConst || item.type==typeAttribute) && (!hasFlag(item, flagClassAttr))) {
            members[name]= item;
          }
        });

        if (r>maxR) {
          maxR= r;
        }
        if (c>maxC) {
          maxC= c;
        }
        cells.push([link(doc), r, c]);
        var col= c;
        if (doc.supers && doc.supers.length) {
          cells.push([linkSuperClass, r+1, c]);
          var first= true;
          bd.forEach(doc.supers, function(item) {
            if (!first) {
              for (c= c+1; c<=col+1; c++) {
                cells.push([linkSiblingClass, r+2, c]);
              }
              col= c;
            }
            first= false;
            var superDoc= getDociByName(item, doc);
            col= dumpSupers((superDoc==-1 ? item : superDoc), r+2, col);
          });
        }
        return col;
      };

    dumpSupers(doc, 0, 0);

    var tableRow= [], table= [];
    for (var i= 0; i<=maxC; i++) {
      tableRow.push(false);
    }
    for (i= 0; i<=maxR; i++) {
      table.push(tableRow.slice(0));
    }
    bd.forEach(cells, function(cell) {
      table[maxR-cell[1]][cell[2]]= cell[0];
    });

    return [members, '<table class="inheritance">' + bd.map(table, function(row) {
      return "<tr>" + bd.map(row, function(cell) {
        if (cell===linkSuperClass) {
          return '<td class="linkSuper">&nbsp;</td>';
        } else if (cell===linkSiblingClass) {
          return '<td class="linkSibling">&nbsp;</td>';
        } else if (cell) {
          return cell;
        } else {
          return '<td class="linkNone">&nbsp;</td>';
        }
      }).join("") + "</tr>";
    }).join("") + "</table>"];
  },

  loader= function(
    doc,
    sectionName,
    rawDoc
  ) {
    bdRead.genericLoader(doc, sectionName, rawDoc);
    var docItems= doc.items;
    if (docItems.resources) {
      docItems.resources.type= typeResources;
    }
    if (docItems.modules) {
      docItems.modules.type= typeModules;
    }
    for (var p in docItems) {
      var doci= docItems[p];
      if (doci.imember && (hasFlag(doci, flagAttr, flagReadOnlyAttr))) {
        doci.type= typeAttribute;
      }
    }
  },

  nameResolver= function (
    name
  ) {
    // Resolves JavaScript API reference manual names.
    ///
    // JavaScript API reference manual names have two forms:
    // 
    // * normal JavaScript names: these are javascript.name types of the form "a", "a.b", "a.b.c", etc.
    // * normal JavaScript names with a ":<member-name>" suffix: these are used to denote a class
    //   instance member (i.e., a property of the prototype property of a constructor function)
    // 
    // Examples:
    // 
    // 'code
    // f("a")     -> ["a", null]
    // f("a.b")   -> ["a", "b"]
    // f("a.b.c") -> ["a.b", "c"]
    // f("a.b:c") -> ["a.b", "c"]
    //
    var result= name.match(/(.+)(\:|\.)([^\:\.]+)$/);
    // one or more of anything followed by { : | . } followed by one or more of anything other than { : | . } followed by eol
    // proper JavaScript names (e.g. "a.b.c") don't have colons, but we use colons to signal a property of a
    // prototype object for a constructor function (a class instance method).
    return result ? [result[1], result[3]] : [name, null];
  },

  getPageClass= function(type) {
    return "bdRead:pageTypes." + moduleUid + "." + type.name;
  };

//
// Page Classes Start Here
//

bd.set(getPageClass(typeDoc), bd.declare([bd.widget.pane], {
  ///
  // The top-level document page.

  "class": "bdReadPage",

  getCreateDomAttributes: function() {
    var 
      doc= getDociByUid(this.key.uid),
      sectionsContent= [[], [], []]; //namespaces, classes, and resources

    bd.forEachHash(doc.items, function(item, name) {
      switch (item.type) {
        case typeNamespace:
          sectionsContent[0].push({name:item.name, uid:item.uid, item:item});
          break;
        case typeClass:
          sectionsContent[1].push({name:item.name, uid:item.uid, item:item});
          break;
        case bd.symbols.resource:
          sectionsContent[2].push({name:item.name.substring(item.name.indexOf(".")+1), uid:item.uid, item:item});
          break;
      }
    });
    for (var i= 0; i<3; i++) {
      sectionsContent[i].sort(orderByName); 
      sectionsContent[i]= bd.map(sectionsContent[i], function(item) {
        return [genClickSpan(item.uid, item.name), genSection(item.item, item.item.sdoc || "", true)];
      });
    }  

    var program= [
      ["genTitle", "Document", bdRead.getDisplayName(doc)],
      ["genSdoc", doc.sdoc],
      ["genLdoc", doc.ldoc],
      ["genIndex2", "Aggregate Spaces", [
        {title:"Namespaces", content:sectionsContent[0]},
        {title:"Classes",    content:sectionsContent[1]},
        {title:"Resources",  content:sectionsContent[2]}]]];
    this.uid= doc.uid;
    this.mruText= "Document: " + bdRead.getDisplayName(doc);
    return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
  }
}));

bd.set(getPageClass(typeNamespace), bd.declare([bd.widget.pane], {
  "class": "bdReadPage",

  getCreateDomAttributes: function() {
    var 
      doc= getDociByUid(this.key.uid),
      members= {},
      program= [
        ["genTitle", "Namespace", doc.name],
        ["genSdoc", doc.sdoc],
        ["genLdoc", doc.ldoc],
        ["genIndex", "Members", members, [
          {title:"Namespaces",   type: typeNamespace},
          {title:"Types",        type: typeType},
          {title:"Enumerations", type: typeEnum},
          {title:"Classes",      type: typeClass},
          {title:"Constants",    type: typeConst},
          {title:"Attributes",    type: typeVariable},
          {title:"Functions",    type: typeFunction}
        ]]
      ];

    bd.forEachHash(doc.members, function(item) {
      members[getChildName(item)]= item;
    });

    this.uid= doc.uid;
    this.mruText= "Namespace: " + doc.name;
    return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
  }
}));

bd.set(getPageClass(typeType), bd.declare([bd.widget.pane], {
  "class": "bdReadPage",

  getCreateDomAttributes: function() {
    var 
      doc= getDociByUid(this.key.uid),
      program= [
        ["genTitle", "Type:" , doc.name],
        ["genSdoc", doc.sdoc],
        ["enHashProps", doc.props],
        ["genLdoc", doc.ldoc]
      ];

    if (/\.kwargs$/.test(doc.name)) {
      if (dojo.isString(doc.sdoc[0])) {
        doc.sdoc[0]= "(keyword arguments) " + doc.sdoc[0];
      }
    } else if (doc.props) {
      if (dojo.isString(doc.sdoc[0])) {
        doc.sdoc[0]= "(hash) " + doc.sdoc[0];
      }
    }

    this.uid= doc.uid;
    this.mruText= "Type: " + doc.name;
    return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
  }
}));

bd.set(getPageClass(typeEnum), bd.declare([bd.widget.pane], {
  "class": "bdReadPage",

  getCreateDomAttributes: function() {
    var 
      doc= getDociByUid(this.key.uid),
      program= [
        ["genTitle", "Enumeration", doc.name],
        ["genSdoc", doc.sdoc],
        ["genSynopsis", doc.name + ".<span class=\"standin\">property</span>"],
        ["genEnumProps", doc.props],
        ["genLdoc", doc.ldoc],
        ["genCode", getSource(doc)]
      ];

    this.uid= doc.uid;
    this.mruText= "Enumeration: " + doc.name;
    return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
  }
}));

bd.set(getPageClass(typeClass), bd.declare([bd.widget.pane], {
  "class": "bdReadPage",

  getCreateDomAttributes: function() {
    var 
      doc= getDociByUid(this.key.uid),
      inheritanceInfo= getInheritanceInfo(doc),
      instanceMembers= inheritanceInfo[0],
      classMembers= {},
      instanceIndexContent= [
        {title:"Constants", type: typeConst},
        {title:"Attributes",type: typeAttribute},
        {title:"Variables", type: typeVariable},
        {title:"Methods",   type: typeFunction}],
      classIndexContent= [
        {title:"Namespaces",  type: typeNamespace},
        {title:"Types",       type: typeType},
        {title:"Enumerations",type: typeEnum},
        {title:"Classes",     type: typeClass},
        {title:"Constants",   type: typeConst},
        {title:"Variables",   type: typeVariable},
        {title:"Functions",   type: typeFunction}];

    bd.forEachHash(doc.members, function(item) {
      var names= getNames(item);
      if (item.imember && (item.type===typeFunction || item.type===typeVariable || item.type==typeConst || item.type==typeAttribute) && (!hasFlag(item, flagClassAttr))) {
        instanceMembers[names[1]]= item;
      } else {
        classMembers[names[1]]= item;
      }
    });
    var getAttributes= function(
      item
    ) {
      var prefix= (item.doci.parent!==doc ? "<span class=\"inherited\">I</span>" : "");
      if (isPrivate(item.doci)) {
        return prefix + "<span class=\"private\">P</span>";
      } else if (hasFlag(item.doci, flagAttr)) {
        return prefix + "<span class=\"attr\">RW</span>";
      } else if (hasFlag(item.doci, flagReadOnlyAttr)) {
        return prefix + "<span class=\"attr\">RO</span>";
      } else {
        return prefix;
      }
    };
    var
      instanceIndexTableType= (getIndexContent(instanceMembers, instanceIndexContent, getAttributes) ? "genIndex3" : "genIndex2"),
      classIndexTableType= (getIndexContent(classMembers, classIndexContent, getAttributes) ? "genIndex3" : "genIndex2");

    var synopsis;
    if (doc.members && doc.members.constructor) {
      var sigs= getFunctionSignatures(doc.members.constructor);
      synopsis= dojo.map(sigs, function(sig) { return "new " + doc.name + sig; }).join("\n");
    } else {
      synopsis= "new " + doc.name + "()";
    }

    var program= [
      ["genTitle", "Class", doc.name],
      ["genSdoc", doc.sdoc],
      ["genSynopsis", synopsis],
      [instanceIndexTableType, "Instance Attributes and Methods", instanceIndexContent],
      [classIndexTableType, "Class Attributes, Methods, and other Machinery", classIndexContent],
      ["genH2Section", "Class Hierarchy", 0, inheritanceInfo[1]],
      ["genLdoc", doc.ldoc],
      ["genCode", getSource(doc)]];

    this.uid= doc.uid;
    this.mruText= "Class: " + doc.name;
    return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
  }
}));

bd.set(getPageClass(typeVariable), bd.declare([bd.widget.pane], {
  "class": "bdReadPage",

  getCreateDomAttributes: function() {
    var 
      doc= getDociByUid(this.key.uid),
      name= doc.name,
      title, synopsis, source;

    if (doc.parent && doc.parent.type===typeClass && doc.imember) {
      name= doc.name.substring(doc.name.lastIndexOf(".")+1);
      if (hasFlag(doc, flagAttr, flagReadOnlyAttr)) {
        title= (isPrivate(doc) ? '<span class="private">Private</span>' : "") + "Read-Only Instance Attribute: ";
        synopsis= "<span class='standin'>instance-variable</span>.get(\"" + name + "\")";
        if (bd.findFirst(doc.flags, bd.equivP(bd.symbols.roAttr))==-1) {
          title= (isPrivate(doc) ? '<span class="private">Private</span>' : "") + "Read-Write Instance Attribute: ";
          synopsis+= "<br /><span class='standin'>instance-variable</span>.set(\"" + name + "\", <span class='standin'>value</span>)";
        }
      } else {
        title= (isPrivate(doc) ? '<span class="private">Private</span>' : "") + "Instance Variable: ";
        synopsis= "<span class='standin'>instance-variable</span>." + name;
      }
      name= name + ' <span class="ofClass">of class</span> ' + doc.parent.name;
      source= getSource(doc, doc.parent);
    } else {
      if (bd.findFirst(doc.flags, bd.equivP(bd.symbols.hash))!=-1) {
        title= "Hash: ";
      } else {
        title= doc.type===typeConst ? "Constant: " : "Variable: ";
      }
      synopsis= doc.name;
      source= getSource(doc);
    }

    var program= [
      ["genTitle", title, name],
      ["genSdoc", getModifiedSdoc(doc)],
      ["genSynopsis", synopsis],
      ["genHashProps", doc.props],
      ["genTypes", doc.types],
      ["genLdoc", doc.ldoc],
      ["genCode", source]
    ];

    this.uid= doc.uid;
    this.mruText= title + ": " + name;
    return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
  }
}));

bd.set(getPageClass(typeFunction), bd.declare([bd.widget.pane], {
  "class": "bdReadPage",

  getCreateDomAttributes: function() {
    var 
      doc= getDociByUid(this.key.uid),
      name= doc.name,
      sigs= getFunctionSignatures(doc),
      title, synopsis, source;

    if (doc.parent && doc.parent.type===typeClass && doc.imember) {
      name= doc.name.substring(doc.name.lastIndexOf(".")+1);
      if (name=="constructor") {
        synopsis= dojo.map(sigs, function(sig) { return "new " + doc.parent.name + sig; }).join("\n");
      } else {
        synopsis= dojo.map(sigs, function(sig) { return "<span class=\"standin\">instance</span>." + name + sig; }).join("\n");
      }
      title= (isPrivate(doc) ? "<span class=\"private\">Private</span>" : "") + "Instance Method: ";
      name= name + " <span class=\"ofClass\">of class</span> " + doc.parent.name;
      source= getSource(doc, doc.parent);
    } else if (doc.type===typeType) {
      title= "Type: ";
      synopsis= dojo.map(sigs, function(sig) { return "function " + sig + " {\n  // implementation as required by semantics\n}"; }).join("\n");
      source= "";
    } else {
      title= "Function: ";
      synopsis= dojo.map(sigs, function(sig) { return doc.name + sig; }).join("\n");
      source= getSource(doc);
    }

    var 
      i= 1,
      params= (doc.params && doc.params.slice(0)) || [];
    dojo.forEach(doc.overloads, function(doc) {
      dojo.forEach(doc.params, function(param) {
        if (param[1].length) {
          //an overload parameter with documentation; copy it, add the superscript, push it itno params
          param= param.slice(0);
          param[0]= param[0] + "<span class=\"paramOverload\">" + (i++) + "</span>";
          params.push(param);
        }
      });
    });

    var program= [
      ["genTitle", title, name],
      ["genSdoc", doc.sdoc],
      ["genSynopsis", synopsis],
      ["genParams", params],
      ["genReturns", doc.returns],
      ["genExceptions", doc.exceptions],
      ["genLdoc", doc.ldoc]
    ];
    i= 1;
    dojo.forEach(doc.overloads, function(doc) {
      program.push(["genOverloadLdoc", sigs[i++], doc]);
    });
    program.push(["genCode", source]);

    this.uid= doc.uid;
    this.mruText= title + ": " + name;
    return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
  }
}));

dojo.forEach([typeResource, typeModule], function(type) {
  bd.set(getPageClass(type), bd.declare([bd.widget.pane], {
    "class": "bdReadPage",
  
    getCreateDomAttributes: function() {
      var 
        doc= getDociByUid(this.key.uid),
        name= doc.name.substring(doc.name.indexOf(".")+1),
        owningDoc= bdRead.getOwningDoc(doc),
        indexContent= [
          {title:"Namespaces",   type: typeNamespace},
          {title:"Types",        type: typeType},
          {title:"Enumerations", type: typeEnum},
          {title:"Classes",      type: typeClass},
          {title:"Constants",    type: typeConst},
          {title:"Variables",    type: typeVariable},
          {title:"Functions",    type: typeFunction}],
        members= {};
   
      bd.forEachHash(owningDoc.items, 
        (type===typeResource ?
          (function(item) { if (item.src==name) { members[item.name]= item; }}):
          (function(item) { if (item.module==name) { members[item.name]= item; }}))
      );
      getIndexContent(members, indexContent);
  
      var 
        typeName= (type===typeResource ? "Resource" : "Module"),
          program= [
          ["genTitle", typeName, doc.name.substring(doc.name.indexOf(".")+1)],
          ["genSdoc", doc.sdoc],
          ["genLdoc", doc.ldoc],
          ["genIndex2", "Machinery Defined by this " + typeName, indexContent]
        ];
      type===typeResource && program.push(["genCode", getResourceSource(doc)]);

      this.uid= doc.uid;
      this.mruText= "Resource: " + doc.name;
      return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
    }
  }));

  var contentName= (type===typeResource ? "Source Code" : "Modules");
  bd.set(getPageClass(type===typeResource ? typeResources : typeModules), bd.declare([bd.widget.pane], {
    "class": "bdReadPage",
  
    getCreateDomAttributes: function() {
      var 
        doc= getDociByUid(this.key.uid),
        indexContent= [];
  
      bd.forEachHash(doc.parent.items, function(item, name) {
        if (item.type===type) {
          indexContent.push({name:item.name.substring(item.name.indexOf(".")+1), uid:item.uid, item:item});
        }
      });
      indexContent.sort(orderByName);
      indexContent= bd.map(indexContent, function(item) {
        return [
          genClickSpan(item.uid, item.name), 
          genSection(item.item, item.item.sdoc || "no further information available", true)];
      });
  
      var program= [
        ["genTitle", "", contentName],
        ["genIndex2", contentName + " Referenced in this Document", [{title:0, content:indexContent}]]]; //inside every good progam is a lisp program trying to get out!
      this.uid= doc.uid;
      this.mruText= contentName;
      return bd.mix(this.inherited(arguments), {innerHTML:bdRead.generatePageContent(doc, program)});
    }
  }));
});

var
  NOTE= 4,
  WARN= 5,
  chunkTarget= 0,
  searchSection= function(section, regex) {
    if (section) for (var chunk, match, i= 0, end= section.length; i<end;) {
      chunk= section[i++];
      if (!chunkTarget && chunk.charAt) {
        if ((match= chunk.match(regex))) return match;
      } else if (!chunkTarget || chunk[0]===chunkTarget) {
        if ((match= chunk[1].match(regex))) return match;
      }
    }
    return 0;
  },
  searchTypes= function(types, regex) {
    if (types) {
      for (var match, type, i= 0, end= types.length; i<end;) {
        type= types[i++];
        if (!chunkTarget && (match= type[0].match(regex))) return match;
        if ((match= searchSection(type[1], regex))) return match;
      }
    }
    return 0;
  },
  searchParams= function(params, regex) {
    if (params) {
      for (var match, param, i= 0, end= params.length; i<end;) {
        param= params[i++];
        if (!chunkTarget && (match= param[0].match(regex))) return match;
        if ((match= searchTypes(param[1], regex))) return match;
      }
    }
    return 0;
  },
  searchProps= function(props, regex) {
    var match, doc, i= 0, end= props.length;
    while (i<end) {
      if (!chunkTarget && (match= props[i].match(regex))) return match;
      i++;
      doc= props[i++];
      if (!chunkTarget && doc.sdoc && (match= searchSection(doc.sdoc, regex))) return match;
      if (doc.ldoc && (match= searchSection(doc.ldoc, regex))) return match;
      if (doc.types && (match= searchParams(doc.types, regex))) return match;
    }
    return 0;
  },
  searchers= bdRead.search.sectionSearchers;

  searchers["hash properties"]= function(o, regex) {
    var match= o.props && searchProps(o.props, regex);
    return match ? {uid:o.uid, match:match[0], text:"1" + o.name} : 0;
  };

  searchers["parameters"]= function(o, regex) {
    var match= o.params && searchParams(o.params, regex);
    return match ? {uid:o.uid, match:match[0], text:"2" + o.name} : 0;
  };

  searchers["types"]= function(o, regex) {
    var match= o.types && searchTypes(o.types, regex);
    return match ? {uid:o.uid, match:match[0], text:"3" + o.name} : 0;
  };

  searchers["returns"]= function(o, regex) {
    var match= o.returns && searchTypes(o.returns, regex);
    return match ? {uid:o.uid, match:match[0], text:"4" + o.name} : 0;
  };

  searchers["notes"]= function(o, regex) {
    chunkTarget= NOTE;
    var match= searchSection(o.ldoc, regex) ||
      (o.props && searchProps(o.props, regex)) ||
      (o.params && searchParams(o.params, regex)) ||
      (o.types && searchTypes(o.types, regex)) ||
      (o.returns && searchTypes(o.returns, regex));
    chunkTarget= 0;
    return match ? {uid:o.uid, match:match[0], text:"5" + o.name} : 0;
  };

  searchers["warnings"]= function(o, regex) {
    chunkTarget= WARN;
    var match= searchSection(o.ldoc, regex) ||
      (o.props && searchProps(o.props, regex)) ||
      (o.params && searchParams(o.params, regex)) ||
      (o.types && searchTypes(o.types, regex)) ||
      (o.returns && searchTypes(o.returns, regex));
    chunkTarget= 0;
    return match ? {uid:o.uid, match:match[0], text:"6" + o.name} : 0;
  };


//
// Type type property in com.altoviso.javaScriptApiRef are bd.symbols. By adding a guaranteed-unique property to each of these
// symbols, we can set the value of that property to the bd.descriptor used to generate the page. This is a neat example of
// one bd.symbol use pattern.
//
var pageDescriptorLookupUid= bd.uid();
bd.forEach([
  typeDoc,
  typeNamespace,
  typeConst,
  typeEnum,
  typeType,
  typeVariable,
  typeFunction,
  typeClass,
  typeResources,
  typeResource,
  typeModules,
  typeModule
], function(type) {
  type[pageDescriptorLookupUid]=  {className:getPageClass(type)};
});

var getPageDescriptor= function(
  doci
) {
  var type= doci.type;
  if (type===typeConst || type===typeAttribute) {
    return {className:getPageClass(typeVariable)};
  } else if (type===typeType && hasFlag(doci, flagFunction)) {
    return {className:getPageClass(typeFunction)};
  } else if (type===typeDoc.name) {
    return typeDoc[pageDescriptorLookupUid];
  } else {
    return (type && type[pageDescriptorLookupUid]) || {className:"bdRead:pageTypes.generic"};
  }
};

bdRead.docTypes["com/altoviso/javaScriptApiRef"]= {
  ///namespace
  // Holds all machinery required to display a page in a document of type com.altoviso.javaScriptApiRef.
  loaded:true,
  nameResolver:nameResolver,
  loader:loader,
  getPageDescriptor:getPageDescriptor,
  calloutStringsAndComments:calloutStringsAndComments,
  formatCode:formatCode,
  etFormattedCode:getFormattedCode,
  getSource:getSource
};

});
// Copyright (c) 2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.
